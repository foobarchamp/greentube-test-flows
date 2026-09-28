/**
 * Step definitions and the request helper for petstore.feature. Run it with `npm test`; the base URL
 * comes from PETSTORE_BASE_URL and defaults to the public sandbox.
 *
 * The hooks delete the ids a scenario creates and prove each deletion they can with a read-back 404;
 * the run-level hook sweeps and reports the rest.
 */
import assert from 'node:assert/strict';
import { randomInt } from 'node:crypto';
import { After, AfterAll, Before, Given, Then, When, setDefaultTimeout } from '@cucumber/cucumber';

// Cucumber's own 5 s default aborts a step with a message that names no URL, so the ceiling is raised
// to 30 s and covers every step and every hook. A host that never answers is bounded inside call() by
// the connect timeout at ten seconds and the abort at fifteen, both of which name the method and URL; a
// step that makes several slow calls can still reach the ceiling and abort without one.
setDefaultTimeout(30_000);

// Trim a trailing slash: one typed into a shell or a CI variable produces //pet, which answers 404.
const BASE_URL = (process.env.PETSTORE_BASE_URL ?? 'https://petstore.swagger.io/v2').replace(/\/+$/, '');

/** The parsed body of a reply, or null when it is not a JSON object: the 405 replies carry XML, and a
 *  delete of an id the sandbox does not hold answers 404 with an empty body. */
type JsonBody = Record<string, unknown>;
type Reply = { method: string; status: number; body: JsonBody | null; text: string };
type Pet = { id: number; name: string; photoUrls: string[]; status: string };

/** Ids this scenario has sent or created; anything still here when the next scenario starts is what the
 *  Before guard fails on. */
const created = new Set<number>();

/** Ids whose deletion could not be proved, kept for the run-level hook. */
const leaked = new Set<number>();

/** The scenario's state: the payload, the responses, and the id the create response echoed. */
const state = {
  pet: undefined as Pet | undefined,
  storedId: undefined as number | undefined,
  lastReply: undefined as Reply | undefined,
  postReply: undefined as Reply | undefined,
  putReply: undefined as Reply | undefined,
  getReply: undefined as Reply | undefined,
};

/** Parses a reply body, or null when it is not a JSON object. */
function parseBody(text: string): JsonBody | null {
  if (text === '') return null;
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as JsonBody) : null;
  } catch {
    return null;
  }
}

/**
 * One helper for every call, so the reply is read inside the same try that made the request: a body
 * that never arrives is named the same way as a connection that never opens.
 *
 * A failed call is not retried, and its message carries the method and the URL. The only repeated
 * requests are the hooks' deletes and the id draws, described where they live.
 */
async function call(method: string, path: string, body?: string): Promise<Reply> {
  const url = `${BASE_URL}${path}`;
  let response: Response;
  let text: string;
  try {
    response = await fetch(url, {
      method,
      headers: body === undefined ? {} : { 'content-type': 'application/json' },
      body,
      // A request that never answers must not leave a record behind: abort, then let the hooks clean up.
      signal: AbortSignal.timeout(15_000),
    });
    text = await response.text();
  } catch (cause) {
    throw new Error(`${method} ${url} failed: ${(cause as Error).message}`, { cause });
  }
  return { method, status: response.status, body: parseBody(text), text };
}

/**
 * Deletes an id and proves it is gone; a 404 on the delete is fine, the record is already absent.
 *
 * An id this cannot prove moves to `leaked` before the failure leaves here, so the run-level hook
 * still sees it. `created` is emptied on every path, so a hook that did not finish shows up as an id
 * the next scenario's guard can name.
 */
