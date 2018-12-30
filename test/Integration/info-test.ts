import { expect } from "code";
import * as Hapi from "hapi";
import { script } from "lab";
import { IPluginOptions } from "../../src/defaults";
import * as Validate from "../../src/validate";
import * as Helper from "../helper";

export const lab = script();

lab.experiment("info", () => {
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

    lab.test("no info object passed", async () => {
        const response = await Helper.getSwaggerJSON(routes);
        const result = response.result as IPluginOptions;
        const expected = { title: "API documentation", version: "0.0.1" };

        expect(response.statusCode).to.equal(200);
        expect(result.info).to.equal(expected);
        expect(await Validate.test(response.result)).to.be.true();
    });

    lab.test("no info title property passed", async () => {
        const swaggerOptions = {
            info: {}
        };
        const response = await Helper.getSwaggerJSON(routes, swaggerOptions);
        const result = response.result as IPluginOptions;

        expect(response.statusCode).to.equal(200);
        expect(result.info).to.equal({ title: "API documentation", version: "0.0.1" });
        expect(await Validate.test(response.result)).to.be.true();
    });

    lab.test("min valid info object", async () => {
        const swaggerOptions = {
            info: {
                title: "test title for lab",
                version: "0.0.1"
            }
        };
        const response = await Helper.getSwaggerJSON(routes, swaggerOptions);
        const result = response.result as IPluginOptions;

        expect(response.statusCode).to.equal(200);
        expect(result.info).to.equal(swaggerOptions.info);
        expect(await Validate.test(response.result)).to.be.true();
    });

    lab.test("full info object", async () => {
        const swaggerOptions = {
            info: {
                title: "Swagger Petstore",
                description: "This is a sample server Petstore server.",
                version: "1.0.0",
                termsOfService: "http://swagger.io/terms/",
                contact: {
                    email: "apiteam@swagger.io"
                },
                license: {
                    name: "Apache 2.0",
                    url: "http://www.apache.org/licenses/LICENSE-2.0.html"
                }
            }
        };
        const response = await Helper.getSwaggerJSON(routes, swaggerOptions);
        const result = response.result as IPluginOptions;

        expect(response.statusCode).to.equal(200);
        expect(result.info).to.equal(swaggerOptions.info);
        expect(await Validate.test(response.result)).to.be.true();
    });

    lab.test("info object with custom properties", async () => {
        const swaggerOptions = {
            info: {
                title: "test title for lab",
                version: "0.0.1",
                "x-custom": "custom"
            }
        };
        const response = await Helper.getSwaggerJSON(routes, swaggerOptions);
        const result = response.result as IPluginOptions;

        expect(response.statusCode).to.equal(200);
        expect(result.info).to.equal(swaggerOptions.info);
    });
});
