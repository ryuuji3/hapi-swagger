import { expect } from "code";
import * as Hapi from "hapi";
import { script } from "lab";
import { IPluginOptions } from "../../src/defaults";
import * as Validate from "../../src/validate";
import * as Helper from "../helper";

export const lab = script();

lab.experiment("wildcard routes", () => {
    lab.test("method *", async () => {
        const routes: Hapi.ServerRoute = {
            method: "*",
            path: "/test",
            handler: Helper.defaultHandler,
            options: {
                tags: ["api"],
                notes: "test"
            }
        };
        const response = await Helper.getSwaggerJSON(routes);
        const result = response.result as IPluginOptions;

        expect(response.statusCode).to.equal(200);
        expect(result.paths["/test"]).to.have.length(5);
        expect(result.paths["/test"]).to.include("get");
        expect(result.paths["/test"]).to.include("post");
        expect(result.paths["/test"]).to.include("put");
        expect(result.paths["/test"]).to.include("patch");
        expect(result.paths["/test"]).to.include("delete");
    });

    lab.test("method array [GET, POST]", async () => {
        const routes = {
            method: ["GET", "POST"],
            path: "/test",
            handler: Helper.defaultHandler,
            config: {
                tags: ["api"],
                notes: "test"
            }
        };
        const response = await Helper.getSwaggerJSON(routes);
        const result = response.result as IPluginOptions;

        expect(response.statusCode).to.equal(200);
        expect(result.paths["/test"]).to.have.length(2);
        expect(result.paths["/test"]).to.include("get");
        expect(result.paths["/test"]).to.include("post");
        expect(await Validate.test(response.result)).to.be.true();
    });
});
