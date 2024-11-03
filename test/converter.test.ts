import { getFirestore, query, where, or } from 'firebase/firestore';
import { convertPayloadToFirestoreQuery } from './firestoreUtils';

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  and: jest.fn(),
  or: jest.fn(),
}));

describe("convertPayloadToFirestoreQuery", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("1. Simple equals", () => {
    const payloadQuery = { name: "John Doe" };
    convertPayloadToFirestoreQuery(getFirestore(), "users", payloadQuery);

    expect(where).toHaveBeenCalledWith("name", "==", "John Doe");
    expect(query).toHaveBeenCalled();
  });

  test("2. Exists query with false", () => {
    const payloadQuery = { fieldExists: { exists: false } };
    convertPayloadToFirestoreQuery(getFirestore(), "users", payloadQuery);

    expect(where).toHaveBeenCalledWith("fieldExists", "==", null);
    expect(query).toHaveBeenCalled();
  });

  test("3. Exists query with true", () => {
    const payloadQuery = { fieldExists: { exists: true } };
    convertPayloadToFirestoreQuery(getFirestore(), "users", payloadQuery);

    expect(where).toHaveBeenCalledWith("fieldExists", "!=", null);
    expect(query).toHaveBeenCalled();
  });

  test("4. Or query", () => {
    const payloadQuery = {
      or: [
        { age: { greater_than: 20 } },
        { status: "active" }
      ]
    };
    convertPayloadToFirestoreQuery(getFirestore(), "users", payloadQuery);

    expect(or).toHaveBeenCalled();
    expect(where).toHaveBeenCalledWith("age", ">", 20);
    expect(where).toHaveBeenCalledWith("status", "==", "active");
    expect(query).toHaveBeenCalled();
  });

  test("5. And query", () => {
    const payloadQuery = {
      and: [
        { name: "John Doe" },
        { age: { greater_than: 18 } }
      ]
    };
    convertPayloadToFirestoreQuery(getFirestore(), "users", payloadQuery);

    expect(where).toHaveBeenCalledWith("name", "==", "John Doe");
    expect(where).toHaveBeenCalledWith("age", ">", 18);
    expect(query).toHaveBeenCalled();
  });

  test("6. Nested and/or query", () => {
    const payloadQuery = {
      and: [
        {
          or: [
            { age: { greater_than: 20 } },
            { status: "active" }
          ]
        },
        { name: "John Doe" },
        { tags: { in: ["tag1", "tag2"] } }
      ]
    };
    convertPayloadToFirestoreQuery(getFirestore(), "users", payloadQuery);

    expect(or).toHaveBeenCalled();
    expect(where).toHaveBeenCalledWith("age", ">", 20);
    expect(where).toHaveBeenCalledWith("status", "==", "active");
    expect(where).toHaveBeenCalledWith("name", "==", "John Doe");
    expect(where).toHaveBeenCalledWith("tags", "in", ["tag1", "tag2"]);
    expect(query).toHaveBeenCalled();
  });
});
