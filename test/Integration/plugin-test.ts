import { expect } from "code";
import * as Hapi from "hapi";
import Inert from "inert";
import Joi from "joi";
import { script } from "lab";
import Vision from "vision";
import { plugin as HapiSwagger } from "../../src";
import { IPluginOptions } from "../../src/defaults";
import * as Helper from "../helper";

export const lab = script();

lab.experiment("plugin", () => {
    const routes: Hapi.ServerRoute[] = [
        {
            method: "POST",
            path: "/store/",
            options: {
                handler: Helper.defaultHandler,
                tags: ["api"],
                validate: {
                    payload: {
                        a: Joi.number(),
                        b: Joi.number(),
                        operator: Joi.string(),
                        equals: Joi.number()
                    }
                }
            }
        }
    ];

    lab.test("plug-in register no vision dependency", async () => {
        try {
            const server = new Hapi.Server();

            await server.register([Inert, HapiSwagger]);
            server.route(routes);
            await server.start();
        } catch (err) {
            expect(err.message).to.equal("Plugin hapi-swagger missing dependency vision");
        }
    });

    lab.test("plug-in register no inert dependency", async () => {
        try {
            const server = new Hapi.Server();

            await server.register([Vision, HapiSwagger]);
            server.route(routes);
            await server.start();
        } catch (err) {
            expect(err.message).to.equal("Plugin hapi-swagger missing dependency inert");
        }
    });

    lab.test("plug-in register no options", async () => {
        try {
            const server = new Hapi.Server();

            await server.register([Inert, Vision, HapiSwagger]);
            server.route(routes);
            await server.start();

            expect(server).to.be.an.object();
        } catch (err) {
            expect(err).to.equal(undefined);
        }
    });

    lab.test("plug-in register test", async () => {
        const response = await Helper.getSwaggerJSON(routes);

        expect(response.statusCode).to.equal(200);
        expect((response.result as { paths: string[] }).paths).to.have.length(1);
    });

    lab.test("default jsonPath url", async () => {
        const response = await Helper.getSwaggerJSON(routes);

        expect(response.statusCode).to.equal(200);
    });

    lab.test("default documentationPath url", async () => {
        const response = await Helper.getSwaggerResource("/documentation", routes);

        expect(response.statusCode).to.equal(200);
    });

    lab.test("default swaggerUIPath url", async () => {
        const response = await Helper.getSwaggerResource("/swaggerui/swagger-ui.js", routes);

        expect(response.statusCode).to.equal(200);
    });

    lab.test("swaggerUIPath + extend.js remapping", async () => {
        const response = await Helper.getSwaggerResource("/swaggerui/extend.js", routes);

        expect(response.statusCode).to.equal(200);
    });

    const swaggerOptions = {
        jsonPath: "/test.json",
        documentationPath: "/testdoc",
        swaggerUIPath: "/testui/"
    };

    lab.test("repathed jsonPath url", async () => {
        const response = await Helper.getSwaggerResource("/test.json", routes, swaggerOptions);

        expect(response.statusCode).to.equal(200);
    });

    lab.test("repathed documentationPath url", async () => {
        const response = await Helper.getSwaggerResource("/testdoc", routes, swaggerOptions);

        expect(response.statusCode).to.equal(200);
    });

    lab.test("disable documentation path", async () => {
        const swaggerOptions = {
            documentationPage: false
        };
        const response = await Helper.getSwaggerResource("/documentation", routes, swaggerOptions);

        expect(response.statusCode).to.equal(404);
    });

    lab.test("disable swagger UI", async () => {
        const swaggerOptions = {
            swaggerUI: false,
            documentationPage: false
        };
        const response = await Helper.getSwaggerResource("/swaggerui/swagger-ui.js", routes, swaggerOptions);

        expect(response.statusCode).to.equal(404);
    });

    lab.test("disable swagger UI overriden by documentationPage", async () => {
        const swaggerOptions = {
            swaggerUI: false,
            documentationPage: true
        };
        const response = await Helper.getSwaggerResource("/swaggerui/swagger-ui.js", routes, swaggerOptions);

        expect(response.statusCode).to.equal(200);
    });

    lab.test("should take the plugin route prefix into account when rendering the UI", async () => {
        const server = new Hapi.Server();

        await server.register([
            Inert,
            Vision,
            {
                plugin: HapiSwagger,
                routes: {
                    prefix: "/implicitPrefix"
                },
                options: {}
            }
        ]);

        server.route(routes);
        await server.start();

        const response = await server.inject({ method: "GET", url: "/implicitPrefix/documentation" });

        expect(response.statusCode).to.equal(200);

        const htmlContent = response.result;

        expect(htmlContent).to.contain(["/implicitPrefix/swaggerui/swagger-ui.js", "/implicitPrefix/swagger.json"]);
    });

    lab.test("enable cors settings, should return headers with origin settings", async () => {
        const swaggerOptions = {
            cors: true
        };
        const response = await Helper.getSwaggerJSON(routes, swaggerOptions);
        const { paths } = response.result as { paths: string[] };

        expect(response.statusCode).to.equal(200);
        // https://stackoverflow.com/questions/25329405/why-isnt-vary-origin-response-set-on-a-cors-miss
        expect(response.headers.vary).to.equal("origin");
        expect((response.result as { paths: string[] }).paths["/store/"].post.parameters.length).to.equal(1);
        expect(paths["/store/"].post.parameters[0].name).to.equal("body");
    });

    lab.test("disable cors settings, should return headers without origin settings", async () => {
        const swaggerOptions = {
            cors: false
        };
        const response = await Helper.getSwaggerJSON(routes, swaggerOptions);
        const { paths } = response.result as { paths: string[] };

        expect(response.statusCode).to.equal(200);
        expect(response.headers.vary).to.not.equal("origin");
        expect(paths["/store/"].post.parameters.length).to.equal(1);
        expect(paths["/store/"].post.parameters[0].name).to.equal("body");
    });

    lab.test("default cors settings as false, should return headers without origin settings", async () => {
        const response = await Helper.getSwaggerJSON(routes);
        const { paths } = response.result as { paths: string[] };

        expect(response.statusCode).to.equal(200);
        expect(response.headers.vary).to.not.equal("origin,accept-encoding");
        expect(paths["/store/"].post.parameters.length).to.equal(1);
        expect(paths["/store/"].post.parameters[0].name).to.equal("body");
    });

    lab.test("payloadType = form global", async () => {
        const swaggerOptions: Partial<IPluginOptions> = {
            payloadType: "json"
        };
        const response = await Helper.getSwaggerJSON(routes, swaggerOptions);
        const { paths } = response.result as { paths: string[] };

        expect(response.statusCode).to.equal(200);
        expect(paths["/store/"].post.parameters.length).to.equal(1);
        expect(paths["/store/"].post.parameters[0].name).to.equal("body");
    });

    lab.test("payloadType = json global", async () => {
        const swaggerOptions: Partial<IPluginOptions> = {
            payloadType: "form"
        };
        const response = await Helper.getSwaggerJSON(routes, swaggerOptions);
        const { paths } = response.result as { paths: string[] };

        expect(response.statusCode).to.equal(200);
        expect(paths["/store/"].post.parameters.length).to.equal(4);
        expect(paths["/store/"].post.parameters[0].name).to.equal("a");
    });

    lab.test("pathPrefixSize global", async () => {
        const swaggerOptions = {
            pathPrefixSize: 2
        };
        const prefixRoutes = [
            {
                method: "GET",
                path: "/foo/bar/extra",
                config: {
                    handler: Helper.defaultHandler,
                    tags: ["api"]
                }
            }
        ];
        const response = await Helper.getSwaggerJSON(prefixRoutes, swaggerOptions);
        const { paths } = response.result as { paths: string[] };

        expect(response.statusCode).to.equal(200);
        expect(paths["/foo/bar/extra"].get.tags[0]).to.equal("foo/bar");
    });

    lab.test("expanded none", async () => {
        // TODO: find a way to test impact of property change
        const response = await Helper.getSwaggerJSON(null, { expanded: "none" });

        expect(response.statusCode).to.equal(200);
    });

    lab.test("expanded list", async () => {
        const response = await Helper.getSwaggerJSON(null, { expanded: "list" });

        expect(response.statusCode).to.equal(200);
    });

    lab.test("expanded full", async () => {
        const response = await Helper.getSwaggerJSON(null, { expanded: "full" });

        expect(response.statusCode).to.equal(200);
    });

    lab.test("pass through of tags querystring", async () => {
        const response = await Helper.getSwaggerResource("/documentation?tags=reduced", routes);
        const result = (response.result as unknown) as string;

        expect(response.statusCode).to.equal(200);
        expect(result.indexOf("swagger.json?tags=reduced") > -1).to.equal(true);
    });

    lab.test("test route x-meta appears in swagger", async () => {
        const testRoutes: Hapi.ServerRoute[] = [
            {
                method: "POST",
                path: "/test/",
                options: {
                    handler: Helper.defaultHandler,
                    tags: ["api"],
                    plugins: {
                        "hapi-swagger": {
                            "x-meta": {
                                test1: true,
                                test2: "test",
                                test3: {
                                    test: true
                                }
                            }
                        }
                    }
                }
            }
        ];
        const response = await Helper.getSwaggerJSON(testRoutes);
        const { paths } = response.result as { paths: string[] };

        expect(paths["/test/"].post["x-meta"]).to.equal({
            test1: true,
            test2: "test",
            test3: {
                test: true
            }
        });
    });

    lab.test("test aribrary vendor extensions (x-*) appears in swagger", async () => {
        const testRoutes: Hapi.ServerRoute[] = [
            {
                method: "POST",
                path: "/test/",
                options: {
                    handler: Helper.defaultHandler,
                    tags: ["api"],
                    plugins: {
                        "hapi-swagger": {
                            "x-code-samples": {
                                lang: "JavaScript",
                                source: 'console.log("Hello World");'
                            },
                            "x-custom-string": "some string"
                        }
                    }
                }
            }
        ];
        const response = await Helper.getSwaggerJSON(testRoutes);
        const { paths } = response.result as { paths: string[] };

        expect(paths["/test/"].post["x-code-samples"]).to.equal({
            lang: "JavaScript",
            source: 'console.log("Hello World");'
        });
        expect(paths["/test/"].post["x-custom-string"]).to.equal("some string");
    });

    lab.test("test {disableDropdown: true} in swagger", async () => {
        const testRoutes: Hapi.ServerRoute[] = [
            {
                method: "POST",
                path: "/test/",
                options: {
                    handler: Helper.defaultHandler,
                    tags: ["api"],
                    validate: {
                        payload: {
                            a: Joi.number()
                                .integer()
                                .allow(0)
                                .meta({ disableDropdown: true })
                        }
                    }
                }
            }
        ];
        const response = await Helper.getSwaggerJSON(testRoutes);
        const { definitions } = response.result as { definitions: any };

        // console.log(JSON.stringify(response.result));
        expect(definitions).to.equal({
            "Model 1": {
                type: "object",
                properties: {
                    a: {
                        type: "integer",
                        "x-meta": {
                            disableDropdown: true
                        }
                    }
                }
            }
        });
    });
});
