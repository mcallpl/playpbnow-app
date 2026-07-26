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

# interactive selector explorer — best way to debug a failing tapOn
maestro studio
```

## Flows

| Flow | What it covers | Safe against prod? |
| --- | --- | --- |
| `login.yaml` | Happy-path sign-in → lands on the Groups tab | Real login, real session — use a test account |
| `login-validation.yaml` | Empty-form error, generic bad-credentials error, register-mode toggle | Yes — nothing is created |
| `login-forgot-password.yaml` | Reset modal opens, prefills, cancels | Yes — **stops before SEND CODE** |

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
works, but it means **any copy change breaks the flow**. Maestro also treats these
strings as regexes, which is why `6\+ characters` is escaped and why assertions use
punctuation-free substrings (`"Forgot Password"`, not `"Forgot Password?"`).

Adding `testID` props to the inputs and buttons in `app/login.tsx` would make all
of this copy-independent — worth doing before this suite grows.
