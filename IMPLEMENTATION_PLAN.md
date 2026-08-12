# HR Portal QA Fixes & Polish Implementation Plan

This implementation plan outlines the prioritized fixes and enhancements for the Grow More HR Portal based on full QA audit and codebase analysis.

## User Review Required

> [!IMPORTANT]
> - All 521 existing unit/integration tests pass cleanly. 
> - Fixes focus strictly on targeted improvements to auth cache cleanup, mobile navigation behavior, accessibility focus management, component reusability (`EmptyState`), and email error handling.
> - **No unneeded changes** or unnecessary rewrites will be performed.

---

## Phase 1: Security & Auth State Cleanup (High Priority)

### [shared/auth]
#### [MODIFY] [AuthContext.tsx](file:///d:/N/business-os/src/modules/auth/context/AuthContext.tsx)
- Ensure client-side React Query cache (`queryClient.clear()`) and local state are reset even if the server-side logout request throws an API error or network exception.
- Prevent stale authenticated state from persisting in memory upon logout failure.

---

## Phase 2: Mobile Navigation & UX Polish (Medium Priority)

### [shared/layout]
#### [MODIFY] [AppShell.tsx](file:///d:/N/business-os/src/shared/components/layout/AppShell.tsx)
- Automatically close the mobile sidebar drawer when navigating to a new route on mobile viewports (<768px).
- Add overlay click handler to dismiss sidebar on mobile.

---

## Phase 3: Accessibility & Form Focus Management (Medium Priority)

### [modules/auth]
#### [MODIFY] [LoginForm.tsx](file:///d:/N/business-os/src/modules/auth/components/LoginForm.tsx)
#### [MODIFY] [SignupForm.tsx](file:///d:/N/business-os/src/modules/auth/components/SignupForm.tsx)
- Implement programmatic focus shift (`element.focus()`) to error banners or first invalid field upon form submission failure for screen readers and keyboard users.

---

## Phase 4: UI Consistency & Component Integration (Low Priority)

### [shared/feedback]
#### [MODIFY] [VendorsPage.tsx](file:///d:/N/business-os/src/modules/inventory/pages/VendorsPage.tsx)
#### [MODIFY] [VisitorsPage.tsx](file:///d:/N/business-os/src/modules/hrautomation/pages/VisitorsPage.tsx)
- Replace generic "No data" plain text with the existing reusable `<EmptyState />` component for consistent visual design across module views.

---

## Verification Plan

### Automated Tests
- Run `npm test` to verify all 521+ tests continue passing.
- Run `npm run typecheck:client` and `npm run typecheck:server` to guarantee zero TypeScript errors.

### Manual Verification
- Test logout behavior under simulated network disconnect.
- Verify mobile sidebar closes upon clicking nav links at 375px width.
- Verify screen reader accessibility and keyboard focus movement on failed form submission.
