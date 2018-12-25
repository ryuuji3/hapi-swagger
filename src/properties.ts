import Hoek from 'hoek';
import Definitions from './definitions';
import * as Utilities from './utilities';
import { AnySchema } from 'joi';

export default class Properties {
    definitions: Definitions;
    simpleTypePropertyMap: object;
    complexTypePropertyMap: object;
    propertyMap: object;

    /**
     * constructor for properties
     *
     * @param  {Object} settings
     * @param  {Object} definitionCollection
     * @param  {Object} altDefinitionCollection
     * @param  {Array} definitionCache
     */
    constructor(public settings, public definitionCollection?, public altDefinitionCollection?, public definitionCache? ) {
        this.definitions = new Definitions(settings);

        // swagger type can be 'string', 'number', 'integer', 'boolean', 'array' or 'file'
        this.simpleTypePropertyMap = {
            'boolean': { 'type': 'boolean' },
            'binary': { 'type': 'string', 'format': 'binary' },
            'date': { 'type': 'string', 'format': 'date' },
            'number': { 'type': 'number' },
            'string': { 'type': 'string' }
        };

        this.complexTypePropertyMap = {
            'any': { 'type': 'string' },
            'array': { 'type': 'array' },
            'func': { 'type': 'string' },
            'object': { 'type': 'object' },
            'alternatives': { 'type': 'alternatives' }
        };

        // merge
        this.propertyMap = Hoek.applyToDefaults(this.simpleTypePropertyMap, this.complexTypePropertyMap);

        //this.allowedProps = ['$ref','format','title','description','default','multipleOf','maximum','exclusiveMaximum','minimum','exclusiveMinimum','maxLength','minLength','pattern','maxItems','minItems','uniqueItems','maxProperties','minProperties','required','enum','type','items','allOf','properties','additionalProperties','discriminator','readOnly','xml','externalDocs','example'];
        // add none swagger property needed to flag touched state of required property
        //this.allowedProps.push('optional');
    }

    /**
     * parse Joi validators object into a swagger property
     *
     * @param  {String} name
     * @param  {Object} joiObj
     * @param  {String} parent
     * @param  {String} parameterType
     * @param  {Boolean} useDefinitions
     * @param  {Boolean} isAlt
     * @return {Object}
     */
    parseProperty (name, joiObj, parent, parameterType, useDefinitions, isAlt) {

        let property: {
            type?: string;
            format?: any;
            enum?: any;
            $ref?: any;
            properties?: any;
            in?: any;
        } = { type: 'void' };

        // if wrong format or forbidden - return undefined
        if (!Utilities.isJoi(joiObj)) {
            return undefined;
        }
        if (Hoek.reach(joiObj, '_flags.presence') === 'forbidden') {
            return undefined;
        }

        // default the use of definitions to true
        if (useDefinitions === undefined || useDefinitions === null) {
            useDefinitions = true;
        }

        // get name from joi label if its not a path
        if (!name && Utilities.getJoiLabel(joiObj) && parameterType !== 'path') {
            name = Utilities.getJoiLabel(joiObj);
        }

        // add correct type and format by mapping
        let joiType = (joiObj as any)._type.toLowerCase();
        // for Joi extension, use the any type
        if (!(joiType in this.propertyMap)){
            joiType = 'any';
        }
        let map = this.propertyMap[joiType];
        property.type = map.type;
        if (map.format) {
            property.format = map.format;
        }

        // Joi object caching - speeds up parsing
        let joiCache;
        if (useDefinitions && Array.isArray(this.definitionCache) && property.type === 'object') {
            // select WeakMap for current definition collection
            joiCache = (isAlt === true) ? this.definitionCache[1] : this.definitionCache[0];
            if (joiCache.has(joiObj)) {
                return joiCache.get(joiObj);
            }
        }


        property = this.parsePropertyMetadata(property, name, parent, joiObj);

        // add enum
        let describe = (joiObj as AnySchema).describe();
        const allowDropdown = !property['x-meta'] || !property['x-meta'].disableDropdown;
        if (allowDropdown && Array.isArray(describe.valids) && describe.valids.length) {
            // fliter out empty values and arrays
            var enums = describe.valids.filter((item) => {

                return item !== '' && item !== null;
            });
            if (enums.length > 0) {
                property.enum = enums;
            }
        }

        // add number properties
        if (property.type === 'string') {
            property = this.parseString(property, joiObj);
        }

        // add number properties
        if (property.type === 'number') {
            property = this.parseNumber(property, joiObj);
        }

        // add date properties
        if (property.type === 'string' && property.format === 'date') {
            property = this.parseDate(property, joiObj);
        }

        // add object child properties
        if (property.type === 'object') {
            if (Utilities.hasJoiChildren(joiObj)) {

                property = this.parseObject(property, joiObj, name, parameterType, useDefinitions, isAlt);
                if (useDefinitions === true) {
                    let refName = this.definitions.append(name, property, this.getDefinitionCollection(isAlt), this.settings);
                    property = {
                        '$ref': this.getDefinitionRef(isAlt) + refName
                    };
                }

            } else {
                // default empty object
                property.properties = {};
                if (useDefinitions === true) {
                    let objectSchema = { 'type': 'object', 'properties': {} };
                    let refName = this.definitions.append(name, objectSchema, this.getDefinitionCollection(isAlt), this.settings);
                    property = {
                        '$ref': this.getDefinitionRef(isAlt) + refName
                    };
                }

            }
        }


        // add array properties
        if (property.type === 'array') {
            property = this.parseArray(property, joiObj, name, parameterType, useDefinitions, isAlt);

            if (useDefinitions === true) {
                let refName = this.definitions.append(name, property, this.getDefinitionCollection(isAlt), this.settings);
                property = {
                    '$ref': this.getDefinitionRef(isAlt) + refName
                };
            }
        }


        // add alternatives properties
        if (property.type === 'alternatives') {
            property = this.parseAlternatives(property, joiObj, name, parameterType, useDefinitions);
        }

        // convert property to file upload, if indicated by meta property
        if (Utilities.getJoiMetaProperty(joiObj, 'swaggerType') === 'file') {
            property.type = 'file';
            property.in = 'formData';
        }

        property = Utilities.deleteEmptyProperties(property);
        if (joiCache && property.$ref) {
            joiCache.set(joiObj, property);
        }

        return property;
    };

