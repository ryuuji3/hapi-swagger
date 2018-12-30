import { expect } from "code";
import * as Hapi from "hapi";
import Joi from "joi";
import { script } from "lab";
import { IPluginOptions } from "../../src/defaults";
import * as Validate from "../../src/validate";
import * as Helper from "../helper";

export const lab = script();

const routes: Hapi.ServerRoute[] = [
    {
        method: "GET",
        path: "/test",
        handler: Helper.defaultHandler,
        options: {
            tags: ["api"]
        }
    }
];

const xPropertiesRoutes: Hapi.ServerRoute[] = [
    {
        method: "POST",
        path: "/test",
        handler: Helper.defaultHandler,
        options: {
            tags: ["api"],
            validate: {
                payload: {
                    number: Joi.number().greater(10),
                    string: Joi.string().alphanum(),
                    array: Joi.array()
                        .items(Joi.string())
                        .length(2)
                }
            }
        }
    }
];

const reuseModelsRoutes: Hapi.ServerRoute[] = [
    {
        method: "POST",
        path: "/test",
        handler: Helper.defaultHandler,
        options: {
            tags: ["api"],
            validate: {
                payload: {
                    a: Joi.object({ a: Joi.string() }),
                    b: Joi.object({ a: Joi.string() })
                }
            }
        }
    }
];

lab.experiment("builder", () => {
    lab.test("defaults for swagger root object properties", async () => {
        const response = await Helper.getSwaggerJSON(routes);
        const result = response.result as IPluginOptions; // TODO: This is not the right type; IPluginOptions just happens to mirror this

        expect(response.statusCode).to.equal(200);
        expect(result.swagger).to.equal("2.0");
        expect(result.schemes).to.equal(["http"]);
        expect(result.basePath).to.equal("/");
        expect(result.consumes).to.not.exist();
        expect(result.produces).to.not.exist();
        expect(await Validate.test(response.result)).to.be.true();
    });

    lab.test("set values for swagger root object properties", async () => {
        const swaggerOptions: Partial<IPluginOptions> = {
            swagger: "5.9.45",
            schemes: ["https"],
            basePath: "/base",
            consumes: ["application/x-www-form-urlencoded"],
            produces: ["application/json", "application/xml"],
            externalDocs: {
                description: "Find out more about HAPI",
                url: "http://hapijs.com"
            },
            "x-custom": "custom"
        };
        const response = await Helper.getSwaggerJSON(routes, swaggerOptions);
        const result = response.result as IPluginOptions;

        expect(response.statusCode).to.equal(200);
        expect(result.swagger).to.equal("2.0");
        expect(result.schemes).to.equal(["https"]);
        expect(result.basePath).to.equal("/base");
        expect(result.consumes).to.equal(["application/x-www-form-urlencoded"]);
        expect(result.produces).to.equal(["application/json", "application/xml"]);
        expect(result.externalDocs).to.equal(swaggerOptions.externalDocs);
        expect(result["x-custom"]).to.equal("custom");
        expect(await Validate.test(response.result)).to.be.true();
    });

    lab.test("xProperties : false", async () => {
        const response = await Helper.getSwaggerJSON(xPropertiesRoutes, { xProperties: false });
        const result = response.result as IPluginOptions;

        expect(response.statusCode).to.equal(200);
        expect(result.definitions).to.equal({
            array: {
                type: "array",
                items: {
                    type: "string"
                }
            },
            "Model 1": {
                type: "object",
                properties: {
                    number: {
                        type: "number"
                    },
                    string: {
                        type: "string"
                    },
                    array: {
                        $ref: "#/definitions/array"
                    }
                }
            }
        });
        expect(await Validate.test(response.result)).to.be.true();
    });

    lab.test("xProperties : true", async () => {
        const response = await Helper.getSwaggerJSON(xPropertiesRoutes, { xProperties: true });
        const result = response.result as IPluginOptions;

        expect(response.statusCode).to.equal(200);
        expect(result.definitions).to.equal({
            array: {
                type: "array",
                "x-constraint": {
                    length: 2
                },
                items: {
                    type: "string"
                }
            },
            "Model 1": {
                type: "object",
                properties: {
                    number: {
                        type: "number",
                        "x-constraint": {
                            greater: 10
                        }
                    },
                    string: {
                        type: "string",
                        "x-format": {
                            alphanum: true
                        }
                    },
                    array: {
                        $ref: "#/definitions/array"
                    }
                }
            }
        });
        expect(await Validate.test(response.result)).to.be.true();
    });

    lab.test("reuseDefinitions : true", async () => {
        const response = await Helper.getSwaggerJSON(reuseModelsRoutes, { reuseDefinitions: true });
        const result = response.result as IPluginOptions;

        expect(response.statusCode).to.equal(200);
        expect(result.definitions).to.equal({
            a: {
                type: "object",
                properties: {
                    a: {
                        type: "string"
                    }
                }
            },
            "Model 1": {
                type: "object",
                properties: {
                    a: {
                        $ref: "#/definitions/a"
                    },
                    b: {
                        $ref: "#/definitions/a"
                    }
                }
            }
        });
        expect(await Validate.test(response.result)).to.be.true();
    });

    lab.test("reuseDefinitions : false", async () => {
        const response = await Helper.getSwaggerJSON(reuseModelsRoutes, { reuseDefinitions: false });
        const result = response.result as IPluginOptions;

        expect(response.statusCode).to.equal(200);
        expect(result.definitions).to.equal({
            a: {
                type: "object",
                properties: {
                    a: {
                        type: "string"
                    }
                }
            },
            b: {
                type: "object",
                properties: {
                    a: {
                        type: "string"
                    }
                }
            },
            "Model 1": {
                type: "object",
                properties: {
                    a: {
                        $ref: "#/definitions/a"
                    },
                    b: {
                        $ref: "#/definitions/b"
                    }
                }
            }
        });
        expect(await Validate.test(response.result)).to.be.true();
    });

    lab.test("getSwaggerJSON determines host and port from request info", async () => {
        const response = await Helper.getSwaggerResource({
            method: "GET",
            headers: { host: "194.418.15.24:7645" },
            url: "/swagger.json"
        });
        const result = response.result as IPluginOptions;

        expect(response.statusCode).to.equal(200);
        expect(result.host).to.equal("194.418.15.24:7645");
    });

    lab.test("getSwaggerJSON doesn't specify port from request info when port is default", async () => {
        const response = await Helper.getSwaggerResource({
            method: "GET",
            headers: { host: "194.418.15.24:80" },
            url: "/swagger.json"
        });
        const result = response.result as IPluginOptions;

        expect(response.statusCode).to.equal(200);
        expect(result.host).to.equal("194.418.15.24");
    });
});

lab.experiment("builder", () => {
    let logs = [];

    lab.before(async () => {
        const server = await Helper.createServer({ debug: true }, reuseModelsRoutes);

        return new Promise((resolve, reject) => {
            server.events.on("log", event => {
                logs = event.tags;

                if (((event.data as unknown) as string) === "PASSED - The swagger.json validation passed.") {
                    logs = event.tags;
                    resolve();
                } else {
                    reject();
                }
            });
            server.inject({ method: "GET", url: "/swagger.json" });
        });
    });

    lab.test("debug : true", () => {
        expect(logs).to.equal(["hapi-swagger", "validation", "info"]);
    });
});
