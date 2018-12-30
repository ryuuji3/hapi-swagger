import Hoek from "hoek";
import Joi from "joi";

import * as Hapi from "hapi";
import Definitions from "./definitions";
import * as Parameters from "./parameters";
import Properties from "./properties";
import Responses from "./responses";
import * as Utilities from "./utilities";

export default class Paths {
    public static getDefaultStructures() {
        return {
            properties: {},
            parameters: []
        };
    }
    public definitions: Definitions;
    public properties: Properties;
    public responses: Responses;
    public defaults: object;
    public schema: Joi.JoiObject;

    constructor(public settings: any) {
        this.definitions = new Definitions(settings);
        this.properties = new Properties(settings, {}, {});
        this.responses = new Responses(settings, {}, {});

        this.defaults = {
            responses: {}
        };

        this.schema = Joi.object({
            tags: Joi.array().items(Joi.string()),
            summary: Joi.string(),
            description: Joi.string(),
            externalDocs: Joi.object({
                description: Joi.string(),
                url: Joi.string().uri()
            }),
            operationId: Joi.string(),
            consumes: Joi.array().items(Joi.string()),
            produces: Joi.array().items(Joi.string()),
            parameters: Joi.array().items(Joi.object()),
            responses: Joi.object().required(),
            schemes: Joi.array().items(Joi.string().valid(["http", "https", "ws", "wss"])),
            deprecated: Joi.boolean(),
            security: Joi.array().items(Joi.object())
        });
    }

    /**
     * build the swagger path section
     *
     * @param  {Object} setting
     * @param  {Object} routes
     * @return {Object}
     */
    public build(routes) {
        const routesData = [];

        // loop each route
        routes.forEach(route => {
            const routeOptions = Hoek.reach(route, "settings.plugins.hapi-swagger") || {};

            const routeData = {
                path: route.path,
                method: route.method.toUpperCase(),
                description: route.settings.description,
                notes: route.settings.notes,
                tags: Hoek.reach(route, "settings.tags"),
                queryParams: Hoek.reach(route, "settings.validate.query"),
                pathParams: Hoek.reach(route, "settings.validate.params"),
                payloadParams: Hoek.reach(route, "settings.validate.payload"),
                responseSchema: Hoek.reach(route, "settings.response.schema"),
                responseStatus: Hoek.reach(route, "settings.response.status"),
                headerParams: Hoek.reach(route, "settings.validate.headers"),
                consumes: Hoek.reach(routeOptions, "consumes") || null,
                produces: Hoek.reach(routeOptions, "produces") || null,
                responses: Hoek.reach(routeOptions, "responses") || null,
                payloadType: Hoek.reach(routeOptions, "payloadType") || null,
                security: Hoek.reach(routeOptions, "security") || null,
                order: Hoek.reach(routeOptions, "order") || null,
                deprecated: Hoek.reach(routeOptions, "deprecated") || null,
                id: Hoek.reach(routeOptions, "id") || null,
                groups: route.group
            };

            Utilities.assignVendorExtensions(routeData, routeOptions);
            routeData.path = Utilities.replaceInPath(routeData.path, ["endpoints"], this.settings.pathReplacements);

            // user configured interface through route plugin options
            if (Hoek.reach(routeOptions, "validate.query")) {
                routeData.queryParams = Utilities.toJoiObject(Hoek.reach(routeOptions, "validate.query"));
            }
            if (Hoek.reach(routeOptions, "validate.params")) {
                routeData.pathParams = Utilities.toJoiObject(Hoek.reach(routeOptions, "validate.params"));
            }
            if (Hoek.reach(routeOptions, "validate.headers")) {
                routeData.headerParams = Utilities.toJoiObject(Hoek.reach(routeOptions, "validate.headers"));
            }
            if (Hoek.reach(routeOptions, "validate.payload")) {
                // has different structure, just pass straight through
                routeData.payloadParams = Hoek.reach(routeOptions, "validate.payload");
                // if its a native javascript object convert it to JOI
                if (!routeData.payloadParams.isJoi) {
                    routeData.payloadParams = Joi.object(routeData.payloadParams);
                }
            }

            // swap out any custom validation function for Joi object/string
            ["queryParams", "pathParams", "headerParams", "payloadParams"].forEach(property => {
                // swap out any custom validation function for Joi object/string
                if (Utilities.isFunction(routeData[property])) {
                    if (property !== "pathParams") {
                        this.settings.log(
                            ["validation", "warning"],
                            "Using a Joi.function for a query, header or payload is not supported."
                        );

                        if (property === "payloadParams") {
                            routeData[property] = Joi.object().label("Hidden Model");
                        } else {
                            routeData[property] = Joi.object({
                                "Hidden Model": Joi.string()
                            });
                        }
                    } else {
                        this.settings.log(
                            ["validation", "error"],
                            "Using a Joi.function for a params is not supported and has been removed."
                        );
                        routeData[property] = null;
                    }
                }
            });

            // hapi wildcard method support
            if (routeData.method === "*") {
                // OPTIONS not supported by Swagger and HEAD not support by HAPI
                ["GET", "POST", "PUT", "PATCH", "DELETE"].forEach(method => {
                    const newRoute = Hoek.clone(routeData);

                    newRoute.method = method.toUpperCase();
                    routesData.push(newRoute);
                });
            } else {
                routesData.push(routeData);
            }
        });

        return this.buildRoutes(routesData);
    }