    /**
     * parse property metadata
     *
     * @param  {Object} property
     * @param  {Object} joiObj
     * @return {Object}
     */
    parsePropertyMetadata (property, name, parent, joiObj) {

        const describe = joiObj.describe();

        // add common properties
        property.description = Hoek.reach(joiObj, '_description');
        property.notes = Hoek.reach(joiObj, '_notes');
        property.tags = Hoek.reach(joiObj, '_tags');

        // add extended properties not part of openAPI spec
        if (this.settings.xProperties === true) {
            this.convertRules(property, describe.rules, [
                'unit'
            ], 'x-format');
            property.example = Hoek.reach(joiObj, '_examples.0');
            property['x-meta'] = Hoek.reach(joiObj, '_meta.0');
        }

        // add required/optional state only if present
        if (parent && name) {
            if (Hoek.reach(joiObj, '_flags.presence')) {
                if (parent.required === undefined) {
                    parent.required = [];
                }
                if (parent.optional === undefined) {
                    parent.optional = [];
                }
                if (Hoek.reach(joiObj, '_flags.presence') === 'required') {
                    parent.required.push(name);
                }
                if (Hoek.reach(joiObj, '_flags.presence') === 'optional') {
                    parent.optional.push(name);
                }
            }
        }

        property.default = Hoek.reach(joiObj, '_flags.default');

        // allow for function calls
        if (Utilities.isFunction(property.default)) {
            property.default = property.default();
        }

        return property;
    };

    /**
     * parse string property
     *
     * @param  {Object} property
     * @param  {Object} joiObj
     * @return {Object}
     */
    parseString (property, joiObj) {

        const describe = joiObj.describe();

        property.minLength = this.getArgByName(describe.rules, 'min');
        property.maxLength = this.getArgByName(describe.rules, 'max');

        // add regex
        joiObj._tests.forEach((test) => {
            // Joi post v10
            if (Utilities.isObject(test.arg) && test.arg.pattern) {
                property.pattern = test.arg.pattern.source;
            }
            // Joi pre v10
            /* $lab:coverage:off$ */
            if (Utilities.isRegex(test.arg)) {
                property.pattern = test.arg.source;
            }
            /* $lab:coverage:on$ */
        });


        // add extended properties not part of openAPI spec
        if (this.settings.xProperties === true) {
            this.convertRules(property, describe.rules, [
                'insensitive',
                'length'
            ], 'x-constraint');

            this.convertRules(property, describe.rules, [
                'creditCard',
                'alphanum',
                'token',
                'email',
                'ip',
                'uri',
                'guid',
                'hex',
                'hostname',
                'isoDate'
            ], 'x-format');

            this.convertRules(property, describe.rules, [
                'lowercase',
                'uppercase',
                'trim'
            ], 'x-convert');
        }

        return property;
    };

