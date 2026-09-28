# Test flows and cases: Registration and Login on GameTwist

## 1. Purpose and scope

This document describes the registration and login flows on GameTwist and the test cases for them.

## 2. The flows

**Registration**

1. Open `https://www.gametwist.com/en/registration/` by any of these routes: the REGISTER button on the landing page `https://www.gametwist.com/en/`, "Register now" on the login page, or the URL directly.
2. Enter an unused but valid e-mail address, an available nickname, a valid password and a date of birth of 18 years or over. Tick the terms checkbox and solve the security check.
3. Press BEGIN ADVENTURE.
 - A field is invalid or empty: a message appears under that field, and no registration request leaves the browser.
 - Everything is valid: the confirmation page opens, states that the confirmation e-mail has been sent, and offers a control to send it again.
4. Open the confirmation e-mail and follow the activation link, which confirms the e-mail address used for the GameTwist account. Until that link is used, the account is unconfirmed: signing in still succeeds, and the page shows the unconfirmed-address notice (`Your e-mail address has not yet been confirmed`).

**Login**

1. Open `https://www.gametwist.com/en/login/`, or press the LOGIN button in the landing page header `https://www.gametwist.com/en/`, which opens the login form in a dialog. LOG IN on the registration page opens the same form as a dialog over the registration page, without navigating. While a session is active, asking for the login page lands on the landing page, where the header shows the nickname instead of LOGIN, so sign out first.
2. Enter the nickname and the password, and optionally tick "Log in automatically".
3. Press LOG IN.
 - Wrong password or an unregistered nickname: the message "Incorrect nickname/password combination." appears and the login form stays open.
 - Correct: the player is signed in, and the landing page shows the nickname in the header. Entering the credentials on the login page itself does not navigate away from it; the sign-in is registered, and the landing page reflects it, so the check for the signed-in state belongs there. This section describes the flows; the cases carry different amounts of live evidence, so where a reading has not been seen on a live run the case says so.

## 3. Use cases at a glance

Ten cases: six for registration, four for login. In the table, a star marks an automated case that needs an account that already exists on the service, and those accounts are set up before a run; the two manual cases are not starred even where they need such an account. The Automated column is a plan rather than shipped code: this delivery builds the petstore automation, and these marks say which GameTwist cases a team would automate next. R1 and R6 stay manual because both need a human to solve the security check, and R1 also needs a mailbox.

| ID | Case | Type | Automated |
|---|---|---|---|
| R1 | Successful registration with a confirmed e-mail address | happy path | no |
| R2 | E-mail and nickname rules: missing, malformed, too short, too long, bad characters, nickname already taken | negative, boundary, control | yes* (needs a registered nickname) |
| R3 | Password rules: shorter than 10 characters, and 10 letters with no number and no special character | negative, boundary, control | yes |
| R4 | A date of birth under 18 is refused | negative, boundary | yes |
| R5 | The submit is blocked when the terms checkbox is unticked, and when the security check is unsolved | negative | yes |
| R6 | An e-mail address that is already in use cannot be registered again | negative | no |
| L1 | Successful login | happy path | yes* (needs test account) |
| L2 | Login with both fields empty is refused | negative | yes |
| L3 | Wrong credentials are refused without revealing whether the account exists | negative, security | yes* (needs test account) |
| L4 | An account whose e-mail address is not confirmed can sign in, and the page shows the unconfirmed-address notice | state | yes* (needs an unconfirmed test account) |

## 4. Test cases in detail

Every case below starts on the page its step 1 names, and each run begins signed out if a session could be active and rejects the cookie dialog if it appears; only some step 1s spell that out. Tags mark the type: @happy-path, @negative, @boundary, @positive, @security, @state, @manual and @automated; the table in section 3 says control for the rows tagged @positive. The shared values the cases use are in section 6.

Three terms are worth defining for a reader who does not work with tests. A `Scenario Outline` with an `Examples` table is one scenario run several times, once per row of the table, with that row's values substituted into the steps, which is how a rule that needs several data rows is written: a case that covers several rules without data rows uses a plain scenario for each rule. The tag `@automated` marks a case the team would automate, and section 5 gives the reason for each one. A case that records "no registration request leaves the browser" means the page refused the input before it sent a registration request to the service, which the run checks in the browser's own network log rather than by watching the server.

