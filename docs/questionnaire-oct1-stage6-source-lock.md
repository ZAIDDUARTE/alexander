# Stage 6 source lock

Branch `questionnaire-oct1`. Written source: `changes-1oct.md` Software & Integrations. Transcript: Phillip said the section was rewritten, the first software question is already the same, Voice & Conversation is already good, keep the MVP simple, preserve his answers, and the Saving / Saved just now flicker should be fixed. The “?” popup was “maybe” and is not in this pass. Question IDs and Prompt Zero are the next task, not this pass.

VOICE & CONVERSATION:
NO CHANGE

HELP ICON / ? POPUP:
NOT IMPLEMENTED
Reason: Phillip mentioned it tentatively (“maybe”), so it is not treated as a mandatory October 1 requirement.

PROMPT ZERO / STRUCTURED QUESTIONNAIRE SPEC:
NOT PART OF THIS PASS

## Sequence

1. CRM / customer-record system
2. Appointment availability
3. Phone system
4. Other software
5. Integration authorization
6. Secure software connection notice
7. Integration failure behavior
8. Final optional catch-all
9. Existing review / confirmation / submission flow

## Requirements

### CRM / customer records

- Requirement: “What system does your team primarily use for customer records and service jobs?” Options: ServiceTitan, Housecall Pro, Jobber, GoHighLevel, HubSpot, Salesforce, Another system, We don’t use one. Another system asks “What system do you use?”
- Current path: `Section8Form.tsx`, `CRM_FSM_OPTIONS`, `crmFsmProvider`, `crmFsmCustomName`
- Current behavior: same eight options and a custom name field. Title and help text differ. Label is “System name”.
- Target: keep the stored keys. Use the October 1 question as the title. Remove the extra help line. Label the follow-up “What system do you use?” with placeholder “Enter software name”.
- Source: WRITTEN + TRANSCRIPT
- Planned change: wording only

### Appointment availability

- Requirement: “Where does your team look to see when customers can be scheduled?” Options: Same system selected above, Google Calendar, Microsoft Outlook / Microsoft 365, Cal.com, Another scheduling system, We don’t use scheduling software. Another asks “What scheduling system do you use?”
- Current path: `SCHEDULING_OPTIONS`, `schedulingProvider`, `schedulingCustomName`
- Current behavior: same six options. Different title and help text. Extra sentence when “same system” is disabled.
- Target: keep stored keys and options. Use the October 1 question. Remove helper commentary. Follow-up label and placeholder from the document.
- Source: WRITTEN + TRANSCRIPT
- Planned change: wording only

### Dispatch removal

- Requirement: no standalone dispatch question between scheduling and phone.
- Current path: `Section8Form.tsx` dispatch card, `dispatchProvider`, `DISPATCH_OPTIONS`, progress `q106`, review “Dispatch”
- Current behavior: required three-way question
- Target: not rendered, not required, not in progress, review, or current submission. Legacy value flagged `DROPPED_OBSOLETE` and `NEEDS_QA`. Not copied into another system field. Section 3 emergency dispatch stays.
- Source: WRITTEN + TRANSCRIPT
- Planned change: remove current question; migrate by clearing and flagging

### Phone system

- Requirement: “What phone system do you currently use?” Eight listed options. Another asks “What phone system do you use?” Not sure stays valid.
- Current path: `PHONE_OPTIONS`, `phoneProvider`, `phoneCustomName`
- Current behavior: options already match. Custom label is “Phone system name”.
- Target: keep keys and options. Align the follow-up label and placeholder.
- Source: WRITTEN + TRANSCRIPT
- Planned change: wording only

### Other software

- Requirement: “Do you use any other software Alexander may need to work with?” Nine listed categories including None. Each selected category has its own “What software do you use?”
- Current path: `ADDITIONAL_SOFTWARE_CATEGORIES`, `additionalSoftwareCategories`, `additionalSoftwareCards[].systemName`. `toggleAdditionalCategory` already makes None exclusive.
- Current behavior: same nine options. Per-category name already stored. Label is “Exact software name”. None exclusivity is local to this toggle, not a shared checkbox refactor.
- Target: keep the list and the per-category `systemName` fields. Relabel the input. Do not add a new exclusivity engine. Do not copy one name across categories.
- Source: WRITTEN + TRANSCRIPT
- Planned change: label and placeholder. None behavior recorded, not rebuilt.

