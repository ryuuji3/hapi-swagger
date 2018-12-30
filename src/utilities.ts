import Hoek from "hoek";
import Joi, { JoiObject } from "joi";

// tslint:disable ban-types

/**
 * is passed item an object
 *
 * @param  {unknown} obj
 * @return {Boolean}
 */
export function isObject(obj: unknown): obj is object {
    return obj !== null && obj !== undefined && typeof obj === "object" && !Array.isArray(obj);
}

/**
 * is passed item a function
 *
 * @param  {Object} obj
 * @return {Boolean}
 */
export function isFunction(obj: unknown): obj is Function {
    // remove `obj.constructor` test as it was always true
    return !!(obj && (obj as Function).call && (obj as Function).apply);
}

/**
 * is passed item a regex
 *
 * @param  {Object} obj
 * @return {Boolean}
 */
export function isRegex(obj: unknown): obj is RegExp {
    // base on https://github.com/ljharb/is-regex/
    // has a couple of edge use cases for different env  - hence coverage:off
    /* $lab:coverage:off$ */

    const regexExec = RegExp.prototype.exec;
    const tryRegexExec = function tryRegexExec(value: unknown) {
        try {
            regexExec.call(value);
            return true;
        } catch (e) {
            return false;
        }
    };
    const toStr = Object.prototype.toString;
    const regexClass = "[object RegExp]";
    const hasToStringTag = typeof Symbol === "function" && typeof Symbol.toStringTag === "symbol";

    if (typeof obj !== "object") {
        return false;
    }
    return hasToStringTag ? tryRegexExec(obj) : toStr.call(obj) === regexClass;
    /* $lab:coverage:on$ */
}

/**
 * does string start with test, temp before native support
 *
 * @param  {String} str
 * @param  {String} test
 * @return {Boolean}
 */
export function startsWith(str: string, test: string): boolean {
    return str.indexOf(test) === 0;
}

/**
 * does an object have any of its own properties
 *
 * @param  {Object} obj
 * @return {Boolean}
 */
export function hasProperties(obj: object): boolean {
    for (const key in obj) {
        // tslint:disable-next-line forin
        return obj.hasOwnProperty(key);
    }
    return false;
}

/**
 * deletes any property in an object that is undefined, null or an empty array
 *
 * @param  {Object} obj
 * @return {Object}
 */
export function deleteEmptyProperties(obj: { [key: string]: any }): object {
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            // delete properties undefined values
            if (obj[key] === undefined || obj[key] === null) {
                delete obj[key];
            }
            // allow blank objects for example or default properties
            if (["default", "example", "security"].indexOf(key) === -1) {
                // delete array with no values
                if (Array.isArray(obj[key]) && obj[key].length === 0) {
                    delete obj[key];
                }
                // delete object which does not have its own properties
                if (isObject(obj[key]) && hasProperties(obj[key]) === false) {
                    delete obj[key];
                }
            }
        }
    }

    return obj;
}

/**
 * gets first item of an array
 *
 * @param  {Array} array
 * @return {Object}
 */
export function first(array: any[]): any {
    return Array.isArray(array) ? array[0] : undefined;
}

/**
 * sort array so it has a set firstItem
 *
 * @param  {Array} array
 * @param  {object} firstItem
 * @return {Array}
 */
export function sortFirstItem(array: any[], firstItem: object): any[] {
    let out = array;
    if (firstItem) {
        out = [firstItem];
        array.forEach(item => {
            if (item !== firstItem) {
                out.push(item);
            }
        });
    }
    return out;
}

/**
 * replace a value in an array - does not keep order
 *
 * @param  {Array} array
 * @param  {object} current
 * @param  {object} replacement
 * @return {Array}
 */
export function replaceValue(array: any[], current: any, replacement: any): any[] {
    if (array && current && replacement) {
        array = Hoek.clone(array);
        if (array.indexOf(current) > -1) {
            array.splice(array.indexOf(current), 1);
            array.push(replacement);
        }
    }
    return array;
}

/**
 * does an object have a key
 *
 * @param  {Object} obj
 * @param  {String} findKey
 * @return {Boolean}
 */
export function hasKey(obj: { [key: string]: any }, findKey: string): boolean {
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (typeof obj[key] === "object") {
                if (hasKey(obj[key], findKey) === true) {
                    return true;
                }
            }
            if (key === findKey) {
                return true;
            }
        }
    }
    return false;
}

/**
 * find and rename key in an object
 *
 * @param  {Object} obj
 * @param  {String} findKey
 * @param  {String} replaceKey
 * @return {Object}
 */
export function findAndRenameKey(obj: { [key: string]: any }, findKey: string, replaceKey: string): object {
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (typeof obj[key] === "object") {
                findAndRenameKey(obj[key], findKey, replaceKey);
            }
            if (key === findKey) {
                if (replaceKey) {
                    obj[replaceKey] = obj[findKey];
                }
                delete obj[findKey];
            }
        }
    }
    return obj;
}

/**
 * remove any properties in an object that are not in the list or do not start with 'x-'
 *
 * @param  {Object} obj
 * @param  {Array} listOfProps
 * @return {Object}
 */
export function removeProps(obj: { [key: string]: any }, listOfProps: any[]): object {
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (listOfProps.indexOf(key) === -1 && startsWith(key, "x-") === false) {
                delete obj[key];
                // console.log('Removed property: ' + key + ' from object: ', JSON.stringify(obj));
            }
        }
    }
    return obj;
}

/**
 * is a Joi object
 *
 * @param  {Object} joiObj
 * @return {Boolean}
 */
