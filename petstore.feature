@api @pet
Feature: PET records can be created, read, updated and deleted

  As a consumer of the Swagger Petstore API
  I want the four PET operations to behave as the sandbox behaves
  So that an integration built on them can be trusted

  # Five scenarios, dense on purpose. Between them they exercise POST, PUT, GET and DELETE, assert the
  # status codes 200, 400, 404 and 405, and compare the record created by POST with the record returned
  # by GET. Every id a scenario creates is deleted by the After hook, which proves the deletion by
  # reading the id back and requiring 404; AfterAll retries anything the After hook could not prove.

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
    And the request sent was a "PUT"
    And the update response carries the name "replaced-name"
    When I read the pet back using the created id
    Then the response status is 200
    And the stored pet carries the name "replaced-name", the status "sold" and no other photoUrls

  @delete @get
  Scenario: DELETE removes the record and the id is gone afterwards
    Given the pet has been created with POST
    When I delete the pet using the created id
    Then the response status is 200
    And the request sent was a "DELETE"
    And the pet cannot be read back any more

  @post
  Scenario: A malformed JSON body is rejected with 400
    When I send a POST request to "/pet" with the malformed body "{not valid json"
    Then the response status is 400
    And the request sent was a "POST"
    And the error body reports the rejection

  @get @patch
  Scenario: An unknown id is 404 and an unsupported method is 405
    When I ask for an id that this run has not created
    Then the response status is 404
    And the error message says that the pet was not found
    When I send a PATCH request to "/pet"
    Then the response status is 405
    And the request sent was a "PATCH"