async function cleanup(id: number): Promise<void> {
  try {
    const deleted = await call('DELETE', `/pet/${id}`);
    if (deleted.status !== 200 && deleted.status !== 404) {
      throw new Error(`cleanup: DELETE /pet/${id} answered ${deleted.status}`);
    }
    const readBack = await call('GET', `/pet/${id}`);
    if (readBack.status !== 404) {
      // Only a 404 proves the record is gone. A 200 proves it is still there; anything else proves
      // neither, so the two are reported differently rather than calling every non-404 "still readable".
      throw new Error(
        readBack.status === 200
          ? `cleanup: pet ${id} is still readable (200), so the delete is unproven`
          : `cleanup: pet ${id} could not be proved gone: the read-back answered ${readBack.status}, and only a 404 proves the deletion`,
      );
    }
    // Printed so the proof lives in the run's own output and not only in the assertion that made it.
    console.log(
      `cleanup: pet ${id} answered ${deleted.status} to DELETE, and reading it back answered ${readBack.status}`,
    );
    // Proved deleted, so it is nobody's problem any more.
    leaked.delete(id);
  } catch (error) {
    leaked.add(id);
    throw error;
  } finally {
    created.delete(id);
  }
}

/** Attempts every id in the given set, so one bad record cannot stop the rest from being reported. */
async function cleanupAll(ids: Iterable<number>): Promise<void> {
  const failures: string[] = [];
  for (const id of [...ids]) {
    try {
      await cleanup(id);
    } catch (error) {
      failures.push((error as Error).message);
    }
  }
  if (failures.length > 0) {
    throw new Error(`cleanup left ${failures.length} record(s) unproven:\n  ${failures.join('\n  ')}`);
  }
}

/**
 * Starts a scenario from a clean slate, and refuses to start on top of an unexplained record.
 *
 * cleanup() empties `created` on every path, so an id still here means the previous scenario's After
 * hook did not run or did not finish. The ids move to `leaked` and this scenario fails, naming them,
 * so a missing hook is reported while the run is going rather than only counted at the end.
 */
Before(function () {
  if (created.size > 0) {
    const stranded = [...created];
    for (const id of stranded) leaked.add(id);
    created.clear();
    throw new Error(
      `the previous scenario's After hook did not run to completion, so the deletion of ${stranded.length} record(s) is unproved: ${stranded.join(', ')}`,
    );
  }
  state.pet = undefined;
  state.storedId = undefined;
  state.lastReply = undefined;
  state.postReply = undefined;
  state.putReply = undefined;
  state.getReply = undefined;
});

/**
 * Draws an id that answers 404, so the record the scenario creates is its own. The probe and the write
 * are two requests, so another client can take the id in between; letting the sandbox assign it is
 * worse, because its documented behaviour is to store an id-less POST under 9223372036854775807, which
 * no run here probes: writing that id would overwrite a record other clients of the sandbox hold.
 */
async function freeId(): Promise<number> {
  const occupied: string[] = [];
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = randomInt(1, 1_000_000_000);
    const probe = await call('GET', `/pet/${candidate}`);
    if (probe.status === 404) return candidate;
    // Each reply is reported with the status it answered: one number cannot describe five ids.
    occupied.push(`${candidate} answered ${probe.status}`);
  }
  throw new Error(`no free pet id found in five draws, so this scenario cannot run: ${occupied.join(', ')}`);
}

Given('a pet payload with an id drawn at random for this scenario', async function () {
  const id = await freeId();
  state.pet = { id, name: `qa-pet-${id}`, photoUrls: ['https://example.com/pet.png'], status: 'available' };
});

Given('the pet has been created with POST', async function () {
  assert.ok(state.pet, 'no payload: the background step did not run');
  state.postReply = await create(state.pet);
  assert.equal(state.postReply.status, 200, `POST /pet answered ${state.postReply.status}`);
});

/** Creates the pet. The payload id is remembered before the response is read, so a POST that fails
 *  after the record was written is still cleaned up; the echoed id is remembered too. */
async function create(pet: Pet): Promise<Reply> {
  created.add(pet.id);
  const reply = await call('POST', '/pet', JSON.stringify(pet));
  const echoedId = reply.body?.['id'];
  if (typeof echoedId === 'number') {
    state.storedId = echoedId;
    created.add(echoedId);
  }
  return reply;
}

When('I create the pet with POST', async function () {
  assert.ok(state.pet, 'no payload: the background step did not run');
  state.postReply = await create(state.pet);
  state.lastReply = state.postReply;
});

When('I read the pet back using the created id', async function () {
  assert.ok(state.storedId, 'the stored id is missing, so this step cannot run');
  state.getReply = await call('GET', `/pet/${state.storedId}`);
  state.lastReply = state.getReply;
});

