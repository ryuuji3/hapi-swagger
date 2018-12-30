// defaults settings for plug-in
export type SwaggerSchemes = "http" | "https" | "ws" | "wss";
export interface ISwaggerTagObject {
    name: string;
    description?: string;
    externalDocs?: ISwaggerExternalDocumentationObject;
}
export interface ISwaggerExternalDocumentationObject {
    description?: string;
    url: string;
}
export interface ISwaggerSecuritySchemaObject {
    [xProperty: string]: any;
    type: "basic" | "apiKey" | "oauth2";
    description?: string;
    name?: string;
    in?: "query" | "header";
    flow?: "implicit" | "password" | "application" | "accessCode";
    authorizationUrl?: string;
    tokenUrl?: string;
    scopes?: ISwaggerScopesObject;
}
export interface ISwaggerScopesObject {
    [key: string]: string;
}
export type MimeTypes = string[];
export interface IPluginOptions {
    // URLs and Plugin
    schemes?: string[];
    host?: string;
    auth: boolean;
    cors?: boolean;
    // JSON
    jsonPath: string;
    basePath: string;
    pathPrefixSize: number;
    pathReplacements: any[];
    info?: {
        [xProperty: string]: any;
        title?: string;
        version?: string;
        description?: string;
        termsOfService?: string;
        contact?: {
            name?: string;
            url?: string;
            email?: string;
        };
        license?: {
            name: string;
            url: string;
        };
    };
    tags?: ISwaggerTagObject[];
    grouping: "path" | "tags";
    tagsGroupingFilter: (tag: string) => boolean;
    securityDefinitions?: { [key: string]: ISwaggerSecuritySchemaObject };
    payloadType: "json" | "form";
    documentationRouteTags: string | string[];
    consumes?: MimeTypes;
    produces?: MimeTypes;
    xProperties: boolean;
    reuseDefinitions: boolean;
    definitionPrefix: "default" | "useLabel";
    deReference: boolean;
    debug: boolean;
    [xProperty: string]: any;
    // UI
    swaggerUI: boolean;
    swaggerUIPath: string;
    documentationPage: boolean;
    documentationPath: string;
    expanded: "none" | "list" | "full";
    jsonEditor: boolean;
    sortTags: "default" | "name";
    sortEndpoints: "path" | "method" | "ordered";
    lang: string;
    uiCompleteScript: string | null;
    validatorUrl: string | null;
    // Undocumented
    sortPaths: string;
    acceptToProduce: boolean;
}

const settings = {
    basePath: "/",
    debug: false,
    jsonPath: "/swagger.json",
    documentationPath: "/documentation",
    documentationRouteTags: [],
    swaggerUIPath: "/swaggerui/",
    auth: false,
    pathPrefixSize: 1,
    payloadType: "json",
    documentationPage: true,
    swaggerUI: true,
    jsonEditor: false,
    expanded: "list", // none, list or full
    lang: "en",
    sortTags: "default",
    sortEndpoints: "path",
    sortPaths: "unsorted",
    grouping: "path",
    tagsGroupingFilter: tag => tag !== "api",
    uiCompleteScript: null,
    xProperties: true,
    reuseDefinitions: true,
    definitionPrefix: "default",
    deReference: false,
    validatorUrl: "//online.swagger.io/validator",
    acceptToProduce: true, // internal, NOT public
    pathReplacements: []
};

export default settings;
