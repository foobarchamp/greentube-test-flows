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
4. Open the confirmation e-mail and follow the activation link, which confirms the e-mail address used for the GameTwist account. Until that link is used, the account is unconfirmed: signing in still succeeds, and the header carries the unconfirmed-address notice (`Your e-mail address has not yet been confirmed`).

**Login**

1. Open `https://www.gametwist.com/en/login/`, or press LOG IN on the landing page `https://www.gametwist.com/en/`, which opens the login form in a dialog. LOG IN on the registration page opens the same form in place. While a session is active, both entry points land on the landing page, so sign out first.
2. Enter the nickname and the password, and optionally tick "Log in automatically".
3. Press LOG IN.
 - Wrong password or an unregistered nickname: the message "Incorrect nickname/password combination." appears and the login form stays open.
 - Correct: the player is signed in, arrives on the landing page, and the header shows the nickname.

## 3. Use cases at a glance

Ten cases: six for registration, four for login. A star means the case needs an account that already exists on the service; those accounts are set up before a run. R1 and R6 stay manual because both need a human to solve the security check, and R1 also needs a mailbox.

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
| L4 | An account whose e-mail address is not confirmed can sign in, and the header shows the unconfirmed-address notice | state | yes* (needs an unconfirmed test account) |

## 4. Test cases in detail

Every case below starts on the page its step 1 names, signed out if a session could be active, with the cookie dialog rejected if it appears; those actions are not repeated in every scenario. Tags mark the type: @happy-path, @negative, @boundary, @positive, @security, @state, @manual and @automated. The shared values the cases use are in section 6.

### R1 Successful registration and confirmed e-mail address

Preconditions: an unregistered, valid e-mail address.

How to test: Manual - needs a solved security check, a new account and a mailbox

| Step | Action |
|---|---|
| 1 | Open `https://www.gametwist.com/en/registration/` and reject the cookie dialog if it appears. |
| 2 | Enter the e-mail address, a nickname that is not taken, and a password of at least 10 characters containing a number or a special character. |
| 3 | Select a date of birth at least 18 years in the past, tick the terms checkbox, and solve the security check. |
| 4 | Press **BEGIN ADVENTURE**. |

Expected result of steps 1 to 4: the confirmation page opens, the header already shows the new nickname, and the page says the confirmation e-mail has been sent and offers to send it again.

| Step | Action |
|---|---|
| 5 | Open the mailbox, open the message whose subject is `GameTwist - Confirm email address - <nickname>`, and follow the link in it. |

Expected result of step 5: a dialog appears with the text `Your e-mail address has been confirmed. You can log in now.`, and the header no longer carries the unconfirmed-address notice.

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
  And the header shows the new nickname
  And the page says the confirmation e-mail has been sent
  When the player follows the link in the confirmation e-mail
  Then a dialog confirms that the e-mail address has been confirmed
  And the header no longer shows an unconfirmed-address notice
```

### R2 E-mail and nickname rules

Preconditions: an account whose nickname is already registered, for the last row of the table

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
| Control: a well-formed address, and the nicknames `abc` and `abcdefghijklm` | no message for the e-mail field and no message for the nickname field |

Expected result: each refusal appears under the field it belongs to, and that field is marked invalid. No registration request leaves the browser. The check for a nickname that is already registered runs while the nickname is typed, and the page answers it from its own availability check; the length and character rules are reported under the field on submit. The control row shows that the rules are not so strict that valid input is refused.

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
  And the player enters "<nickname>" as the nickname
  And the player leaves the date of birth, the terms and the security check untouched
  And the player presses "BEGIN ADVENTURE"
  Then no message is shown for the e-mail field
  And no message is shown for the nickname field
  And the message "The security check is a required field. Please enter the code." is shown
  And no registration request leaves the browser

  Examples:
  | nickname |
  | abc |
  | abcdefghijklm |
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
| Empty password field | `Password required` |

Expected result: the message appears under the password field, the field is marked invalid, and no registration request leaves the browser. The two accepted passwords show no password message, and for both of them the message `The security check is a required field. Please enter the code.` appears, which is the sign that validation ran and only the unsolved check remains. The empty password field shows `Password required` instead.

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

Expected result: for step 3 the newest year offered is the current year minus 18. For steps 4 and 5, `The minimum legal age required for using our offerings is 18 years.` appears, the security-check message appears as well because that check is still unsolved, the page stays on the registration page, and no request is sent.

The year list is the page's only guard on the year, and the year alone does not settle the age: on every day except 31 December, a date inside the newest year is still under 18, which is the date step 4 selects. The refusal in step 5 is what enforces the rule.

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

Expected result: step 3 shows `You must agree to our General Terms & Conditions to continue.` and step 4 shows `The security check is a required field. Please enter the code.` Each message appears for its own condition, the page stays on the registration page, and no registration request leaves the browser. The security-check message is also the signal that every other field passed, which is what makes it the positive signal used by R2, R3 and R4.

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

Expected result: `The e-mail address you entered is already in use.` is shown, the page stays on the registration page, and no confirmation page opens. This case is the one exception to the transmission rule: the refusal is the service's answer, so a registration request is expected here.

The page does not answer this rule on its own: it flags a nickname that is taken while it is typed, which is the R2 case, but for an address it stays silent until the service replies. That is why this case needs the submit to be completed and the security check solved, and why it cannot be automated here.

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

How to test: Automated - needs the test account, and the login form has no security check

| Step | Action |
|---|---|
| 1 | Sign out if a session is active, then open `https://www.gametwist.com/en/login/`, or press LOGIN on the landing page, which opens the form in a dialog. |
| 2 | Enter the account's nickname and password. |
| 3 | Press **LOG IN**. |

