import { initializeApp } from "firebase-admin/app";
import { generateQueryJson } from "./../src/firestoreQueryJsonConverter";
import { Filter, getFirestore } from "firebase-admin/firestore";

let app = initializeApp({
  projectId: "example"
});
let firestore = getFirestore(app);

describe("generateQueryJson", () => {

  test("simple where id == 1234", () => {

    const collectionName = "testcollection";
    const colRef = firestore.collection(collectionName);
    const firestoreQuery = colRef.where("id", "==", "1234");
    let json = generateQueryJson(firestoreQuery);
    expect(JSON.parse(json)).toStrictEqual({
      "collection": "testcollection",
      "filters": [
        {
          "field": "id",
          "operator": "EQUAL",
          "value": "1234"
        }
      ],
      "orderBy": []
    });

  });


  test("simple where id == 1234 and number = 5678", () => {

    const collectionName = "testcollection";
    const colRef = firestore.collection(collectionName);
    let firestoreQuery = colRef.where("id", "==", "1234");
    firestoreQuery = firestoreQuery.where("number", "==", "5678");
    let json = generateQueryJson(firestoreQuery);
    expect(JSON.parse(json)).toStrictEqual({
      "collection": "testcollection",
      "filters": [
        {
          "field": "id",
          "operator": "EQUAL",
          "value": "1234"
        },
        {
          "field": "number",
          "operator": "EQUAL",
          "value": "5678"
        }
      ],
      "orderBy": []
    });

  });



  test("simple where id in (1234,5678)", () => {

    const collectionName = "testcollection";
    const colRef = firestore.collection(collectionName);
    let firestoreQuery = colRef.where("id", "in", ["1234", "5678"]);
    let json = generateQueryJson(firestoreQuery);
    expect(JSON.parse(json)).toStrictEqual({
      "collection": "testcollection",
      "filters": [
        {
          "field": "id",
          "operator": "IN",
          "value": ["1234", "5678"]
        }
      ],
      "orderBy": []
    });
  });

  test("simple where id == 1234 or number == 5678", () => {

    const collectionName = "testcollection";
    const colRef = firestore.collection(collectionName);
    let firestoreQuery = colRef.where(Filter.or(Filter.where("id", "==", "1234"), Filter.where("number", "==", "5678")));
    let json = generateQueryJson(firestoreQuery);
    expect(JSON.parse(json)).toStrictEqual({
      "collection": "testcollection",
      "filters": [
        {
          "filters": [
            {
              "field": "id",
              "operator": "EQUAL",
              "value": "1234"
            },
            {
              "field": "number",
              "operator": "EQUAL",
              "value": "5678"
            }
          ],
          "operator": "OR"
        }
      ],
      "orderBy": []
    });
  });


  test("combination where (id == 1234 or number == 5678) && (id == 9 or number == 0)", () => {

    const collectionName = "testcollection";
    const colRef = firestore.collection(collectionName);
    let firestoreQuery = colRef.where(Filter.and(
      Filter.or(Filter.where("id", "==", "1234"), Filter.where("number", "==", "5678")),
      Filter.or(Filter.where("id", "==", "9"), Filter.where("number", "==", "0"))
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
                  "operator": "EQUAL",
                  "value": "1234"
                },
                {
                  "field": "number",
                  "operator": "EQUAL",
                  "value": "5678"
                }
              ],
              "operator": "OR"
            },
            {
              "filters": [
                {
                  "field": "id",
                  "operator": "EQUAL",
                  "value": "9"
                },
                {
                  "field": "number",
                  "operator": "EQUAL",
                  "value": "0"
                }
              ],
              "operator": "OR"
            }
          ],
          "operator": "AND"
        }
      ],
      "orderBy": []
    });
  });

  test("combination where (id == 1234 or number == 5678) or (id == 9 or number == 0)", () => {
    const collectionName = "testcollection";
    const colRef = firestore.collection(collectionName);
    let firestoreQuery = colRef.where(Filter.or(
      Filter.or(Filter.where("id", "==", "1234"), Filter.where("number", "==", "5678")),
      Filter.or(Filter.where("id", "==", "9"), Filter.where("number", "==", "0"))
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
                  "operator": "EQUAL",
                  "value": "1234"
                },
                {
                  "field": "number",
                  "operator": "EQUAL",
                  "value": "5678"
                }
              ],
              "operator": "OR"
            },
            {
              "filters": [
                {
                  "field": "id",
                  "operator": "EQUAL",
                  "value": "9"
                },
                {
                  "field": "number",
                  "operator": "EQUAL",
                  "value": "0"
                }
              ],
              "operator": "OR"
            }
          ],
          "operator": "OR"
        }
      ],
      "orderBy": []
    });
  });


  test("combination where (id == 1234 and number == 5678) or (id == 9 and number == 0)", () => {
    const collectionName = "testcollection";
    const colRef = firestore.collection(collectionName);
    let firestoreQuery = colRef.where(Filter.or(
      Filter.and(Filter.where("id", "==", "1234"), Filter.where("number", "==", "5678")),
      Filter.and(Filter.where("id", "==", "9"), Filter.where("number", "==", "0"))
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
                  "operator": "EQUAL",
                  "value": "1234"
                },
                {
                  "field": "number",
                  "operator": "EQUAL",
                  "value": "5678"
                }
              ],
              "operator": "AND"
            },
            {
              "filters": [
                {
                  "field": "id",
                  "operator": "EQUAL",
                  "value": "9"
                },
                {
                  "field": "number",
                  "operator": "EQUAL",
                  "value": "0"
                }
              ],
              "operator": "AND"
            }
          ],
          "operator": "OR"
        }
      ],
      "orderBy": []
    });
  });



  test("two queries combining where id == 1234 and the other where searches fornumber == 5678", () => {
    const collectionName = "testcollection";
    const colRef = firestore.collection(collectionName);
    let firestoreQuery = colRef.where("id", "==", "1234");
    firestoreQuery = firestoreQuery.where("number", "==", "5678");
    let json = generateQueryJson(firestoreQuery);
    expect(JSON.parse(json)).toStrictEqual({
      "collection": "testcollection",
      "filters": [
        {
          "field": "id",
          "operator": "EQUAL",
          "value": "1234"
        },
        {
          "field": "number",
          "operator": "EQUAL",
          "value": "5678"
        }
      ],
      "orderBy": []
    });

  });
});