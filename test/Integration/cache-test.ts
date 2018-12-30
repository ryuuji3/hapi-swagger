import { expect } from "code";
import * as Hapi from "hapi";
import Joi from "joi";
import { script } from "lab";
import * as Validate from "../../src/validate";
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

    lab.test("basic cache", async () => {
        const swaggerOptions = {
            cache: {
                expiresIn: 24 * 60 * 60 * 1000
            }
        };
        const request = { method: "GET", url: "/swagger.json" };
        const server = await Helper.createServer(swaggerOptions, routes);
        let response = await server.inject(request);

        expect(response.statusCode).to.equal(200);

        // double call to test code paths as cache works
        response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(await Validate.test(response.result)).to.be.true();
    });

    lab.test("cache with generateTimeout", async () => {
        const swaggerOptions = {
            cache: {
                expiresIn: 24 * 60 * 60 * 1000,
                generateTimeout: 30 * 1000
            }
        };
        const server = await Helper.createServer(swaggerOptions, routes);
        const response = await server.inject({ method: "GET", url: "/swagger.json" });

        expect(response.statusCode).to.equal(200);
        expect(await Validate.test(response.result)).to.be.true();
    });

    lab.test("model cache using weakmap", async () => {
        /*
         * test if a joi object weakmap cache
         * the Joi object should only be parsed once
         */
        const joiObj = Joi.object({
            a: Joi.number(),
            b: Joi.number(),
            operator: Joi.string(),
            equals: Joi.number()
        });
        const tempRoutes = [
            {
                method: "POST",
                path: "/store1/",
                options: {
                    handler: Helper.defaultHandler,
                    tags: ["api"],
                    validate: {
                        payload: joiObj
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
                        payload: joiObj
                    }
                }
            }
        ];
        const response = await Helper.getSwaggerJSON(tempRoutes);

        expect(response.statusCode).to.equal(200);
        expect(await Validate.test(response.result)).to.be.true();
    });
});
