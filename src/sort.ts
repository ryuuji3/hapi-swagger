import * as Utilities from './utilities';

/**
 * sort routes by path then method
 *
 * @param  {String} sortType
 * @param  {Array} routes
 * @return {Array}
 */
export function paths (sortType, routes) {


    if (sortType === 'path-method') {
        //console.log('path-method')
        routes.sort(
            Utilities.firstBy('path').thenBy('method')
        );
    }

    return routes;
};
