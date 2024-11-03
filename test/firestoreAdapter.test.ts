import { getPayload } from 'payload'
import config from '@payload-config'
import assert from 'node:assert';
const payload = await getPayload({ config });

(async () => {
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
    assert(book.prefix === "books/");
    assert(book.slug === "title1");
    assert(book.id);
    assert(book.updatedAt);
    assert(book.createdAt);
    
    let deleteBook = await payload.delete({
      collection: "books",
      id: book.id
    });
    console.log('delete book', deleteBook);

    book = await payload.create({
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
    assert(book.prefix === "books/");
    assert(book.slug === "title2");
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
          title: "Demokratie",
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

    const titleSlugBooks: any = await payload.find({
        collection: 'books',
        where: {
          slug: {
            equals: "title2",
          },
        },
        page: 8,
        limit: 0,
        depth: 2
    });

    console.log('titleSlugBooks', titleSlugBooks.docs.length);

    const titleSlugStats: any = await payload.count({
      collection: 'books',
      where: {
        slug: {
          equals: "title2",
        },
      }
  });

  console.log('titleSlugBooks count', titleSlugStats.totalDocs);

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


  process.exit(0);
})();