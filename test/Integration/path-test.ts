import { expect } from "code";
import * as Hapi from "hapi";
import Hoek from "hoek";
import Joi from "joi";
import { script } from "lab";
import * as Validate from "../../src/validate";
import * as Helper from "../helper";

export const lab = script();

lab.experiment("path", () => {
    const routes: Hapi.ServerRoute = {
        method: "POST",
        path: "/test",
        handler: Helper.defaultHandler,
        options: {
            description: "Add sum",
            notes: ["Adds a sum to the data store"],
            tags: ["api"],
            validate: {
                payload: {
                    a: Joi.number()
                        .required()
                        .description("the first number")
                        .default(10),

                    b: Joi.number()
                        .required()
                        .description("the second number"),

                    operator: Joi.string()
                        .required()
                        .default("+")
                        .valid(["+", "-", "/", "*"])
                        .description("the opertator i.e. + - / or *"),

                    equals: Joi.number()
                        .required()
                        .description("the result of the sum")
                }
            }
        }
    };

    lab.test("summary and description", async () => {
        const response = await Helper.getSwaggerJSON(routes);
        const { paths } = response.result as { paths: string[] };

        expect(response.statusCode).to.equal(200);
        expect(paths["/test"].post.summary).to.equal("Add sum");
        expect(paths["/test"].post.description).to.equal("Adds a sum to the data store");

        const isValid = await Validate.test(response.result);

        expect(isValid).to.be.true();
    });

    lab.test("description as an array", async () => {
        const testRoutes = Hoek.clone(routes);
        const options = testRoutes.options as Hapi.RouteOptions & { notes: string[] };

        options.notes = ["note one", "note two"];

        const response = await Helper.getSwaggerJSON(testRoutes);
        const { paths } = response.result as { paths: string[] };

        expect(response.statusCode).to.equal(200);

        expect(paths["/test"].post.description).to.equal("note one<br/><br/>note two");

        const isValid = await Validate.test(response.result);

        expect(isValid).to.be.true();
    });

    lab.test("route settting of consumes produces", async () => {
        const testRoutes = Hoek.clone(routes);
        const options = testRoutes.options as Hapi.RouteOptions;

        options.plugins = {
            "hapi-swagger": {
                consumes: ["application/x-www-form-urlencoded"],
                produces: ["application/json", "application/xml"]
            }
        };

        const response = await Helper.getSwaggerJSON(testRoutes);
        const { paths } = response.result as { paths: string[] };

        expect(response.statusCode).to.equal(200);
        expect(paths["/test"].post.consumes).to.equal(["application/x-www-form-urlencoded"]);
        expect(paths["/test"].post.produces).to.equal(["application/json", "application/xml"]);

        const isValid = await Validate.test(response.result);

        expect(isValid).to.be.true();
    });

    lab.test("override plug-in settting of consumes produces", async () => {
        const testRoutes = Hoek.clone(routes);
        const options = testRoutes.options as Hapi.RouteOptions;
        const swaggerOptions = {
            consumes: ["application/json"],
            produces: ["application/json"]
        };

        options.plugins = {
            "hapi-swagger": {
                consumes: ["application/x-www-form-urlencoded"],
                produces: ["application/json", "application/xml"]
            }
        };

        const response = await Helper.getSwaggerJSON(testRoutes, swaggerOptions);
        const { paths } = response.result as { paths: string[] };

        expect(response.statusCode).to.equal(200);
        expect(paths["/test"].post.consumes).to.equal(["application/x-www-form-urlencoded"]);
        expect(paths["/test"].post.produces).to.equal(["application/json", "application/xml"]);

        const isValid = await Validate.test(response.result);

        expect(isValid).to.be.true();
    });

    lab.test('auto "x-www-form-urlencoded" consumes with payloadType', async () => {
        const testRoutes = Hoek.clone(routes);
        const options = testRoutes.options as Hapi.RouteOptions;

        options.plugins = {
            "hapi-swagger": {
                payloadType: "form"
            }
        };

        const response = await Helper.getSwaggerJSON(testRoutes);
        const { paths } = response.result as { paths: string[] };

        expect(response.statusCode).to.equal(200);
        expect(paths["/test"].post.consumes).to.equal(["application/x-www-form-urlencoded"]);

        const isValid = await Validate.test(response.result);

        expect(isValid).to.be.true();
    });

    lab.test("rename a parameter", async () => {
        const testRoutes = Hoek.clone(routes);
        const options = testRoutes.options as Hapi.RouteOptions;

        options.plugins = {
            "hapi-swagger": {
                payloadType: "form"
            }
        };
        options.validate.payload = Joi.object({
            a: Joi.string().label("foo")
        });

        const response = await Helper.getSwaggerJSON(testRoutes);
        const { paths } = response.result as { paths: string[] };

        expect(response.statusCode).to.equal(200);
        expect(paths["/test"].post.parameters).to.equal([
            {
                type: "string",
                name: "a",
                in: "formData"
            }
        ]);

        const isValid = await Validate.test(response.result);

        expect(isValid).to.be.true();
    });

    lab.test('auto "multipart/form-data" consumes with { swaggerType: "file" }', async () => {
        const testRoutes = Hoek.clone(routes);
        const options = testRoutes.options as Hapi.RouteOptions;

        options.validate = {
            payload: {
                file: Joi.any()
                    .meta({ swaggerType: "file" })
                    .description("json file")
            }
        };

        const response = await Helper.getSwaggerJSON(testRoutes);
        const { paths } = response.result as { paths: string[] };

        expect(response.statusCode).to.equal(200);
        expect(paths["/test"].post.consumes).to.equal(["multipart/form-data"]);
    });

    lab.test('auto "multipart/form-data" do not add two', async () => {
        const testRoutes = Hoek.clone(routes);
        const options = testRoutes.options as Hapi.RouteOptions;

        options.validate = {
            payload: {
                file: Joi.any()
                    .meta({ swaggerType: "file" })
                    .description("json file")
            }
        };

        options.plugins = {
            "hapi-swagger": {
                consumes: ["multipart/form-data"]
            }
        };

        const response = await Helper.getSwaggerJSON(testRoutes);
        const { paths } = response.result as { paths: string[] };

        expect(response.statusCode).to.equal(200);
        expect(paths["/test"].post.consumes).to.equal(["multipart/form-data"]);
    });

    lab.test('auto "application/x-www-form-urlencoded" do not add two', async () => {
        const testRoutes: Hapi.ServerRoute = Hoek.clone(routes);
        const options = testRoutes.options as Hapi.RouteOptions;

        options.validate = {
            payload: {
                file: Joi.string().description("json file")
            }
        };
        options.plugins = {
            "hapi-swagger": {
                consumes: ["application/x-www-form-urlencoded"]
            }
        };

        const response = await Helper.getSwaggerJSON(testRoutes);
        const { paths } = response.result as { paths: string[] };

        expect(response.statusCode).to.equal(200);
        expect(paths["/test"].post.consumes).to.equal(["application/x-www-form-urlencoded"]);
    });

    lab.test("a user set content-type header removes consumes", async () => {
        const consumes = ["application/json", "application/json;charset=UTF-8", "application/json; charset=UTF-8"];
        const testRoutes = Hoek.clone(routes);
        const options = testRoutes.options as Hapi.RouteOptions;

        options.validate.headers = Joi.object({
            "content-type": Joi.string().valid(consumes)
        }).unknown();

        const response = await Helper.getSwaggerJSON(testRoutes);
        const { paths } = response.result as { paths: string[] };

        expect(response.statusCode).to.equal(200);
        expect(paths["/test"].post.consumes).to.not.exist();

        const isValid = await Validate.test(response.result);

        expect(isValid).to.be.true();
    });

    lab.test("payloadType form", async () => {
        const testRoutes = Hoek.clone(routes);
        const options = testRoutes.options as Hapi.RouteOptions;

        options.plugins = {
            "hapi-swagger": {
                payloadType: "form"
            }
        };

        const response = await Helper.getSwaggerJSON(testRoutes);
        const { paths } = response.result as { paths: string[] };

        expect(response.statusCode).to.equal(200);
        expect(paths["/test"].post.consumes).to.equal(["application/x-www-form-urlencoded"]);

        const isValid = await Validate.test(response.result);

        expect(isValid).to.be.true();
    });

    lab.test("accept header", async () => {
        const testRoutes = Hoek.clone(routes);
        const options = testRoutes.options as Hapi.RouteOptions;

        options.validate.headers = Joi.object({
            accept: Joi.string()
                .required()
                .valid(["application/json", "application/vnd.api+json"])
        }).unknown();

        const response = await Helper.getSwaggerJSON(testRoutes);
        const { paths } = response.result as { paths: string[] };

        expect(response.statusCode).to.equal(200);
        expect(paths["/test"].post.produces).to.equal(["application/json", "application/vnd.api+json"]);
        const isValid = await Validate.test(response.result);
        expect(isValid).to.be.true();
    });

    lab.test("accept header - no emum", async () => {
        const testRoutes = Hoek.clone(routes);
        const options = testRoutes.options as Hapi.RouteOptions;

        options.validate.headers = Joi.object({
            accept: Joi.string()
                .required()
                .default("application/vnd.api+json")
        }).unknown();

        const response = await Helper.getSwaggerJSON(testRoutes);
        const { paths } = response.result as { paths: string[] };

        expect(response.statusCode).to.equal(200);
        expect(paths["/test"].post.parameters[0]).to.equal({
            required: true,
            default: "application/vnd.api+json",
            in: "header",
            name: "accept",
            type: "string"
        });
        expect(paths["/test"].post.produces).to.not.exist();

        const isValid = await Validate.test(response.result);

        expect(isValid).to.be.true();
    });

    lab.test("accept header - default first", async () => {
        const testRoutes = Hoek.clone(routes);
        const options = testRoutes.options as Hapi.RouteOptions;

        options.validate.headers = Joi.object({
            accept: Joi.string()
                .required()
                .valid(["application/json", "application/vnd.api+json"])
                .default("application/vnd.api+json")
        }).unknown();

        const response = await Helper.getSwaggerJSON(testRoutes);
        const { paths } = response.result as { paths: string[] };

        expect(response.statusCode).to.equal(200);
        expect(paths["/test"].post.produces).to.equal(["application/vnd.api+json", "application/json"]);
        const isValid = await Validate.test(response.result);

        expect(isValid).to.be.true();
    });

    lab.test("accept header acceptToProduce set to false", async () => {
        const testRoutes = Hoek.clone(routes);
        const options = testRoutes.options as Hapi.RouteOptions;

        options.validate.headers = Joi.object({
            accept: Joi.string()
                .required()
                .valid(["application/json", "application/vnd.api+json"])
                .default("application/vnd.api+json")
        }).unknown();

        const response = await Helper.getSwaggerJSON(testRoutes, { acceptToProduce: false });
        const { paths } = response.result as { paths: string[] };

        expect(response.statusCode).to.equal(200);
        expect(paths["/test"].post.parameters[0]).to.equal({
            enum: ["application/json", "application/vnd.api+json"],
            required: true,
            default: "application/vnd.api+json",
            in: "header",
            name: "accept",
            type: "string"
        });
        expect(paths["/test"].post.produces).to.not.exist();

        const isValid = await Validate.test(response.result);

        expect(isValid).to.be.true();
    });

    lab.test("path parameters {id}/{note?}", async () => {
        const testRoutes = Hoek.clone(routes);
        const options = testRoutes.options as Hapi.RouteOptions;

        testRoutes.path = "/servers/{id}/{note?}";
        options.validate = {
            params: {
                id: Joi.number()
                    .integer()
                    .required()
                    .description("ID of server to delete"),
                note: Joi.string().description("Note..")
            }
        };

        const response = await Helper.getSwaggerJSON(testRoutes, { acceptToProduce: false });
        const { paths } = response.result as { paths: string[] };

        expect(response.statusCode).to.equal(200);
        expect(paths["/servers/{id}/{note}"]).to.exist();
    });

    lab.test("path parameters {a}/{b?} required overriden by JOI", async () => {
        const testRoutes = [
            {
                method: "POST",
                path: "/server/1/{a}/{b?}",
                options: {
                    handler: Helper.defaultHandler,
                    tags: ["api"],
                    validate: {
                        params: {
                            a: Joi.number().required(),
                            b: Joi.string().required()
                        }
                    }
                }
            },
            {
                method: "POST",
                path: "/server/2/{c}/{d?}",
                options: {
                    handler: Helper.defaultHandler,
                    tags: ["api"],
                    validate: {
                        params: {
                            c: Joi.number().optional(),
                            d: Joi.string().optional()
                        }
                    }
                }
            },
            {
                method: "POST",
                path: "/server/3/{e}/{f?}",
                options: {
                    handler: Helper.defaultHandler,
                    tags: ["api"],
                    validate: {
                        params: {
                            e: Joi.number(),
                            f: Joi.string()
                        }
                    }
                }
            }
        ];

        const response = await Helper.getSwaggerJSON(testRoutes);
        const { paths } = response.result as { paths: string[] };

        expect(response.statusCode).to.equal(200);
        expect(paths["/server/1/{a}/{b}"].post.parameters).to.equal([
            {
                type: "number",
                name: "a",
                in: "path",
                required: true
            },
            {
                type: "string",
                name: "b",
                in: "path",
                required: true
            }
        ]);
        expect(paths["/server/2/{c}/{d}"].post.parameters).to.equal([
            {
                type: "number",
                in: "path",
                name: "c"
            },
            {
                type: "string",
                in: "path",
                name: "d"
            }
        ]);
        expect(paths["/server/3/{e}/{f}"].post.parameters).to.equal([
            {
                required: true,
                type: "number",
                in: "path",
                name: "e"
            },
            {
                type: "string",
                in: "path",
                name: "f"
            }
        ]);
    });

    lab.test("path and basePath", async () => {
        const testRoutes = Hoek.clone(routes);
        const options = testRoutes.options as Hapi.RouteOptions;

        testRoutes.path = "/v3/servers/{id}";
        options.validate = {
            params: {
                id: Joi.number()
                    .integer()
                    .required()
                    .description("ID of server to delete")
            }
        };

        const response = await Helper.getSwaggerJSON(testRoutes, { basePath: "/v3" });
        const { paths } = response.result as { paths: string[] };

        expect(response.statusCode).to.equal(200);
        expect(paths["/servers/{id}"]).to.exist();
    });

    lab.test("basePath trim tailing slash", async () => {
        const testRoutes = Hoek.clone(routes);
        const options = testRoutes.options as Hapi.RouteOptions;

        testRoutes.path = "/v3/servers/{id}";
        options.validate = {
            params: {
                id: Joi.number()
                    .integer()
                    .required()
                    .description("ID of server to delete")
            }
        };

        const response = await Helper.getSwaggerJSON(testRoutes, { basePath: "/v3" });
        const { paths } = response.result as { paths: string[] };

        expect(response.statusCode).to.equal(200);
        expect(paths["/servers/{id}"]).to.exist();
    });

    lab.test("path, basePath suppressing version fragment", async () => {
        const testRoutes = Hoek.clone(routes);
        const options = testRoutes.options as Hapi.RouteOptions;

        testRoutes.path = "/api/v3/servers/{id}";
        options.validate = {
            params: {
                id: Joi.number()
                    .integer()
                    .required()
                    .description("ID of server to delete")
            }
        };

        const serverOptions = {
            basePath: "/api",
            pathReplacements: [
                {
                    replaceIn: "all",
                    pattern: /v([0-9]+)\//,
                    replacement: ""
                }
            ]
        };
        const response = await Helper.getSwaggerJSON(testRoutes, serverOptions);
        const { paths } = response.result as { paths: string[] };

        expect(response.statusCode).to.equal(200);
        expect(paths["/servers/{id}"]).to.exist();
    });

    lab.test("route deprecated", async () => {
        const testRoutes = Hoek.clone(routes);
        const options = testRoutes.options as Hapi.RouteOptions;

        options.plugins = {
            "hapi-swagger": {
                deprecated: true
            }
        };

        const response = await Helper.getSwaggerJSON(testRoutes);
        const { paths } = response.result as { paths: string[] };

        expect(response.statusCode).to.equal(200);
        expect(paths["/test"].post.deprecated).to.equal(true);

        const isValid = await Validate.test(response.result);

        expect(isValid).to.be.true();
    });

    lab.test("custom operationId for code-gen apps", async () => {
        const testRoutes = Hoek.clone(routes);
        const options = testRoutes.options as Hapi.RouteOptions;

        options.plugins = {
            "hapi-swagger": {
                id: "add"
            }
        };

        const response = await Helper.getSwaggerJSON(testRoutes);
        const { paths } = response.result as { paths: string[] };

        expect(response.statusCode).to.equal(200);
        expect(paths["/test"].post.operationId).to.equal("add");

        const isValid = await Validate.test(response.result);

        expect(isValid).to.be.true();
    });

    lab.test("stop boolean creating parameter", async () => {
        const testRoutes = {
            method: "GET",
            path: "/{name}",
            config: {
                handler: () => Helper.defaultHandler,
                tags: ["api"],
                validate: {
                    headers: true,
                    params: {
                        name: Joi.string().min(2)
                    },
                    query: false
                }
            }
        };

        const response = await Helper.getSwaggerJSON(testRoutes);
        const { paths } = response.result as { paths: string[] };

        expect(response.statusCode).to.equal(200);
        expect(paths["/{name}"].get.parameters).to.equal([
            {
                type: "string",
                minLength: 2,
                name: "name",
                in: "path",
                required: true
            }
        ]);

        const isValid = await Validate.test(response.result);

        expect(isValid).to.be.true();
    });

    lab.test("stop emtpy objects creating parameter", async () => {
        const testRoutes = {
            method: "POST",
            path: "/{name}",
            config: {
                handler: Helper.defaultHandler,
                tags: ["api"],
                validate: {
                    payload: Joi.object()
                }
            }
        };

        const response = await Helper.getSwaggerJSON(testRoutes);
        const { paths } = response.result as { paths: string[] };

        expect(response.statusCode).to.equal(200);
        expect(paths["/{name}"].post.parameters).to.equal([
            {
                in: "body",
                name: "body",
                schema: {
                    $ref: "#/definitions/Model 1"
                }
            }
        ]);

        // Before this test returned string: "'Validation failed. /paths/{name}/post is missing path parameter(s) for {name}"
        const isValid = await Validate.test(response.result);

        expect(isValid).to.be.false();
    });

    lab.test("stop emtpy formData object creating parameter", async () => {
        const testRoutes = {
            method: "POST",
            path: "/",
            config: {
                handler: Helper.defaultHandler,
                tags: ["api"],
                validate: {
                    payload: Joi.object()
                },
                plugins: {
                    "hapi-swagger": {
                        payloadType: "form"
                    }
                }
            }
        };

        const response = await Helper.getSwaggerJSON(testRoutes);
        const { paths } = response.result as { paths: string[] };

        expect(response.statusCode).to.equal(200);
        expect(paths["/"].post.parameters).to.not.exists();

        const isValid = await Validate.test(response.result);

        expect(isValid).to.be.true();
    });
});
