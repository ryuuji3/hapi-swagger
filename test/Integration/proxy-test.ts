import { expect } from "code";
import * as Hapi from "hapi";
import Joi from "joi";
import { script } from "lab";
import { IPluginOptions } from "../../src/defaults";
import * as Validate from "../../src/validate";
import * as Helper from "../helper";

export const lab = script();

lab.experiment("proxies", () => {
    const requestOptions = {
        method: "GET",
        url: "/swagger.json",
        headers: {
            host: "localhost"
        }
    };

    const routes: Hapi.ServerRoute = {
        method: "GET",
        path: "/test",
        handler: Helper.defaultHandler,
        options: {
            tags: ["api"]
        }
    };

    lab.test("basePath option", async () => {
        const options = {
            basePath: "/v2"
        };
        const response = await Helper.getSwaggerResource(requestOptions, routes, options);
        const result = response.result as IPluginOptions;

        expect(response.statusCode).to.equal(200);
        expect(result.basePath).to.equal(options.basePath);
        expect(await Validate.test(response.result)).to.be.true();
    });

    lab.test("schemes and host options", async () => {
        const options = {
            schemes: ["https"],
            host: "testhost"
        };
        const response = await Helper.getSwaggerResource(requestOptions, routes, options);
        const result = response.result as IPluginOptions;

        expect(result.host).to.equal(options.host);
        expect(result.schemes).to.equal(options.schemes);
        expect(await Validate.test(response.result)).to.be.true();
    });

    lab.test("x-forwarded options", async () => {
        const request = {
            ...requestOptions,
            headers: {
                "x-forwarded-host": "proxyhost",
                "x-forwarded-proto": "https"
            }
        };
        const response = await Helper.getSwaggerResource(request, routes);
        const result = response.result as IPluginOptions;

        expect(result.host).to.equal(request.headers["x-forwarded-host"]);
        expect(result.schemes).to.equal(["https"]);
    });

    lab.test("Azure Web Sites options", async () => {
        const request = {
            ...requestOptions,
            headers: {
                "x-arr-ssl": "information about the SSL server certificate",
                "disguised-host": "requested-host",
                host: "internal-host"
            }
        };

        const response = await Helper.getSwaggerResource(request, routes);
        const result = response.result as IPluginOptions;

        expect(result.host).to.equal(request.headers["disguised-host"]);
        expect(result.schemes).to.equal(["https"]);
        expect(await Validate.test(response.result)).to.be.true();
    });

    lab.test("iisnode options", async () => {
        const pluginOptions = {};
        const serverOptions = {
            port: "\\\\.\\pipe\\GUID-expected-here"
        };
        const request = {
            ...requestOptions,
            headers: {
                "disguised-host": "requested-host",
                host: "internal-host"
            }
        };

        const server = await Helper.createServer(pluginOptions, routes, serverOptions);
        const response = await server.inject(request);
        const result = response.result as IPluginOptions;

        // Stop because otherwise consecutive test runs would error
        // with EADDRINUSE.
        await server.stop();

        expect(result.host).to.equal(request.headers["disguised-host"]);
        expect(result.schemes).to.equal(["http"]);
    });

    lab.test("adding facade for proxy using route options 1", async () => {
        const testRoutes: Hapi.ServerRoute = {
            method: "POST",
            path: "/tools/microformats/",
            options: {
                tags: ["api"],
                plugins: {
                    "hapi-swagger": {
                        nickname: "microformatsapi",
                        validate: {
                            payload: {
                                a: Joi.number()
                                    .required()
                                    .description("the first number"),
                                b: Joi.number()
                                    .required()
                                    .description("the first number")
                            },
                            query: {
                                testquery: Joi.string()
                            },
                            params: {
                                testparam: Joi.string()
                            },
                            headers: {
                                testheaders: Joi.string()
                            }
                        }
                    }
                },
                handler: {
                    proxy: {
                        host: "glennjones.net",
                        protocol: "http",
                        onResponse: Helper.replyWithJSON
                    }
                }
            }
        };
        const response = await Helper.getSwaggerResource(requestOptions, testRoutes);
        const result = response.result as IPluginOptions;
        const expected = [
            {
                type: "string",
                in: "header",
                name: "testheaders"
            },
            {
                type: "string",
                in: "path",
                name: "testparam"
            },
            {
                type: "string",
                in: "query",
                name: "testquery"
            },
            {
                in: "body",
                name: "body",
                schema: {
                    $ref: "#/definitions/Model 1"
                }
            }
        ];

        expect(result.paths["/tools/microformats/"].post.parameters).to.equal(expected);
    });

    lab.test("adding facade for proxy using route options 2 - naming", async () => {
        const testRoutes: Hapi.ServerRoute = {
            method: "POST",
            path: "/tools/microformats/",
            options: {
                tags: ["api"],
                plugins: {
                    "hapi-swagger": {
                        id: "microformatsapi",
                        validate: {
                            payload: Joi.object({
                                a: Joi.number()
                                    .required()
                                    .description("the first number")
                            }).label("testname")
                        }
                    }
                },
                handler: {
                    proxy: {
                        host: "glennjones.net",
                        protocol: "http",
                        onResponse: Helper.replyWithJSON
                    }
                }
            }
        };
        const response = await Helper.getSwaggerResource(requestOptions, testRoutes);
        const result = response.result as IPluginOptions;
        const expected = [
            {
                in: "body",
                name: "body",
                schema: {
                    $ref: "#/definitions/testname"
                }
            }
        ];

        expect(result.paths["/tools/microformats/"].post.parameters).to.equal(expected);
        expect(await Validate.test(response.result)).to.be.true();
    });

    lab.test("adding facade for proxy using route options 3 - defination reuse", async () => {
        const testRoutes: Hapi.ServerRoute[] = [
            {
                method: "POST",
                path: "/tools/microformats/1",
                options: {
                    tags: ["api"],
                    plugins: {
                        "hapi-swagger": {
                            id: "microformatsapi1",
                            validate: {
                                payload: Joi.object({
                                    a: Joi.number()
                                        .required()
                                        .description("the first number")
                                }).label("testname")
                            }
                        }
                    },
                    handler: {
                        proxy: {
                            host: "glennjones.net",
                            protocol: "http",
                            onResponse: Helper.replyWithJSON
                        }
                    }
                }
            },
            {
                method: "POST",
                path: "/tools/microformats/2",
                options: {
                    tags: ["api"],
                    plugins: {
                        "hapi-swagger": {
                            id: "microformatsapi2",
                            validate: {
                                payload: Joi.object({
                                    a: Joi.number()
                                        .required()
                                        .description("the first number")
                                }).label("testname")
                            }
                        }
                    },
                    handler: {
                        proxy: {
                            host: "glennjones.net",
                            protocol: "http",
                            onResponse: Helper.replyWithJSON
                        }
                    }
                }
            }
        ];
        const response = await Helper.getSwaggerResource(requestOptions, testRoutes);
        const result = response.result as IPluginOptions;
        const expected = {
            testname: {
                properties: {
                    a: {
                        type: "number",
                        description: "the first number"
                    }
                },
                required: ["a"],
                type: "object"
            }
        };

        expect(result.definitions).to.equal(expected);
    });

    lab.test("adding facade for proxy using route options 4 - defination name clash", async () => {
        const testRoutes: Hapi.ServerRoute[] = [
            {
                method: "POST",
                path: "/tools/microformats/1",
                options: {
                    tags: ["api"],
                    plugins: {
                        "hapi-swagger": {
                            id: "microformatsapi1",
                            validate: {
                                payload: Joi.object({
                                    a: Joi.number()
                                        .required()
                                        .description("the first number")
                                }).label("testname")
                            }
                        }
                    },
                    handler: {
                        proxy: {
                            host: "glennjones.net",
                            protocol: "http",
                            onResponse: Helper.replyWithJSON
                        }
                    }
                }
            },
            {
                method: "POST",
                path: "/tools/microformats/2",
                options: {
                    tags: ["api"],
                    plugins: {
                        "hapi-swagger": {
                            id: "microformatsapi2",
                            validate: {
                                payload: Joi.object({
                                    b: Joi.string().description("the string")
                                }).label("testname")
                            }
                        }
                    },
                    handler: {
                        proxy: {
                            host: "glennjones.net",
                            protocol: "http",
                            onResponse: Helper.replyWithJSON
                        }
                    }
                }
            }
        ];
        const response = await Helper.getSwaggerResource(requestOptions, testRoutes);
        const result = response.result as IPluginOptions;
        const expected = {
            testname: {
                properties: {
                    a: {
                        type: "number",
                        description: "the first number"
                    }
                },
                required: ["a"],
                type: "object"
            },
            "Model 1": {
                properties: {
                    b: {
                        type: "string",
                        description: "the string"
                    }
                },
                type: "object"
            }
        };

        expect(result.definitions).to.equal(expected);
    });
});
