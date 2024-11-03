import { initializeApp } from "firebase/app";
import { generateQueryJson } from "./firestoreQueryJsonConverter";
import { and, collection, getFirestore, or, query, where } from "firebase/firestore";

let app = initializeApp({
  projectId: "example"
});
let firestore = getFirestore(app);

describe("generateQueryJson", () => {

  test("simple where id == 1234", () => {

    const collectionName = "testcollection";
    const colRef = collection(firestore, collectionName);
    const firestoreQuery = query(colRef, where("id", "==", "1234"));
    let json = generateQueryJson(firestoreQuery);
    expect(JSON.parse(json)).toStrictEqual({
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


  test("simple where id == 1234 and number = 5678", () => {

    const collectionName = "testcollection";
    const colRef = collection(firestore, collectionName);
    let firestoreQuery = query(colRef, where("id", "==", "1234"));
    firestoreQuery = query(firestoreQuery, where("number", "==", "5678"));
    let json = generateQueryJson(firestoreQuery);
    expect(JSON.parse(json)).toStrictEqual({
      "collection": "testcollection",
      "filters": [
        {
          "field": "id",
          "operator": "==",
          "value": "1234"
        },
        {
          "field": "number",
          "operator": "==",
          "value": "5678"
        }
      ],
      "orderBy": [],
      "limit": null
    });

  });



  test("simple where id in (1234,5678)", () => {

    const collectionName = "testcollection";
    const colRef = collection(firestore, collectionName);
    let firestoreQuery = query(colRef, where("id", "in", ["1234", "5678"]));
    let json = generateQueryJson(firestoreQuery);
    expect(JSON.parse(json)).toStrictEqual({
      "collection": "testcollection",
      "filters": [
        {
          "field": "id",
          "operator": "in",
          "value": {
            "values": [
              {
                "stringValue": "1234"
              },
              {
                "stringValue": "5678"
              }
            ]
          }
        }
      ],
      "orderBy": [],
      "limit": null
    });
  });

  test("simple where id == 1234 or number == 5678", () => {

    const collectionName = "testcollection";
    const colRef = collection(firestore, collectionName);
    let firestoreQuery = query(colRef, or(where("id", "==", "1234"), where("number", "==", "5678")));
    let json = generateQueryJson(firestoreQuery);
    expect(JSON.parse(json)).toStrictEqual({
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
              "field": "number",
              "operator": "==",
              "value": "5678"
            }
          ],
          "operator": "or"
        }
      ],
      "orderBy": [],
      "limit": null
    });
  });


  test("combination where (id == 1234 or number == 5678) && (id == 9 or number == 0)", () => {

    const collectionName = "testcollection";
    const colRef = collection(firestore, collectionName);
    let firestoreQuery = query(colRef, and(
      or(where("id", "==", "1234"), where("number", "==", "5678")),
      or(where("id", "==", "9"), where("number", "==", "0"))
    ));
    let json = generateQueryJson(firestoreQuery);
    expect(JSON.parse(json)).toStrictEqual({
      "collection": "testcollection",
      "filters": [
        {
          "filters": [
            {
              "filters": [
                {
                  "field": "id",
                  "operator": "==",
                  "value": "1234"
                },
                {
                  "field": "number",
                  "operator": "==",
                  "value": "5678"
                }
              ],
              "operator": "or"
            },
            {
              "filters": [
                {
                  "field": "id",
                  "operator": "==",
                  "value": "9"
                },
                {
                  "field": "number",
                  "operator": "==",
                  "value": "0"
                }
              ],
              "operator": "or"
            }
          ],
          "operator": "and"
        }
      ],
      "orderBy": [],
      "limit": null
    });
  });

  test("combination where (id == 1234 or number == 5678) or (id == 9 or number == 0)", () => {
    const collectionName = "testcollection";
    const colRef = collection(firestore, collectionName);
    let firestoreQuery = query(colRef, or(
      or(where("id", "==", "1234"), where("number", "==", "5678")),
      or(where("id", "==", "9"), where("number", "==", "0"))
    ));
    let json = generateQueryJson(firestoreQuery);
    expect(JSON.parse(json)).toStrictEqual({
      "collection": "testcollection",
      "filters": [
        {
          "filters": [
            {
              "filters": [
                {
                  "field": "id",
                  "operator": "==",
                  "value": "1234"
                },
                {
                  "field": "number",
                  "operator": "==",
                  "value": "5678"
                }
              ],
              "operator": "or"
            },
            {
              "filters": [
                {
                  "field": "id",
                  "operator": "==",
                  "value": "9"
                },
                {
                  "field": "number",
                  "operator": "==",
                  "value": "0"
                }
              ],
              "operator": "or"
            }
          ],
          "operator": "or"
        }
      ],
      "orderBy": [],
      "limit": null
    });
  });


  test("combination where (id == 1234 and number == 5678) or (id == 9 and number == 0)", () => {
    const collectionName = "testcollection";
    const colRef = collection(firestore, collectionName);
    let firestoreQuery = query(colRef, or(
      and(where("id", "==", "1234"), where("number", "==", "5678")),
      and(where("id", "==", "9"), where("number", "==", "0"))
    ));
    let json = generateQueryJson(firestoreQuery);
    expect(JSON.parse(json)).toStrictEqual({
      "collection": "testcollection",
      "filters": [
        {
          "filters": [
            {
              "filters": [
                {
                  "field": "id",
                  "operator": "==",
                  "value": "1234"
                },
                {
                  "field": "number",
                  "operator": "==",
                  "value": "5678"
                }
              ],
              "operator": "and"
            },
            {
              "filters": [
                {
                  "field": "id",
                  "operator": "==",
                  "value": "9"
                },
                {
                  "field": "number",
                  "operator": "==",
                  "value": "0"
                }
              ],
              "operator": "and"
            }
          ],
          "operator": "or"
        }
      ],
      "orderBy": [],
      "limit": null
    });
  });



  test("two queries combining where id == 1234 and the other where searches fornumber == 5678", () => {
    const collectionName = "testcollection";
    const colRef = collection(firestore, collectionName);
    let firestoreQuery = query(colRef, where("id", "==", "1234"));
    firestoreQuery = query(firestoreQuery, where("number", "==", "5678"));
    let json = generateQueryJson(firestoreQuery);
    expect(JSON.parse(json)).toStrictEqual({
      "collection": "testcollection",
      "filters": [
        {
          "field": "id",
          "operator": "==",
          "value": "1234"
        },
        {
          "field": "number",
          "operator": "==",
          "value": "5678"
        }
      ],
      "orderBy": [],
      "limit": null
    });

  });
});