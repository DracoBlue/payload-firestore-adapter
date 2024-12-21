# payload-firestore-adapter

This is an unofficial and completely experimental and not at all finished firestore database adapter for payload cms 3.0 beta.

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
