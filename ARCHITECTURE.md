# architecture of payload-firestore-adapter

This shares some details about how the payload
firestore adapter works internally and why
specific decisions have been made in the past.

## datastore mode

The adapter currently works only with a firestore
database in "datastore mode".

There is a [comparison between datastore and native mode](https://cloud.google.com/firestore/docs/firestore-or-datastore?hl=en)
and it states:

> **Use Firestore in Datastore mode for new server projects.**
> Firestore in Datastore mode allows you to use established Datastore server architectures while removing fundamental Datastore limitations. Datastore mode can automatically scale to millions of writes per second.

## querying the datastore

The payload cms [supports a wide range of queries](https://payloadcms.com/docs/queries/overview),
but some are not supported by datastore mode of firestore.

Thus we choose the following approach for handling
queries:

1. convert the payload query to a datastore query
2. if 1. does suppprt everything in pure datastore
   apply offset+limit and return the results
3. if 1. does not support everything natively continue
4. query a broader search for all results without
   limit/offset and without what's not supported in
    datastore mode of firestore
5. use "mingo" in memory mongodb-inspired library to
   filter results by all parts of the initial payload
   query and slice by offset/filter afterwards
6. return the results
 