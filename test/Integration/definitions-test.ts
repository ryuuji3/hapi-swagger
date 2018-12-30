import { expect } from "code";
import * as Hapi from "hapi";
import Joi from "joi";
import { script } from "lab";
import { IPluginOptions } from "../../src/defaults";
import * as Validate from "../../src/validate";
import * as Helper from "../helper";

export const lab = script();

lab.experiment("definitions", () => {
    const routes: Hapi.ServerRoute[] = [
        {
            method: "POST",
            path: "/test/",
            options: {
                handler: Helper.defaultHandler,
                tags: ["api"],
                validate: {
                    payload: {
                        a: Joi.number()
                            .required()
                            .description("the first number"),

                        b: Joi.number()
                            .required()
                            .description("the second number"),

                        operator: Joi.string()
                            .required()
                            .default("+")
                            .description("the opertator i.e. + - / or *"),

                        equals: Joi.number()
                            .required()
                            .description("the result of the sum")
                    }
                }
            }
        },
        {
            method: "POST",
            path: "/test/2",
            options: {
                handler: Helper.defaultHandler,
                tags: ["api"],
                validate: {
                    payload: Joi.object({
                        a: Joi.string(),
                        b: Joi.object({
                            c: Joi.string()
                        })
                    }).label("Model")
                }
            }
        },
        {
            method: "POST",
            path: "/test/3",
            options: {
                handler: Helper.defaultHandler,
                tags: ["api"],
                validate: {
                    payload: Joi.object({
                        a: Joi.string(),
                        b: Joi.object({
                            c: Joi.string()
                        })
                    }).label("Model 1")
                }
            }
        }
    ];

    lab.test("payload with inline definition", async () => {
        const response = await Helper.getSwaggerJSON(routes);
        const result = response.result as IPluginOptions;
        const definition = {
            properties: {
                a: {
                    description: "the first number",
                    type: "number"
                },
                b: {
                    description: "the second number",
                    type: "number"
                },
                operator: {
                    description: "the opertator i.e. + - / or *",
                    default: "+",
                    type: "string"
                },
                equals: {
                    description: "the result of the sum",
                    type: "number"
                }
            },
            required: ["a", "b", "operator", "equals"],
            type: "object"
        };

        expect(response.statusCode).to.equal(200);
        expect(result.paths["/test/"].post.parameters[0].schema).to.equal({
            $ref: "#/definitions/Model 1"
        });
        expect(result.definitions["Model 1"]).to.equal(definition);
        expect(await Validate.test(response.result)).to.be.true();
    });

    lab.test("override definition named Model", async () => {
        const response = await Helper.getSwaggerJSON(routes);
        const result = response.result as IPluginOptions;

        expect(result.definitions.b).to.exists();
        expect(result.definitions.Model).to.exists();
        expect(result.definitions["Model 1"]).to.exists();
        expect(await Validate.test(response.result)).to.be.true();
    });

    lab.test("reuseDefinitions = false", async () => {
        // forces two models even though the model hash is the same
        const tempRoutes: Hapi.ServerRoute[] = [
            {
                method: "POST",
                path: "/store1/",
                options: {
                    handler: Helper.defaultHandler,
                    tags: ["api"],
                    validate: {
                        payload: Joi.object({
                            a: Joi.number(),
                            b: Joi.number(),
                            operator: Joi.string(),
                            equals: Joi.number()
                        }).label("A")
                    }
                }
            },
            {
                method: "POST",
                path: "/store2/",
                options: {
                    handler: Helper.defaultHandler,
                    tags: ["api"],
                    validate: {
                        payload: Joi.object({
                            a: Joi.number(),
                            b: Joi.number(),
                            operator: Joi.string(),
                            equals: Joi.number()
                        }).label("B")
                    }
                }
            }
        ];
        const response = await Helper.getSwaggerJSON(tempRoutes, { reuseDefinitions: false });
        const result = response.result as IPluginOptions;

        expect(response.statusCode).to.equal(200);
        expect(result.definitions.A).to.exist();
        expect(result.definitions.B).to.exist();
        expect(await Validate.test(response.result)).to.be.true();
    });

    lab.test("definitionPrefix = useLabel", async () => {
        // use the label as a prefix for dynamic model names
        const tempRoutes: Hapi.ServerRoute[] = [
            {
                method: "POST",
                path: "/store1/",
                options: {
                    handler: Helper.defaultHandler,
                    tags: ["api"],
                    validate: {
                        payload: Joi.object({
                            a: Joi.number(),
                            b: Joi.number(),
                            operator: Joi.string(),
                            equals: Joi.number()
                        }).label("A")
                    }
                }
            },
            {
                method: "POST",
                path: "/store2/",
                options: {
                    handler: Helper.defaultHandler,
                    tags: ["api"],
                    validate: {
                        payload: Joi.object({
                            c: Joi.number(),
                            v: Joi.number(),
                            operator: Joi.string(),
                            equals: Joi.number()
                        }).label("A A")
                    }
                }
            },
            {
                method: "POST",
                path: "/store3/",
                options: {
                    handler: Helper.defaultHandler,
                    tags: ["api"],
                    validate: {
                        payload: Joi.object({
                            c: Joi.number(),
                            f: Joi.number(),
                            operator: Joi.string(),
                            equals: Joi.number()
                        }).label("A")
                    }
                }
            }
        ];
        const response = await Helper.getSwaggerJSON(tempRoutes, { definitionPrefix: "useLabel" });
        const result = response.result as IPluginOptions;

        expect(response.statusCode).to.equal(200);
        expect(result.definitions.A).to.exist();
        expect(result.definitions["A A"]).to.exist();
        expect(result.definitions["A 1"]).to.exist();
        expect(await Validate.test(response.result)).to.be.true();
    });

    lab.test("test that optional array is not in swagger output", async () => {
        const testRoutes: Hapi.ServerRoute[] = [
            {
                method: "POST",
                path: "/server/1/",
                options: {
                    handler: Helper.defaultHandler,
                    tags: ["api"],
                    validate: {
                        payload: Joi.object({
                            a: Joi.number().required(),
                            b: Joi.string().optional()
                        }).label("test")
                    }
                }
            }
        ];
        const response = await Helper.getSwaggerJSON(testRoutes);
        const result = response.result as IPluginOptions;
        const expected = {
            type: "object",
            properties: {
                a: {
                    type: "number"
                },
                b: {
                    type: "string"
                }
            },
            required: ["a"]
        };

        expect(response.statusCode).to.equal(200);
        expect(result.definitions.test).to.equal(expected);
    });

    lab.test("test that name changing for required", async () => {
        const FormDependencyDefinition = Joi.object({
            id: Joi.number().required()
        }).label("FormDependencyDefinition");
        const ActionDefinition = Joi.object({
            id: Joi.number()
                .required()
                .allow(null),
            reminder: FormDependencyDefinition.required()
        }).label("ActionDefinition");
        const testRoutes: Hapi.ServerRoute[] = [
            {
                method: "POST",
                path: "/server/",
                options: {
                    handler: Helper.defaultHandler,
                    tags: ["api"],
                    validate: {
                        payload: ActionDefinition
                    }
                }
            }
        ];
        const response = await Helper.getSwaggerJSON(testRoutes);
        const result = response.result as IPluginOptions;

        expect(response.statusCode).to.equal(200);
        expect(result.definitions.ActionDefinition).to.equal({
            type: "object",
            properties: {
                id: {
                    type: "number"
                },
                reminder: {
                    $ref: "#/definitions/FormDependencyDefinition"
                }
            },
            required: ["id", "reminder"]
        });
    });
});
