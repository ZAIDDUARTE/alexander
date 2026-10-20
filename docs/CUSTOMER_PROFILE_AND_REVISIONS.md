# Customer business profiles and revisions

## Separation

- `onboarding_submissions` — immutable questionnaire history
- `customer_business_profiles` — current operational profile
- `customer_profile_revisions` — immutable revision trail

## Initial projection

On final questionnaire submit → profile revision 1, source `initial_questionnaire`.

## Later edits

Short-lived magic-link sessions (`customer_profile_update_sessions`) → new revision → update canonical profile → optional `trillet_sync_required`.

Permanent login remains Trillet.
