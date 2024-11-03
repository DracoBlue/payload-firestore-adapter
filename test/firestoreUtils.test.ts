import { collection, Firestore, getFirestore, query } from "firebase/firestore";
import { generateQueryJson } from "./firestoreQueryJsonConverter";
import { convertPayloadToFirestoreQuery } from "./firestoreUtils";
import { Where } from "payload";
import { initializeApp } from "firebase/app";

let app = initializeApp({
    projectId: "example"
});
let firestore = getFirestore(app);
const collectionName = "testcollection";

describe("convertPayloadToFirestoreQuery", () => {

    test("Simple id equals 1234", () => {
        let whereOne: Where = {
            and: [{
                id: {
                    equals: "1234"
                }
            }]
        };

        const colRef = collection(firestore, collectionName);

        let resultingQuery = convertPayloadToFirestoreQuery(firestore, collectionName, whereOne) as unknown as any;

        expect(JSON.parse(generateQueryJson(resultingQuery))).toStrictEqual({
            "collection": "testcollection",
            "filters": [
                {
                    "field": "id",
                    "operator": "==",
                    "value": "1234"
                }
            ],
            "orderBy": [],
            "limit": null
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

        let resultingQuery = convertPayloadToFirestoreQuery(firestore, collectionName, whereTwo) as unknown as any;
        expect(JSON.parse(generateQueryJson(resultingQuery))).toStrictEqual({
            "collection": "testcollection",
            "filters": [
                {
                    "filters": [
                        {
                            "field": "id",
                            "operator": "==",
                            "value": "1234"
                        },
                        {
                            "field": "_status",
                            "operator": "==",
                            "value": "draft"
                        }
                    ],
                    "operator": "and"
                }
            ],
            "orderBy": [],
            "limit": null
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

        let resultingQuery = convertPayloadToFirestoreQuery(firestore, collectionName, whereThree) as unknown as any;

        expect(JSON.parse(generateQueryJson(resultingQuery))).toStrictEqual({
            "collection": "testcollection",
            "filters": [
                {
                    "filters": [
                        {
                            "field": "key",
                            "operator": "==",
                            "value": "nav"
                        },
                        {
                            "field": "user.relationTo",
                            "operator": "==",
                            "value": "users"
                        },
                        {
                            "field": "user.value",
                            "operator": "==",
                            "value": "d0a5ea03-5ab9-4d57-b91e-9beabc1b3c28"
                        }
                    ],
                    "operator": "and"
                }
            ],
            "orderBy": [],
            "limit": null
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

        let resultingQuery = convertPayloadToFirestoreQuery(firestore, collectionName, whereFour) as unknown as any;

        expect(JSON.parse(generateQueryJson(resultingQuery))).toStrictEqual({
            "collection": "testcollection",
            "filters": [
                {
                    "filters": [
                        {
                            "filters": [
                                {
                                    "field": "_status",
                                    "operator": "==",
                                    "value": "published"
                                },
                                {
                                    "field": "_status",
                                    "operator": "==",
                                    "value": null
                                }
                            ],
                            "operator": "or"
                        },
                        {
                            "field": "id",
                            "operator": "==",
                            "value": "935ae00f-91c6-4a91-8b0f-8c4ed4c04894"
                        }
                    ],
                    "operator": "and"
                }
            ],
            "orderBy": [],
            "limit": null
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

        let resultingQuery = convertPayloadToFirestoreQuery(firestore, collectionName, whereFour) as unknown as any;
        console.log(generateQueryJson(resultingQuery));
        expect(JSON.parse(generateQueryJson(resultingQuery))).toStrictEqual({
            "collection": "testcollection",
            "filters": [
                {
                    "filters": [
                        {
                            "field": "title",
                            "operator": ">=",
                            "value": "title#2"
                        },
                        {
                            "field": "title",
                            "operator": "<=",
                            "value": "title#2"
                        }
                    ],
                    "operator": "and"
                }
            ],
            "orderBy": [],
            "limit": null
        });

    });
});