Expected result: the login form closes if it was opened in a dialog, the player is signed in on the landing page, the header shows the nickname of the test account, and no unconfirmed-address notice appears.

```gherkin
@L1 @happy-path @automated
Scenario: A registered player signs in
  When the player opens the login page
  And the player enters the nickname of the test account
  And the player enters its correct password
  And the player presses "LOG IN"
  Then the player is signed in
  And the header shows the nickname of the test account
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

Expected result: both attempts show `Incorrect nickname/password combination.`, the player stays signed out, the form stays on the page, and the two recorded messages are identical, so the page does not reveal whether the nickname exists. One attempt of each kind per run, with no retry loop, so the test account is not driven towards a lockout.

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

Expected result: the player is signed in, and the header carries `Your e-mail address has not yet been confirmed` with a control that sends the confirmation e-mail again. Signing in therefore does not depend on the address being confirmed, which is the behaviour this case records.

```gherkin
@L4 @state @automated
Scenario: An account whose e-mail address is not confirmed can sign in
  When the player opens the login page
  And the player enters the nickname of an account whose e-mail address is not confirmed
  And the player enters its correct password
  And the player presses "LOG IN"
  Then the player is signed in
  And the header shows the text "Your e-mail address has not yet been confirmed"
  And the header shows the enabled control that sends the confirmation e-mail again
```

## 5. Automation

Section 3 marks eight cases automated and two manual. This section gives the reasoning, and the approach for the two that stay manual.

**Why those eight.** A case needs only one of these:

- **The browser decides them.** R3, R4 and R5 are refusals the page produces before any registration request leaves the browser, so they need no account, no mailbox and no security check.
- **Exact wording and state are compared.** L2 and L3 turn on message text, and L3 compares two refusals word for word, which is where a person is least reliable. L1 and L4 assert the signed-in state of the header.
- **A failure names its own cause.** Each case asserts one rule and carries its own input, so a red run points at a field rather than at "registration is broken".

**Why R1 and R6 are manual.** Both need a human to solve the security check. R6's answer comes from the service only after a completed submit, and R1 additionally needs a mailbox and creates a real account on every run. R1 is also the only end-to-end case in the set, and deliberately so: it is the only check that crosses the browser, the service, the mail path and the confirmed account state.

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
| Accounts | One confirmed test account for L1 and L3, one unconfirmed test account for L4, and one account whose nickname is already registered for the last row of R2; all are set up before a run |
| Credentials | Supplied by the environment, and never written into this document |
| Address for R1 | A fresh address from a domain the team controls, one per run |
| Address for R6 | The e-mail address of the account named in the R6 precondition |
| Shared case data | A valid e-mail address is any address that is not registered; a valid nickname is any nickname that is not taken; a valid password is at least 10 characters with a number or a special character, and the cases use Abcdefgh12!; a valid date of birth is 18 years or more in the past, and the cases use 15 June 1990 |
| Cookie dialog | OneTrust; every case's step 1 rejects it if it appears |
