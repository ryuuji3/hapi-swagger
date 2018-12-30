import SwaggerParser from "swagger-parser";

/**
 * validate a JSON swagger document and log output
 * logFnc pattern function(array,string){}
 *
 * @param  {Object} doc
 * @param  {Object} logFnc
 * @return {Object}
 */
export async function log(doc, logFnc) {
    try {
        await SwaggerParser.validate(doc);
        logFnc(["validation", "info"], "PASSED - The swagger.json validation passed.");
        return true;
    } catch (err) {
        logFnc(["validation", "error"], `FAILED - ${err.message}`);
        return false;
    }
}

/**
 * validate a JSON swagger document
 *
 * @param  {Object} doc
 * @param  {Object} next
 * @return {Object}
 */
export async function test(doc) {
    try {
        await SwaggerParser.validate(doc);
        return true;
    } catch (err) {
        return false;
    }
}