More terms, for the same reader. The fenced gherkin blocks are these same cases written in the plain-language form the brief asks for. Each step line of one begins with Given (the state it starts from), When (the action taken), Then (what should be true afterwards) or And, which carries whichever of those three came before it. Preconditions is not a line inside a block: it is a prose line in the case's own section, above the block, and it names what must already be true before step 1. The tags fall into three groups: a kind, one or more of a happy path, a refusal, a value at a boundary, a positive control, the security check and the signed-in state; `@automated` or `@manual`, for how the case is run; and a case name such as `@R3` or `@L1`. A red run is a run that fails, a mock is a stand-in that answers in place of the real service, and there is no staging environment here, so every run is against the live site.

### R1 Successful registration and confirmed e-mail address

Preconditions: an unregistered, valid e-mail address.

How to test: Manual - needs a solved security check, a new account and a mailbox. R1 and R6 have not been run while writing the document, because both need a person to solve the security check, and R1 also needs a mailbox; nor has L1 on an account whose e-mail address is confirmed, because the account used so far is not confirmed. The three readings R1 names, the confirmation page, the subject line of the message and the wording of the dialog, are what its first run confirms.

| Step | Action |
|---|---|
| 1 | Open `https://www.gametwist.com/en/registration/` and reject the cookie dialog if it appears. |
| 2 | Enter the e-mail address, a nickname that is not taken, and a password of at least 10 characters containing a number or a special character. |
| 3 | Select a date of birth at least 18 years in the past, tick the terms checkbox, and solve the security check. |
| 4 | Press **BEGIN ADVENTURE**. |

Expected result of steps 1 to 4: the confirmation page opens, and it says the confirmation e-mail has been sent and offers to send it again.

| Step | Action |
|---|---|
| 5 | Open the mailbox, open the message whose subject is `GameTwist - Confirm email address - <nickname>` (the wording to be confirmed on the first run), and follow the link in it. |

Expected result of step 5: a dialog appears confirming the address, with the wording `Your e-mail address has been confirmed. You can log in now.` to be read from the first run, and no unconfirmed-address notice is shown.

```gherkin
@R1 @happy-path @manual
Scenario: A new player registers and confirms the e-mail address
  When the player enters an e-mail address that is not in use
  And the player enters an available nickname
  And the player enters a valid password
  And the player selects a date of birth at least 18 years in the past
  And the player ticks the terms checkbox
  And the player solves the security check
  And the player presses "BEGIN ADVENTURE"
  Then the player is taken to the registration confirmation page
  And the page says the confirmation e-mail has been sent
  When the player follows the link in the confirmation e-mail
  Then a dialog confirms that the e-mail address has been confirmed
  And the page no longer shows an unconfirmed-address notice
```

### R2 E-mail and nickname rules

Preconditions: an account whose nickname is already registered, for the registered-nickname row of the table.

How to test: Automated - no e-mail verification and no security check to solve

| Step | Action |
|---|---|
| 1 | Open `https://www.gametwist.com/en/registration/` and reject the cookie dialog if it appears. |
| 2 | Enter one row's value in its field, keeping the other field valid. |
| 3 | Leave the date of birth, the terms checkbox and the security check untouched. The refusal under test must appear even while those three are unsatisfied. |
| 4 | Press **BEGIN ADVENTURE**. |

| Input | Expected |
|---|---|
| E-mail left empty | `E-mail address required` |
| E-mail `not-an-email`, `missing@tld`, `two@@at.com`, `space in@mail.com`, `@nolocal.com`, `trailing.dot.@mail.com` | `Please enter a valid e-mail address.` |
| Nickname left empty | `Nickname required` |
| Nickname `ab` or `abcdefghijklmn` | `Your nickname must be between 3 and 13 characters long.` |
| Nickname `qa tester!` or `qa<tester>` | `Your nickname may not contain Cyrillic letters or special characters.` |
| Nickname that is already registered | `This nickname is already taken. Possible alternatives:` followed by three suggested nicknames |
| Control: a well-formed address, and a nickname the availability check reports as free, at each accepted length boundary, 3 and 13 characters | no message for the e-mail field and no message for the nickname field |