    /**
     * parse number property
     *
     * @param  {Object} property
     * @param  {Object} joiObj
     * @return {Object}
     */
    parseNumber (property, joiObj) {

        const describe = joiObj.describe();
        property.minimum = this.getArgByName(describe.rules, 'min');
        property.maximum = this.getArgByName(describe.rules, 'max');
        if (this.hasPropertyByName(describe.rules, 'integer')) {
            property.type = 'integer';
        }

        // add extended properties not part of openAPI spec
        if (this.settings.xProperties === true) {
            this.convertRules(property, describe.rules, [
                'greater',
                'less',
                'precision',
                'multiple',
                'positive',
                'negative'
            ], 'x-constraint');
        }

        return property;
    }

    /**
     * parse date property
     *
     * @param  {Object} property
     * @param  {Object} joiObj
     * @return {Object}
     */
    parseDate (property, joiObj) {

        if (joiObj._flags.timestamp) {
            property.type = 'number';
            delete property.format;
        }

        return property;
    }

    /**
     * parse object property
     *
     * @param  {Object} property
     * @param  {Object} joiObj
     * @param  {String} name
     * @param  {Boolean} useDefinitions
     * @param  {Boolean} isAlt
     * @return {Object}
     */
    parseObject (property, joiObj, name, parameterType, useDefinitions, isAlt) {

        property.properties = {};
        joiObj = joiObj._inner.children;
        joiObj.forEach((obj) => {

            let keyName = obj.key;
            let itemName = obj.key;
            let joiChildObj = obj.schema;
            // get name form label if set
            if (Utilities.getJoiLabel(joiChildObj)) {
                itemName = Utilities.getJoiLabel(joiChildObj);
            }
            //name, joiObj, parent, parameterType, useDefinitions, isAlt
            property.properties[keyName] = this.parseProperty(itemName, joiChildObj, property, parameterType, useDefinitions, isAlt);
            // switch references if naming has changed
            if (keyName !== itemName) {
                property.required = Utilities.replaceValue(property.required, itemName, keyName);
                property.optional = Utilities.replaceValue(property.optional, itemName, keyName);
            }
        });
        property.name = name;
        return property;
    };

    /**
     * parse array property
     *
     * @param  {Object} property
     * @param  {Object} joiObj
     * @param  {String} name
     * @param  {String} parameterType,
     * @param  {Boolean} useDefinitions
     * @param  {Boolean} isAlt
     * @return {Object}
     */
    parseArray (property, joiObj, name, parameterType, useDefinitions, isAlt) {

        const describe = joiObj.describe();
        property.minItems = this.getArgByName(describe.rules, 'min');
        property.maxItems = this.getArgByName(describe.rules, 'max');


        // add extended properties not part of openAPI spec
        if (this.settings.xProperties === true) {
            this.convertRules(property, describe.rules, [
                'length',
                'unique'
            ], 'x-constraint');

            if (describe.flags.sparse) {
                this.addToPropertyObject(property, 'x-constraint', 'sparse', true);
            }
            if (describe.flags.single) {
                this.addToPropertyObject(property, 'x-constraint', 'single', true);
            }
        }


        // default the items with type:string
        property.items = {
            'type': 'string'
        };

        // set swaggers collectionFormat to one that works with hapi
        if (parameterType === 'query' || parameterType === 'formData') {
            property.collectionFormat = 'multi';
        }

        // swagger appears to only support one array item type at a time, so grab the first one
        let arrayItemTypes = joiObj._inner.items; // joiObj._inner.inclusions;
        let arrayItem = Utilities.first(arrayItemTypes);

        if (arrayItem) {
            // get name of item if it has one
            let itemName;
            if (Utilities.getJoiLabel(arrayItem)) {
                itemName = Utilities.getJoiLabel(arrayItem);
            }

            //name, joiObj, parent, parameterType, useDefinitions, isAlt
            let arrayItemProperty = this.parseProperty(itemName, arrayItem, property, parameterType, useDefinitions, isAlt);
            if (this.simpleTypePropertyMap[arrayItem._type.toLowerCase()]) {
                // map simple types directly
                property.items = {};
                for (let key in arrayItemProperty) {
                    property.items[key] = arrayItemProperty[key];
                }
            } else {
                property.items = arrayItemProperty;
            }

        }

        property.name = name;
        return property;
    };

