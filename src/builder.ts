import Hoek from 'hoek';
import * as Joi from "joi";
import $RefParser from 'json-schema-ref-parser';
import * as Filter from './filter';
import * as Group from './group';
import * as Sort from './sort';
import * as Info from './info';
import Paths from './paths';
import * as Tags from './tags';
import * as Validate from './validate';
import * as Utilities from './utilities';
import * as Hapi from "hapi";
import { IPluginOptions, MimeTypes } from './defaults';

export type SwaggerSchemes = 'http'|'https'|'ws'|'wss';
export interface ISwagger2Schema extends Partial<ISwaggerDocument>{
    swagger: '2.0';
}

export interface ISwaggerDocument {
    info: any;
    paths: any;
    schema: string;
    host: string;
    basePath: string;
    schemes: SwaggerSchemes[];
    consumes: MimeTypes;
    produces: MimeTypes;
    definitions: any;
    parameters: any;
    responses: any;
    securityDefinitions: any;
    security: any;
    grouping: 'path'|'tags'
    tagsGroupingFilter: Function;
    tags: any;
    cors: boolean;
    externalDocs: { description: string, url: string},
    cache: {
        expiresIn: number,
        expiresAt: string,
        generateTimeout: number
    }
}

/**
 * default data for swagger root object
 */
const data: ISwagger2Schema = {
    swagger: '2.0',
    host: 'localhost',
    basePath: '/'
}

export default data;

type SwaggerSchema = {[K in keyof ISwagger2Schema]};

/**
 * schema for swagger root object
 */
export const swaggerSchema: SwaggerSchema = {
    swagger: Joi.string().valid('2.0').required(),
    info: Joi.any(),
    host: Joi.string(), // JOI hostname validator too strict
    basePath: Joi.string().regex(/^\//),
    schemes: Joi.array()
        .items(Joi.string().valid(['http', 'https', 'ws', 'wss']))
        .optional(),
    consumes: Joi.array().items(Joi.string()),
    produces: Joi.array().items(Joi.string()),
    paths: Joi.any(),
    definitions: Joi.any(),
    parameters: Joi.any(),
    responses: Joi.any(),
    securityDefinitions: Joi.any(),
    security: Joi.any(),
    grouping: Joi.string().valid(['path', 'tags']),
    tagsGroupingFilter: Joi.func(),
    tags: Joi.any(),
    cors: Joi.boolean(),
    externalDocs: Joi.object({
        description: Joi.string(),
        url: Joi.string().uri()
    }),
    cache: Joi.object({
        expiresIn: Joi.number(),
        expiresAt: Joi.string(),
        generateTimeout: Joi.number()
    })
};

export const schema = Joi.object(swaggerSchema).pattern(/^x-/, Joi.any());

/**
 * gets the Swagger JSON
 *
 * @param settings
 * @param request
 */
export async function getSwaggerJSON (settings, request: Hapi.Request) {
    // remove items that cannot be changed by user
    delete settings.swagger;

    // collect root information
    data.host = getHost(request);
    data.schemes = [getSchema(request)];

    settings = Hoek.applyToDefaults(data, settings);
    if (settings.basePath && settings.basePath !== '/') {
        settings.basePath = Utilities.removeTrailingSlash(settings.basePath);
    }
    let out = removeNoneSchemaOptions(settings);
    Joi.assert(out, schema);

    out.info = Info.build(settings);
    out.tags = Tags.build(settings);

    let routes = request.server.table();

    routes = Filter.byTags(['api'], routes);
    Sort.paths(settings.sortPaths, routes);

    // filter routes displayed based on tags passed in query string
    if (Utilities.isObject(request.query) && (request.query as any).tags) { // for some reason type gaurd didn't work
        let filterTags = (request.query as any).tags.split(',');
        routes = Filter.byTags(filterTags, routes);
    }

    // append group property - by path
    Group.appendGroupByPath(
        settings.pathPrefixSize,
        settings.basePath,
        routes,
        settings.pathReplacements
    );

    let paths = new Paths(settings);
    let pathData = paths.build(routes);
    out.paths = pathData.paths;
    out.definitions = pathData.definitions;
    if (Utilities.hasProperties(pathData['x-alt-definitions'])) {
        out['x-alt-definitions'] = pathData['x-alt-definitions'];
    }
    out = removeNoneSchemaOptions(out);

    if (settings.debug) {
        await Validate.log(out, settings.log);
    }

    if (settings.deReference === true) {
        return dereference(out);
    } else {
        return out;
    }
};

/**
 * dereference a schema
 *
 * @param  {Object} schema
 * @param  {Function} callback
 */
export async function dereference (schema) {
    const parser = new $RefParser(); // Typings for $RefParser static methods are incorrect

    try {
        const json = await parser.dereference(schema);

        delete json.definitions;
        delete json['x-alt-definitions'];

        return json;

    } catch(err) {
        throw new Error('failed to dereference schema');
    }
};

/**
 * finds the current host
 *
 * @param  {Object} request
 * @return {String}
 */
function getHost (request) {
    const proxyHost = request.headers['x-forwarded-host'] || request.headers['disguised-host'] || '';
    if (proxyHost) {
        return proxyHost;
    }

    const reqHost = request.info.host.split(':');
    const host = reqHost[0];
    const port = parseInt(reqHost[1] || '', 10);
    const protocol = request.server.info.protocol;

    // do not set port if its protocol http/https with default post numbers
    // this cannot be tested on most desktops as ports below 1024 throw EACCES
    /* $lab:coverage:off$ */
    if (!isNaN(port) &&
        ((protocol === 'http' && port !== 80) ||
        (protocol === 'https' && port !== 443))
    ) {
        return host + ':' + port;
    }
    /* $lab:coverage:on$ */

    return host;
};

/**
 * finds the current schema
 *
 * @param  {Object} request
 * @param  {Object} connection
 * @return {String}
 */
function getSchema (request) {
    const forwardedProtocol = request.headers['x-forwarded-proto'];

    if (forwardedProtocol) {
        return forwardedProtocol;
    }

    // Azure Web Sites adds this header when requests was received via HTTPS.
    if (request.headers['x-arr-ssl']) {
        return 'https';
    }

    const protocol = request.server.info.protocol;

    // When iisnode is used, connection protocol is `socket`. While IIS
    // receives request over HTTP and passes it to node via a named pipe.
    if (protocol === 'socket') {
        return 'http';
    }

    return protocol;
};

/**
 * removes none schema properties from options
 *
 * @param  {Object} options
 * @return {Object}
 */
function removeNoneSchemaOptions(options) {
    let out = Hoek.clone(options);
    [
        'debug',
        'documentationPath',
        'documentationRouteTags',
        'documentationPage',
        'jsonPath',
        'auth',
        'swaggerUIPath',
        'swaggerUI',
        'pathPrefixSize',
        'payloadType',
        'expanded',
        'lang',
        'sortTags',
        'sortEndpoints',
        'sortPaths',
        'grouping',
        'tagsGroupingFilter',
        'xProperties',
        'reuseDefinitions',
        'uiCompleteScript',
        'deReference',
        'definitionPrefix',
        'validatorUrl',
        'jsonEditor',
        'acceptToProduce',
        'cache',
        'pathReplacements',
        'log',
        'cors'
    ].forEach(element => {
        delete out[element];
    });
    return out;
};
