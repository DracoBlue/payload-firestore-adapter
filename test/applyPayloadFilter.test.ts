import { applyPayloadFilter } from "./../src/applyPayloadFilter";

describe('applyPayloadFilter', () => {
  test('Matches equality condition', () => {
    const entity = { status: "active" };
    const query = { status: { equals: "active" } };
    expect(applyPayloadFilter(entity, query)).toBe(true);
  });

  test('Rejects non-matching equality condition', () => {
    const entity = { status: "inactive" };
    const query = { status: { equals: "active" } };
    expect(applyPayloadFilter(entity, query)).toBe(false);
  });

  test('Matches exists:true condition', () => {
    const entity = { status: "active" };
    const query = { status: { exists: true } };
    expect(applyPayloadFilter(entity, query)).toBe(true);
  });

  test('Matches exists:false condition', () => {
    const entity = {};
    const query = { status: { exists: false } };
    expect(applyPayloadFilter(entity, query)).toBe(true);
  });

  test('Matches less_than condition', () => {
    const entity = { timestamp: new Date("2024-12-31T23:59:59Z") };
    const query = { timestamp: { less_than: "2025-01-01T00:00:00Z" } };
    expect(applyPayloadFilter(entity, query)).toBe(true);
  });

  test('Rejects non-matching less_than condition', () => {
    const entity = { timestamp: new Date("2025-01-02T00:00:00Z") };
    const query = { timestamp: { less_than: "2025-01-01T00:00:00Z" } };
    expect(applyPayloadFilter(entity, query)).toBe(false);
  });

  test('Handles nested and/or conditions', () => {
    const entity = { status: "active", timestamp: new Date("2024-12-31T23:59:59Z") };
    const query = {
      and: [
        { status: { equals: "active" } },
        {
          or: [
            { timestamp: { less_than: "2025-01-01T00:00:00Z" } },
            { status: { equals: "inactive" } }
          ]
        }
      ]
    };
    expect(applyPayloadFilter(entity, query)).toBe(true);
  });

  test('Handles complex or conditions', () => {
    const entity = { status: "inactive" };
    const query = {
      or: [
        { status: { equals: "active" } },
        { status: { equals: "inactive" } }
      ]
    };
    expect(applyPayloadFilter(entity, query)).toBe(true);
  });
});



