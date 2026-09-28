// Cucumber configuration for the PET suite.
// One feature, one steps file, one worker: the record-creating scenarios mutate a shared public sandbox,
// so the run is serialised. The gain from parallelism on five scenarios is not worth the reading cost.
//
// Two reports are written: the HTML one is for a person opening the run, the JUnit XML one is for a CI
// server, which cannot read HTML. Both land in reports/, which .gitignore keeps out of the repository.

export default {
  paths: ['petstore.feature'],
  import: ['petstore.steps.ts'],
  format: ['progress-bar', 'summary', 'html:reports/petstore-report.html', 'junit:reports/petstore-report.xml'],
  formatOptions: { snippetInterface: 'async-await' },
  parallel: 1,
  retry: 0,
  strict: true,
};
