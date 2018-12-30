import { expect } from "code";
import * as Hapi from "hapi";
import { script } from "lab";
import { IPluginOptions } from "../../src/defaults";
import * as Validate from "../../src/validate";
import * as Helper from "../helper";

export const lab = script();

lab.experiment("tags", () => {
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

    lab.test("no tag objects passed", async () => {
        const response = await Helper.getSwaggerJSON(routes);
        const result = response.result as IPluginOptions;

        expect(response.statusCode).to.equal(200);
        expect(result.tags).to.equal([]);
        expect(await Validate.test(response.result)).to.be.true();
    });

    lab.test("name property passed", async () => {
        const swaggerOptions = {
            tags: [
                {
                    name: "test"
                }
            ]
        };
        const response = await Helper.getSwaggerJSON(routes, swaggerOptions);
        const result = response.result as IPluginOptions;

        expect(response.statusCode).to.equal(200);
        expect(result.tags[0].name).to.equal("test");
        expect(await Validate.test(response.result)).to.be.true();
    });

    lab.test("full tag object", async () => {
        const swaggerOptions = {
            tags: [
                {
                    name: "test",
                    description: "Everything about test",
                    externalDocs: {
                        description: "Find out more",
                        url: "http://swagger.io"
                    }
                }
            ]
        };
        const response = await Helper.getSwaggerJSON(routes, swaggerOptions);
        const result = response.result as IPluginOptions;

        expect(response.statusCode).to.equal(200);
        expect(result.tags).to.equal(swaggerOptions.tags);
        expect(await Validate.test(response.result)).to.be.true();
    });
});