Expected result: each refusal appears under the field it belongs to, and that field is marked invalid. No registration request leaves the browser. The check for a nickname that is already registered runs while the nickname is typed, and the page answers it from its own availability check; the length and character rules are reported under the field on submit. The control row shows that the rules are not so strict that valid input is refused. It runs at both accepted length boundaries, 3 and 13 characters, so a rule that is off by one is caught, and its nickname is read from the availability check at run time, because a nickname written into this document can be registered by someone else before the case is run.

```gherkin
@R2 @negative @automated
Scenario: An empty e-mail address is refused
  When the player leaves the e-mail address empty
  And the player enters a valid nickname
  And the player leaves the date of birth, the terms and the security check untouched
  And the player presses "BEGIN ADVENTURE"
  Then the message "E-mail address required" is shown for the e-mail field
  And the e-mail field is marked as invalid
  And no registration request leaves the browser

@R2 @negative @automated
Scenario Outline: A malformed e-mail address is refused
  When the player enters "<email>" as the e-mail address
  And the player enters a valid nickname
  And the player leaves the date of birth, the terms and the security check untouched
  And the player presses "BEGIN ADVENTURE"
  Then the message "Please enter a valid e-mail address." is shown for the e-mail field
  And the e-mail field is marked as invalid
  And no registration request leaves the browser

  Examples:
  | email |
  | not-an-email |
  | missing@tld |
  | two@@at.com |
  | space in@mail.com |
  | @nolocal.com |
  | trailing.dot.@mail.com |

@R2 @negative @automated
Scenario: An empty nickname is refused
  When the player enters a valid e-mail address
  And the player leaves the nickname empty
  And the player leaves the date of birth, the terms and the security check untouched
  And the player presses "BEGIN ADVENTURE"
  Then the message "Nickname required" is shown for the nickname field
  And the nickname field is marked as invalid
  And no registration request leaves the browser

@R2 @negative @boundary @automated
Scenario Outline: A nickname outside the allowed length is refused
  When the player enters a valid e-mail address
  And the player enters "<nickname>" as the nickname
  And the player leaves the date of birth, the terms and the security check untouched
  And the player presses "BEGIN ADVENTURE"
  Then the message "Your nickname must be between 3 and 13 characters long." is shown for the nickname field
  And the nickname field is marked as invalid
  And no registration request leaves the browser

  Examples:
  | nickname |
  | ab |
  | abcdefghijklmn |

@R2 @negative @boundary @automated
Scenario Outline: A nickname with a space or a special character is refused
  When the player enters a valid e-mail address
  And the player enters "<nickname>" as the nickname
  And the player leaves the date of birth, the terms and the security check untouched
  And the player presses "BEGIN ADVENTURE"
  Then the message "Your nickname may not contain Cyrillic letters or special characters." is shown for the nickname field
  And the nickname field is marked as invalid
  And no registration request leaves the browser

  Examples:
  | nickname |
  | qa tester! |
  | qa<tester> |

@R2 @negative @automated
Scenario: A nickname that is already registered is refused while it is typed
  When the player enters a valid e-mail address
  And the player enters the nickname of an existing account
  Then the message "This nickname is already taken. Possible alternatives:" is shown for the nickname field, followed by three suggested nicknames
  And the nickname field is marked as invalid
  And no registration request leaves the browser

@R2 @positive @automated
Scenario Outline: Valid input produces no e-mail or nickname message
  When the player enters a well-formed e-mail address
  And the player enters an available nickname of <length> characters
  And the player leaves the date of birth, the terms and the security check untouched
  And the player presses "BEGIN ADVENTURE"
  Then no message is shown for the e-mail field
  And no message is shown for the nickname field
  And the message "The security check is a required field. Please enter the code." is shown
  And no registration request leaves the browser

  Examples:
  | length |
  | 3 |
  | 13 |
```

### R3 Password rules

How to test: Automated - no e-mail verification and no security check to solve

| Step | Action |
|---|---|
| 1 | Open `https://www.gametwist.com/en/registration/` and reject the cookie dialog if it appears. |
| 2 | Enter a valid e-mail address and a valid nickname. |
| 3 | Enter the passwords given below one by one. |
| 4 | Leave the rest untouched, so the page refuses the submit. |
| 5 | Press **BEGIN ADVENTURE**. |

