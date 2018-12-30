import { expect } from "code";
import * as Hapi from "hapi";
import { script } from "lab";
import * as Validate from "../../src/validate";
import * as Helper from "../helper";

export const lab = script();

lab.experiment("documentation-route-tags", () => {
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

    const testServer = async (swaggerOptions, tagName) => {
        const server = await Helper.createServer(swaggerOptions, routes);
        const response = await server.inject({ method: "GET", url: "/swagger.json" });
        const table = server.table();

        table.forEach(route => {
            switch (route.path) {
                case "/swagger.json":
                case "/swaggerui/extend.js":
                case "/swaggerui/{path*}":
                    expect(route.settings.tags).to.equal(tagName);
                    break;
                default:
                    break;
            }
        });

        expect(response.statusCode).to.equal(200);
        expect(await Validate.test(response.result)).to.be.true();
    };

    lab.test("no documentationRouteTags property passed", async () => {
        await testServer({}, []);
    });

    lab.test("documentationRouteTags property passed", async () => {
        const swaggerOptions = {
            documentationRouteTags: ["no-logging"]
        };

        await testServer(swaggerOptions, swaggerOptions.documentationRouteTags);
    });

    lab.test("multiple documentationRouteTags passed", async () => {
        const swaggerOptions = {
            documentationRouteTags: ["hello", "world"]
        };

        await testServer(swaggerOptions, swaggerOptions.documentationRouteTags);
    });
});
