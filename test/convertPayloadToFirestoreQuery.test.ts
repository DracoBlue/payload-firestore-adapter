import { Datastore, or, and, PropertyFilter, Query } from '@google-cloud/datastore';
import { generateQueryJson } from "./../src/firestoreQueryJsonConverter";
import { convertPayloadToFirestoreQuery } from "./../src/convertPayloadToFirestoreQuery";
import { FlattenedField, SanitizedCollectionConfig, Where } from "payload";

const datastore = new Datastore({
    projectId: 'example',
}) as any;

const collectionName = "testcollection";
const sanitizedCollectionConfig = {
    flattenedFields: [
        {
            name: "id",
            type: "text",
        } as FlattenedField,
        {
            name: "tags",
            type: "text",
            hasMany: true
        } as FlattenedField,
    ],
    auth: {},
    endpoints: [],
    joins: [],
    upload: {},
    versions: {},
    access: {},
    admin: {},
    custom: {},
    dbName: "",
    defaultPopulate: [],
    defaultSort: "",
    disableDuplicate: false,
    graphQL: false,
    hooks: {},
    labels: {},
    lockDocuments: false,
    slug: collectionName,
    timestamps: false,
    typescript: {},
    ui: {},
} as unknown as SanitizedCollectionConfig;

describe("convertPayloadToFirestoreQuery", () => {

    test("Simple id equals 1234", () => {
        let whereOne: Where = {
            and: [{
                id: {
                    equals: "1234"
                }
            }]
        };

        let [resultingQuery, hasNodeConditions] = convertPayloadToFirestoreQuery(datastore, collectionName, sanitizedCollectionConfig, whereOne) as unknown as any;
        expect(hasNodeConditions).toBe(false);
        expect(JSON.parse(generateQueryJson(resultingQuery))).toStrictEqual({
            "kinds": ["testcollection"],
            "filters": [
                {
                    "field": "id",
                    "operator": "=",
                    "value": "1234"
                }
            ],
            "orderBy": [
                {
                    "field": "id",
                    "direction": "DESCENDING",
                }
            ],
            "limit": -1,
            "offset": -1
        });
    });
    test("Simple id equals 1234 and _status equals draft", () => {

        let whereTwo: Where = {
            and: [{
                id: {
                    equals: "1234"
                },
                _status: {
                    equals: "draft"
                }
            }]
        };

        let [resultingQuery, hasNodeConditions] = convertPayloadToFirestoreQuery(datastore, collectionName, sanitizedCollectionConfig, whereTwo) as unknown as any;
        expect(hasNodeConditions).toBe(false);
        expect(JSON.parse(generateQueryJson(resultingQuery))).toStrictEqual({
            "kinds": ["testcollection"],
            "filters": [
                {
                    "filters": [
                        {
                            "field": "id",
                            "operator": '=',
                            "value": "1234"
                        },
                        {
                            "field": "_status",
                            "operator": '=',
                            "value": "draft"
                        }
                    ],
                    "operator": "AND"
                }
            ],
            "orderBy": [
                {
                    "field": "id",
                    "direction": "DESCENDING",
                }
            ],
            "limit": -1,
            "offset": -1
        });
    });
    test("and(and(key=nav, user.relationTo=users, user.value=d0a5ea03-5ab9-4d57-b91e-9beabc1b3c28))", () => {


        let whereThree: Where = {
            "and": [
                {
                    "and": [
                        {
                            "key": {
                                "equals": "nav"
                            }
                        },
                        {
                            "user.relationTo": {
                                "equals": "users"
                            }
                        },
                        {
                            "user.value": {
                                "equals": "d0a5ea03-5ab9-4d57-b91e-9beabc1b3c28"
                            }
                        }
                    ]
                }
            ]
        };

        let [resultingQuery, hasNodeConditions] = convertPayloadToFirestoreQuery(datastore, collectionName, sanitizedCollectionConfig, whereThree) as unknown as any;
        expect(hasNodeConditions).toBe(false);
        expect(JSON.parse(generateQueryJson(resultingQuery))).toStrictEqual({
            "kinds": ["testcollection"],
            "filters": [
                {
                    "filters": [
                        {
                            "field": "key",
                            "operator": '=',
                            "value": "nav"
                        },
                        {
                            "field": "user.relationTo",
                            "operator": '=',
                            "value": "users"
                        },
                        {
                            "field": "user.value",
                            "operator": '=',
                            "value": "d0a5ea03-5ab9-4d57-b91e-9beabc1b3c28"
                        }
                    ],
                    "operator": "AND"
                }
            ],
            "orderBy": [
                {
                    "field": "id",
                    "direction": "DESCENDING",
                }
            ],
            "limit": -1,
            "offset": -1
        });

    });
    test("and(and(or(_status=published, _status exists false),id=935ae00f-91c6-4a91-8b0f-8c4ed4c04894))", () => {
        let whereFour: Where = {
            "and": [
                {
                    "and": [
                        {
                            "or": [
                                {
                                    "_status": {
                                        "equals": "published"
                                    }
                                },
                                {
                                    "_status": {
                                        "exists": "false"
                                    }
                                }
                            ]
                        },
                        {
                            "id": {
                                "equals": "935ae00f-91c6-4a91-8b0f-8c4ed4c04894"
                            }
                        }
                    ]
                }
            ]
        };

        let [resultingQuery, hasNodeConditions] = convertPayloadToFirestoreQuery(datastore, collectionName, sanitizedCollectionConfig, whereFour) as unknown as any;
        expect(hasNodeConditions).toBe(true);
        expect(JSON.parse(generateQueryJson(resultingQuery))).toStrictEqual({
            "kinds": ["testcollection"],
            "filters": [
                {
                    "field": "id",
                    "operator": '=',
                    "value": "935ae00f-91c6-4a91-8b0f-8c4ed4c04894"
                }
            ],
            "orderBy": [
                {
                    "field": "id",
                    "direction": "DESCENDING",
                }
            ],
            "limit": -1,
            "offset": -1
        });

    });


    test("and(and(<empty>,or(title like title#2)))", () => {
        let whereFour: Where = {
            "and": [
                {
                    "and": [
                        {},
                        {
                            "or": [
                                {
                                    "title": {
                                        "like": "title#2"
                                    }
                                }
                            ]
                        }
                    ]
                }
            ]
        };

        let [resultingQuery, hasNodeConditions] = convertPayloadToFirestoreQuery(datastore, collectionName, sanitizedCollectionConfig, whereFour) as unknown as any;
        expect(hasNodeConditions).toBe(true);
        expect(JSON.parse(generateQueryJson(resultingQuery))).toStrictEqual({
            "kinds": ["testcollection"],
            "filters": [],
            "orderBy": [
                {
                    "field": "id",
                    "direction": "DESCENDING",
                }
            ],
            "limit": -1,
            "offset": -1
        });

    });


    test("in-query on a hasMany field", () => {
        let whereOne: Where = {
            and: [{
                tags: {
                    in: ["one", "two"]
                }
            }]
        };

        let [resultingQuery, hasNodeConditions] = convertPayloadToFirestoreQuery(datastore, collectionName, sanitizedCollectionConfig, whereOne) as unknown as any;
        expect(hasNodeConditions).toBe(false);
        expect(JSON.parse(generateQueryJson(resultingQuery))).toStrictEqual({
            "kinds": ["testcollection"],
            "filters": [
                {
                    "field": "tags",
                    "operator": "IN",
                    "value": ["one", "two"]
                }
            ],
            "orderBy": [
                {
                    "field": "id",
                    "direction": "DESCENDING",
                }
            ],
            "limit": -1,
            "offset": -1
        });
    });


    test("in-query on a non-hasMany field", () => {
        let whereOne: Where = {
            and: [{
                id: {
                    in: ["one", "two"]
                }
            }]
        };

        let [resultingQuery, hasNodeConditions] = convertPayloadToFirestoreQuery(datastore, collectionName, sanitizedCollectionConfig, whereOne) as unknown as any;
        expect(hasNodeConditions).toBe(false);
        expect(JSON.parse(generateQueryJson(resultingQuery))).toStrictEqual({
            "kinds": ["testcollection"],
            "filters": [
                {
                    "field": "id",
                    "operator": "IN",
                    "value": ["one", "two"]
                }
            ],
            "orderBy": [
                {
                    "field": "id",
                    "direction": "DESCENDING",
                }
            ],
            "limit": -1,
            "offset": -1
        });
    });
});


