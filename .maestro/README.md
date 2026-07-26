# Maestro E2E flows

UI flows for the PlayPBNow app, run with [Maestro](https://maestro.mobile.dev).

## Running

Maestro needs a JDK. There's no system Java on this Mac — `JAVA_HOME` points at
Homebrew `openjdk@21` in `~/.zshrc`, so a normal login shell just works.
(`/usr/libexec/java_home` reporting "Unable to locate a Java Runtime" is expected;
the keg-only JDK is intentionally not registered system-wide.)

Boot a simulator/emulator with the app installed, then:

```bash
# Android
maestro test -e APP_ID=com.mcallpl.playpbnow .maestro/login-validation.yaml

# iOS — note the different casing in the bundle id
maestro test -e APP_ID=com.mcallpl.PlayPBNow .maestro/login-validation.yaml

# whole suite
maestro test -e APP_ID=com.mcallpl.playpbnow .maestro/

# dump the view hierarchy — what to reach for when a tapOn can't find its target
maestro hierarchy
```

Maestro Studio (the interactive selector explorer) is **no longer bundled with the
CLI** as of 2.7.0 — it's a separate desktop app: <https://studio.maestro.dev>.
`maestro hierarchy` covers the same debugging need from the terminal.

## Flows

| Flow | Status | Safe against prod? |
| --- | --- | --- |
| `login.yaml` | ⚠️ Not yet run — needs credentials | Real login, real session — use a test account |
| `login-validation.yaml` | ✅ Passing (iPhone 17 Pro, iOS 26.5, 2026-07-26) | Yes — nothing is created |
| `login-forgot-password.yaml` | ✅ Passing (same run) | Yes — **stops before SEND CODE** |

Coverage note: `login-validation.yaml` checks register mode's *empty-form* error
(`Email and password are required.`) but not the per-field messages after it, such
as `Please enter your first name.` Filling that form means driving fields the iOS
keyboard occludes, which was too flaky to be worth it — add `testID`s first.

`login.yaml` needs credentials, which are never committed:

```bash
maestro test -e APP_ID=com.mcallpl.playpbnow \
             -e LOGIN_EMAIL=you@example.com \
             -e LOGIN_PASSWORD=... \
             .maestro/login.yaml
```

## ⚠️ Never automate SMS

`forgot_password.php` sends a **real Twilio SMS** to whatever number is in the
field. `login-forgot-password.yaml` asserts the SEND CODE button exists but never
taps it, and that's on purpose. Don't add a flow that completes the reset against
production — the code-entry and new-password steps need a staging API or a manual
run with your own phone.

## Selectors

The login screen has no `testID`s, so these flows match on visible text and
placeholders (`"Email or phone number"`, `"Your password"`, `"SIGN IN"`). That
works, but it means **any copy change breaks the flow**.

Gotchas that cost real debugging time here — all verified against the iOS 26.5
simulator, not assumed:

- **Matching is full-string regex, not substring.** `"Please enter your email"`
  will NOT match the banner `Please enter your email (or phone) and password.` —
  you need `"Please enter your email.*"`. Literal punctuation must be escaped:
  `"Forgot Password\\?"`, `"6\\+ characters"`.
- **`hideKeyboard` is flaky on iOS 26.5.** It failed on steps that had passed
  moments earlier. These flows dismiss the keyboard by tapping a static label
  (`"EMAIL OR PHONE"`, `"PASSWORD"`) instead — `keyboardShouldPersistTaps` is
  `"handled"`, so a tap on non-interactive text closes it.
- **A `tapOn` against an occluded element hits whatever is on top, and still
  reports COMPLETED.** Two things occlude here: the iOS keyboard (tapping a label
  behind it types stray letters into the focused field) and Expo's LogBox toast
  (`Open debugger to view warnings`), which covers CREATE ACCOUNT in dev builds —
  hence the `scroll` before that tap. Release builds have no LogBox.
- **`toggleMode()` keeps the email/password state**, so switching to register mode
  after typing leaves both fields populated and their placeholders hidden. The
  register section relaunches with `clearState` rather than assuming empty fields.

When a `tapOn` misbehaves, read the screenshot in
`~/.maestro/tests/<timestamp>/<flow>/screenshots/` first — it shows occlusion that
the view hierarchy does not.

Adding `testID` props to the inputs and buttons in `app/login.tsx` would make all
of this copy-independent — worth doing before this suite grows.
