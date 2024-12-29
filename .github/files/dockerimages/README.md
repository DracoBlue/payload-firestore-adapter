# dockerimages uses for payload-firestore-adapter development

Build

```
$ docker build --platform linux/amd64 -f datastore-mode.Dockerfile -t ghcr.io/dracoblue/payload-firestore-adapter/datastore-mode-emulator:504.1.0 .
$ docker build --platform linux/amd64 -f native-mode.Dockerfile -t ghcr.io/dracoblue/payload-firestore-adapter/native-mode-emulator:504.1.0 .
```