import { expect } from "code";
import * as Hapi from "hapi";
import Joi from "joi";
import { script } from "lab";
import * as Validate from "../../src/validate";
import * as Helper from "../helper";

export const lab = script();

lab.experiment("default `auth` settings", () => {
    const routes: Hapi.ServerRoute[] = [
        {
            method: "GET",
            path: "/",
            options: {
                auth: false,
                handler: () => {
                    return { text: "Token not required" };
                }
            }
        },
        {
            method: "GET",
            path: "/restricted",
            options: {
                auth: "jwt",
                tags: ["api"],
                plugins: {
                    "hapi-swagger": {
                        security: [{ jwt: [] }]
                    }
                },
                handler(request, h) {
                    h.response({ text: `You used a Token! ${(request.auth.credentials as any).name}` }).header(
                        "Authorization",
                        request.headers.authorization
                    );
                }
            }
        }
    ];

    lab.test("get documentation page should not be restricted", async () => {
        const response = await Helper.getSecureSwaggerResourceByJWT("/documentation", routes);

        expect(response.statusCode).to.equal(200);
    });

    lab.test("get documentation page should be restricted 401", async () => {
        const response = await Helper.getSecureSwaggerResourceByJWT("/documentation", routes, { auth: undefined });

        expect(response.statusCode).to.equal(401);
    });
});

lab.experiment("authentication", () => {
    // route using bearer token auth
    const routes: Hapi.ServerRoute = {
        method: "POST",
        path: "/bookmarks/",
        options: {
            handler: Helper.defaultAuthHandler,
            plugins: {
                "hapi-swagger": {
                    payloadType: "form"
                }
            },
            tags: ["api"],
            auth: "bearer",
            validate: {
                headers: Joi.object({
                    authorization: Joi.string()
                        .default("Bearer 12345")
                        .description("bearer token")
                }).unknown(),

                payload: {
                    url: Joi.string()
                        .required()
                        .description("the url to bookmark")
                }
            }
        }
    };

    lab.test("get plug-in interface with bearer token", async () => {
        const requestOptions = {
            method: "GET",
            url: "/swagger.json",
            headers: {
                authorization: "Bearer 12345"
            }
        };
        const response = await Helper.getSecureSwaggerResourceByBearerToken(requestOptions, routes);

        expect(response.statusCode).to.equal(200);
        expect(await Validate.test(response.result)).to.be.true();
    });

    lab.test("get plug-in interface without bearer token", async () => {
        // plugin routes should be not be affected by auth on API
        const response = await Helper.getSecureSwaggerResourceByBearerToken("/swagger.json", routes);

        expect(response.statusCode).to.equal(200);
        expect(await Validate.test(response.result)).to.be.true();
    });

    lab.test("get API interface with bearer token", async () => {
        const requestOptions = {
            method: "POST",
            url: "/bookmarks/",
            headers: {
                authorization: "Bearer 12345"
            },
            payload: {
                url: "http://glennjones.net"
            }
        };
        const response = await Helper.getSecureSwaggerResourceByBearerToken(requestOptions, routes);

        expect(response.statusCode).to.equal(200);
    });

    lab.test("get API interface with incorrect bearer token", async () => {
        const requestOptions = {
            method: "POST",
            url: "/bookmarks/",
            headers: {
                authorization: "Bearer XXXXXX"
            },
            payload: {
                url: "http://glennjones.net"
            }
        };
        const response = await Helper.getSecureSwaggerResourceByBearerToken(requestOptions, routes);

        expect(response.statusCode).to.equal(401);
    });
});