    /**
     * parse alternatives property
     *
     * @param  {Object} property
     * @param  {Object} joiObj
     * @param  {String} name
     * @param  {String} parameterType
     * @param  {Boolean} useDefinitions
     * @return {Object}
     */
    parseAlternatives (property, joiObj, name, parameterType, useDefinitions) {

        // convert .try() alternatives structures
        if (Hoek.reach(joiObj, '_inner.matches.0.schema')) {
            // add first into definitionCollection
            let child = joiObj._inner.matches[0].schema;
            let childName = Utilities.getJoiLabel(joiObj);
            //name, joiObj, parent, parameterType, useDefinitions, isAlt
            property = this.parseProperty(childName, child, property, parameterType, useDefinitions, false);

            // create the alternatives without appending to the definitionCollection
            // if (property && this.settings.xProperties === true) {
            if (this.settings.xProperties === true) {
                let altArray = joiObj._inner.matches.map((obj) => {
                    let altName = (Utilities.getJoiLabel(obj.schema) || name);
                    //name, joiObj, parent, parameterType, useDefinitions, isAlt
                    return this.parseProperty(altName, obj.schema, property, parameterType, useDefinitions, true);
                }).filter((obj) => obj);
                property['x-alternatives'] = Hoek.clone(altArray);
            }
        }

        // convert .when() alternatives structures
        else {
            // add first into definitionCollection
            let child = joiObj._inner.matches[0].then;
            let childName = (Utilities.getJoiLabel(child) || name);
            //name, joiObj, parent, parameterType, useDefinitions, isAlt
            property = this.parseProperty(childName, child, property, parameterType, useDefinitions, false);

            // create the alternatives without appending to the definitionCollection
            if (property && this.settings.xProperties === true) {
                let altArray = joiObj._inner.matches
                    .reduce((res, obj) => {
                        obj.then && res.push(obj.then);
                        obj.otherwise && res.push(obj.otherwise);
                        return res;
                    }, [])
                    .map((joiNewObj) => {
                        let altName = (Utilities.getJoiLabel(joiNewObj) || name);
                        return this.parseProperty(altName, joiNewObj, property, parameterType, useDefinitions, true);
                    })
                    .filter((obj) => obj);
                property['x-alternatives'] = Hoek.clone(altArray);
            }
        }

        //if (!property.$ref && Utilities.geJoiLabel(joiObj)) {
        //    property.name = Utilities.geJoiLabel(joiObj);
        //}

        return property;
    }

    /**
     * selects the correct definition collection
     *
     * @param  {Boolean} isAlt
     * @return {Object}
     */
    getDefinitionCollection (isAlt) {

        return (isAlt === true) ? this.altDefinitionCollection : this.definitionCollection;
    };

    /**
     * selects the correct definition reference
     *
     * @param  {Boolean} isAlt
     * @return {String}
     */
    getDefinitionRef (isAlt) {

        return (isAlt === true) ? '#/x-alt-definitions/' : '#/definitions/';
    };

    /**
     * coverts rules into property objects
     *
     * @param  {Object} property
     * @param  {Array} rules
     * @param  {Array} ruleNames
     * @param  {String} groupName
     */
    convertRules (property, rules, ruleNames, groupName) {

        ruleNames.forEach((ruleName) => {
            this.appendToPropertyObject(property, rules, groupName, ruleName);
        });
    }

    /**
     * appends a name item to object on a property
     *
     * @param  {Object} property
     * @param  {Array} rules
     * @param  {String} groupName
     * @param  {String} ruleName
     */
    appendToPropertyObject (property, rules, groupName, ruleName) {

        if (this.hasPropertyByName(rules, ruleName)) {
            let value = this.getArgByName(rules, ruleName);
            if (Utilities.isObject(value) && Utilities.hasProperties(value) === false) {
                value = undefined;
            }
            this.addToPropertyObject(property, groupName, ruleName, value);
        }
    }

    /**
     * add a name item to object on a property
     *
     * @param  {Object} property
     * @param  {String} groupName
     * @param  {String} ruleName
     * @param  {String} value
     */
    addToPropertyObject (property, groupName, ruleName, value) {

        if (!property[groupName]) {
            property[groupName] = {};
        }
        property[groupName][ruleName] = (value !== undefined) ? value : true;
    }

    /**
     * return the value of an item in array of object by name - structure [ { name: 'value', arg: 'value' } ]
     *
     * @param  {Array} array
     * @param  {String} name
     * @return {String || Undefined}
     */
    getArgByName (array, name) {

        if (Array.isArray(array)) {
            let i = array.length;
            while (i--) {
                if (array[i].name === name) {
                    return array[i].arg;
                }
            }
        }
        return undefined;
    }

    /**
     * return existance of an item in array of - structure [ { name: 'value' } ]
     *
     * @param  {Array} array
     * @param  {String} name
     * @return {Boolean}
     */
    hasPropertyByName (array, name) {

        return array && array.some((obj) => {

            return obj.name === name;
        });
    };
}