When('I ask for an id that this run has not created', async function () {
  // An id someone else owns answers 200, so draw until one answers 404; five collisions are not the
  // service answering wrongly, and each reply is reported with the status it gave.
  const inTheWay: string[] = [];
  let unknown: Reply | undefined;
  while (inTheWay.length < 5) {
    const candidate = randomInt(900_000_000, 1_000_000_000);
    const reply = await call('GET', `/pet/${candidate}`);
    if (reply.status === 404) {
      unknown = reply;
      break;
    }
    inTheWay.push(`${candidate} answered ${reply.status}`);
  }
  if (unknown === undefined) {
    throw new Error(`no unknown id found in five draws, so this scenario cannot run: ${inTheWay.join(', ')}`);
  }
  state.lastReply = unknown;
});

When(
  'I replace the pet with PUT using the name {string} and the status {string}',
  async function (name: string, status: string) {
    assert.ok(state.pet && state.storedId, 'the payload or the stored id is missing, so this step cannot run');
    // photoUrls is left out on purpose: PUT must replace, so a merge fails the assertion below.
    const replacement = { id: state.storedId, name, status };
    state.putReply = await call('PUT', '/pet', JSON.stringify(replacement));
    state.lastReply = state.putReply;
  },
);

When('I delete the pet using the created id', async function () {
  assert.ok(state.storedId, 'the stored id is missing, so this step cannot run');
  state.lastReply = await call('DELETE', `/pet/${state.storedId}`);
});

When('I send a POST request to {string} with the malformed body {string}', async function (path: string, body: string) {
  state.lastReply = await call('POST', path, body);
});

When('I send a PATCH request to {string}', async function (path: string) {
  state.lastReply = await call('PATCH', path);
});

Then('the response status is {int}', function (expected: number) {
  assert.ok(state.lastReply, 'no response recorded in this scenario');
  assert.equal(
    state.lastReply.status,
    expected,
    `expected HTTP ${expected}, got ${state.lastReply.status}: ${state.lastReply.text.slice(0, 200)}`,
  );
});

/** The status check alone would pass for a service that answered 400 to everything, so the scenario
 *  checks the body as well. */
Then('the error body reports the rejection', function () {
  assert.ok(state.lastReply, 'no response recorded in this scenario');
  // A body that is empty, HTML or an array is not a JSON object, so the shape is named before the
  // checks below, which speak about a code and a message the body carries.
  const carried = state.lastReply.body;
  assert.ok(
    carried !== null,
    `the error reply carried no JSON object, so this step cannot read a code from it: ${state.lastReply.text.slice(0, 120)}`,
  );
  assert.ok(
    'code' in carried,
    `the error body carries no code member, so there is nothing to compare with the status ${state.lastReply.status}: ${state.lastReply.text.slice(0, 120)}`,
  );
  assert.equal(
    carried.code,
    state.lastReply.status,
    `the error body reports the code ${JSON.stringify(carried.code)}, not the status ${state.lastReply.status}`,
  );
  // A present but unreadable message is not a missing one, so the two are reported apart.
  assert.ok('message' in carried, `the error body carries no message member: ${state.lastReply.text.slice(0, 120)}`);
  assert.ok(
    typeof carried.message === 'string' && carried.message.length > 0,
    `the error body's message is not a non-empty string: ${JSON.stringify(carried.message)}`,
  );
});

/** The status alone does not always identify the request: the sandbox answers 405 to DELETE /pet and
 *  to PATCH /pet with a byte-identical body and no Allow header. This compares the method the helper
 *  recorded, so it catches a step that sends the wrong one and cannot see a substitution made inside
 *  the helper. */
Then('the helper was asked to send a {string}', function (method: string) {
  assert.ok(state.lastReply, 'no response recorded in this scenario');
  assert.equal(state.lastReply.method, method, `the helper was asked for a ${state.lastReply.method}, not a ${method}`);
});

