/**
 * Step definitions for petstore.feature.
 *
 * The whole suite is this file plus the feature. One helper performs every request and records which
 * method was sent, one object holds the scenario's payload and responses, and the hooks delete every
 * id the scenario creates and prove each deletion with a read-back 404.
 *
 * Run with: cucumber-js, pointed at petstore.feature for its paths and at this file for its import.
 * This folder ships the suite only, so it carries no package manifest and no cucumber configuration.
 * Base URL: PETSTORE_BASE_URL, defaulting to the public sandbox.
 */
import assert from 'node:assert/strict';
import { randomInt } from 'node:crypto';
import { After, AfterAll, Given, Then, When, setDefaultTimeout } from '@cucumber/cucumber';

// A shared public sandbox can answer slowly, and a step that waits longer than this is a problem to
// report rather than a reason to sit forever: without this, cucumber's own 5 s default aborts a step
// with a message that names no URL, and the cleanup runs late or not at all.
setDefaultTimeout(30_000);

// Draw the base URL without a trailing slash: one typed into a shell or a CI variable ends with one
// often enough, and it produces //pet, which the sandbox answers 404.
const BASE_URL = (process.env.PETSTORE_BASE_URL ?? 'https://petstore.swagger.io/v2').replace(/\/+$/, '');

type Reply = { method: string; status: number; body: any; text: string };
type Pet = { id: number; name: string; photoUrls: string[]; status: string };

/** Ids this scenario has sent or created. Cleared at the start of every scenario. */
const created = new Set<number>();

/** Ids whose deletion could not be proved. Never cleared by a scenario, so AfterAll still sees them. */
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

/** One helper for every call, so each request goes through one place. */
async function call(method: string, path: string, body?: string): Promise<Reply> {
  const reply = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body,
    // A request that never answers must not leave a record behind: abort, then let the hooks clean up.
    signal: AbortSignal.timeout(15_000),
  });
  const text = await reply.text();
  let parsed: any = null;
  try {
    parsed = text === '' ? null : JSON.parse(text);
  } catch {
    parsed = null;
  }
  return { method, status: reply.status, body: parsed, text };
}

/** Deletes an id and proves it is gone. A 404 on the delete is fine: the record is already absent. */
async function cleanup(id: number): Promise<void> {
  const deleted = await call('DELETE', `/pet/${id}`);
  if (deleted.status !== 200 && deleted.status !== 404) {
    leaked.add(id);
    throw new Error(`cleanup: DELETE /pet/${id} answered ${deleted.status}`);
  }
  const readBack = await call('GET', `/pet/${id}`);
  if (readBack.status !== 404) {
    leaked.add(id);
    throw new Error(`cleanup: pet ${id} is still readable (${readBack.status}), so the delete is unproven`);
  }
  // Only now is the id safe to forget. An id that could not be proved is moved to leaked instead, which
  // the next scenario does not clear, so AfterAll gets a second attempt at it.
  created.delete(id);
  leaked.delete(id);
}

/** Attempts every id this run still holds, so one bad record cannot strand the rest. */
async function cleanupAll(): Promise<void> {
  const failures: string[] = [];
  for (const id of [...new Set([...created, ...leaked])]) {
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

/** Draws an id the sandbox does not hold, so no other client's record is overwritten or deleted. */
async function freeId(): Promise<number> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = randomInt(1, 1_000_000_000);
    const probe = await call('GET', `/pet/${candidate}`);
    if (probe.status === 404) return candidate;
  }
  throw new Error('no free pet id found in five draws');
}

Given('a pet payload with an id drawn at random for this scenario', async function () {
  created.clear();
  const id = await freeId();
  state.pet = { id, name: `qa-pet-${id}`, photoUrls: ['https://example.com/pet.png'], status: 'available' };
  state.storedId = undefined;
  state.lastReply = undefined;
  state.postReply = undefined;
  state.putReply = undefined;
  state.getReply = undefined;
});

