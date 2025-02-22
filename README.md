# payload-firestore-adapter

This is an unofficial and completely experimental and not at all finished firestore database adapter for payload cms 3.0 beta.

## Testing the alpha

> Caution: **It's not fully working (only 70% of the official payload integration tests pass). It uses the firestore emulator in datastore mode. Do not use it!**

```console
$ pnpm install --save payload-firestore-adapter@alpha
```

In your payload.config.ts add:

```
import { firestoreAdapter } from 'payload-firestore-adapter';
```

and initialize the db like this:

```
db: firestoreAdapter({})
```

start the firestore emulator with datastore mode activated locally

```
docker run --rm -it -p 8080:8080 ghcr.io/dracoblue/payload-firestore-adapter/datastore-mode-emulator:504.1.0
```
and set the env for

```
DATASTORE_EMULATOR_HOST=0.0.0.0:8080
FIRESTORE_PROJECT_ID=example 
```
before booting your payloadcms and it will connect accordingly.

## TODOs

- [x] build proof of concept
- [x] setup github actions for integration testing with payload beta branch
- [x] setup github actions for unit tests with jest
- [x] setup github actions for integration tests with jest
- [x] implement features as rough proof of concept
- [ ] implement features to be valid for all int.spec.ts tests on payload 3.0
  - [ ] add unique constraints handling (firestore.runTransaction + search + insert)
  - [ ] add locale handling
  - [ ] handle array[*].texts[*] equals "string" (since array.texts is not supported for in+contains)
  - [ ] add "in" query for hasMany fields (to array-contains-any: array, array-contains: literal or in: array)
  - [ ] handle joins
  - [ ] handle select
  - [ ] add migrations handling
  - [ ] custom db names
  - [ ] virtual database fields
- [ ] make it work without the emulator
  - [ ] fix `The query requires an index. You can create it here: ` (as the indexes are not required for emulator)
- [ ] setup github actions for npm releases
- [ ] run payload e2e.spec.ts tests for payload 3.0
- [ ] upstream changes to adjust drizzle/mongodb hardcoded parts
  - [ ] test/helpers/snapshot.ts (the way to store and restore snapshots)
  - [ ] test/helpers/reset.ts (the way to empty the databases)

## Technical differences

* "like" query
  * Firestore does not support like queries with wild card. Thus we convert it into a prefix search.
* "contains" query
  * Firestore cannot do "contains" queries. Thus we convert it into a prefix search.

## License

payload-firestore-adapater is licensed under the terms of MIT. See LICENSE for more information.
