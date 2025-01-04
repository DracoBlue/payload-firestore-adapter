import { applyPayloadFilter } from "./../src/applyPayloadFilter";

describe('applyPayloadFilter', () => {
  // ✅ Equals Operator Tests
  describe('equals operator', () => {
    test('matches exact value', () => {
      const entity = { age: 30 };
      const query = { age: { equals: 30 } };
      expect(applyPayloadFilter(entity, query)).toBe(true);
    });

    test('does not match different value', () => {
      const entity = { age: 25 };
      const query = { age: { equals: 30 } };
      expect(applyPayloadFilter(entity, query)).toBe(false);
    });

    test('handles string value', () => {
      const entity = { name: 'Alice' };
      const query = { name: { equals: 'Alice' } };
      expect(applyPayloadFilter(entity, query)).toBe(true);
    });
  });

  // ✅ Not Equals Operator Tests
  describe('not_equals operator', () => {
    test('does not match exact value', () => {
      const entity = { age: 30 };
      const query = { age: { not_equals: 30 } };
      expect(applyPayloadFilter(entity, query)).toBe(false);
    });

    test('matches different value', () => {
      const entity = { age: 25 };
      const query = { age: { not_equals: 30 } };
      expect(applyPayloadFilter(entity, query)).toBe(true);
    });

    test('handles string mismatch', () => {
      const entity = { name: 'Alice' };
      const query = { name: { not_equals: 'Bob' } };
      expect(applyPayloadFilter(entity, query)).toBe(true);
    });
  });

  // ✅ Greater Than Operator Tests
  describe('greater_than operator', () => {
    test('matches value greater than specified', () => {
      const entity = { age: 35 };
      const query = { age: { greater_than: 30 } };
      expect(applyPayloadFilter(entity, query)).toBe(true);
    });

    test('does not match value equal to specified', () => {
      const entity = { age: 30 };
      const query = { age: { greater_than: 30 } };
      expect(applyPayloadFilter(entity, query)).toBe(false);
    });

    test('does not match value less than specified', () => {
      const entity = { age: 25 };
      const query = { age: { greater_than: 30 } };
      expect(applyPayloadFilter(entity, query)).toBe(false);
    });
  });

  // ✅ Less Than Operator Tests
  describe('less_than operator', () => {
    test('matches value less than specified', () => {
      const entity = { age: 25 };
      const query = { age: { less_than: 30 } };
      expect(applyPayloadFilter(entity, query)).toBe(true);
    });

    test('does not match value equal to specified', () => {
      const entity = { age: 30 };
      const query = { age: { less_than: 30 } };
      expect(applyPayloadFilter(entity, query)).toBe(false);
    });

    test('does not match value greater than specified', () => {
      const entity = { age: 35 };
      const query = { age: { less_than: 30 } };
      expect(applyPayloadFilter(entity, query)).toBe(false);
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
  });

  // ✅ Contains Operator Tests
  describe('contains operator', () => {
    test('matches substring in string', () => {
      const entity = { description: 'This is important' };
      const query = { description: { contains: 'important' } };
      expect(applyPayloadFilter(entity, query)).toBe(true);
    });

    test('is case insensitive', () => {
      const entity = { description: 'This is Important' };
      const query = { description: { contains: 'important' } };
      expect(applyPayloadFilter(entity, query)).toBe(true);
    });

    test('does not match if substring is not present', () => {
      const entity = { description: 'This is trivial' };
      const query = { description: { contains: 'important' } };
      expect(applyPayloadFilter(entity, query)).toBe(false);
    });
  });

  // ✅ In Operator Tests
  describe('in operator', () => {
    test('matches value in array', () => {
      const entity = { status: 'active' };
      const query = { status: { in: ['active', 'pending'] } };
      expect(applyPayloadFilter(entity, query)).toBe(true);
    });

    test('does not match value not in array', () => {
      const entity = { status: 'inactive' };
      const query = { status: { in: ['active', 'pending'] } };
      expect(applyPayloadFilter(entity, query)).toBe(false);
    });

    test('handles numeric arrays', () => {
      const entity = { age: 25 };
      const query = { age: { in: [20, 25, 30] } };
      expect(applyPayloadFilter(entity, query)).toBe(true);
    });
  });

  // ✅ Exists Operator Tests
  describe('exists operator', () => {
    test('matches if field exists', () => {
      const entity = { status: 'active' };
      const query = { status: { exists: true } };
      expect(applyPayloadFilter(entity, query)).toBe(true);
    });

    test('does not match if field does not exist', () => {
      const entity = {};
      const query = { status: { exists: true } };
      expect(applyPayloadFilter(entity, query)).toBe(false);
    });

    test('matches if field does not exist', () => {
      const entity = {};
      const query = { status: { exists: false } };
      expect(applyPayloadFilter(entity, query)).toBe(true);
    });
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