### Authorization

- Requirement: “Who can authorize Alexander to connect to these systems?” Only “I can” and “Someone else on our team”. Someone else asks name, email, and optional phone.
- Current path: `CONNECTION_OWNER_OPTIONS` `self_authorized` / `not_authorized` / `someone_else`. Phone is required and must be E.164.
- Current behavior: Yes / No / Someone else handles this. Phone required.
- Target: labels “I can” and “Someone else on our team”. Remove No from the current choices. Keep stored ids `self_authorized` and `someone_else`. Phone optional; non-empty phone still uses the existing phone check. Name and email required.
- Legacy: Yes stays I can. Someone else stays, with name, email, and phone kept. No, not sure, and unknown become unanswered and `NEEDS_QA`. Do not guess I can or Someone else.
- Source: WRITTEN + TRANSCRIPT
- Planned change: options, validation, migration

### Connection notice

- Requirement: the two-paragraph notice and required “I understand”.
- Current path: `Q111_NOTICE`, `connectionNoticeAcknowledged`
- Current behavior: the same sentences in one paragraph. Acknowledgement is required.
- Target: show the notice as two paragraphs with the written wording. Do not reset a saved acknowledgement.
- Source: WRITTEN + TRANSCRIPT
- Planned change: copy layout only

### Capability checklist removal

- Requirement: remove “Which of these should Alexander be able to do when your software supports it?”
- Current path: `INTEGRATION_CAPABILITY_OPTIONS`, `authorizedCapabilities`
- Current behavior: required checklist, preselected
- Target: not current. Legacy selections flagged `DROPPED_OBSOLETE` and `NEEDS_QA`. Not translated into new permissions.
- Source: WRITTEN + TRANSCRIPT
- Planned change: remove current question; clear and flag on load

### Integration failure

- Requirement: three options. Recommended collect-and-send is the real default. Follow another rule asks “What should Alexander do?” Placeholder: “Tell us how you’d like Alexander to handle it.” The confirmed-action sentence stays, without the extra word “dispatched”.
- Current path: `failureFallback` includes `callback`. No default. Help text adds “dispatched”.
- Target: drop Arrange a callback. Default `collect_and_send` for fresh and unmappable values. Preserve collect, connect, and custom plus custom text. Callback becomes the default and is flagged `DEFAULTED_FROM_LEGACY` and `NEEDS_QA`.
- Source: WRITTEN + TRANSCRIPT
- Planned change: options, default, wording, migration

### Final catch-all

- Requirement: optional “Anything else Alexander should know about how your company operates?” Placeholder “Enter anything else you’d like us to know.”
- Current path: `finalOperatingNotes`. Title is the other sentence from the same written block.
- Current behavior: optional, no placeholder
- Target: add the placeholder. Keep the existing title and help, both of which are in the written block. Do not make it required.
- Source: WRITTEN
- Planned change: placeholder only

### Review / confirm / submit

- Requirement: keep the existing confirmation and submit flow. Update Section 8 review only where Dispatch and the capability list must disappear and current answers must show.
- Current path: `Section8ReviewSummary.tsx`, submission confirmations unchanged
- Target: no copy rewrite of confirm/submit
- Source: TRANSCRIPT
- Planned change: Section 8 review fields only

### Autosave flicker

- Requirement: stop Saving / Saved just now from flickering while idle.
- Current path: `OnboardingContext.tsx` saves when draft JSON changes. A successful save writes the server `updatedAt` back into React state, which changes the JSON and saves again.
- Target: save when answers change. A timestamp-only update must not start another save.
- Source: TRANSCRIPT
- Planned change: compare a fingerprint that ignores `updatedAt`

### Explicit non-changes

- Voice & Conversation: no question, default, validation, or storage edit
- Help `?` button: no popup
- Question IDs, Prompt Zero, Company Truth semantics: not this pass
