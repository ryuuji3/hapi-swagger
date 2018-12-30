import Boom from "boom";
import H2o2 from "h2o2";
import Hapi, { ServerInjectOptions } from "hapi";
import BearerToken from "hapi-auth-bearer-token";
import Inert from "inert";
import Vision from "vision";
import Wreck from "wreck";
import { plugin as HapiSwagger } from "../src";
import { IPluginOptions } from "../src/defaults";

/**
 * creates a Hapi server
 *
 * @param  {Object} swaggerOptions
 * @param  {Object} routes
 * @param  {Function} callback
 */
export async function createServer(
    swaggerOptions?: Partial<IPluginOptions>,
    routes?: Hapi.ServerRoute | Hapi.ServerRoute[],
    serverOptions: Hapi.ServerOptions = {}
) {
    const server = new Hapi.Server(serverOptions);

    try {
        await server.register([
            Inert,
            Vision,
            H2o2,
            {
                plugin: HapiSwagger,
                options: swaggerOptions
            }
        ]);

        if (routes) {
            server.route(routes);
        }

        await server.start();
        return server;
    } catch (e) {
        throw e;
    }
}

/**
 * creates a Hapi server using bearer token auth
 *
 * @param  {Object} swaggerOptions
 * @param  {Object} routes
 * @param  {Function} callback
 */
export async function createAuthServer(swaggerOptions, routes, serverOptions = {}) {
    const server = new Hapi.Server(serverOptions);

    await server.register([
        Inert,
        Vision,
        H2o2,
        BearerToken,
        {
            plugin: HapiSwagger,
            options: swaggerOptions
        }
    ]);

    server.auth.strategy("bearer", "bearer-access-token", {
        accessTokenName: "access_token",
        validate: validateBearer
    });
    server.route(routes);

    await server.start();

    return server;
}

/**
 * creates a Hapi server using JWT auth
 *
 * @param  {Object} swaggerOptions
 * @param  {Object} routes
 * @param  {Function} callback
 */
export async function createJWTAuthServer(swaggerOptions = {}, routes) {
    const people = {
        56732: {
            id: 56732,
            name: "Jen Jones",
            scope: ["a", "b"]
        }
    };
    const privateKey = "hapi hapi joi joi";
    // const token = JWT.sign({ id: 56732 }, privateKey, { algorithm: 'HS256' });
    const validateJWT = decoded => {
        if (!people[decoded.id]) {
            return { valid: false };
        }

        return { valid: true };
    };

    const server = new Hapi.Server();

    await server.register([
        Inert,
        Vision,
        require("hapi-auth-jwt2"),
        {
            plugin: HapiSwagger,
            options: swaggerOptions
        }
    ]);

    server.auth.strategy("jwt", "jwt", {
        key: privateKey,
        validate: validateJWT,
        verifyOptions: { algorithms: ["HS256"] }
    });

    server.auth.default("jwt");

    server.route(routes);
    await server.start();
    return server;
}

/**
 * a handler function used to mock a response
 *
 * @param  {Object} request
 * @param  {Object} reply
 */
export function defaultHandler() {
    return "ok";
}

/**
 * a handler function used to mock a response to a authorized request
 *
 * @param  {Object} request
 * @param  {Object} reply
 */
export function defaultAuthHandler(request) {
    if (request.auth && request.auth.credentials && request.auth.credentials.user) {
        return request.auth.credentials.user;
    } else {
        return Boom.unauthorized("unauthorized access", [request.auth.strategy]);
    }
}

/**
 * a validation function for bearer strategy
 *
 * @param  {String} token
 * @param  {Function} callback
 */
export async function validateBearer(request, token) {
    return {
        isValid: token === "12345",
        credentials: {
            token,
            user: {
                username: "glennjones",
                name: "Glenn Jones",
                groups: ["admin", "user"]
            }
        }
    };
}

/**
 * fires a HAPI reply with json payload - see h2o2 onResponse function signature
 *
 * @param  {Object} err
 * @param  {Object} res
 * @param  {Object} request
 * @param  {Object} reply
 * @param  {Object} settings
 * @param  {Int} ttl
 */
export async function replyWithJSON(err, res) {
    const { payload } = await Wreck.read(res, { json: true });
    return payload;
}

/**
 * creates an object with properties which are not its own
 *
 * @return {Object}
 */
export function objWithNoOwnProperty() {
    // tslint:disable only-arrow-functions no-empty
    const sides = { a: 1, b: 2, c: 3 };
    const Triangle = function() {};
    // tslint:enable
    Triangle.prototype = sides;

    return new Triangle();
}

/**
 * @param server
 * @param requestOrUrl
 */
async function injectRequest(
    server: Hapi.Server,
    requestOrUrl: string | ServerInjectOptions = { method: "GET", url: "/" }
) {
    if (typeof requestOrUrl === "string") {
        return server.inject({
            method: "GET",
            url: requestOrUrl
        });
    } else {
        return server.inject(requestOrUrl);
    }
}

/**
 * Creates server instance from specified options and then performs specified GET request.
 *
 * @param requestOrUrl
 * @param routes
 * @param pluginOptions
 * @param serverOptions
 *
 * @returns server response
 */
export async function getSwaggerResource(
    requestOrUrl: string | ServerInjectOptions,
    routes?: Hapi.ServerRoute | Hapi.ServerRoute[],
    pluginOptions?: Partial<IPluginOptions>,
    serverOptions?: Hapi.ServerOptions
) {
    const server = await createServer(pluginOptions, routes, serverOptions);

    return injectRequest(server, requestOrUrl);
}

/**
 * Creates JWT auth server instance from specified options and then performs specified GET request.
 *
 * @param pluginOptions
 * @param routes
 * @param url path to resource (ie. url)
 *
 * @returns server response
 */
export async function getSecureSwaggerResourceByJWT(
    requestOrUrl: string | ServerInjectOptions,
    routes?: Hapi.ServerRoute | Hapi.ServerRoute[],
    pluginOptions?: Partial<IPluginOptions>
) {
    const server = await createJWTAuthServer(pluginOptions, routes);

    return injectRequest(server, requestOrUrl);
}

/**
 * Creates Bearer auth server instance from specified options and then performs specified GET request.
 *
 * @param pluginOptions
 * @param routes
 * @param url path to resource (ie. url)
 *
 * @returns server response
 */
export async function getSecureSwaggerResourceByBearerToken(
    requestOrUrl: string | ServerInjectOptions,
    routes?: Hapi.ServerRoute | Hapi.ServerRoute[],
    pluginOptions?: Partial<IPluginOptions>
) {
    const server = await createAuthServer(pluginOptions, routes);

    return injectRequest(server, requestOrUrl);
}

/**
 * Wrapper for getSwaggerResource that retrieve swagger.json
 *
 * @param pluginOptions
 * @param routes
 */
export async function getSwaggerJSON(
    routes?: Hapi.ServerRoute | Hapi.ServerRoute[],
    pluginOptions?: Partial<IPluginOptions>,
    serverOptions?: Hapi.ServerOptions
) {
    return getSwaggerResource("/swagger.json", routes, pluginOptions);
}
