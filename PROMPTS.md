# Antigravity Execution Prompts

Copy and paste these prompts sequentially into your AI tool / prompt window to execute each phase of the implementation plan.

---

## Setup & Pre-Check Prompt

```text
Please read AGENTS.md and IMPLEMENTATION_PLAN.md in the project root first. Then run `npm run typecheck:client`, `npm run typecheck:server`, and `npm test` to verify that the baseline codebase is healthy before making any changes. Confirm your findings before proceeding.
```

---

## Phase 1 Prompt: Security & Auth State Cleanup (High Priority)

```text
Execute Phase 1 from IMPLEMENTATION_PLAN.md:
1. Inspect `src/modules/auth/context/AuthContext.tsx`.
2. Update the `logout` function to ensure `queryClient.clear()` and token/user state resets occur in a `finally` block or error handler, so client auth state is thoroughly wiped even if the network request or API endpoint fails.
3. Run `npm test` and `npm run typecheck:client` to confirm no regressions.
```

---

## Phase 2 Prompt: Mobile Navigation & UX Polish (Medium Priority)

```text
Execute Phase 2 from IMPLEMENTATION_PLAN.md:
1. Inspect `src/shared/components/layout/AppShell.tsx`.
2. Ensure that when a navigation link is clicked or route changes on mobile screen widths (<768px), the sidebar drawer auto-closes.
3. Verify overlay background click listener correctly triggers sidebar state close.
4. Run `npm run typecheck:client` to confirm type safety.
```

---

## Phase 3 Prompt: Accessibility & Form Focus (Medium Priority)

```text
Execute Phase 3 from IMPLEMENTATION_PLAN.md:
1. Inspect `src/modules/auth/components/LoginForm.tsx` and `SignupForm.tsx`.
2. Add focus management (`ref.current?.focus()`) so that when form submission validation fails or server returns an inline error, focus is programmatically moved to the error element or first invalid input field.
3. Run `npm test` to verify form tests pass.
```

---

## Phase 4 Prompt: UI Consistency & Component Integration (Low Priority)

```text
Execute Phase 4 from IMPLEMENTATION_PLAN.md:
1. Inspect `src/modules/inventory/pages/VendorsPage.tsx` and `src/modules/hrautomation/pages/VisitorsPage.tsx`.
2. Replace fallback plain text "No items found" with the reusable `<EmptyState />` component from `src/shared/components/feedback/EmptyState.tsx`.
3. Run `npm run typecheck:client` and `npm test` to ensure zero compilation or runtime errors.
```

---

## Final Verification & Cleanup Prompt

```text
Run full verification suite:
1. Execute `npm run typecheck:client`
2. Execute `npm run typecheck:server`
3. Execute `npm test`
Provide a summary of all executed changes and test results.
```