Given('the pet has been created with POST', async function () {
  assert.ok(state.pet, 'no payload: the background step did not run');
  state.postReply = await create(state.pet);
  assert.equal(state.postReply.status, 200, `POST /pet answered ${state.postReply.status}`);
});

/** Creates the pet. The payload id is remembered before the response is read, so a POST that fails
 *  after the record was written is still cleaned up; the id the response carries is remembered too,
 *  in case the service stored the record under its own id. */
async function create(pet: Pet): Promise<Reply> {
  created.add(pet.id);
  const reply = await call('POST', '/pet', JSON.stringify(pet));
  if (typeof reply.body?.id === 'number') {
    state.storedId = reply.body.id;
    created.add(reply.body.id);
  }
  return reply;
}

When('I create the pet with POST', async function () {
  assert.ok(state.pet, 'no payload: the background step did not run');
  state.postReply = await create(state.pet);
  state.lastReply = state.postReply;
});

When('I read the pet back using the created id', async function () {
  assert.ok(state.storedId, 'no id: the pet has not been created');
  state.getReply = await call('GET', `/pet/${state.storedId}`);
  state.lastReply = state.getReply;
});

When('I ask for an id that this run has not created', async function () {
  // The sandbox is shared and an id someone else owns answers 200. Draw until one answers 404, so a
  // 200 in the scenario below can only mean the draw collided with a stranger's record.
  let reply: Reply | undefined;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    reply = await call('GET', `/pet/${randomInt(900_000_000, 1_000_000_000)}`);
    if (reply.status === 404) break;
  }
  state.lastReply = reply;
});

When(
  'I replace the pet with PUT using the name {string} and the status {string}',
  async function (name: string, status: string) {
    assert.ok(state.pet && state.storedId, 'no pet: it has not been created');
    // photoUrls is deliberately left out: PUT must replace the record, so the stored record may not
    // keep the value the create sent. A merge implementation fails the assertion that follows.
    const replacement = { id: state.storedId, name, status };
    state.putReply = await call('PUT', '/pet', JSON.stringify(replacement));
    state.lastReply = state.putReply;
  },
);

When('I delete the pet using the created id', async function () {
  assert.ok(state.storedId, 'no id: the pet has not been created');
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

/** The status alone would let a service that answered 400 for every request pass this scenario. */
Then('the error body reports the rejection', function () {
  assert.ok(state.lastReply, 'no response recorded in this scenario');
  const body = state.lastReply.body ?? {};
  assert.equal(body.code, state.lastReply.status, 'the error body reports a different code');
  assert.ok(typeof body.message === 'string' && body.message.length > 0, 'the error body carries no message');
});

/** The status alone does not always identify the request: DELETE /pet answers 405 as well, so a
 *  scenario about an unsupported method has to say which method it actually sent. */
Then('the request sent was a {string}', function (method: string) {
  assert.ok(state.lastReply, 'no response recorded in this scenario');
  assert.equal(state.lastReply.method, method, `the request sent was a ${state.lastReply.method}, not a ${method}`);
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
  // The comparison above compares two responses. These assertions compare the read-back with what was
  // sent, so a field the sandbox dropped or rewrote on the way in cannot pass unnoticed.
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
    const stored = state.getReply.body ?? {};
    assert.equal(stored.name, name, 'GET still shows the old name');
    assert.equal(stored.status, status, 'GET still shows the old status');
    assert.ok(
      !stored.photoUrls || stored.photoUrls.length === 0,
      `the stored record still carries photoUrls (${JSON.stringify(stored.photoUrls)}), so PUT merged instead of replacing`,
    );
  },
);

Then('the pet cannot be read back any more', async function () {
  assert.ok(state.storedId, 'no id: the pet has not been created');
  const readBack = await call('GET', `/pet/${state.storedId}`);
  assert.equal(readBack.status, 404, `a deleted pet answered ${readBack.status}`);
  // The record is gone, so stop asking the hooks to delete it.
  created.delete(state.storedId);
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
  await cleanupAll();
});

AfterAll(async function () {
  await cleanupAll();
});