| Password | Expected |
|---|---|
| `abc123` (6 characters) | `Your password must be at least 10 characters long.` |
| `abcdefghi` (9 characters, just below the limit) | `Your password must be at least 10 characters long.` |
| `abcdefghij` (10 characters, letters only) | `Your password must contain at least one letter, one number or a special character.` |
| `Abcdefg12!` (10 characters, and it contains a number) | no password message |
| `Abcdefgh12!` (11 characters, satisfies every rule) | no password message |
| Empty password field | `Password required`, with the page's other password rules listed alongside it |

Expected result: the message appears under the password field, the field is marked invalid, and no registration request leaves the browser. The two accepted passwords show no password message, and for both of them the message `The security check is a required field. Please enter the code.` appears, which is the sign that validation ran and reached the security check. The fields this case leaves untouched, the date of birth and the terms, show their own messages alongside it, the same way the R5 paragraph below describes. The empty password field shows `Password required` instead, and the page lists its other password rules alongside that one; the case asserts the message the table names, and that no registration request leaves the browser.

```gherkin
@R3 @negative @boundary @automated
Scenario Outline: A password shorter than 10 characters is refused
  When the player enters a valid e-mail address
  And the player enters a valid nickname
  And the player enters "<password>" as the password
  And the player leaves the date of birth, the terms and the security check untouched
  And the player presses "BEGIN ADVENTURE"
  Then the message "Your password must be at least 10 characters long." is shown for the password field
  And the password field is marked as invalid
  And no registration request leaves the browser

  Examples:
  | password |
  | abc123 |
  | abcdefghi |

@R3 @negative @boundary @automated
Scenario: A password of 10 letters and no number or special character is refused
  When the player enters a valid e-mail address
  And the player enters a valid nickname
  And the player enters "abcdefghij" as the password
  And the player leaves the date of birth, the terms and the security check untouched
  And the player presses "BEGIN ADVENTURE"
  Then the message "Your password must contain at least one letter, one number or a special character." is shown for the password field
  And the password field is marked as invalid
  And no registration request leaves the browser

@R3 @negative @automated
Scenario: An empty password is refused
  When the player enters a valid e-mail address
  And the player enters a valid nickname
  And the player leaves the password empty
  And the player leaves the date of birth, the terms and the security check untouched
  And the player presses "BEGIN ADVENTURE"
  Then the message "Password required" is shown for the password field
  And no registration request leaves the browser

@R3 @positive @boundary @automated
Scenario Outline: A password that satisfies every rule produces no password message
  When the player enters a valid e-mail address
  And the player enters a valid nickname
  And the player enters "<password>" as the password
  And the player leaves the date of birth, the terms and the security check untouched
  And the player presses "BEGIN ADVENTURE"
  Then no message is shown for the password field
  And the message "The security check is a required field. Please enter the code." is shown
  And no registration request leaves the browser

  Examples:
  | password    |
  | Abcdefg12!  |
  | Abcdefgh12! |
```

### R4 A date of birth under 18 is refused

How to test: Automated - no e-mail verification and no security check to solve

| Step | Action |
|---|---|
| 1 | Open `https://www.gametwist.com/en/registration/` and reject the cookie dialog if it appears. |
| 2 | Enter a valid e-mail address, an available nickname, a valid password, and tick the terms checkbox. |
| 3 | Open the date of birth year dropdown and note the newest year it offers. |
| 4 | Select that newest year with the latest month and day in it, which leaves the player under 18. On 31 December no date in that year is under 18, so record the refusal as not runnable that day and stop. |
| 5 | Leave the security check unsolved and press **BEGIN ADVENTURE**. |

Expected result: for step 3 the newest year offered is the current year minus 18. For steps 4 and 5, `The minimum legal age required for using our offerings is 18 years.` appears, the security-check message appears as well because that check is still unsolved, the page stays on the registration page, and no registration request is sent. The two messages are what the live measurement recorded, together with the absence of the age message for an over-18 date; that measurement had the e-mail, nickname and password fields reported as empty, so what it shows is the age rule and not the rest of a valid form, and the page staying put and the silence of the network are what the first run of this case confirms.

