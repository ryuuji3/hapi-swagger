import { expect } from "code";
import * as Hapi from "hapi";
import Joi from "joi";
import { script } from "lab";
import { dereference } from "../../src/builder";
import { IPluginOptions } from "../../src/defaults";
import * as Validate from "../../src/validate";
import * as Helper from "../helper";

export const lab = script();

lab.experiment("dereference", () => {
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

    lab.test("flatten with no references", async () => {
        const response = await Helper.getSwaggerJSON(routes, { deReference: true });
        const result = response.result as IPluginOptions;
        const expected = [
            {
                in: "body",
                name: "body",
                schema: {
                    properties: {
                        a: {
                            type: "number"
                        },
                        b: {
                            type: "number"
                        },
                        operator: {
                            type: "string"
                        },
                        equals: {
                            type: "number"
                        }
                    },
                    type: "object"
                }
            }
        ];

        expect(response.statusCode).to.equal(200);
        expect(result.paths["/store/"].post.parameters).to.equal(expected);
        expect(await Validate.test(response.result)).to.be.true();
    });

    lab.test("dereferences error", async () => {
        try {
            await dereference(null);
        } catch (err) {
            expect(err).to.exists();
            expect(err.message).to.equal("failed to dereference schema");
        }
    });
});
