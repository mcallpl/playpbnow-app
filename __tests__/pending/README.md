# Pending specs — components that do not exist yet

These suites were written against a planned component library
(`components/Button.tsx`, `components/TextInput.tsx`) that was never built —
neither file appears anywhere in git history, and `components/ui/` only ever
contained `collapsible`, `icon-symbol` and `ComponentLibraryGuide.md`.

They are kept because they encode a usable spec for those components, but they
are excluded from the Jest run (see `testPathIgnorePatterns` in jest.config.js)
so the suite reports real failures rather than the permanent noise of importing
modules that cannot resolve.

Move a file back into `__tests__/` when the component it describes exists.

## SignupWizard.test.ts (was useSetupState.test.ts)

Describes a multi-step player-signup wizard — photo, firstName, email,
playLevel, daysToPlay, per-step validation, getSubmissionData. Those are
`pool_players` signup fields, and that flow lives in the standalone
`player-signup.html` page, not in a React hook.

It was importing `hooks/useSetupState`, which is a different thing entirely
(match setup: groups, players, courts), and neither that hook nor the live one
at `app/setup/hooks/useSetupState.ts` has ever exposed nextStep/validateStep/
getSummary. The real reducer is covered by `__tests__/useSetupState.test.ts`.

## Game.screen.test.tsx and Setup.screen.test.tsx

Both are written against an architecture the screens do not have, so nothing in
them was ever exercising real code:

- They mock `ApiClient.getInstance()` and stub `.get()/.post()`. Neither screen
  imports ApiClient — `app/(tabs)/game.tsx` calls `fetch` directly against
  get_courts.php, save_scores.php, search_players.php and
  generate_report_image.php, so the mock is inert and the screens would hit the
  network.
- `Game.screen.test.tsx` imports `{ GameScreen }`; game.tsx has a default export.
- They query testIDs such as `player-selected-1`. `app/(tabs)/game.tsx` is 1,374
  lines and contains **no testID at all**.

Making them real is a genuine piece of work, not a repair: instrument the game
screen with testIDs, mock `fetch` (or route the screen through ApiClient), and
stand up expo-router and the context providers each screen mounts under. That
touches the core scoring screen, which is why it is not being done as a drive-by
alongside a test pass.

What guards this code in the meantime: `__tests__/standings.test.ts` covers
utils/standings.ts — the seeding, tiebreak, semifinal and gold/bronze logic the
game screen delegates its actual decisions to.