The year list is the page's only guard on the year, and the year alone does not settle the age: on every day except 31 December, the latest date inside the newest year is still under 18, which is the date step 4 selects. The refusal in step 5 is what enforces the rule.

```gherkin
@R4 @boundary @automated
Scenario: The newest year in the date of birth dropdown is the current year minus 18
  When the player opens the year dropdown
  Then the newest year offered is the current year minus 18

@R4 @negative @boundary @automated
Scenario: A date of birth under 18 is refused
  When the player enters a valid e-mail address
  And the player enters a valid nickname
  And the player enters a valid password
  And the player ticks the terms checkbox
  And the player selects the newest year offered with the latest month and day in it
  And the player leaves the security check unsolved
  And the player presses "BEGIN ADVENTURE"
  # On 31 December this case is not runnable: the newest year offered is then exactly 18 years before
  # today, so no under-18 date exists and the refusal below is not produced.
  Then the message "The minimum legal age required for using our offerings is 18 years." is shown
  And the message "The security check is a required field. Please enter the code." is shown
  And no registration request leaves the browser
```

### R5 The terms and the security check block the submit

How to test: Automated - no e-mail verification and no security check to solve

| Step | Action |
|---|---|
| 1 | Open `https://www.gametwist.com/en/registration/` and reject the cookie dialog if it appears. |
| 2 | Enter a valid e-mail address, an available nickname, a valid password and a date of birth at least 18 years in the past. |
| 3 | Leave the terms checkbox unticked and press **BEGIN ADVENTURE**. |
| 4 | Confirm that the form still holds the values from step 2, tick the terms checkbox, leave the security check unsolved, and press **BEGIN ADVENTURE**. |

Expected result: step 3 shows `You must agree to our General Terms & Conditions to continue.` and step 4 shows `The security check is a required field. Please enter the code.` Each message appears for its own condition, the page stays on the registration page, and no registration request leaves the browser. The security-check message does not mean that every earlier field passed: the page shows it alongside the messages of the fields that did not. It is the message a form with everything else valid still produces, which is what makes it the positive signal R2 and R3 read; R4 asserts it alongside the age refusal, so there it is evidence that validation ran and not that the date of birth passed.

```gherkin
@R5 @negative @automated
Scenario: The submit is refused while the terms are unticked
  When the player enters a valid e-mail address
  And the player enters a valid nickname
  And the player enters a valid password
  And the player selects a date of birth at least 18 years in the past
  And the player leaves the terms unticked
  And the player presses "BEGIN ADVENTURE"
  Then the message "You must agree to our General Terms & Conditions to continue." is shown
  And no registration request leaves the browser

@R5 @negative @automated
Scenario: The submit is refused while the security check is unsolved
  When the player enters a valid e-mail address
  And the player enters a valid nickname
  And the player enters a valid password
  And the player selects a date of birth at least 18 years in the past
  And the player ticks the terms checkbox
  And the player leaves the security check unsolved
  And the player presses "BEGIN ADVENTURE"
  Then the message "The security check is a required field. Please enter the code." is shown
  And no registration request leaves the browser
```

### R6 An e-mail address that is already in use cannot be registered again

Preconditions: an account already exists and its e-mail address is known.

How to test: Manual - the refusal comes from the service, so the submit has to be completed, and that needs a solved security check

| Step | Action |
|---|---|
| 1 | Sign out if a session is active, then open `https://www.gametwist.com/en/registration/` and reject the cookie dialog if it appears. |
| 2 | Enter the e-mail address of the existing account, with a nickname that is not taken, a valid password and a date of birth at least 18 years in the past. |
| 3 | Tick the terms checkbox and solve the security check. |
| 4 | Press **BEGIN ADVENTURE**. |

Expected result: the registration is refused, the page says the address is already in use, the page stays on the registration page, and no confirmation page opens. The wording recorded here, `The e-mail address you entered is already in use.`, has not been seen on a live run, so this case records the exact text when it is first run. The browser refuses R2, R3 and R5 before a registration request leaves the browser, and R2's registered-nickname row sends no registration request either: its answer comes from the availability check while the nickname is typed. R4's silence is what its first run confirms. R1 and R6 are the two cases whose answer to the submit comes from the service, so a registration request is expected here as it is in R1.

