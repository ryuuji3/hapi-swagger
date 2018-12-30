import { expect } from "code";
import Joi from "joi";
import { script } from "lab";
import * as Validate from "../../src/validate";
import * as Helper from "../helper";

export const lab = script();

lab.experiment("alternatives", () => {
    const routes = [
        {
            method: "POST",
            path: "/store/",
            options: {
                handler: Helper.defaultHandler,
                tags: ["api"],
                validate: {
                    payload: Joi.alternatives()
                        .try(Joi.number(), Joi.string())
                        .label("Alt")
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
                    payload: Joi.alternatives()
                        .try(
                            Joi.object({
                                name: Joi.string().required()
                            }).label("alt1"),
                            Joi.object({
                                name: Joi.number().required()
                            }).label("alt2")
                        )
                        .label("Alt")
                },
                response: {
                    schema: Joi.alternatives()
                        .try(
                            Joi.object({
                                name: Joi.string().required()
                            }).label("alt1"),
                            Joi.object({
                                name: Joi.number().required()
                            }).label("alt2")
                        )
                        .label("Alt")
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
                    payload: Joi.alternatives()
                        .try(
                            Joi.object({
                                name: Joi.string().required()
                            }).label("Model A"),
                            Joi.object({
                                name: Joi.number().required()
                            }).label("Model B")
                        )
                        .label("Alt")
                }
            }
        },
        {
            method: "POST",
            path: "/store4/",
            options: {
                handler: Helper.defaultHandler,
                tags: ["api"],
                validate: {
                    payload: Joi.object({
                        type: Joi.string()
                            .valid("string", "number", "image")
                            .label("Type"),
                        data: Joi.alternatives()
                            .when("type", { is: "string", then: Joi.string() })
                            .when("type", { is: "number", then: Joi.number() })
                            .when("type", { is: "image", then: Joi.string().uri() })
                            .label("Typed Data"),
                        extra: Joi.alternatives()
                            .when("type", {
                                is: "image",
                                then: Joi.object({
                                    width: Joi.number(),
                                    height: Joi.number()
                                }).label("Dimensions"),
                                otherwise: Joi.forbidden()
                            })
                            .label("Extra")
                    })
                }
            }
        },
        {
            method: "POST",
            path: "/store5/",
            options: {
                handler: Helper.defaultHandler,
                tags: ["api"],
                validate: {
                    payload: Joi.object({
                        type: Joi.string()
                            .valid("string", "number", "image")
                            .label("Type"),
                        key: Joi.string().when("category", {
                            is: "stuff",
                            then: Joi.forbidden() // https://github.com/glennjones/hapi-swagger/issues/338
                        }),
                        data: Joi.alternatives()
                            .when("type", { is: "string", then: Joi.string() })
                            .when("type", { is: "number", then: Joi.number() })
                            .when("type", { is: "image", then: Joi.string().uri() })
                            .label("Typed Data"),
                        extra: Joi.alternatives()
                            .when("type", {
                                is: "image",
                                then: Joi.object({
                                    width: Joi.number(),
                                    height: Joi.number()
                                }).label("Dimensions"),
                                otherwise: Joi.forbidden()
                            })
                            .label("Extra")
                    })
                }
            }
        }
    ];

    lab.test("x-alternatives", async () => {
        const response = await Helper.getSwaggerJSON(routes);
        const { paths, definitions } = response.result as { paths: string[]; definitions: any };

        expect(response.statusCode).to.equal(200);
        expect(paths["/store/"].post.parameters).to.equal([
            {
                in: "body",
                schema: {
                    type: "number"
                },
                "x-alternatives": [
                    {
                        type: "number"
                    },
                    {
                        type: "string"
                    }
                ],
                name: "body"
            }
        ]);
        expect(paths["/store2/"].post.parameters).to.equal([
            {
                in: "body",
                name: "body",
                schema: {
                    $ref: "#/definitions/Alt"
                },
                "x-alternatives": [
                    {
                        $ref: "#/x-alt-definitions/alt1"
                    },
                    {
                        $ref: "#/x-alt-definitions/alt2"
                    }
                ]
            }
        ]);
        expect(paths["/store2/"].post.responses).to.equal({
            "200": {
                schema: {
                    $ref: "#/definitions/Alt",
                    "x-alternatives": [
                        {
                            $ref: "#/x-alt-definitions/alt1"
                        },
                        {
                            $ref: "#/x-alt-definitions/alt2"
                        }
                    ]
                },
                description: "Successful"
            }
        });
        expect(response.result["x-alt-definitions"].alt1).to.equal({
            type: "object",
            properties: {
                name: {
                    type: "string"
                }
            },
            required: ["name"]
        });
        expect(definitions["Model 1"]).to.equal({
            type: "object",
            properties: {
                type: {
                    type: "string",
                    enum: ["string", "number", "image"]
                },
                data: {
                    type: "string",
                    "x-alternatives": [
                        {
                            type: "string"
                        },
                        {
                            type: "number"
                        },
                        {
                            type: "string",
                            "x-format": {
                                uri: true
                            }
                        }
                    ]
                },
                extra: {
                    $ref: "#/definitions/Dimensions",
                    "x-alternatives": [
                        {
                            $ref: "#/x-alt-definitions/Dimensions"
                        }
                    ]
                }
            }
        });
        expect(await Validate.test(response.result)).to.be.true(); // test full swagger document
    });

    lab.test("no x-alternatives", async () => {
        const response = await Helper.getSwaggerJSON(routes, { xProperties: false });
        const { paths, definitions } = response.result as { paths: string[]; definitions: any };

        expect(response.statusCode).to.equal(200);
        expect(paths["/store/"].post.parameters).to.equal([
            {
                name: "body",
                in: "body",
                schema: {
                    type: "number"
                }
            }
        ]);
        expect(paths["/store2/"].post.parameters).to.equal([
            {
                name: "body",
                in: "body",
                schema: {
                    $ref: "#/definitions/Alt"
                }
            }
        ]);
        expect(paths["/store4/"].post.parameters).to.equal([
            {
                in: "body",
                name: "body",
                schema: {
                    $ref: "#/definitions/Model 1"
                }
            }
        ]);
        expect(definitions).to.equal({
            Alt: {
                properties: {
                    name: {
                        type: "string"
                    }
                },
                required: ["name"],
                type: "object"
            },
            Dimensions: {
                properties: {
                    width: {
                        type: "number"
                    },
                    height: {
                        type: "number"
                    }
                },
                type: "object"
            },
            "Model 1": {
                properties: {
                    type: {
                        type: "string",
                        enum: ["string", "number", "image"]
                    },
                    data: {
                        type: "string"
                    },
                    extra: {
                        $ref: "#/definitions/Dimensions"
                    }
                },
                type: "object"
            }
        });
        expect(await Validate.test(response.result)).to.be.true(); // test full swagger document
    });
});