    /**
     * build the swagger path section from hapi routes data
     *
     * @param  {Object} setting
     * @param  {Object} routes
     * @return {Object}
     */
    public buildRoutes(routes) {
        const pathObj = {};
        const swagger = {
            definitions: {},
            "x-alt-definitions": {},
            paths: pathObj
        };
        const definitionCache = [new WeakMap(), new WeakMap()];

        // reset properties
        this.properties = new Properties(
            this.settings,
            swagger.definitions,
            swagger["x-alt-definitions"],
            definitionCache
        );
        this.responses = new Responses(
            this.settings,
            swagger.definitions,
            swagger["x-alt-definitions"],
            definitionCache
        );

        routes.forEach(route => {
            const method = route.method;
            let path = this.removeBasePath(route.path, this.settings.basePath, this.settings.pathReplacements);
            const out = {
                summary: route.description,
                operationId: route.id || Utilities.createId(route.method, path),
                description: route.notes,
                parameters: [],
                consumes: [],
                produces: [],
                tags: undefined,
                security: undefined,
                responses: undefined,
                deprecated: undefined
            };

            // tags in swagger are used for grouping
            if (this.settings.grouping === "tags") {
                out.tags = route.tags.filter(this.settings.tagsGroupingFilter);
            } else {
                out.tags = route.groups;
            }

            out.description = Array.isArray(route.notes) ? route.notes.join("<br/><br/>") : route.notes;

            if (route.security) {
                out.security = route.security;
            }

            // set from plugin options or from route options
            const payloadType = this.overload(this.settings.payloadType, route.payloadType);

            // build payload either with JSON or form input
            let payloadStructures = Paths.getDefaultStructures();
            const payloadJoi = this.getJOIObj(route, "payloadParams");
            if (payloadType.toLowerCase() === "json") {
                // set as json
                payloadStructures = this.getSwaggerStructures(payloadJoi, "body", true, false);
            } else {
                // set as formData
                if (Utilities.hasJoiChildren(payloadJoi)) {
                    payloadStructures = this.getSwaggerStructures(payloadJoi, "formData", false, false);
                } else {
                    this.testParameterError(payloadJoi, "payload form-urlencoded", path);
                }
                // add form data mimetype
                out.consumes = ["application/x-www-form-urlencoded"];
            }

            // change form mimetype based on meta property 'swaggerType'
            if (this.hasFileType(route)) {
                out.consumes = ["multipart/form-data"];
            }

            // add user defined over automaticlly discovered
            if (this.settings.consumes || route.consumes) {
                out.consumes = this.overload(this.settings.consumes, route.consumes);
            }

            if (this.settings.produces || route.produces) {
                out.produces = this.overload(this.settings.produces, route.produces);
            }

            // set required true/false for each path params
            // var pathParams = this.properties.toParameters (this.getJOIObj(route, 'pathParams'), 'path', false);
            let pathStructures = Paths.getDefaultStructures();
            const pathJoi = this.getJOIObj(route, "pathParams");
            if (Utilities.hasJoiChildren(pathJoi)) {
                pathStructures = this.getSwaggerStructures(pathJoi, "path", false, false);
                pathStructures.parameters.forEach(item => {
                    // add required based on path pattern {prama} and {prama?}
                    if (item.required === undefined) {
                        if (path.indexOf("{" + item.name + "}") > -1) {
                            item.required = true;
                        }
                        if (path.indexOf("{" + item.name + "?}") > -1) {
                            delete item.required;
                        }
                    }
                    if (item.required === false) {
                        delete item.required;
                    }
                    if (!item.required) {
                        this.settings.log(
                            ["validation", "warning"],
                            "The " +
                                path +
                                " params parameter {" +
                                item.name +
                                "} is set as optional. This will work in the UI, but is invalid in the swagger spec"
                        );
                    }
                });
            } else {
                this.testParameterError(pathJoi, "params", path);
            }

            // removes ? from {prama?} after we have set required/optional for path params
            path = this.cleanPathParameters(path);

            // let headerParams = this.properties.toParameters (this.getJOIObj(route, 'headerParams'), 'header', false);
            let headerStructures = Paths.getDefaultStructures();
            const headerJoi = this.getJOIObj(route, "headerParams");
            if (Utilities.hasJoiChildren(headerJoi)) {
                headerStructures = this.getSwaggerStructures(headerJoi, "header", false, false);
            } else {
                this.testParameterError(headerJoi, "headers", path);
            }
            // if the API has a user set accept header with a enum convert into the produces array
            if (this.settings.acceptToProduce === true) {
                headerStructures.parameters = headerStructures.parameters.filter(header => {
                    if (header.name.toLowerCase() === "accept") {
                        if (header.enum) {
                            out.produces = Utilities.sortFirstItem(header.enum, header.default);
                            return false;
                        }
                    }
                    return true;
                });
            }

            let queryStructures = Paths.getDefaultStructures();
            const queryJoi = this.getJOIObj(route, "queryParams");
            if (Utilities.hasJoiChildren(queryJoi)) {
                queryStructures = this.getSwaggerStructures(queryJoi, "query", false, false);
            } else {
                this.testParameterError(queryJoi, "query", path);
            }

            out.parameters = out.parameters.concat(
                headerStructures.parameters,
                pathStructures.parameters,
                queryStructures.parameters,
                payloadStructures.parameters
            );

            // if the api sets the content-type header pramater use that
            if (this.hasContentTypeHeader(out)) {
                delete out.consumes;
            }

            // let name = out.operationId + method;
            // userDefindedSchemas, defaultSchema, statusSchemas, useDefinitions, isAlt
            out.responses = this.responses.build(
                route.responses,
                route.responseSchema,
                route.responseStatus,
                true,
                false
            );

            if (route.order) {
                out["x-order"] = route.order;
            }

            Utilities.assignVendorExtensions(out, route);

            if (route.deprecated !== null) {
                out.deprecated = route.deprecated;
            }

            if (!pathObj[path]) {
                pathObj[path] = {};
            }
            pathObj[path][method.toLowerCase()] = Utilities.deleteEmptyProperties(out);
        });

        swagger.paths = pathObj;
        return swagger;
    }