The page does not answer this rule on its own: it flags a nickname that is taken while it is typed, which is the R2 case, and the answer about an address is expected only from the service, after the submit. That is why this case needs the submit to be completed and the security check solved, and why it cannot be automated here.

```gherkin
@R6 @negative @manual
Scenario: An e-mail address that is already in use is refused
  When the player enters the e-mail address of an account that already exists
  And the player enters an available nickname
  And the player enters a valid password
  And the player selects a date of birth at least 18 years in the past
  And the player ticks the terms checkbox
  And the player solves the security check
  And the player presses "BEGIN ADVENTURE"
  Then the message "The e-mail address you entered is already in use." is shown
  And the page stays on the registration page
  And no confirmation page opens
```

### L1 Successful login

Preconditions: the credentials of a test account whose e-mail address is confirmed.

How to test: Automated - needs the test account, and the login form has no security check. The sign-in itself is measured, on an account whose address is not confirmed, so the confirmed-account path and the absence of the notice at the end of the expected result are what a first run on such an account confirms.

| Step | Action |
|---|---|
| 1 | Sign out if a session is active, then open `https://www.gametwist.com/en/login/`, or press LOGIN on the landing page, which opens the form in a dialog. |
| 2 | Enter the account's nickname and password. |
| 3 | Press **LOG IN**. |

Expected result: the player is signed in, the landing page shows the nickname of the test account in the header, and no unconfirmed-address notice appears. Where the credentials were entered on `/en/login/` itself, that page does not navigate on its own, so the signed-in state is read on the landing page.

```gherkin
@L1 @happy-path @automated
Scenario: A registered player signs in
  When the player opens the login page
  And the player enters the nickname of the test account
  And the player enters its correct password
  And the player presses "LOG IN"
  And the player opens the landing page
  Then the player is signed in
  And the landing page shows the nickname of the test account in the header
  And no unconfirmed-address notice is shown
```

### L2 An empty login form is refused

How to test: Automated - no account needed, nothing is sent

| Step | Action |
|---|---|
| 1 | Sign out if a session is active, then open `https://www.gametwist.com/en/login/`. |
| 2 | Press **LOG IN** with both fields empty. |

Expected result: `Nickname required` and `Password required` appear, both fields are marked invalid, the form stays on the page, and no login request is sent.

```gherkin
@L2 @negative @automated
Scenario: An empty login form is refused
  When the player opens the login page
  And the player leaves the nickname and the password empty
  And the player presses "LOG IN"
  Then the message "Nickname required" is shown for the nickname field
  And the message "Password required" is shown for the password field
  And both fields are marked as invalid
  And the login form stays open
  And no login request is sent
```

### L3 Wrong credentials are refused without revealing whether the account exists

Preconditions: the nickname of a test account is known.

How to test: Automated - needs a test account

| Step | Action |
|---|---|
| 1 | Sign out if a session is active, then open `https://www.gametwist.com/en/login/`. |
| 2 | Enter a nickname that is not registered, with any password, press **LOG IN**, and record the message. |
| 3 | Enter the test account's nickname with a wrong password, press **LOG IN**, and record the message. |

Expected result: both attempts show `Incorrect nickname/password combination.`, the player stays signed out, the form stays on the page, and the two recorded messages are identical, so the page does not reveal whether the nickname exists. One attempt of each kind per run, with no retry loop, so the test account is not driven towards a lockout. Both halves are measured.

```gherkin
@L3 @negative @security @automated
Scenario: Wrong credentials are refused without revealing whether the account exists
  When the player opens the login page
  And the player enters a nickname that is not registered, with any password
  And the player presses "LOG IN"
  Then the message "Incorrect nickname/password combination." is shown
  And the player is not signed in
  When the player enters the nickname of the test account with a wrong password
  And the player presses "LOG IN"
  Then the same message "Incorrect nickname/password combination." is shown
  And the login form stays open
  And the two recorded messages are identical
```

### L4 An account whose e-mail address is not confirmed can sign in

Preconditions: the credentials of a test account whose e-mail address has not been confirmed.

How the account is produced: it is registered before a run and its activation link is never followed, so the address stays unconfirmed.

How to test: Automated - needs a test account that is left unconfirmed

