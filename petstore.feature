@api @pet
Feature: PET records can be created, read, updated and deleted

  As a consumer of the Swagger Petstore API
  I want the four PET operations to behave as the sandbox behaves
  So that an integration built on them can be trusted

  # Five scenarios, dense on purpose. Between them they exercise POST, PUT, GET and DELETE, assert the
  # status codes 200, 400, 404 and 405, and compare the record created by POST with the record returned
  # by GET. Every id a scenario creates is chased by the After hook, which sends the DELETE and, when
  # that answers 200 or 404, reads the id back requiring 404, so an id the scenario's own step had
  # already removed comes back 404 and is proved too; an id that hook cannot prove gone is retried by
  # the run-level hook, which reports it if it cannot prove the deletion either. Two failure situations
  # reach that retry by different roads.
  # An id whose After hook never ran is still in the hook set when the next scenario starts, so that
  # scenario's Before hook fails and hands the id on; an id whose After hook ran but could not prove the
  # deletion moves to the run-level hook's set at once and is swept and reported by it after the last
  # scenario, wherever it came from. A missing, broken or timed-out scenario hook therefore cannot leave
  # records behind in silence: the next scenario's guard, or the run-level hook, reports it. The
  # run-level hook is the last net and nothing runs after it. If it fails, an id it does not get to
  # sweep stays in the sandbox with the run's own failure as its only record; if it is not there at all,
  # only a scenario's own hook can clear that scenario's ids, so when the run-level hook is absent and a
  # last scenario's own hook neither clears its ids nor fails, an id it created is reported by nothing and
  # the suite can pass while leaving it behind. A hook that fails is a different case, and red: one that
  # cannot prove a deletion names the id, and one cut off by the ceiling names nothing.

  Background:
    Given a pet payload with an id drawn at random for this scenario

  @post @get
  Scenario: The record created by POST is exactly the record returned by GET
    When I create the pet with POST
    Then the response status is 200
    And the create response carries what the payload sent
    When I read the pet back using the created id
    Then the response status is 200
    And the GET response matches the POST response

  @put @get
  Scenario: PUT replaces the stored record and a later GET shows the new values
    Given the pet has been created with POST
    When I replace the pet with PUT using the name "replaced-name" and the status "sold"
    Then the response status is 200
    And the helper was asked to send a "PUT"
    And the update response carries the name "replaced-name"
    When I read the pet back using the created id
    Then the response status is 200
    And the stored pet carries the name "replaced-name", the status "sold" and no other photoUrls

  @delete @get
  Scenario: DELETE removes the record and the id is gone afterwards
    Given the pet has been created with POST
    When I delete the pet using the created id
    Then the response status is 200
    And the helper was asked to send a "DELETE"
    And the pet cannot be read back any more

  @post
  Scenario: A malformed JSON body is rejected with 400
    When I send a POST request to "/pet" with the malformed body "{not valid json"
    Then the response status is 400
    And the helper was asked to send a "POST"
    And the error body reports the rejection

  @get @patch
  Scenario: An unknown id is 404 and an unsupported method is 405
    When I ask for an id that this run has not created
    Then the response status is 404
    And the error message says that the pet was not found
    When I send a PATCH request to "/pet"
    Then the response status is 405
    And the helper was asked to send a "PATCH"