    /**
     * gets the JOI object from route object
     *
     * @param  {Object} base
     * @param  {String} name
     * @return {Object}
     */
    public getJOIObj(route, name) {
        const prama = route[name];
        //  if (Utilities.hasJoiChildren(route[name])) {
        //      prama = route[name]._inner.children;
        //  }
        return prama;
    }

    /**
     * overload one object with another
     *
     * @param  {Object} base
     * @param  {Object} priority
     * @return {Object}
     */
    public overload(base, priority) {
        return priority ? priority : base;
    }

    /**
     * does route have property swaggerType of file
     *
     * @param  {Object} route
     * @return {Boolean}
     */
    public hasFileType(route) {
        const routeString = JSON.stringify(route, (key, value) => {
            // _currentJoi is a circular reference, introduced in Joi v11.0.0
            return key === "_currentJoi" ? undefined : value;
        });
        return routeString.indexOf("swaggerType") > -1;
    }

    /**
     * clear path parameters of optional char flag
     *
     * @param  {String} path
     * @return {String}
     */
    public cleanPathParameters(path) {
        return path.replace("?}", "}");
    }
    /**
     * remove the base path from endpoint
     *
     * @param  {String} path
     * @param  {String} basePath
     * @param  {Array} pathReplacements
     * @return {String}
     */
    public removeBasePath(path, basePath, pathReplacements) {
        if (basePath !== "/" && Utilities.startsWith(path, basePath)) {
            path = path.replace(basePath, "");
            path = Utilities.replaceInPath(path, ["endpoints"], pathReplacements);
        }
        return path;
    }

    /**
     * does path parameters have a content-type header
     *
     * @param  {String} path
     * @return {boolean}
     */
    public hasContentTypeHeader(path) {
        let out = false;
        path.parameters.forEach(prama => {
            if (prama.in === "header" && prama.name.toLowerCase() === "content-type") {
                out = true;
            }
        });
        return out;
    }

    /**
     * builds an object containing different swagger structures that can be use to represent one object
     *
     * @param  {Object} joiObj
     * @param  {String} parameterType
     * @param  {Boolean} useDefinitions
     * @param  {Boolean} isAlt
     * @return {Object}
     */
    public getSwaggerStructures(joiObj, parameterType, useDefinitions, isAlt) {
        let outProperties;
        let outParameters;

        if (joiObj) {
            // name, joiObj, parent, parameterType, useDefinitions, isAlt
            outProperties = this.properties.parseProperty(null, joiObj, null, parameterType, useDefinitions, isAlt);
            outParameters = Parameters.fromProperties(outProperties, parameterType);
        }
        const out = {
            properties: outProperties || {},
            parameters: outParameters || []
        };
        return out;
    }

    public testParameterError(joiObj, parameterType, path) {
        if (joiObj && !Utilities.hasJoiChildren(joiObj)) {
            this.settings.log(
                ["validation", "error"],
                "The " +
                    path +
                    " route " +
                    parameterType +
                    " parameter was set, but not as a Joi.object() with child properties"
            );
        }
    }
}
