import * as Utilities from './utilities';

/**
 * append group property with name created from url path segments
 *   - adds group property to route
 *   - returns array of group names
 *
 * @param  {Number} pathPrefixSize
 * @param  {String} basePath
 * @param  {Array} routes
 * @param  {Array} pathReplacements
 * @return {Array}
 */
export function appendGroupByPath(pathPrefixSize: number, basePath: string, routes: Array<any>, pathReplacements: Array<any>): Array<any> {

    let out: string[] = [];

    routes.forEach((route) => {
        let prefix = getNameByPath(pathPrefixSize, basePath, route.path, pathReplacements);
        // append tag reference to route
        route.group = [prefix];
        if (out.indexOf(prefix) === -1) {
            out.push(prefix);
        }
    });

    return out;
};


/**
 * get a group name from url path segments
 *
 * @param  {Int} pathPrefixSize
 * @param  {String} basePath
 * @param  {String} path
 * @param  {Array} pathReplacements
 * @return {String}
 */
export function getNameByPath(pathPrefixSize: Number, basePath: string, path: string, pathReplacements: Array<any>): string {


    if (pathReplacements) {
        path = Utilities.replaceInPath(path, ['groups'], pathReplacements);
    }

    let i = 0;
    let pathHead = [];
    let parts = path.split('/');

    while (parts.length > 0) {
        let item = parts.shift();

        if (item !== '') {
            pathHead.push(item);
            i++;
        }
        if (i >= pathPrefixSize) {
            break;
        }
    }
    let name = pathHead.join('/');

    if (basePath !== '/' && Utilities.startsWith('/' + name, basePath)) {

        name = ('/' + name).replace(basePath, '');

        if (Utilities.startsWith(name, '/')) {
            name = name.replace('/', '');
        }
    }
    return name;
};
