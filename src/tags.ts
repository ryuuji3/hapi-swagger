import Joi from "joi";

/**
 * schema for tags
 *
 */
export const schema = Joi.array().items(
    Joi.object({
        name: Joi.string().required(),
        description: Joi.string(),
        externalDocs: Joi.object({
            description: Joi.string(),
            url: Joi.string().uri()
        }),
        "x-order": Joi.number()
    })
        .label("Tag")
        .optional()
);

/**
 * build the swagger tag section
 *
 * @param  {Object} settings
 * @return {Object}
 */
export function build(settings) {
    let out = [];

    if (settings.tags) {
        Joi.assert(settings.tags, schema);
        out = settings.tags;
    }
    return out;
}
