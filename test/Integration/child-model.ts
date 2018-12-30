"use strict";
import { expect } from "code";
import * as Hapi from "hapi";
import Joi from "joi";
import { script } from "lab";
import { IPluginOptions } from "../../src/defaults";
import * as Validate from "../../src/validate";
import * as Helper from "../helper";

export const lab = script();

lab.experiment("child-models", () => {
    const requestOptions = {
        method: "GET",
        url: "/swagger.json",
        headers: {
            host: "localhost"
        }
    };
    const routes: Hapi.ServerRoute[] = [
        {
            method: "POST",
            path: "/foo/v1/bar",
            options: {
                description: "...",
                tags: ["api"],
                validate: {
                    payload: Joi.object({
                        outer1: Joi.object({
                            inner1: Joi.string()
                        }),
                        outer2: Joi.object({
                            inner2: Joi.string()
                        })
                    })
                },
                // tslint:disable-next-line no-empty
                handler() {}
            }
        },
        {
            path: "/bar/objects",
            method: "POST",
            options: {
                // tslint:disable-next-line no-empty
                handler() {},
                tags: ["api"],
                response: {
                    schema: Joi.object()
                        .keys({
                            foos: Joi.object()
                                .keys({
                                    foo: Joi.string().description("some foo")
                                })
                                .label("FooObj")
                        })
                        .label("FooObjParent")
                },
                validate: {
                    payload: Joi.object()
                        .keys({
                            foos: Joi.object()
                                .keys({
                                    foo: Joi.string().description("some foo")
                                })
                                .label("FooObj")
                        })
                        .label("FooObjParent")
                }
            }
        },
        {
            path: "/bar/arrays",
            method: "POST",
            options: {
                // tslint:disable-next-line no-empty
                handler() {},
                tags: ["api"],
                response: {
                    schema: Joi.array()
                        .items(
                            Joi.array()
                                .items(Joi.object({ bar: Joi.string() }).label("FooArrObj"))
                                .label("FooArr")
                        )
                        .label("FooArrParent")
                },
                validate: {
                    payload: Joi.array()
                        .items(
                            Joi.array()
                                .items(Joi.object({ bar: Joi.string() }).label("FooArrObj"))
                                .label("FooArr")
                        )
                        .label("FooArrParent")
                }
            }
        }
    ];

    lab.test("child definitions models", async () => {
        const response = await Helper.getSwaggerResource(requestOptions, routes);
        const result = response.result as IPluginOptions;

        expect(response.statusCode).to.equal(200);
        expect(result.paths["/foo/v1/bar"].post.parameters[0].schema).to.equal({
            $ref: "#/definitions/Model 1"
        });
        expect(result.definitions["Model 1"]).to.equal({
            properties: {
                outer1: {
                    $ref: "#/definitions/outer1"
                },
                outer2: {
                    $ref: "#/definitions/outer2"
                }
            },
            type: "object"
        });
        expect(result.definitions.outer1).to.equal({
            properties: {
                inner1: {
                    type: "string"
                }
            },
            type: "object"
        });
        expect(await Validate.test(response.result)).to.be.true();
    });

    lab.test("object within an object - array within an array", async () => {
        const response = await Helper.getSwaggerResource(requestOptions, routes);
        const result = response.result as IPluginOptions;

        expect(response.statusCode).to.equal(200);
        expect(result.paths["/bar/objects"].post.parameters[0].schema).to.equal({
            $ref: "#/definitions/FooObjParent"
        });
        expect(result.paths["/bar/objects"].post.responses[200].schema).to.equal({
            $ref: "#/definitions/FooObjParent"
        });
        expect(result.definitions.FooObjParent).to.equal({
            type: "object",
            properties: {
                foos: {
                    $ref: "#/definitions/FooObj"
                }
            }
        });
        expect(result.definitions.FooObj).to.equal({
            type: "object",
            properties: {
                foo: {
                    type: "string",
                    description: "some foo"
                }
            }
        });
        expect(result.paths["/bar/arrays"].post.parameters[0].schema).to.equal({
            $ref: "#/definitions/FooArrParent"
        });
        expect(result.paths["/bar/arrays"].post.responses[200].schema).to.equal({
            $ref: "#/definitions/FooArrParent"
        });
        expect(result.definitions.FooArrParent).to.equal({
            type: "array",
            items: {
                $ref: "#/definitions/FooArr"
            }
        });
        expect(result.definitions.FooArr).to.equal({
            type: "array",
            items: {
                $ref: "#/definitions/FooArrObj"
            }
        });
        expect(result.definitions.FooArrObj).to.equal({
            type: "object",
            properties: {
                bar: {
                    type: "string"
                }
            }
        });
        expect(await Validate.test(response.result)).to.be.true();
    });
});
