import { expect } from "code";
import * as Hapi from "hapi";
import Inert from "inert";
import { script } from "lab";
import Vision from "vision";
import { plugin as HapiSwagger } from "../../src";
import { IPluginOptions } from "../../src/defaults";
import * as Validate from "../../src/validate";

export const lab = script();

const testPlugin: Hapi.Plugin<any> = {
    name: "grouping1",
    register: server => {
        server.route({
            method: "GET",
            path: "/grouping1",
            options: {
                handler: () => "Hi from grouping 1",
                description: "plugin1",
                tags: ["api", "hello group", "another group"]
            }
        });
    }
};

const swaggerOptions: Partial<IPluginOptions> = {
    schemes: ["http"],
    info: {
        title: "Test API Documentation",
        description: "This is a sample example of API documentation.",
        version: "1.0.0",
        termsOfService: "https://github.com/glennjones/hapi-swagger/",
        contact: {
            email: "glennjonesnet@gmail.com"
        },
        license: {
            name: "MIT",
            url: "https://raw.githubusercontent.com/glennjones/hapi-swagger/master/license.txt"
        }
    }
};

lab.experiment("default grouping", () => {
    lab.test("group by path", async () => {
        const server = await new Hapi.Server({});

        await server.register([
            Inert,
            Vision,
            {
                plugin: testPlugin
            },
            {
                plugin: HapiSwagger,
                options: swaggerOptions
            }
        ]);
        await server.start();

        const response = await server.inject({ method: "GET", url: "/swagger.json" });
        const result = response.result as IPluginOptions;

        expect(response.statusCode).to.equal(200);
        expect(result.paths["/grouping1"]).to.equal({
            get: {
                tags: ["grouping1"],
                responses: {
                    default: {
                        schema: {
                            type: "string"
                        },
                        description: "Successful"
                    }
                },
                operationId: "getGrouping1",
                summary: "plugin1"
            }
        });
        expect(await Validate.test(response.result)).to.be.true();
    });

    lab.experiment("tag grouping", async () => {
        lab.test("group by tags", async () => {
            const server = await new Hapi.Server({});
            const optionsGroupByTag = { ...swaggerOptions, grouping: "tags" };

            await server.register([
                Inert,
                Vision,
                testPlugin,
                {
                    plugin: HapiSwagger,
                    options: optionsGroupByTag
                }
            ]);
            await server.start();

            const response = await server.inject({ method: "GET", url: "/swagger.json" });
            const result = response.result as IPluginOptions;

            expect(response.statusCode).to.equal(200);
            expect(result.paths["/grouping1"]).to.equal({
                get: {
                    tags: ["hello group", "another group"],
                    responses: {
                        default: {
                            schema: {
                                type: "string"
                            },
                            description: "Successful"
                        }
                    },
                    operationId: "getGrouping1",
                    summary: "plugin1"
                }
            });
            expect(await Validate.test(response.result)).to.be.true();
        });
    });

    lab.experiment("tag grouping with tagsGroupingFilter", () => {
        lab.test("group by filtered tags", async () => {
            const server = await new Hapi.Server({});
            const optionsWithGroupingAndFilter = {
                ...swaggerOptions,
                grouping: "tags",
                tagsGroupingFilter: tag => tag === "hello group"
            };

            await server.register([
                Inert,
                Vision,
                testPlugin,
                {
                    plugin: HapiSwagger,
                    options: optionsWithGroupingAndFilter
                }
            ]);
            await server.start();

            const response = await server.inject({ method: "GET", url: "/swagger.json" });
            const result = response.result as IPluginOptions;

            expect(response.statusCode).to.equal(200);
            expect(result.paths["/grouping1"]).to.equal({
                get: {
                    tags: ["hello group"],
                    responses: {
                        default: {
                            schema: {
                                type: "string"
                            },
                            description: "Successful"
                        }
                    },
                    operationId: "getGrouping1",
                    summary: "plugin1"
                }
            });
            expect(await Validate.test(response.result)).to.be.true();
        });
    });
});