export function isJoi(joiObj: unknown): joiObj is JoiObject {
    return joiObj && (joiObj as JoiObject).isJoi ? true : false;
}

/**
 * does JOI object have children
 *
 * @param  {Object} joiObj
 * @return {Boolean}
 */
export function hasJoiChildren(joiObj: any): boolean {
    return isJoi(joiObj) && Hoek.reach(joiObj, "_inner.children") ? true : false;
}

/**
 * checks if object has meta array
 *
 * @param  {Object} joiObj
 * @return {Boolean}
 */
export function hasJoiMeta(joiObj: any): boolean {
    return isJoi(joiObj) && Array.isArray((joiObj as any)._meta) ? true : false;
}

/**
 * get meta property value from JOI object
 *
 * @param  {Object} joiObj
 * @param  {String} propertyName
 */
export function getJoiMetaProperty(joiObj: any, propertyName: string): string | undefined {
    // get headers added using meta function
    if (isJoi(joiObj) && hasJoiMeta(joiObj)) {
        const meta = (joiObj as any)._meta;
        let i = meta.length;
        while (i--) {
            if (meta[i][propertyName]) {
                return meta[i][propertyName];
            }
        }
    }
    return undefined;
}

/**
 * get label from Joi object
 *
 * @param  {Object} joiObj
 * @return {String || Null}
 */
export function getJoiLabel(joiObj: object): string | null {
    // old version
    /* $lab:coverage:off$ */
    if (Hoek.reach(joiObj, "_settings.language.label")) {
        return Hoek.reach(joiObj, "_settings.language.label");
    }
    /* $lab:coverage:on$ */
    // Joi > 10.9
    if (Hoek.reach(joiObj, "_flags.label")) {
        return Hoek.reach(joiObj, "_flags.label");
    }

    return null;
}

/**
 * returns a javascript object into JOI object
 * needed to covert custom parameters objects passed in by plug-in route options
 *
 * @param  {Object} obj
 * @return {Object}
 */
export function toJoiObject(obj: unknown): JoiObject {
    if (isJoi(obj)) {
        return obj;
    } else if (isObject(obj)) {
        return Joi.object(obj as { [index: string]: any });
    }
}

/**
 * get chained functions for sorting
 *
 * @return {Function}
 */
export const firstBy = (() => {
    // code from https://github.com/Teun/thenBy.js
    // has its own tests
    /* $lab:coverage:off$ */
    function makeCompareFunction(f, direction?) {
        if (typeof f !== "function") {
            const prop = f;
            // make unary function
            f = v1 => {
                return v1[prop];
            };
        }
        if (f.length === 1) {
            // f is a unary function mapping a single item to its sort score
            const uf = f;
            f = (v1, v2) => {
                return uf(v1) < uf(v2) ? -1 : uf(v1) > uf(v2) ? 1 : 0;
            };
        }
        if (direction === -1) {
            return (v1, v2) => {
                return -f(v1, v2);
            };
        }
        return f;
    }
    /* mixin for the `thenBy` property */
    function extend(f, d?) {
        f = makeCompareFunction(f, d);
        f.thenBy = tb;
        return f;
    }

    /* adds a secondary compare function to the target function (`this` context)
       which is applied in case the first one returns 0 (equal)
       returns a new compare function, which has a `thenBy` method as well */
    function tb(y, d) {
        y = makeCompareFunction(y, d);

        return extend((a, b) => {
            return this(a, b) || y(a, b);
        });
    }

    return extend;
    /* $lab:coverage:on$ */
})();

/**
 * create id
 *
 * @param  {String} method
 * @param  {String} path
 * @return {String}
 */
export function createId(method: string, path: string): string {
    if (path.indexOf("/") > -1) {
        let items = path.split("/");
        items = items.map(item => {
            // replace chars such as '{'
            item = item.replace(/[^\w\s]/gi, "");

            return this.toTitleCase(item);
        });
        path = items.join("");
    } else {
        path = this.toTitleCase(path);
    }
    return method.toLowerCase() + path;
}

/**
 * create toTitleCase
 *
 * @param  {String} word
 * @return {String}
 */
export function toTitleCase(word: string): string {
    return word.replace(/\w\S*/g, txt => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

/**
 * applies path replacements
 *
 * @param  {String} path
 * @param  {Array} applyTo
 * @param  {Array} options
 * @return {String}
 */
export function replaceInPath(path: string, applyTo: any[], options: any[]): string {
    options.forEach(option => {
        if (applyTo.indexOf(option.replaceIn) > -1 || option.replaceIn === "all") {
            path = path.replace(option.pattern, option.replacement);
        }
    });
    return path;
}

/**
 * removes trailing slash `/` from a string
 *
 * @param  {String} str
 * @return {String}
 */
export function removeTrailingSlash(str: string): string {
    if (str.endsWith("/")) {
        return str.slice(0, -1);
    }
    return str;
}

/**
 * Assign vendor extensions: x-* to the target. This mutates target.
 *
 * @param  {Object} target
 * @param  {Object} source
 * @return {Object}
 */
export function assignVendorExtensions(target: object, source: object): object {
    if (!this.isObject(target) || !this.isObject(source)) {
        return target;
    }

    for (const sourceProperty in source) {
        if (sourceProperty.startsWith("x-") && sourceProperty.length > 2) {
            // this may override existing x- properties which should not be an issue since values should be identical.
            target[sourceProperty] = Hoek.reach(source, sourceProperty) || null;
        }
    }
    return target;
}
