import { expect } from "code";
import * as Hapi from "hapi";
import { script } from "lab";
import { IPluginOptions } from "../../src/defaults";
import * as Validate from "../../src/validate";
import * as Helper from "../helper";

export const lab = script();

lab.experiment("filter", () => {
    const routes: Hapi.ServerRoute[] = [
        {
            method: "GET",
            path: "/actors",
            handler: Helper.defaultHandler,
            options: {
                tags: ["api"]
            }
        },
        {
            method: "GET",
            path: "/movies",
            handler: Helper.defaultHandler,
            options: {
                tags: ["api", "a"]
            }
        },
        {
            method: "GET",
            path: "/movies/movie",
            handler: Helper.defaultHandler,
            options: {
                tags: ["api", "b", "a"]
            }
        },
        {
            method: "GET",
            path: "/movies/movie/director",
            handler: Helper.defaultHandler,
            options: {
                tags: ["api", "a"]
            }
        },
        {
            method: "GET",
            path: "/movies/movie/actor",
            handler: Helper.defaultHandler,
            options: {
                tags: ["api", "c"]
            }
        },
        {
            method: "GET",
            path: "/movies/movie/actors",
            handler: Helper.defaultHandler,
            options: {
                tags: ["api", "d"]
            }
        }
    ];

    lab.test("filter by tags=a", async () => {
        const request = { method: "GET", url: "/swagger.json?tags=a" };
        const response = await Helper.getSwaggerResource(request, routes);
        const result = response.result as IPluginOptions;

        expect(response.statusCode).to.equal(200);
        expect(result.paths).to.have.length(3);
        expect(await Validate.test(response.result)).to.be.true();
    });

    lab.test("filter by tags=a,b,c,d", async () => {
        const request = { method: "GET", url: "/swagger.json?tags=a,b,c,d" };
        const response = await Helper.getSwaggerResource(request, routes);
        const result = response.result as IPluginOptions;

        expect(response.statusCode).to.equal(200);
        expect(result.paths).to.have.length(5);
        expect(await Validate.test(response.result)).to.be.true();
    });

    lab.test("filter by tags=a,c", async () => {
        const request = { method: "GET", url: "/swagger.json?tags=a,c" };
        const response = await Helper.getSwaggerResource(request, routes);
        const result = response.result as IPluginOptions;

        expect(response.statusCode).to.equal(200);
        expect(result.paths).to.have.length(4);
        expect(await Validate.test(response.result)).to.be.true();
    });

    lab.test("filter by tags=a,-b", async () => {
        const request = { method: "GET", url: "/swagger.json?tags=a,-b" };
        const response = await Helper.getSwaggerResource(request, routes);
        const result = response.result as IPluginOptions;

        expect(response.statusCode).to.equal(200);
        expect(result.paths).to.have.length(2);
        expect(await Validate.test(response.result)).to.be.true();
    });

    lab.test("filter by tags=a,+b", async () => {
        const request = { method: "GET", url: "/swagger.json?tags=a,%2Bb" }; // note %2B is a '+' plus char url encoded
        const response = await Helper.getSwaggerResource(request, routes);
        const result = response.result as IPluginOptions;

        expect(response.statusCode).to.equal(200);
        expect(result.paths).to.have.length(1);
        expect(await Validate.test(response.result)).to.be.true();
    });

    lab.test("filter by tags=a,+c", async () => {
        const request = { method: "GET", url: "/swagger.json?tags=a,%2Bc" }; // note %2B is a '+' plus char url encoded
        const response = await Helper.getSwaggerResource(request, routes);
        const result = response.result as IPluginOptions;

        expect(response.statusCode).to.equal(200);
        expect(result.paths).to.have.length(0);
        expect(await Validate.test(response.result)).to.be.true();
    });

    lab.test("filter by tags=x", async () => {
        const request = { method: "GET", url: "/swagger.json?tags=x" };
        const response = await Helper.getSwaggerResource(request, routes);
        const result = response.result as IPluginOptions;

        expect(response.statusCode).to.equal(200);
        expect(result.paths).to.have.length(0);
        expect(await Validate.test(response.result)).to.be.true();
    });
});
