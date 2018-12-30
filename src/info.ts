import Hoek from "hoek";
import Joi from "joi";

/**
 * default data for info
 */
export const defaults = {
    title: "API documentation",
    version: "0.0.1"
};

/**
 * schema for info
 */
export const schema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string(),
    termsOfService: Joi.string(),
    contact: Joi.object({
        name: Joi.string(),
        url: Joi.string().uri(),
        email: Joi.string().email()
    }),
    license: Joi.object({
        name: Joi.string(),
        url: Joi.string().uri()
    }),
    version: Joi.string().required()
}).pattern(/^x-/, Joi.any());

/**
 * build the swagger info section
 *
 * @param  {Object} options
 * @return {Object}
 */
export function build(options) {
    const out = options.info ? Hoek.applyToDefaults(defaults, options.info) : defaults;
    Joi.assert(out, schema);
    return out;
}
