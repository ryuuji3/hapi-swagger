import { expect } from "code";
import * as Hapi from "hapi";
import Joi from "joi";
import { script } from "lab";
import { IPluginOptions } from "../../src/defaults";
import * as Validate from "../../src/validate";
import * as Helper from "../helper";

export const lab = script();

const anyFile = Joi.any()
    .meta({ swaggerType: "file" })
    .required();

lab.experiment("file", () => {
    const routes = (fileSchema = anyFile): Hapi.ServerRoute => ({
        method: "POST",
        path: "/test/",
        options: {
            handler: Helper.defaultHandler,
            plugins: {
                "hapi-swagger": {
                    payloadType: "form"
                }
            },
            tags: ["api"],
            validate: {
                payload: {
                    file: fileSchema
                }
            },
            payload: {
                maxBytes: 1048576,
                parse: true,
                output: "stream"
            }
        }
    });

    lab.test("upload", async () => {
        const response = await Helper.getSwaggerJSON(routes());
        const result = response.result as IPluginOptions;
        const expected = [
            {
                type: "file",
                required: true,
                "x-meta": {
                    swaggerType: "file"
                },
                name: "file",
                in: "formData"
            }
        ];

        expect(response.statusCode).to.equal(200);
        expect(result.paths["/test/"].post.parameters).to.equal(expected);
        expect(await Validate.test(response.result)).to.be.true();
    });

    lab.test("upload with binary file type", async () => {
        const binaryFile = Joi.binary()
            .meta({ swaggerType: "file" })
            .required();
        const response = await Helper.getSwaggerJSON(routes(binaryFile));
        const result = response.result as IPluginOptions;
        const expected = [
            {
                type: "file",
                format: "binary",
                required: true,
                "x-meta": {
                    swaggerType: "file"
                },
                name: "file",
                in: "formData"
            }
        ];

        expect(response.statusCode).to.equal(200);
        expect(result.paths["/test/"].post.parameters).to.equal(expected);
        expect(await Validate.test(response.result)).to.be.true();
    });

    lab.test("file type not fired on other meta properties", async () => {
        const wrongMeta = Joi.any()
            .meta({ anything: "test" })
            .required();
        const response = await Helper.getSwaggerJSON(routes(wrongMeta));
        const result = response.result as IPluginOptions;
        const expected = [
            {
                required: true,
                "x-meta": {
                    anything: "test"
                },
                in: "formData",
                name: "file",
                type: "string"
            }
        ];

        expect(response.statusCode).to.equal(200);
        expect(result.paths["/test/"].post.parameters).to.equal(expected);
        expect(await Validate.test(response.result)).to.be.true();
    });
});
