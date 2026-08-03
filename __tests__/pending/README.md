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
