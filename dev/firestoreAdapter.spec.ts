import type { Payload } from 'payload'
import { getPayload } from 'payload'
import config from './src/payload.config';
import assert from 'node:assert';

let payload: Payload;

describe('firestore adapter tests', () => {
  beforeAll(async () => {
    payload = await getPayload({config});
  });

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
    });

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
  
  });

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
  
  });

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
  
  })

  it('should query hasMany in for one', async () => {
    const hit = await payload.create({
      collection: 'books',
      data: {
        author: "author with tags: one, five",
        title: "title with tags: one, five",
        publisher: "publisher with tags: one, five",
        tags: ['one', 'five']
      },
    })

    const miss = await payload.create({
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

    expect(docs.length).toBeGreaterThan(0);

    for (let doc of docs) {
      expect(doc.tags).toContain('one');
      expect(doc.tags).not.toContain('two');
    }

  })

  it('should query hasMany in for one + five', async () => {
    const hit = await payload.create({
      collection: 'books',
      data: {
        author: "author with tags: one, five",
        title: "title with tags: one, five",
        publisher: "publisher with tags: one, five",
        tags: ['one', 'five']
      },
    })

    const miss = await payload.create({
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

  })



  it('should query hasMany in for one + two with no results', async () => {
    const hit = await payload.create({
      collection: 'books',
      data: {
        author: "author with tags: one, five",
        title: "title with tags: one, five",
        publisher: "publisher with tags: one, five",
        tags: ['one', 'five']
      },
    })

    const miss = await payload.create({
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
          in: ['one', 'two'],
        },
      },
    })

    expect(docs).toHaveLength(0);


  })

})