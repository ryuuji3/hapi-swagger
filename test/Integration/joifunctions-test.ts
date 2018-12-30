import { expect } from "code";
import * as Hapi from "hapi";
import { script } from "lab";
import { IPluginOptions } from "../../src/defaults";
import * as Validate from "../../src/validate";
import * as Helper from "../helper";

export const lab = script();

lab.experiment("validation", () => {
    const routes: Hapi.ServerRoute = {
        method: "POST",
        path: "/test",
        handler: Helper.defaultHandler,
        options: {
            description: "Add sum",
            notes: ["Adds a sum to the data store"],
            tags: ["api"],
            validate: {
                payload: async value => {
                    console.log("testing");
                    return value;
                },
                // params: async (value) => {

                //     console.log('testing');
                //     return value;
                // },
                query: async value => {
                    console.log("testing");
                    return value;
                },
                headers: async value => {
                    console.log("testing");
                    return value;
                }
            }
        }
    };

    lab.test("function not joi", async () => {
        const response = await Helper.getSwaggerJSON(routes);
        const result = response.result as IPluginOptions;

        expect(response.statusCode).to.equal(200);
        expect(result.paths["/test"].post.parameters).to.equal([
            {
                type: "string",
                name: "Hidden Model",
                in: "header"
            },
            {
                type: "string",
                name: "Hidden Model",
                in: "query"
            },
            {
                in: "body",
                name: "body",
                schema: {
                    $ref: "#/definitions/Hidden Model"
                }
            }
        ]);
        expect(result.definitions).to.equal({
            "Hidden Model": {
                type: "object"
            }
        });
        expect(await Validate.test(response.result)).to.be.true();
    });
});