| Step | Action |
|---|---|
| 1 | Sign out if a session is active, then open `https://www.gametwist.com/en/login/`. |
| 2 | Enter the nickname and password of the unconfirmed account. |
| 3 | Press **LOG IN**. |

Expected result: the player is signed in, read on the landing page, whose header shows the nickname of the account, and a notification bar fixed to the foot of the page reads `Your e-mail address has not yet been confirmed` next to an enabled control that sends the confirmation e-mail again. Signing in therefore does not depend on the address being confirmed, which is the behaviour this case records.

```gherkin
@L4 @state @automated
Scenario: An account whose e-mail address is not confirmed can sign in
  When the player opens the login page
  And the player enters the nickname of an account whose e-mail address is not confirmed
  And the player enters its correct password
  And the player presses "LOG IN"
  And the player opens the landing page
  Then the player is signed in
  And the landing page shows the text "Your e-mail address has not yet been confirmed"
  And the landing page shows the enabled control that sends the confirmation e-mail again
```

## 5. Automation

Section 3 marks eight cases automated and two manual. This section gives the reasoning, and the approach for the two that stay manual.

**Why those eight.** Each automated case is automated for at least one of these reasons:

- **The browser decides them.** R3, R4 and R5 are refusals the page produces without sending a registration request, so they need no account, no mailbox and no security check. R3's and R5's silence on the network is measured, and R4's message is measured while its silence is what the case's first run confirms, which is why section 4 says so at R4. R2's rows are the same kind of refusal, with one exception: its registered-nickname row is answered by the service, which is why the table marks R2 with a star.
- **Exact wording and state are compared.** L2 and L3 turn on message text, and L3 compares two refusals word for word, which is where a person is least reliable. L1 asserts the signed-in state, which is the nickname in the header, and L4 asserts that state together with the unconfirmed-address notice and its resend control.
- **A failure names its own cause.** Each scenario lists in its own steps the messages or the state it checks, so a red run points at a field rather than at "registration is broken", which is why the cases that cover several rules are written as several scenarios.

**Why R1 and R6 are manual.** Both need a human to solve the security check, which is Google reCAPTCHA v2: its widget sits in the `recaptcha/api2/anchor` and `recaptcha/api2/bframe` frames, and the solved token is carried by the `g-recaptcha-response` form field, and no automated run here may solve it. R6's answer comes from the service only after a completed submit, and R1 additionally needs a mailbox and creates a real account on every run. R1 is also the only end-to-end case in the set, and deliberately so: it is the only check that crosses the browser, the service, the mail path and the confirmed account state.

**Approach for R1.**

- Run once per release candidate, and again when the form, the terms text, the security check or the confirmation e-mail changes.
- Data: a fresh address from a domain the team controls, and a human for the security check.
- Record: build, date, the address used, whether the message arrived and how long it took, the dialog wording if it differs, and any deviation.
- End state: signed out, so the login cases start from a signed-out browser.

**Approach for R6.**

- Run once per release candidate, with the address of an existing account.
- Record: the message shown, and whether the page stayed on the registration page.
- One submit per run, with no retry loop.

**What would make them automatable.** A test environment in which the site itself disables the security check for test accounts, plus a mailbox API (or a mock). Nothing in the pages blocks automation; the security check does. Because test accounts can be created for a run, these two cases become candidates for automation as soon as the security check can be disabled for them.

**What the automated cases need at run time** is listed in section 6.

## 6. Test data and environment

| Item | Value |
|---|---|
| Environment | The live site, English locale, no staging environment available |
| Browser | Chromium, desktop viewport |
| Accounts | One confirmed test account for L1 and L3, one unconfirmed test account for L4, and one account whose nickname is already registered for the registered-nickname row of R2; all are set up before a run |
| Credentials | Supplied by the environment, and never written into this document |
| Address for R1 | A fresh address from a domain the team controls, one per run |
| Address for R6 | The e-mail address of the account named in the R6 precondition |
| Shared case data | A valid e-mail address is any address that is not registered; a valid nickname is any nickname that is not taken; a valid password is at least 10 characters with a number or a special character, and the cases use Abcdefgh12!; a valid date of birth is 18 years or more in the past, and each case that needs one selects it at run time |
| Cookie dialog | OneTrust; the six registration cases name rejecting it in their step 1, and the login cases inherit that from the preamble to section 4 |
