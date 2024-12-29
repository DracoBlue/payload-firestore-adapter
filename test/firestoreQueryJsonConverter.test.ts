import { Datastore, or, and, PropertyFilter } from '@google-cloud/datastore';
import { generateQueryJson } from './../src/firestoreQueryJsonConverter';

const datastore = new Datastore({
  projectId: 'example',
});

describe('generateQueryJson', () => {
  test('simple where id == 1234', () => {
    const query = datastore.createQuery('testcollection').filter('id', '=', '1234');
    let json = generateQueryJson(query);
    expect(JSON.parse(json)).toStrictEqual({
      kinds: ['testcollection'],
      filters: [
        {
          "field": "id",
          "operator": "=",
          "value": "1234"
        }
      ],
      offset: -1,
      limit: -1,
      orderBy: [],
    });
  });

  test('simple where id == 1234 and number == 5678', () => {
    const query = datastore
      .createQuery('testcollection')
      .filter('id', '=', '1234')
      .filter('number', '=', '5678');

    let json = generateQueryJson(query);
    expect(JSON.parse(json)).toStrictEqual({
      kinds: ['testcollection'],
      filters: [
        {
          "field": "id",
          "operator": "=",
          "value": "1234"
        },
        {
          "field": "number",
          "operator": "=",
          "value": "5678"
        }
      ],
      orderBy: [],
      offset: -1,
      limit: -1,
    });
  });

  test('simple where id IN (1234,5678)', () => {
    const query = datastore.createQuery('testcollection').filter('id', 'IN', ['1234', '5678']);

    let json = generateQueryJson(query);
    expect(JSON.parse(json)).toStrictEqual({
      kinds: ['testcollection'],
      filters: [
        {
          "field": "id",
          "operator": "IN",
          "value": ["1234", "5678"]
        }
      ],
      orderBy: [],
      offset: -1,
      limit: -1,
    });
  });

  test('simple where id == 1234 OR number == 5678', () => {
    const query = datastore.createQuery('testcollection');

    query.filter(or([
      new PropertyFilter('id', '=', '1234'),
      new PropertyFilter('number', '=', '5678'),
    ]));

    console.log(JSON.stringify(query.entityFilters, null, 4));

    let json = generateQueryJson(query);
    expect(JSON.parse(json)).toStrictEqual({
      kinds: ['testcollection'],
      filters: [
        {
          "filters": [
            {
              "field": "id",
              "operator": "=",
              "value": "1234"
            },
            {
              "field": "number",
              "operator": "=",
              "value": "5678"
            }
          ],
          "operator": "OR"
        }
      ],
      "orderBy": [],
      "limit": -1,
      "offset": -1
    });
  });

  test('combination where (id == 1234 OR number == 5678) AND (id == 9 OR number == 0)', () => {
    const query = datastore.createQuery('testcollection');

    query.filter(and(
      [
        or([
          new PropertyFilter('id', '=', '1234'),
          new PropertyFilter('number', '=', '5678'),
        ]),
        or([
          new PropertyFilter('id', '=', '9'),
          new PropertyFilter('number', '=', '0'),
        ])
      ])
    );

    let json = generateQueryJson(query);
    expect(JSON.parse(json)).toStrictEqual({
      "kinds": ["testcollection"],
      "filters": [
        {
          "filters": [
            {
              "filters": [
                {
                  "field": "id",
                  "operator": "=",
                  "value": "1234"
                },
                {
                  "field": "number",
                  "operator": "=",
                  "value": "5678"
                }
              ],
              "operator": "OR"
            },
            {
              "filters": [
                {
                  "field": "id",
                  "operator": "=",
                  "value": "9"
                },
                {
                  "field": "number",
                  "operator": "=",
                  "value": "0"
                }
              ],
              "operator": "OR"
            }
          ],
          "operator": "AND"
        }
      ],
      "orderBy": [],
      "limit": -1,
      "offset": -1
    });
  });

  test('combination where (id == 1234 AND number == 5678) OR (id == 9 AND number == 0)', () => {
    const query = datastore.createQuery('testcollection');

    query.filter(or(
      [
        and([
          new PropertyFilter('id', '=', '1234'),
          new PropertyFilter('number', '=', '5678'),
        ]),
        and([
          new PropertyFilter('id', '=', '9'),
          new PropertyFilter('number', '=', '0'),
        ])
      ])
    );

    let json = generateQueryJson(query);
    expect(JSON.parse(json)).toStrictEqual({
      "kinds": ["testcollection"],
      "filters": [
        {
          "filters": [
            {
              "filters": [
                {
                  "field": "id",
                  "operator": "=",
                  "value": "1234"
                },
                {
                  "field": "number",
                  "operator": "=",
                  "value": "5678"
                }
              ],
              "operator": "AND"
            },
            {
              "filters": [
                {
                  "field": "id",
                  "operator": "=",
                  "value": "9"
                },
                {
                  "field": "number",
                  "operator": "=",
                  "value": "0"
                }
              ],
              "operator": "AND"
            }
          ],
          "operator": "OR"
        }
      ],
      "orderBy": [],
      "limit": -1,
      "offset": -1
    });
  });
  test("two queries combining where id == 1234 and the other where searches fornumber == 5678", () => {
    const collectionName = "testcollection";
    const query = datastore
      .createQuery('testcollection')
      .filter('id', '=', '1234')
      .filter('number', '=', '5678');

      console.log(query);

    let json = generateQueryJson(query);
    expect(JSON.parse(json)).toStrictEqual({
      "kinds": ["testcollection"],
      "filters": [
        {
          "field": "id",
          "operator": "=",
          "value": "1234"
        },
        {
          "field": "number",
          "operator": "=",
          "value": "5678"
        }
      ],
      orderBy: [],
      offset: -1,
      limit: -1,
    });
  });
});
