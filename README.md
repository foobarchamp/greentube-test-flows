# Greentube test automation assignment

Two deliverables, one per task in the brief. This folder holds them and nothing else.

## What is where

| File | Task | What it is |
|---|---|---|
| `registration-login-test-flows.md` | Task 1 | The registration and login flows and cases on GameTwist, with the Gherkin for each case inline |
| `petstore.feature` | Task 2 | Five Gherkin scenarios for the PET endpoints, which also state what is asserted |
| `petstore.steps.ts` | Task 2 | The step definitions in TypeScript, with the request helper, the payload state and the cleanup hooks |

## Task 1: registration and login on GameTwist

`registration-login-test-flows.md` answers the first two parts of the brief.

Section 1 states the purpose and the scope of the document, section 2 describes the two flows, and section 3 lists the ten cases at a glance with their type and whether they would be automated.

Section 4 gives each of the ten cases in detail: the preconditions, the steps, the expected result, and the Gherkin for it.

Section 5 explains why eight of the ten cases would be automated, and sets out the approach for the two that stay manual, R1 (a successful registration with a confirmed e-mail address) and R6 (an e-mail address that is already in use).

Section 6 records the test data and the environment, including the shared data the cases rely on.

The document is written to be read by a developer and by a reader who is not familiar with the technology, as the brief requires: the Gherkin states the behaviour, and the prose around it defines the terms it uses.

## Task 2: the PET endpoints

The brief asks for TypeScript and names Cucumber as optional, so task 2 uses both. `petstore.feature` holds the scenarios and `petstore.steps.ts` implements them.

The three bullets of the automation task are covered as follows.

- Four request types: the scenarios use POST, PUT, GET and DELETE.
- At least three status codes: the scenarios assert 200, 400, 404 and 405.
- The record created by POST matches the GET response: the first scenario creates a record, reads it back by its id, and asserts that the record GET returned equals the record POST returned, field for field.

The other four scenarios cover the remaining request types and the rejection paths: PUT replaces the stored record, DELETE removes it and the id returns 404 afterwards, a malformed body is refused with 400, and an unknown id is 404 while an unsupported method on the collection is 405.

## Running the task 2 suite

This folder ships the suite only, so it carries no package manifest and no Cucumber configuration, and the suite cannot be executed from here as it stands.

To run it, add a manifest and a runner configuration that points the feature path at `petstore.feature` and the import at `petstore.steps.ts`, then run cucumber-js.

Node 22.18 or newer executes the TypeScript directly, because it strips the type annotations, so there is no compile step and no build output to keep in step with the sources.

The suite talks to the public sandbox at https://petstore.swagger.io/v2.

`PETSTORE_BASE_URL` overrides that address, for example to point the suite at a local petstore.

## How the suite treats the shared sandbox

The public sandbox is shared with other clients, and it stores a record under the id the caller chooses, whether or not that id is already in use.

Each scenario therefore draws an id that answers 404 before it is used, and the hooks delete every id the scenario created.

A deletion counts as done only when reading the id back returns 404, and any id the after-scenario hook could not prove is retried by the run-level hook, so a run does not leave records behind.
