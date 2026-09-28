# Greentube test automation assignment

Two deliverables: the manual test document the brief asks for in its first two tasks, and the automation project its third task asks for, with the files that make that one runnable.

## What is where

| File | What it is |
|---|---|
| `README.md` | This file: what is where, how to run the suite, what it asserts, and what it deliberately does not cover |
| `registration-login-test-flows.md` | Tasks 1 and 2: the registration and login flows and cases on GameTwist, with the Gherkin for each case inline, section 3 marking which of them would be automated, and section 5 giving the reason for each and what happens to the rest |
| `petstore.feature` | Task 3: five Gherkin scenarios for the PET endpoints, which also state what is asserted |
| `petstore.steps.ts` | Task 3: the step definitions in TypeScript, with the request helper, the payload state and the cleanup hooks |
| `cucumber.mjs` | The runner configuration: the feature path, the step import, the reporters and the single worker |
| `package.json` and `package-lock.json` | The manifest and the lockfile: `npm ci` installs the runner, the linter, the formatter and the TypeScript toolchain at locked versions |
| `tsconfig.json` | The type-checking gate, which is what `npm run typecheck` runs |
| `.env.example` | Documents the `PETSTORE_BASE_URL` variable the suite reads from the environment, which is exported in the shell rather than loaded from a file |
| `.github/workflows/ci.yml` | CI: the gates and the suite on every pull request, on pushes to main and when started by hand, then the reports; the run section below lists the steps |
| `.gitignore` | Keeps `node_modules/`, the generated `reports/`, the local `.env` files, and the editor and OS files out of the repository |
| `.gitattributes` | Keeps every text file LF in the index and in a fresh checkout, so the formatting gate means the same on Windows and on CI |
| `eslint.config.mjs` | The lint rules: the JavaScript and TypeScript recommended sets, with Prettier after them so formatting is not a lint rule |
| `.prettierrc.json` and `.prettierignore` | The formatting rules, and what formatting leaves alone: the two documents, the generated lockfile, and the installed and generated directories. The Gherkin feature file is not formatted either, because the formatting glob lists only the code and configuration extensions it matches on |


## Tasks 1 and 2: registration and login on GameTwist

`registration-login-test-flows.md` answers the first two parts of the brief. The eight cases it marks automated are the plan that second part asks for, not code: what this repository runs is the Petstore suite the third part asks for.

Section 1 states the purpose and the scope of the document, section 2 describes the two flows, and section 3 lists the ten cases at a glance with their type and whether they would be automated.

Section 4 gives each of the ten cases in detail, with the Gherkin for it.

Section 5 explains why eight of the ten cases would be automated, and sets out the approach for the two that stay manual, R1 (a successful registration with a confirmed e-mail address) and R6 (an e-mail address that is already in use).

Section 6 records the test data and the environment, including the shared data the cases rely on.

The document is written to be read by a developer and by a reader who is not familiar with the technology, as the brief requires: the Gherkin states the behaviour, and the prose around it defines the terms it uses.

## Task 3: the PET endpoints

The brief asks for TypeScript and names Cucumber as optional, so the automation task uses both. `petstore.feature` holds the scenarios and `petstore.steps.ts` implements them.

The three bullets of the automation task are covered as follows.

- Four request types, the ones the brief names: the scenarios use POST, PUT, GET and DELETE, and scenario 5 sends PATCH to stand for an unsupported method.
- At least three status codes: the scenarios assert 200, 400, 404 and 405.
- The record created by POST matches the GET response: the first scenario creates a record, reads it back by its id, and asserts that the record GET returned equals the record POST returned, field for field.

The other four scenarios cover the remaining request types and the rejection paths: PUT replaces the stored record, DELETE removes it and the id returns 404 afterwards, a malformed body is refused with 400, and an unknown id is 404 while an unsupported method on the collection is 405.

Not covered, on purpose: the store and user endpoints, the form-encoded `POST /pet/{petId}`, `findByStatus` and `findByTags`, and the refusals of a body sent under a content type that is not JSON, which the sandbox answers 415 for no content type and for `text/plain`, and 400 for `application/xml`. The brief names the four operations on a PET record, and the suite stays on those rather than spreading over the whole sandbox.

## Running the task 3 suite

Node 22.18 or newer is required, on one of the release lines `package.json` declares support for: 22.18, 24, or 26 and later. The suite runs straight from TypeScript because Node strips the type annotations, so there is no compile step and no build output to keep in step with the sources.

```
npm ci                # install the locked dependencies
npm run check         # the whole gate: formatting, lint, type-check, then the suite
```

`npm run check` runs `format:check`, `lint`, `typecheck` and `test` in that order, and it is the command `.github/workflows/ci.yml` runs, so the same gate runs in both places rather than two gates that can drift apart. CI adds things the gate does not: it checks that the JUnit file was written and that it records at least one scenario, which a local run could also do, and it uploads `reports/` as an artifact and publishes the JUnit file as the run's test results, which need a CI server. Each of the four also runs on its own when a failure needs narrowing down:

```
npm run format:check  # prettier: the sources are formatted
npm run lint          # eslint: the sources pass the rules
npm run typecheck     # tsc --noEmit
npm test              # cucumber-js, five scenarios
```

`npm test` prints the summary, and the progress bar as well when the output is a terminal, and writes two reports into `reports/`, which `.gitignore` keeps out of the repository: `petstore-report.html` for a person opening the run, and `petstore-report.xml`, the JUnit file a CI server reads.

`npm run format` is the only command here that rewrites the sources; `npm test` writes the two reports into `reports/`, and `npm ci` installs `node_modules/`.

The suite talks to the public sandbox at https://petstore.swagger.io/v2.

`PETSTORE_BASE_URL` overrides that address, for example to point the suite at a local petstore. In a POSIX shell: `PETSTORE_BASE_URL=http://localhost:8080/v2 npm test`. In PowerShell: `$env:PETSTORE_BASE_URL = 'http://localhost:8080/v2'; npm test`.

Every scenario is tagged, so a subset can be selected with the Cucumber CLI: `npx cucumber-js --tags "@delete"` runs one scenario. The pass-through form `npm test -- --tags "@delete"` fails under Windows PowerShell, which drops the `--` separator while binding the arguments, so npm reads `--tags` as its own flag and rejects it; in cmd.exe and Git Bash the same command reaches the runner and selects the one scenario. The example calls the runner directly because that form works in every shell.

`.github/workflows/ci.yml` installs the dependencies and runs `npm run check` on Node 22.18, 24 and 26, one release of each line `package.json` declares support for, on every pull request, on pushes to main, and when started by hand. Each version then checks that the JUnit file exists and that it records at least one scenario, uploads `reports/` as a build artifact, and publishes the JUnit file as the run's test results. The matrix runs with `fail-fast` off, so a version that fails does not hide the result for the other two. The same gate has been run locally on all three lines. That scenario count is the one thing the runner cannot check for itself: a missing feature file, or a tag expression that matches nothing, exits 0 and writes a report reading `tests="0"`, so a green job and a job that ran nothing look the same from the exit code alone, and the workflow is where the difference is caught.

## How the suite treats the shared sandbox

The public sandbox is shared with other clients, and it stores a record under the id the caller chooses, whether or not that id is already in use.

The scenarios that create a record therefore draw an id that answers 404 before they use it, the scenario that needs an id this run has not created draws its own inside its step, and the hooks delete every id a scenario created.

A deletion counts as done only when reading the id back returns 404, and any id the after-scenario hook could not prove is retried by the run-level hook, so a run that cannot prove a deletion fails loudly instead of passing silently. That guarantee has one boundary, which the feature file states: the run-level hook is the last net, so when it is absent and a last scenario's own hook neither clears its ids nor fails, an id that scenario created can be left with the run still passing. A hook that fails is a different case, and red: one that cannot prove a deletion names the id, and one cut off by the ceiling names nothing. Every deletion it does prove is printed, so the run's own output carries the proof and not only the assertion that made it.

The scenarios expect the answers the sandbox gave when they were written: 200 for a stored record, 400 with a JSON error body for a body that is not JSON, 404 with `Pet not found` for an id it does not hold, and 405 for a method it does not serve. A sandbox that changes one of those answers fails the scenario that asserts it, which is the point of asserting it.

The 405 replies carry an XML `apiResponse` body rather than JSON and no `Allow` header, and `DELETE /pet` answers 405 with a body byte-identical to the one PATCH gets, so nothing in the reply says which method was refused. The 405 scenario therefore asserts the status and the method the request helper recorded; the 404 body text is asserted in the same scenario, and the 405 body is never checked, only quoted in the status assertion's own failure message. That comparison is against the method the request helper recorded, so it catches a step that sends the wrong method and cannot see a substitution made inside the helper, which only a proxy sitting in front of the sandbox could.

A failed call is not retried by the step that made it, and there is no scenario retry either. Deletes are the one repeated request that changes state: the after-scenario hook deletes an id the scenario's own step may already have deleted and proves it gone with a read-back, and the run-level hook retries an id that hook could not prove, as the cleanup paragraph above describes. The id draws repeat a read instead, five probes at most for each, whenever the sandbox does not answer 404 for the id they drew. No rate limit is observed: forty requests in one burst answered forty 404s with no 429 and no rate-limit or retry-after header among the six headers the sandbox sends, measured again on 2026-09-28, so there is no transient to absorb, and a suite that quietly retried a 429 or a 503 would hide the degradation the run exists to report. A call that fails instead fails with the method and the URL in the message, including a response whose body never arrives, so a broken run says which request to go and look at.

A failure in the after-scenario hook is reported against its own scenario and does appear in the JUnit file, as a failed testcase. Only a run-level failure, one the run-level hook raises after the last scenario, has no scenario to attach to: it is in the console output and in the HTML report, and not in the JUnit file, because cucumber's JUnit writer records scenarios and not that hook. The job is red either way.