Then('the create response carries what the payload sent', function () {
  assert.ok(state.pet && state.postReply, 'no create response recorded');
  const echoed = state.postReply.body ?? {};
  assert.equal(echoed.id, state.pet.id, 'the create response does not carry the id that was sent');
  assert.equal(echoed.name, state.pet.name, 'the create response does not carry the name that was sent');
  assert.equal(echoed.status, state.pet.status, 'the create response does not carry the status that was sent');
  assert.deepStrictEqual(
    echoed.photoUrls,
    state.pet.photoUrls,
    'the create response does not carry the photoUrls that were sent',
  );
});

Then('the GET response matches the POST response', function () {
  assert.ok(state.pet && state.postReply && state.getReply, 'the payload, the POST or the GET response is missing');
  assert.deepStrictEqual(
    state.getReply.body,
    state.postReply.body,
    `the record created by POST is not the record returned by GET\nPOST: ${JSON.stringify(state.postReply.body)}\nGET : ${JSON.stringify(state.getReply.body)}`,
  );
  // The comparison above prints both bodies when they differ; these four compare the read-back with
  // the payload field by field, and a green run passes them.
  const stored = state.getReply.body ?? {};
  assert.equal(stored.id, state.pet.id, 'the stored record lost the id that was sent');
  assert.equal(stored.name, state.pet.name, 'the stored record lost the name that was sent');
  assert.equal(stored.status, state.pet.status, 'the stored record lost the status that was sent');
  assert.deepStrictEqual(stored.photoUrls, state.pet.photoUrls, 'the stored record lost the photoUrls that were sent');
});

Then('the update response carries the name {string}', function (name: string) {
  assert.ok(state.putReply, 'no update response recorded');
  assert.equal(state.putReply.body?.name, name, 'the update response does not carry the new name');
});

Then(
  'the stored pet carries the name {string}, the status {string} and no other photoUrls',
  function (name: string, status: string) {
    assert.ok(state.getReply, 'no GET response recorded');
    const stored: JsonBody = state.getReply.body ?? {};
    // The guard tells two failures apart: a reply that carried nothing and a record that lost the
    // field are not the same answer, and only it says which of the two the run saw.
    assert.ok(
      state.getReply.body !== null,
      `the read-back carried no JSON object, so it shows neither the new values nor the old ones: ${state.getReply.text.slice(0, 120)}`,
    );
    assert.equal(stored.name, name, 'the read-back does not carry the name that was sent');
    assert.equal(stored.status, status, 'the read-back does not carry the status that was sent');
    const photoUrls = stored.photoUrls;
    assert.ok(
      photoUrls === undefined || photoUrls === null || (Array.isArray(photoUrls) && photoUrls.length === 0),
      `the stored record still carries photoUrls (${JSON.stringify(photoUrls)}), so PUT merged instead of replacing`,
    );
  },
);

Then('the pet cannot be read back any more', async function () {
  assert.ok(state.storedId, 'the stored id is missing, so this step cannot run');
  const readBack = await call('GET', `/pet/${state.storedId}`);
  assert.equal(readBack.status, 404, `a deleted pet answered ${readBack.status}`);
  // The id stays in the hook's set on purpose, so the After hook proves the deletion a second time.
});

Then('the error message says that the pet was not found', function () {
  assert.ok(state.lastReply, 'no response recorded');
  assert.match(
    state.lastReply.text,
    /Pet not found/,
    `the 404 body does not say the pet was not found: ${state.lastReply.text}`,
  );
});

After(async function () {
  // Only what this scenario created; ids that already failed to clean up are the run-level hook's.
  await cleanupAll(created);
});

AfterAll(async function () {
  // A last scenario whose After hook never ran leaves its ids here, and this is the last place that
  // can notice; an earlier scenario's leftovers were caught by the next scenario's Before guard. They
  // are swept and the run is failed, because the alternative is a green suite that left records behind.
  const stranded = [...created];
  for (const id of stranded) leaked.add(id);
  created.clear();
  await cleanupAll(leaked);
  if (stranded.length > 0) {
    throw new Error(
      `${stranded.length} record(s) reached the end of the run without their scenario's cleanup. The ` +
        `run-level hook has now deleted and proved them gone: ${stranded.join(', ')}`,
    );
  }
});
