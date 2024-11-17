import type { CollectionSlug, Payload } from 'payload'
import { BasePayload, getPayload } from 'payload'
import config from './src/payload.config';
import assert from 'node:assert';
import { Field } from 'payload';
import { clear } from 'node:console';

let payload: Payload;
let DEFAULT_TIMEOUT = 20000;
let BEFORE_EACH_TIMEOUT = 10000;


describe('firestore adapter tests', () => {
  
  let clearDocs = async (collectionNames: Array<CollectionSlug>) => {
    for (let collection of collectionNames) {
      let result = await payload.delete({
        collection,
        where: { id: { exists: true } },
      });
      console.log('clearDocs: deleted', result.docs.length, 'docs in', collection)
    }
  }

  beforeAll(async () => {
    payload = await getPayload({config});
  });


  beforeEach(async () => {
    await clearDocs(["books", "topics"]);
  }, BEFORE_EACH_TIMEOUT)

  afterAll(async () => {
  })

  it('create and delete collection items', async () => {
    let book: any = await payload.create({
        collection: 'books',
        data: {
          author: "author#1",
          title: "title#1",
          publisher: "publisher#1"
        }
      });
      console.log('book', book);
  
  
      //assert(book._status === "draft");
      assert(book.author === "author#1");
      assert(book.title === "title#1");
      assert(book.publisher === "publisher#1");
      assert(book.id);
      assert(book.updatedAt);
      assert(book.createdAt);
      
      let deleteBook = await payload.delete({
        collection: "books",
        id: book.id
      });
      console.log('delete book', deleteBook);      
    }, DEFAULT_TIMEOUT);

    it('update and read references of collection items', async () => {
      let book = await payload.create({
        collection: 'books',
        data: {
          author: "author#2",
          title: "title#2",
          publisher: "publisher#2"
        }
      });
      console.log('book', book);
  
  
      //assert(book._status === "draft");
      assert(book.author === "author#2");
      assert(book.title === "title#2");
      assert(book.publisher === "publisher#2");
      assert(book.id);
      assert(book.updatedAt);
      assert(book.createdAt);

      const topics: any = await payload.find({
        collection: 'topics',
        where: {
          title: {
            equals: "Demokratie",
          },
        },
        limit: 1
      });
  
      let topic = null;
  
      if (topics.docs.length) {
        topic = topics.docs[0];
      } else {
        topic = await payload.create({
          collection: 'topics',
          data: {
            title: "DIY",
          }
        });
      }
    
      let updateBook = await payload.update({
        collection: "books",
        id: book.id,
        data: {
          topics: [topic.id],
          publisher: "title2updated"
        }
      });
      console.log('updated book', updateBook);
  
      const titleFoundBooks: any = await payload.find({
          collection: 'books',
          where: {
            title: {
              equals: "title#2",
            },
          },
          page: 8,
          limit: 0,
          depth: 2
      });
  
      console.log('titleFoundBooks', titleFoundBooks.docs.length);
  
      const titleFoundStats: any = await payload.count({
        collection: 'books',
        where: {
          title: {
            equals: "title#2",
          },
        }
    });
  
    console.log('titleSlugBooks count', titleFoundStats.totalDocs);
  
  }, DEFAULT_TIMEOUT);

  it('update and read globals', async () => {
    const topics: any = await payload.find({
      collection: 'topics',
      where: {
        title: {
          equals: "DIY",
        },
      },
      limit: 1
    });

    let topic = null;
  
      if (topics.docs.length) {
        topic = topics.docs[0];
      } else {
        topic = await payload.create({
          collection: 'topics',
          data: {
            title: "DIY",
          }
        });
      }

    let configuration: any = await payload.updateGlobal({
      slug: 'configuration',
      data: {
        heroTitle: "title"
      }
    });
    console.log('configuration', configuration);
      
    let homepage: any = await payload.updateGlobal({
      slug: 'homepage',
      data: {
        heroTitle: "title " + (new Date()).toISOString(),
        heroDescription: "description",
        heroFootnote: "footnote"
      }
    });
    console.log('homepage', homepage);
  
    const findByIdTopic: any = await payload.findByID({
      collection: 'topics',
      id: topic.id,
    });
  
    console.log('findByIdTopic', findByIdTopic);
  
  }, DEFAULT_TIMEOUT);

  it('find versions of collections and globals', async () => {
    let book = await payload.create({
      collection: 'books',
      data: {
        author: "author#3",
        title: "title#3",
        publisher: "publisher#3"
      }
    });
    console.log('book', book);
    let updateBook = await payload.update({
      collection: "books",
      id: book.id,
      data: {
        publisher: "title3updated"
      }
    });
    const findBooksVersions: any = await payload.findVersions({
      collection: 'books',
      where: {
        parent: {
          equals: book.id
        }
      }
    });
  
    console.log('findBooksVersions', findBooksVersions.docs);
  
  
    let findGlobalHomepage: any = await payload.findGlobal({
      slug: 'homepage'
    });
  
    console.log('findGlobalHomepage', findGlobalHomepage);
  
  
    let findGlobalVersions: any = await payload.findGlobalVersions({
      slug: 'homepage',
      limit: 10000
    });
  
    console.log('findGlobalVersions', findGlobalVersions.docs);
  
    let latestFindGlobalVersions = findGlobalVersions.docs.filter((doc: any) => doc.latest);
    let notLatestFindGlobalVersions = findGlobalVersions.docs.filter((doc: any) => !doc.latest);
    console.log('latestFindGlobalVersions.length', latestFindGlobalVersions.length);
    console.log('notLatestFindGlobalVersions.length', notLatestFindGlobalVersions.length);
  
  }, DEFAULT_TIMEOUT)

  it('should query hasMany in for one', async () => {
    const withTagsOneAndFive = await payload.create({
      collection: 'books',
      data: {
        author: "author with tags: one, five",
        title: "title with tags: one, five",
        publisher: "publisher with tags: one, five",
        tags: ['one', 'five']
      },
    })

    const withTagTwo = await payload.create({
      collection: 'books',
      data: {
        author: "author with tags: two",
        title: "title with tags: two",
        publisher: "publisher with tags: two",
        tags: ['two'],
      },
    })

    const { docs } = await payload.find({
      collection: 'books',
      where: {
        tags: {
          in: ['one'],
        },
      },
    })

    let tagFieldConfig = payload.collections["books"].config.fields.find((field) => (field as any).name === "tags");
    expect(tagFieldConfig).toBeDefined();
    expect(tagFieldConfig.name).toBe("tags");
    expect(tagFieldConfig.hasMany).toBe(true);
    expect(docs.length).toBeGreaterThan(0);

    for (let doc of docs) {
      expect(doc.tags).toContain('one');
      expect(doc.tags).not.toContain('two');
    }

  }, DEFAULT_TIMEOUT)

  it('should query hasMany in for one + five', async () => {
    const withTagsOneAndFive = await payload.create({
      collection: 'books',
      data: {
        author: "author with tags: one, five",
        title: "title with tags: one, five",
        publisher: "publisher with tags: one, five",
        tags: ['one', 'five']
      },
    })

    const withTagTwo = await payload.create({
      collection: 'books',
      data: {
        author: "author with tags: two",
        title: "title with tags: two",
        publisher: "publisher with tags: two",
        tags: ['two'],
      },
    })

    const { docs } = await payload.find({
      collection: 'books',
      where: {
        tags: {
          in: ['one', 'five'],
        },
      },
    })

    expect(docs.length).toBeGreaterThan(0);

    for (let doc of docs) {
      expect(doc.tags).toContain('one');
      expect(doc.tags).toContain('five');
      expect(doc.tags).not.toContain('two');
    }

  }, DEFAULT_TIMEOUT)



  it('should query hasMany in for one + two with no results', async () => {
    const withTagsOneAndFive = await payload.create({
      collection: 'books',
      data: {
        author: "author with tags: one, five",
        title: "title with tags: one, five",
        publisher: "publisher with tags: one, five",
        tags: ['one', 'five']
      },
    })

    const withTagTwo = await payload.create({
      collection: 'books',
      data: {
        author: "author with tags: two",
        title: "title with tags: two",
        publisher: "publisher with tags: two",
        tags: ['two'],
      },
    })

    const { docs: inBothDocs } = await payload.find({
      collection: 'books',
      where: {
        tags: {
          in: ['one', 'two'],
        },
        id: {
          in: [withTagsOneAndFive.id, withTagTwo.id]
        }
      },
      limit: 0
    })

    expect(inBothDocs).toHaveLength(2);


    const { docs: inOneDocs } = await payload.find({
      collection: 'books',
      where: {
        tags: {
          in: ['one'],
        },
        id: {
          in: [withTagsOneAndFive.id, withTagTwo.id]
        }
      },
      limit: 0
    })

    expect(inOneDocs).toHaveLength(1);



    const { docs: inNoneOfThoseDocs } = await payload.find({
      collection: 'books',
      where: {
        tags: {
          in: ['hai'],
        },
        id: {
          in: [withTagsOneAndFive.id, withTagTwo.id]
        }
      },
      limit: 0
    })

    expect(inNoneOfThoseDocs).toHaveLength(0);


  }, DEFAULT_TIMEOUT);
/*
  it('should query hasMany within an array', async () => {
    const docFirst = await payload.create({
      collection: 'books',
      data: {
        author: 'required',
        title: 'required',
        publisher: 'required',
        array: [
          {
            texts: ['text_1', 'text_2'],
          },
        ],
      },
    })

    const docSecond = await payload.create({
      collection: 'books',
      data: {
        author: 'required',
        title: 'required',
        publisher: 'required',
        array: [
          {
            texts: ['text_other', 'text_2'],
          },
        ],
      },
    })

    const resEqualsFull = await payload.find({
      collection: 'books',
      where: {
        'array.texts': {
          equals: 'text_2',
        },
      },
      sort: '-createdAt',
    })

    console.log('resEqualsFull', resEqualsFull);

    expect(resEqualsFull.docs.find((res) => res.id === docFirst.id)).toBeDefined()
    expect(resEqualsFull.docs.find((res) => res.id === docSecond.id)).toBeDefined()

    expect(resEqualsFull.totalDocs).toBe(2)

    const resEqualsFirst = await payload.find({
      collection: 'books',
      where: {
        'array.texts': {
          equals: 'text_1',
        },
      },
      sort: '-createdAt',
    })

    expect(resEqualsFirst.docs.find((res) => res.id === docFirst.id)).toBeDefined()
    expect(resEqualsFirst.docs.find((res) => res.id === docSecond.id)).toBeUndefined()

    expect(resEqualsFirst.totalDocs).toBe(1)

    const resContainsSecond = await payload.find({
      collection: 'books',
      where: {
        'array.texts': {
          contains: 'text_other',
        },
      },
      sort: '-createdAt',
    })

    expect(resContainsSecond.docs.find((res) => res.id === docFirst.id)).toBeUndefined()
    expect(resContainsSecond.docs.find((res) => res.id === docSecond.id)).toBeDefined()

    expect(resContainsSecond.totalDocs).toBe(1)

    const resInSecond = await payload.find({
      collection: 'books',
      where: {
        'array.texts': {
          in: ['text_other'],
        },
      },
      sort: '-createdAt',
    })

    expect(resInSecond.docs.find((res) => res.id === docFirst.id)).toBeUndefined()
    expect(resInSecond.docs.find((res) => res.id === docSecond.id)).toBeDefined()

    expect(resInSecond.totalDocs).toBe(1)
  }, DEFAULT_TIMEOUT)
*/


it('should query non-hasMany within an group', async () => {
  const docFirst = await payload.create({
    collection: 'books',
    data: {
      author: 'required',
      title: 'required',
      publisher: 'required',
      group: {
        text: 'text_1',
      },
    },
  })

  const docSecond = await payload.create({
    collection: 'books',
    data: {
      author: 'required',
      title: 'required',
      publisher: 'required',
      group: {
        text: 'text_other',
      },
    },
  });


  const resEqualsFirst = await payload.find({
    collection: 'books',
    where: {
      'group.text': {
        equals: 'text_1',
      },
    },
    sort: '-createdAt',
  })

  expect(resEqualsFirst.docs.find((res) => res.id === docFirst.id)).toBeDefined()
  expect(resEqualsFirst.docs.find((res) => res.id === docSecond.id)).toBeUndefined()

  expect(resEqualsFirst.totalDocs).toBe(1)

  const resEqualsFull = await payload.find({
    collection: 'books',
    where: {
      'group.text': {
        in: ['text_1', 'text_other'],
      },
    },
    sort: '-createdAt',
  })

  console.log('resEqualsFull', resEqualsFull);

  expect(resEqualsFull.docs.find((res) => res.id === docFirst.id)).toBeDefined()
  expect(resEqualsFull.docs.find((res) => res.id === docSecond.id)).toBeDefined()

  expect(resEqualsFull.totalDocs).toBe(2)


  const resContainsSecond = await payload.find({
    collection: 'books',
    where: {
      'group.text': {
        contains: 'text_other',
      },
    },
    sort: '-createdAt',
  })

  expect(resContainsSecond.docs.find((res) => res.id === docFirst.id)).toBeUndefined()
  expect(resContainsSecond.docs.find((res) => res.id === docSecond.id)).toBeDefined()

  expect(resContainsSecond.totalDocs).toBe(1)

  const resInSecond = await payload.find({
    collection: 'books',
    where: {
      'group.text': {
        in: ['text_other'],
      },
    },
    sort: '-createdAt',
  })

  expect(resInSecond.docs.find((res) => res.id === docFirst.id)).toBeUndefined()
  expect(resInSecond.docs.find((res) => res.id === docSecond.id)).toBeDefined()

  expect(resInSecond.totalDocs).toBe(1)
}, DEFAULT_TIMEOUT)


it('should query hasMany within an group', async () => {
  const docFirst = await payload.create({
    collection: 'books',
    data: {
      author: 'required',
      title: 'required',
      publisher: 'required',
      group: {
        texts: ['text_1', 'text_2'],
      },
    },
  })

  const docSecond = await payload.create({
    collection: 'books',
    data: {
      author: 'required',
      title: 'required',
      publisher: 'required',
      group: {
        texts: ['text_other', 'text_2'],
      },
    },
  })

  const resEqualsFull = await payload.find({
    collection: 'books',
    where: {
      'group.texts': {
        equals: 'text_2',
      },
    },
    sort: '-createdAt',
  })

  console.log('resEqualsFull', resEqualsFull);

  expect(resEqualsFull.docs.find((res) => res.id === docFirst.id)).toBeDefined()
  expect(resEqualsFull.docs.find((res) => res.id === docSecond.id)).toBeDefined()

  expect(resEqualsFull.totalDocs).toBe(2)

  const resEqualsFirst = await payload.find({
    collection: 'books',
    where: {
      'group.texts': {
        equals: 'text_1',
      },
    },
    sort: '-createdAt',
  })

  expect(resEqualsFirst.docs.find((res) => res.id === docFirst.id)).toBeDefined()
  expect(resEqualsFirst.docs.find((res) => res.id === docSecond.id)).toBeUndefined()

  expect(resEqualsFirst.totalDocs).toBe(1)

  const resContainsSecond = await payload.find({
    collection: 'books',
    where: {
      'group.texts': {
        in: ['text_other'],
      },
    },
    sort: '-createdAt',
  })

  expect(resContainsSecond.docs.find((res) => res.id === docFirst.id)).toBeUndefined()
  expect(resContainsSecond.docs.find((res) => res.id === docSecond.id)).toBeDefined()

  expect(resContainsSecond.totalDocs).toBe(1)

  const resInSecond = await payload.find({
    collection: 'books',
    where: {
      'group.texts': {
        in: ['text_other'],
      },
    },
    sort: '-createdAt',
  })

  expect(resInSecond.docs.find((res) => res.id === docFirst.id)).toBeUndefined()
  expect(resInSecond.docs.find((res) => res.id === docSecond.id)).toBeDefined()

  expect(resInSecond.totalDocs).toBe(1)
}, DEFAULT_TIMEOUT)
})