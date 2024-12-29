FROM google/cloud-sdk:504.0.1-emulators
ENV FIRESTORE_PROJECT_ID "example"
EXPOSE 8080
CMD /bin/sh '-c' 'gcloud beta emulators firestore start --project="${FIRESTORE_PROJECT_ID}"  --host-port="0.0.0.0:8080"'