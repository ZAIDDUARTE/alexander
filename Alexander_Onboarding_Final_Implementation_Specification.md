**Final Implementation Specification - V2.0**

8 sections \| 114 active top-level questions \| custom application

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Purpose</strong><br />
This document is the implementation-ready source of truth for the Alexander customer onboarding application. It consolidates the original 128-question master questionnaire, both review meetings, the final fee UX addendum, the new Voice &amp; Conversation section, and the 8-section onboarding UX copy. The next step after this specification is technical implementation.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Authority rule</strong><br />
Where sources conflict, this specification applies the latest explicit meeting decision, then the specific final addendum, then earlier meeting decisions, then the original master questionnaire. Deleted concepts remain documented in the reconciliation appendix but must not reappear in the customer flow.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 1. Product and Architecture Principles

- Custom application, not Fillout/Tally. The form must be implemented in Alexander-controlled code so layout, branching, autosave, reuse, and structured data are not constrained by a third-party form builder.

- The questionnaire is a business-policy compiler, not a PDF-to-form conversion. Every answer should become structured, addressable configuration for Alexander.

- Default-first UX. Pre-fill safe, obvious defaults where the meetings explicitly approved them, then let the business edit them.

- Conditions must attach to the exact entity they modify. Never collect a generic condition paragraph when the system can bind the condition to a service, customer type, fee, remedy, or routing row.

- Reuse previously captured entities. Services, contacts, fees, and systems are registries referenced later; users should not retype them.

- Keep human-review states distinct from autonomous conditions. “Yes, with conditions” means Alexander can apply a defined rule. “Ask our team first” means a human workflow is required.

- Remove policy ambiguity. Operational “Not sure yet” choices are removed. A technical-identification “Not sure” may remain only where the source explicitly keeps it (for example, current phone-system identification).

- Separate policy, capability, and real-time state: what the business authorizes, what an integration technically supports, and what is actually confirmed right now are different facts.

- Truthful action confirmation is universal. Alexander may not say an appointment, dispatch, cancellation, transfer, or other action succeeded until the underlying system/team actually confirms it.

- MVP scope is inbound voice receptionist. Membership management, warranty administration, referrals, omnichannel customer messaging, and similar scope expansions were explicitly removed from this questionnaire.

## 1.1 Global UX Rules

- Welcome screen before Section 1; no immediate drop into a long form.

- Eight section intro screens and eight section completion screens.

- Progress shown as “X of 8 sections complete,” never as page count.

- Autosave with clear “progress saved” feedback. Final implementation recommendation: server-side draft persistence tied to the onboarding record, with local/browser fallback for resilience.

- Required fields use a clearly visible red asterisk. Optional fields explicitly show “(Optional)” where ambiguity is likely.

- No horizontally scrolling matrices. Desktop layouts must fit important controls; mobile layouts stack rows/cards.

- Conditional controls appear immediately beneath the item they modify.

- Inline help/tooltips explain Alexander defaults and important boundaries before the user answers.

- All “Other” choices that survive must open a specific text field.

- Mutually exclusive states disable conflicting controls (for example, No service vs 24-hour service; No maximum vs booking-horizon number).

- Reusable card pattern for repeatable structured records (fees, pricing rules, conditional territories, technician assignments, pronunciation entries).

## 1.2 Shared Registries

**Service registry:** Stable service IDs from Section 2; reused by booking rules, technician assignment, visit type, and service pricing.

**Contact registry:** People/roles and contact details; reused for escalation, exception approval, callbacks, financial approvals, and call routing.

**Fee registry:** Fee cards from Pricing & Payments. Late-cancellation/no-show fee answers should create or link to the same fee registry to avoid re-entry.

**Schedule component:** Reusable Monday-Sunday structured schedule supporting time ranges, closed/not available, and 24-hour states where relevant.

**Software registry:** Selected systems plus category, system name, permissions, and connection owner.

## 1.3 Canonical State Pattern

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Service/policy state machine</strong><br />
Normal state: offered/allowed. Conditional state: Alexander can act only under a defined rule. Human-first state: collect context and invoke the configured human escalation. Denied state: do not offer/authorize. Avoid adding a “not sure” state to operational policy.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 1.4 Navigation and Save/Resume

- Users may move backward without losing answers.

- Section cards on the review screen must deep-link back to editable sections.

- Autosave after each stable field change; debounce text inputs; immediately save radio/checkbox changes.

- Persist schema version with the draft so future questionnaire migrations are controlled.

- Before final submission, revalidate every visible required field and every conditional rule.

# 2. Customer Journey and Section Copy

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Initial Welcome Screen</strong><br />
Welcome to Alexander<br />
<br />
We’re excited to begin building your company’s AI receptionist.<br />
<br />
This questionnaire gives us the information we need to configure Alexander around the way your business actually operates - including your services, service area, scheduling rules, emergency procedures, pricing policies, customer-care standards, voice, and team handoffs.<br />
<br />
Some questions are required. Others are optional or appear only when they apply to your business. Smaller companies may finish quickly, while larger or more complex organizations may choose to provide more detail.<br />
<br />
You do not need to complete everything in one sitting. Save your progress at any time and return when convenient.<br />
<br />
This is the most important part of your setup. Once it is complete, our team will use your answers to configure, test, and review Alexander before he represents your company.<br />
<br />
The more relevant detail you provide, the more accurately Alexander can serve your customers.<br />
<br />
Progress: 0 of 8 sections complete<br />
Button: Begin Section 1 -&gt;</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## Section 1 of 8 - Your Company

Tell Alexander who your company is, when you are available, and what he is authorized to say about your business.

This section helps Alexander introduce your company accurately, follow your operating hours, and avoid making claims you have not approved. You do not need to answer questions that do not apply to your business.

**Estimated time:** 5-10 minutes

**Button:** Begin Your Company -\>

**Section 1 completion copy:** Your company is now part of Alexander’s foundation. Alexander now understands your company’s identity, operating hours, approved claims, and basic availability. This helps him represent your business accurately and communicate with callers within the boundaries you have established.

Progress: 1 of 8 sections complete

Next: Your Services

## Section 2 of 8 - Your Services

Tell Alexander which jobs your company accepts, who you serve, and where you work.

This information helps him recognize the difference between a service your company routinely provides, a request that requires review, and a job your company does not accept. The more clearly your service boundaries are defined, the more confidently Alexander can qualify calls and guide customers to the right next step.

**Estimated time:** 10-15 minutes

**Button:** Begin Your Services -\>

**Section 2 completion copy:** Alexander now understands the work your company does. He knows which services you offer, which customers and properties you serve, where you normally work, and which requests require special conditions or human review. This helps Alexander qualify opportunities without promising work your company does not provide.

Progress: 2 of 8 sections complete

Next: Emergencies

## Section 3 of 8 - Emergencies

Tell Alexander which situations require immediate attention and what should happen when your team needs to step in.

This section establishes your emergency rules, after-hours response, approval requirements, escalation contacts, retry process, and fallback behavior. Alexander will use this information to recognize urgent situations, gather the right details, and communicate honestly about what has - and has not - been confirmed.

**Estimated time:** 10-15 minutes

**Button:** Begin Emergency Setup -\>

**Section 3 completion copy:** Alexander now knows how your company handles urgent situations. He understands which calls require immediate attention, when human approval is needed, who should be contacted, what happens when nobody answers, and how to communicate unresolved situations truthfully. This gives Alexander a clear safety and escalation framework instead of forcing him to guess under pressure.

Progress: 3 of 8 sections complete

Next: Scheduling

## Section 4 of 8 - Scheduling

Tell Alexander when and how your company can accept appointments.

This section defines booking authority, appointment windows, authorization, capacity rules, rescheduling, cancellation policy, technician assignment, and exceptions. Alexander may be configured to book within your rules, request approval, collect information for your team, or use a combination of these approaches.

**Estimated time:** 10-15 minutes

**Button:** Begin Scheduling -\>

**Section 4 completion copy:** Alexander now understands your scheduling rules. He knows when appointments may be offered, what information is needed, which situations require approval, and how to handle changes, cancellations, capacity limits, and scheduling exceptions. This helps prevent double promises, unsupported availability claims, and unnecessary back-and-forth with your team.

Progress: 4 of 8 sections complete

Next: Pricing and Payments

## Section 5 of 8 - Pricing and Payments

Tell Alexander what he may explain about fees, estimates, payments, and financial policies.

You decide whether Alexander may share specific prices, explain service fees, provide approved ranges, or send financial questions to your team. If your company does not want Alexander to discuss a particular financial topic, simply indicate that. He will not guess or improvise.

**Estimated time:** 10-15 minutes

**Button:** Begin Pricing and Payments -\>

**Section 5 completion copy:** Alexander now understands your financial boundaries. He knows which fees and payment information he may explain, which prices require an estimate or human review, and which discounts, credits, refunds, or exceptions require authorization. This helps Alexander provide useful information without making financial promises your company has not approved.

Progress: 5 of 8 sections complete

Next: Customer Care

## Section 6 of 8 - Customer Care

Tell Alexander how to care for existing customers and handle situations that require context, patience, or follow-up.

This section covers callbacks, complaints, service recovery, privacy boundaries, additional-service recommendations, and non-service calls. These policies help Alexander recognize when a caller may already have a relationship with your company and respond appropriately without making unsupported promises.

**Estimated time:** 10-15 minutes

**Button:** Begin Customer Care -\>

**Section 6 completion copy:** Alexander now understands how to support existing customers and unusual calls. He knows how to handle callbacks, complaints, privacy boundaries, non-service callers, and requests that require your team’s involvement. This helps every caller receive a clear next step without unsupported promises.

Progress: 6 of 8 sections complete

Next: Voice and Conversation

## Section 7 of 8 - Voice and Conversation

Now choose how Alexander should sound and introduce himself to your customers.

We provide the conversational intelligence standard. You choose the voice, identity details, language preferences, and communication style that should feel specific to your company. These choices affect Alexander’s presentation, not his underlying safety rules, reasoning, authority, or business policies.

**Estimated time:** 5-10 minutes

**Button:** Begin Voice and Conversation -\>

**Section 7 completion copy:** Alexander now has a voice that fits your company. You have selected how he should sound, introduce himself, identify himself as an AI, handle supported languages, pronounce important names, and communicate with callers. These choices help Alexander feel natural and consistent while preserving the professional standards and safeguards built into his core behavior.

Progress: 7 of 8 sections complete

Next: Integration Systems and Final Setup

## Section 8 of 8 - Integration Systems and Final Setup

This final section connects Alexander’s approved behavior to the systems and people who help your company operate.

Tell us about your CRM or field-service software, calendar, dispatch, phone system, integrations, permissions, connection owner, and any final implementation details. You do not need to provide passwords or ordinary account credentials here. When a secure connection is required, we will guide you through the appropriate setup process.

**Estimated time:** 5-10 minutes

**Button:** Begin Final Setup -\>

**Section 8 completion copy:** Your Alexander setup is complete. You have provided the information we need to configure Alexander around your company’s services, policies, customers, team, voice, and operating systems. Our team will now normalize your answers, configure Alexander, verify the saved settings, and test his behavior against realistic calls before asking you to approve the final experience.

Progress: 8 of 8 sections complete

# 3. Final Question Specification

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Numbering</strong><br />
Customer-facing numbering in this document is the final sequential numbering after approved merges and deletions. “Legacy source” preserves the original PDF/addendum question ID for engineering traceability. Inline conditional sub-fields are intentionally not promoted into separate customer-facing question numbers.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## Section 1 - Your Company (Q1-Q13)

### Q1. What name do your customers know your company by?

| **Legacy source** | Original Q1                                    |
|-------------------|------------------------------------------------|
| **Control**       | Short text                                     |
| **Required**      | Yes                                            |
| **Data mapping**  | company_facts_credentials.customer_facing_name |

### Q2. What is your legal business name?

| **Legacy source** | Original Q2                          |
|-------------------|--------------------------------------|
| **Control**       | Short text                           |
| **Required**      | No                                   |
| **Data mapping**  | company_facts_credentials.legal_name |

**Help text:** Leave blank if it is the same as the name above.

### Q3. What is your main business phone number?

| **Legacy source** | Original Q3                          |
|-------------------|--------------------------------------|
| **Control**       | Phone number                         |
| **Required**      | Yes                                  |
| **Data mapping**  | company_facts_credentials.main_phone |

### Q4. What is your website?

| **Legacy source** | Original Q4                       |
|-------------------|-----------------------------------|
| **Control**       | URL                               |
| **Required**      | No                                |
| **Data mapping**  | company_facts_credentials.website |

### Q5. Which of these may Alexander tell customers about your company?

| **Legacy source** | Original Q5                               |
|-------------------|-------------------------------------------|
| **Control**       | Multi-select checkboxes                   |
| **Required**      | Yes                                       |
| **Data mapping**  | company_facts_credentials.approved_claims |

**Options**

- Licensed

- Insured

- Bonded

- Locally owned

- Family owned

- Other

- None of these

**Conditional logic**

- If Other is selected, show Q6.

- None of these is mutually exclusive with all other selections.

### Q6. What else may Alexander tell customers about your company?

| **Legacy source** | Original Q6 (conditional)                        |
|-------------------|--------------------------------------------------|
| **Control**       | Short text                                       |
| **Required**      | Conditional - required when Q5 Other is selected |
| **Data mapping**  | company_facts_credentials.other_approved_claim   |

**Example**

Serving the Antelope Valley for more than 25 years.

### Q7. Are there any license numbers or credential details Alexander may give customers?

| **Legacy source** | Original Q7                             |
|-------------------|-----------------------------------------|
| **Control**       | Short text                              |
| **Required**      | No                                      |
| **Data mapping**  | licensing_scope.customer_facing_details |

**Help text:** For example: California Contractor License \#123456 - C-36 Plumbing.

### Q8. Is there anything Alexander should never claim about your company’s credentials, awards, guarantees, experience, or affiliations?

| **Legacy source** | Original Q8                                |
|-------------------|--------------------------------------------|
| **Control**       | Long text                                  |
| **Required**      | No                                         |
| **Data mapping**  | company_facts_credentials.forbidden_claims |

**Example**

Do not say we are BBB accredited. The owner has 25 years of experience, but the company was founded in 2018.

### Q9. What are your normal office hours?

| **Legacy source** | Original Q9 - meeting override |
|-------------------|--------------------------------|
| **Control**       | Weekly schedule                |
| **Required**      | Yes                            |
| **Data mapping**  | business_hours.office_hours    |

**Help text:** When can customers normally reach someone in your office?

**Defaults**

- Monday-Friday: 8:00 AM-5:00 PM, open.

- Saturday-Sunday: Closed.

**Validation**

- Each active day requires start and end times.

- Closed disables times for that day.

**UX / UI notes**

- Pre-fill the approved default; customer edits only if different.

- No free-text time entry.

### Q10. When are service appointments normally available?

| **Legacy source** | Original Q10 - meeting override |
|-------------------|---------------------------------|
| **Control**       | Weekly service schedule         |
| **Required**      | Yes                             |
| **Data mapping**  | business_hours.service_hours    |

**Help text:** This may be different from your office hours.

**Columns / states**

- From

- To

- No service

- 24-hour service

**Defaults**

- Monday-Saturday: 8:00 AM-6:00 PM.

- Sunday: No service.

**Validation**

- No service and 24-hour service are mutually exclusive.

- Selecting either disables From/To.

- A normal active day requires From and To.

**UX / UI notes**

Use the same reusable weekly-schedule component; no horizontal scrolling.

### Q11. When should Alexander answer your calls?

| **Legacy source** | Original Q11         |
|-------------------|----------------------|
| **Control**       | Single choice        |
| **Required**      | Yes                  |
| **Data mapping**  | hours.answering_mode |

**Options**

- 24 hours a day, 7 days a week

- Only when our office is closed

- Only during specific hours

**Conditional logic**

Only during specific hours -\> show Q12.

### Q12. What hours should Alexander answer your calls?

| **Legacy source** | Original Q12 (conditional)                                   |
|-------------------|--------------------------------------------------------------|
| **Control**       | Weekly schedule                                              |
| **Required**      | Conditional - required when Q11 = Only during specific hours |
| **Data mapping**  | hours.answering_schedule                                     |

**UX / UI notes**

Enumerate Monday-Sunday; never use open prose for recurring time rules.

### Q13. Is there anything else Alexander should know about your normal hours or availability?

| **Legacy source** | Original Q13                      |
|-------------------|-----------------------------------|
| **Control**       | Long text                         |
| **Required**      | No                                |
| **Data mapping**  | hours.recurring_availability_rule |

**Example**

On Fridays, routine appointments must begin by 3:00 PM.

## Section 2 - Your Services (Q14-Q25)

### Q14. Which plumbing services does your company provide?

| **Legacy source** | Original Q14 + Q15 merged                    |
|-------------------|----------------------------------------------|
| **Control**       | Matrix / one state per service               |
| **Required**      | Yes                                          |
| **Data mapping**  | service_catalog + per-service policy records |

**Columns / states**

- We offer this

- Yes, with conditions

- Ask our team first

- We do not offer this

**Rows / items**

- General plumbing repair

- Toilet repair or replacement

- Faucet or sink repair

- Garbage disposal

- Shower or tub repair

- Water heater repair

- Water heater replacement

- Tankless water heaters

- Shutoff or main valves

- Pressure regulators

- Water service lines

- Frozen pipes

- Slab leaks

- Repiping

- Fixture installation

- Appliance plumbing connections

- Gas-line plumbing (non-emergency)

- Excavation

- Trenchless sewer/service-line work

- Water filtration, softening or RO

- Remodel or project work

- Other specialty plumbing

**Conditional logic**

- For every row marked Yes, with conditions: reveal an inline condition field bound to that exact service.

- Ask our team first does not ask for autonomous conditions; it records a human-review requirement.

**Validation**

Exactly one state per service.

**UX / UI notes**

No generic shared condition box. Condition UI appears directly beneath the selected service row.

### Q15. Which diagnostic, drain, and inspection services does your company provide?

| **Legacy source** | Original Q16 + Q17 merged                                                                                             |
|-------------------|-----------------------------------------------------------------------------------------------------------------------|
| **Control**       | Matrix / one state per service                                                                                        |
| **Required**      | Yes                                                                                                                   |
| **Data mapping**  | diagnostic_capability, drain_capability, camera_advanced_drain_capability, leakdetection_capability, inspection_scope |

**Columns / states**

- We offer this

- Yes, with conditions

- Ask our team first

- We do not offer this

**Rows / items**

- General diagnostic/service visits

- Plumbing inspections

- Leak detection

- Drain cleaning

- Sewer/drain camera inspections

- Hydro-jetting / advanced drain cleaning

**Conditional logic**

Same per-row condition and human-review rules as Q14.

### Q16. Who does your company serve?

| **Legacy source** | Original Q18 + Q19 merged                                                                  |
|-------------------|--------------------------------------------------------------------------------------------|
| **Control**       | Matrix / one state per customer or property type                                           |
| **Required**      | Yes                                                                                        |
| **Data mapping**  | customer/property acceptance policies including insurancework_policy and realestate_policy |

**Columns / states**

- We serve these normally

- Yes, with conditions

- Ask our team first

- We do not serve these

**Rows / items**

- Homeowners

- Tenants

- Landlords / property managers

- Single-family homes

- Condos / HOAs

- Multifamily properties

- Commercial properties

- Real-estate inspection / transaction work

- Insurance-related work

**Conditional logic**

- Yes, with conditions -\> inline field for that exact customer/property type.

- Ask our team first -\> human-review state.

### Q17. Will you install or work with fixtures, equipment, or materials supplied by the customer?

| **Legacy source** | Original Q20                                |
|-------------------|---------------------------------------------|
| **Control**       | Single choice                               |
| **Required**      | Yes                                         |
| **Data mapping**  | customersuppliedunit_policy, material_scope |

**Options**

- Yes, normally

- Yes, with conditions

- Ask our team first

- No

**Conditional logic**

Yes, with conditions -\> show required condition field.

**Example**

We can install customer-supplied faucets and fixtures, but not customer-supplied water heaters.

### Q18. Will your company repair, correct, or finish work another plumber started?

| **Legacy source** | Original Q21          |
|-------------------|-----------------------|
| **Control**       | Single choice         |
| **Required**      | Yes                   |
| **Data mapping**  | correctivework_policy |

**Options**

- Yes, normally

- Yes, with conditions

- Ask our team first

- No

**Conditional logic**

Yes, with conditions -\> show required condition field.

### Q19. How do you normally define your service area?

| **Legacy source** | Original Q22                        |
|-------------------|-------------------------------------|
| **Control**       | Single choice                       |
| **Required**      | Yes                                 |
| **Data mapping**  | service_area_policy.definition_mode |

**Options**

- ZIP codes

- Cities / communities

- Distance from our business location

**Conditional logic**

Reveal only the corresponding Q20 input path.

### Q20. Define your normal service area.

| **Legacy source** | Original Q23A/B/C merged            |
|-------------------|-------------------------------------|
| **Control**       | Conditional structured input        |
| **Required**      | Conditional - required based on Q19 |
| **Data mapping**  | service_area_policy.core_territory  |

**Conditional logic**

- ZIP codes -\> tokenized ZIP code list.

- Cities / communities -\> tokenized location list.

- Distance -\> business-center address + travel radius in miles.

**Validation**

- Radius must be positive.

- Token lists trim duplicates and blank values.

### Q21. Are there any cities, ZIP codes, neighborhoods, or other areas Alexander should always decline?

| **Legacy source** | Original Q24                           |
|-------------------|----------------------------------------|
| **Control**       | Long text / location list              |
| **Required**      | No                                     |
| **Data mapping**  | service_area_policy.excluded_territory |

**Example**

We do not service Edwards Air Force Base.

### Q22. Are there any areas you sometimes serve, but only under certain conditions?

| **Legacy source** | Original Q25                                  |
|-------------------|-----------------------------------------------|
| **Control**       | Yes / No                                      |
| **Required**      | Yes                                           |
| **Data mapping**  | service_area_policy.has_conditional_territory |

**Conditional logic**

Yes -\> show Q23.

### Q23. Which areas are conditional, and what are the conditions?

| **Legacy source** | Original Q26                              |
|-------------------|-------------------------------------------|
| **Control**       | Repeatable area-condition cards           |
| **Required**      | Conditional - required when Q22 = Yes     |
| **Data mapping**  | service_area_policy.conditional_territory |

**Implementation notes**

Final implementation uses repeatable Area + Conditions cards so each rule remains bound to the correct territory; this preserves the source intent while applying the meeting-wide structured-condition principle.

**Example**

- Rosamond - \$75 travel fee.

- Tehachapi - manager approval required.

### Q24. When you are providing after-hours service, where will you go?

| **Legacy source** | Original Q27                         |
|-------------------|--------------------------------------|
| **Control**       | Single choice                        |
| **Required**      | Yes                                  |
| **Data mapping**  | geographic_afterhours_modifiers.mode |

**Options**

- Same service area as normal

- A smaller service area

- We do not provide after-hours field service

**Conditional logic**

A smaller service area -\> show Q25.

### Q25. What is your after-hours service area?

| **Legacy source** | Original Q28                                             |
|-------------------|----------------------------------------------------------|
| **Control**       | Long text / location list                                |
| **Required**      | Conditional - required when Q24 = A smaller service area |
| **Data mapping**  | geographic_afterhours_modifiers.territory                |

## Section 3 - Emergencies (Q26-Q38)

### Q26. How should Alexander treat each of these situations?

| **Legacy source** | Original Q29                                                                        |
|-------------------|-------------------------------------------------------------------------------------|
| **Control**       | Matrix / one classification per scenario                                            |
| **Required**      | Yes                                                                                 |
| **Data mapping**  | company_emergency_policy, emergencyonly_policy, gas_emergency_policy, safety_policy |

**Columns / states**

- Emergency

- Urgent, but not an emergency

- Routine

- Human review required

- Use Alexander’s recommended default

**Rows / items**

- Uncontrolled water leaking inside the property

- Water leaking near electrical equipment

- Suspected gas leak or gas odor

- Sewage actively entering the property

- Multiple fixtures backing up at the same time

- Toilet overflowing and the customer cannot stop it

- The property’s only usable toilet is not working

- Major water-heater leak or rupture

- Potentially dangerous water-heater symptoms

- Sump-pump failure with active or imminent flooding

- Frozen pipe with a confirmed leak

- Complete loss of water to the property

- Major water-service-line leak

- Serious standing water from an unknown source

- An unclear situation that may be dangerous

**Defaults**

Preselect Alexander’s recommended default wherever the approved default library provides one.

**UX / UI notes**

- Each recommended-default control includes an info tooltip explaining the default for that row.

- Default help appears before/at the choice, not buried beneath the matrix.

### Q27. Are there any emergencies where someone on your team must approve emergency dispatch?

| **Legacy source** | Original Q30                                        |
|-------------------|-----------------------------------------------------|
| **Control**       | Multi-select checkboxes                             |
| **Required**      | Yes                                                 |
| **Data mapping**  | company_emergency_policy.dispatch_approval_required |

**Help text:** Alexander can still recognize the emergency and take appropriate safety steps. This setting controls whether a person must approve the dispatch commitment.

**Options**

- Uncontrolled water leaking inside the property

- Water leaking near electrical equipment

- Suspected gas leak or gas odor

- Sewage actively entering the property

- Multiple fixtures backing up at the same time

- Toilet overflowing and the customer cannot stop it

- The property’s only usable toilet is not working

- Major water-heater leak or rupture

- Potentially dangerous water-heater symptoms

- Sump-pump failure with active or imminent flooding

- Frozen pipe with a confirmed leak

- Complete loss of water to the property

- Major water-service-line leak

- Serious standing water from an unknown source

- An unclear situation that may be dangerous

- Other

- None

**Conditional logic**

- Other -\> show required “Which situations?” field.

- None is mutually exclusive with all emergency selections.

### Q28. What should Alexander do when someone calls outside your normal office hours?

| **Legacy source** | Original Q31 - field-type correction         |
|-------------------|----------------------------------------------|
| **Control**       | Three-row dropdown matrix                    |
| **Required**      | Yes                                          |
| **Data mapping**  | after_hours_policy.disposition_by_call_class |

**Columns / states**

- Attempt to reach our on-call/emergency contact

- Confirm or book service if allowed

- Submit the request for team review

- Schedule the next available appointment

- Arrange a callback

- Provide information only

- Do not offer service

**Rows / items**

- Emergency

- Urgent, but contained

- Routine / non-urgent

**UX / UI notes**

Use a dropdown per row; do not render these as wide radio-button rows.

### Q29. When can your company actually send someone out for an after-hours emergency?

| **Legacy source** | Original Q32                 |
|-------------------|------------------------------|
| **Control**       | Single choice                |
| **Required**      | Yes                          |
| **Data mapping**  | emergency_service_scope.mode |

**Options**

- 24 hours a day, 7 days a week

- Only during certain hours

- We do not provide after-hours emergency field service

**Conditional logic**

Only during certain hours -\> show Q30.

### Q30. When can your company provide after-hours emergency service?

| **Legacy source** | Original Q33                                                |
|-------------------|-------------------------------------------------------------|
| **Control**       | Weekly schedule                                             |
| **Required**      | Conditional - required when Q29 = Only during certain hours |
| **Data mapping**  | emergency_service_scope.schedule                            |

**Columns / states**

- From

- To

- Not available

### Q31. Who should Alexander contact first when a call requires immediate human attention?

| **Legacy source** | Original Q34                                |
|-------------------|---------------------------------------------|
| **Control**       | Composite contact card                      |
| **Required**      | Yes                                         |
| **Data mapping**  | on_call_roster.primary + escalation_contact |

**Conditional logic**

- Capture person/role, phone number, full weekly availability schedule, and call categories.

- Call categories: Emergencies; Urgent calls; Scheduling exceptions; Pricing or fee exceptions; Customer complaints; Warranty/callback issues in source, but warranty wording is removed from the final MVP -\> use “Callback / previous-work issues”; Other.

- Other -\> show custom category field.

**UX / UI notes**

Create/update the shared contact registry; availability is structured Monday-Sunday, not prose.

### Q32. If the first person does not respond, should Alexander contact someone else?

| **Legacy source** | Original Q35          |
|-------------------|-----------------------|
| **Control**       | Yes / No              |
| **Required**      | Yes                   |
| **Data mapping**  | on_call_roster.backup |

**Conditional logic**

Yes -\> show a backup contact card using the exact same fields as Q31.

### Q33. If Alexander cannot reach anyone on your team, what should he do?

| **Legacy source** | Original Q36                                |
|-------------------|---------------------------------------------|
| **Control**       | Single choice                               |
| **Required**      | Yes                                         |
| **Data mapping**  | escalation_retry_fallback.terminal_fallback |

**Help text:** Alexander will never tell the customer that someone has been reached, dispatched, or is handling the situation unless that action has actually been confirmed.

**Options**

- Take the customer’s information and arrange a callback

- Schedule the next available appointment, if appropriate

- Send the appropriate team notification and use the approved fallback

- Follow another rule

**Conditional logic**

Follow another rule -\> show required custom rule.

### Q34. If an urgent escalation is not answered, how should Alexander retry?

| **Legacy source** | Original Q37                         |
|-------------------|--------------------------------------|
| **Control**       | Single choice                        |
| **Required**      | Yes                                  |
| **Data mapping**  | escalation_retry_fallback.retry_rule |

**Options**

- Try once, then move to the next person

- Try the same person one more time, then move to the next person

- Move immediately to the next person

- Use another rule

**Conditional logic**

Use another rule -\> show required retry rule.

### Q35. If an emergency comes in when your normal schedule is already full, what should Alexander do?

| **Legacy source** | Original Q38 - meeting override |
|-------------------|---------------------------------|
| **Control**       | Single choice                   |
| **Required**      | Yes                             |
| **Data mapping**  | capacity_override_policy.mode   |

**Options**

- Use capacity we reserve for emergencies

- Allow an emergency override under certain conditions

- Ask an authorized person to approve an exception

- Do not override the schedule - take the customer’s information and arrange follow-up

**Conditional logic**

- Reserved capacity -\> show Q36.

- Emergency override -\> show Q37.

- Authorized approval -\> show Q38.

### Q36. How much capacity do you normally protect for emergencies?

| **Legacy source** | Original Q39                                        |
|-------------------|-----------------------------------------------------|
| **Control**       | Short / long text                                   |
| **Required**      | Conditional - required when Q35 = reserved capacity |
| **Data mapping**  | emergency_reserved_capacity                         |

**Example**

Keep one same-day appointment available whenever possible.

### Q37. When may Alexander use an emergency override?

| **Legacy source** | Original Q40                                         |
|-------------------|------------------------------------------------------|
| **Control**       | Long text                                            |
| **Required**      | Conditional - required when Q35 = emergency override |
| **Data mapping**  | capacity_override_policy.conditions                  |

### Q38. Who can approve an emergency scheduling exception?

| **Legacy source** | Original Q41                                          |
|-------------------|-------------------------------------------------------|
| **Control**       | Existing contact selector + optional new contact      |
| **Required**      | Conditional - required when Q35 = authorized approval |
| **Data mapping**  | capacity_override_policy.approver_contact_id          |

**UX / UI notes**

Prefer existing contacts; if a new person is added, write them into the shared contact registry.

## Section 4 - Scheduling (Q39-Q64)

### Q39. If a caller asks to speak with a person, what should Alexander do?

| **Legacy source** | Original Q42         |
|-------------------|----------------------|
| **Control**       | Single choice        |
| **Required**      | Yes                  |
| **Data mapping**  | human_request_policy |

**Options**

- Try to connect them to someone right away

- Ask briefly what they need, then connect them to the right person

- Take their information and arrange a callback

- Follow another rule

**Conditional logic**

Follow another rule -\> show custom rule.

### Q40. If someone says they do not want to speak with an AI, what should Alexander do?

| **Legacy source** | Original Q43                    |
|-------------------|---------------------------------|
| **Control**       | Single choice                   |
| **Required**      | Yes                             |
| **Data mapping**  | human_request_policy.ai_refusal |

**Options**

- Try to connect them to a person

- Take their information and arrange a callback

- Follow another rule

**Conditional logic**

Follow another rule -\> show custom rule.

### Q41. Who has authority to approve each type of exception?

| **Legacy source** | Original Q44                                                                             |
|-------------------|------------------------------------------------------------------------------------------|
| **Control**       | Matrix / one authority per exception type                                                |
| **Required**      | Yes                                                                                      |
| **Data mapping**  | authority_hierarchy, blueprint_authority, exception_approval_authority, exception_policy |

**Columns / states**

- Alexander

- Dispatcher

- Manager

- Owner

- Another person / role

- Never allowed

**Rows / items**

- Scheduling exception

- Service-area exception

- Fee or price exception

- Discount or promotion exception

- Refund, credit, or goodwill exception

- Callback / previous-work exception

- Other exception

**Conditional logic**

- Another person / role -\> show an approver selector for that exact row.

- Choosing Alexander means Alexander may approve only within rules explicitly provided; it does not grant unlimited authority.

### Q42. What should Alexander do if the person who must approve an exception is not available?

| **Legacy source** | Original Q45 - meeting override       |
|-------------------|---------------------------------------|
| **Control**       | Single choice                         |
| **Required**      | Yes                                   |
| **Data mapping**  | exception_policy.approver_unavailable |

**Options**

- Take the request and arrange a callback

- Follow the normal rule without making an exception

- Other

**Conditional logic**

Other -\> show required custom rule.

### Q43. What can different types of callers authorize?

| **Legacy source** | Original Q46 - homeowner added |
|-------------------|--------------------------------|
| **Control**       | Checkbox matrix                |
| **Required**      | Yes                            |
| **Data mapping**  | authorization_policy           |

**Columns / states**

- Request / schedule service

- Approve diagnostic fee

- Authorize repair

- Agree to pay

- Human approval required

- Not allowed

**Rows / items**

- Homeowner

- Tenant

- Landlord / property manager

- Spouse / family member

- Remote family member

- Realtor / buyer / seller

- Other third party

**Validation**

Permissions may be multi-select, but Not allowed is mutually exclusive with positive permissions for the same caller type.

### Q44. Do any callers have a maximum amount they are allowed to approve?

| **Legacy source** | Original Q47 - meeting override      |
|-------------------|--------------------------------------|
| **Control**       | Yes / No + repeatable limit rows     |
| **Required**      | Yes                                  |
| **Data mapping**  | authorization_policy.spending_limits |

**Conditional logic**

Yes -\> show repeatable rows: Caller type (from Q43) + maximum amount.

### Q45. When there is an emergency, do the same authorization rules still apply?

| **Legacy source** | Original Q48 - wording corrected        |
|-------------------|-----------------------------------------|
| **Control**       | Single choice                           |
| **Required**      | Yes                                     |
| **Data mapping**  | authorization_policy.emergency_override |

**Options**

- Yes - use the same rules

- No - emergencies have special rules

- Human review is always required for emergency authorization

**Conditional logic**

Emergencies have special rules -\> show required text describing the differences.

### Q46. When an eligible customer wants service, what may Alexander normally do?

| **Legacy source** | Original Q49 - simplified            |
|-------------------|--------------------------------------|
| **Control**       | Single choice                        |
| **Required**      | Yes                                  |
| **Data mapping**  | booking_options.default_booking_mode |

**Options**

- Confirm an available appointment immediately

- Submit the requested appointment for team approval

- Arrange a callback so our team can schedule it

### Q47. How far into the future may Alexander book?

| **Legacy source** | Original Q50                  |
|-------------------|-------------------------------|
| **Control**       | Number + No maximum toggle    |
| **Required**      | Yes                           |
| **Data mapping**  | booking_rules.booking_horizon |

**Conditional logic**

No maximum -\> clear/disable the number field.

**Validation**

- Number must be a positive whole number when used.

- Number and No maximum cannot both be active.

### Q48. What appointment windows may Alexander offer customers?

| **Legacy source** | Original Q51 - redesigned            |
|-------------------|--------------------------------------|
| **Control**       | Five predefined editable window rows |
| **Required**      | Yes                                  |
| **Data mapping**  | booking_rules.appointment_windows    |

**Columns / states**

- Window label

- Start time

- End time

**Rows / items**

- Morning

- Late morning

- Early afternoon

- Afternoon

- Late afternoon

**Defaults**

Rows are pre-created; the company can rename, adjust, disable, or reorder them.

**Validation**

Enabled rows require start \< end; avoid overlapping windows unless explicitly allowed by implementation.

**Implementation notes**

The transcript said “Monday” once while describing the first label; the meeting context and sequence clearly indicate Morning. This specification finalizes the label as Morning.

### Q49. When an appointment is successfully confirmed, what information may Alexander repeat to the customer?

| **Legacy source** | Original Q52 - rewritten               |
|-------------------|----------------------------------------|
| **Control**       | Multi-select checkboxes                |
| **Required**      | Yes                                    |
| **Data mapping**  | booking_rules.confirmation_information |

**Help text:** Alexander may repeat only information confirmed by the scheduling system or company team. He must not promise a specific technician, exact arrival time, immediate dispatch, or anything that was not confirmed.

**Options**

- Appointment date

- Appointment time or arrival window

- Requested service

- Customer name and service address

- Callback phone number

- Email address provided

**Defaults**

Preselect all six.

### Q50. Do any types of jobs follow different booking rules?

| **Legacy source** | Original Q53 - structured                |
|-------------------|------------------------------------------|
| **Control**       | Yes / No + repeatable service-rule cards |
| **Required**      | Yes                                      |
| **Data mapping**  | booking_rules.job_exceptions             |

**Conditional logic**

Yes -\> choose a service/job from the existing service registry and enter the special booking rule; allow multiple records.

### Q51. When may Alexander offer same-day or holiday appointments?

| **Legacy source** | Original Q54 + Q55 merged                      |
|-------------------|------------------------------------------------|
| **Control**       | Two-row policy matrix                          |
| **Required**      | Yes                                            |
| **Data mapping**  | sameday_policy, holiday_weekend_policy.holiday |

**Columns / states**

- Allowed

- Allowed with conditions

- Human approval required

- Not offered

**Rows / items**

- Same-day service

- Holiday service

**Conditional logic**

Allowed with conditions -\> inline required condition field for that exact row.

### Q52. What may Alexander do when a customer wants to reschedule?

| **Legacy source** | Original Q56 - simplified |
|-------------------|---------------------------|
| **Control**       | Single choice             |
| **Required**      | Yes                       |
| **Data mapping**  | reschedule_authority      |

**Options**

- Reschedule the appointment directly

- Reschedule only under certain conditions

- Submit the request for human approval

- Arrange a callback

**Conditional logic**

Reschedule only under certain conditions -\> required condition field.

### Q53. What may Alexander do when a customer wants to cancel?

| **Legacy source** | Original Q57 - simplified     |
|-------------------|-------------------------------|
| **Control**       | Single choice                 |
| **Required**      | Yes                           |
| **Data mapping**  | cancellation_policy.authority |

**Options**

- Cancel the appointment directly

- Cancel only under certain conditions

- Submit the request for human approval

- Arrange a callback

**Conditional logic**

Cancel only under certain conditions -\> required condition field.

### Q54. Do you charge a late-cancellation fee?

| **Legacy source** | Original Q58                              |
|-------------------|-------------------------------------------|
| **Control**       | Single choice + structured fee details    |
| **Required**      | Yes                                       |
| **Data mapping**  | cancellation_policy.late_cancellation_fee |

**Options**

- Yes

- Only under certain conditions

- No

**Conditional logic**

- Yes/conditional -\> amount + notice required.

- Conditional -\> show rule describing when it applies.

- If a fee is created here, create/link a Late cancellation fee record in the shared fee registry so Section 5 does not require re-entry.

### Q55. Do you charge a no-show fee?

| **Legacy source** | Original Q59                           |
|-------------------|----------------------------------------|
| **Control**       | Single choice + structured fee details |
| **Required**      | Yes                                    |
| **Data mapping**  | cancellation_policy.no_show_fee        |

**Options**

- Yes

- Only under certain conditions

- No

**Conditional logic**

- Yes/conditional -\> amount.

- Conditional -\> show rule describing when it applies.

- Create/link the corresponding shared fee record.

### Q56. Are there situations where Alexander should not apply the normal cancellation or no-show rule?

| **Legacy source** | Original Q60                   |
|-------------------|--------------------------------|
| **Control**       | Long text                      |
| **Required**      | No                             |
| **Data mapping**  | cancellation_policy.exceptions |

### Q57. What should Alexander do if the customer needs service but there are no appropriate appointments available?

| **Legacy source** | Original Q61 - simplified           |
|-------------------|-------------------------------------|
| **Control**       | Ranking / drag to order             |
| **Required**      | Yes                                 |
| **Data mapping**  | waitlist_callback.fallback_priority |

**Options**

- Offer the next available appointment

- Look for another approved appointment window

- Add the customer to a callback / waitlist

- Ask the team for help

### Q58. May Alexander arrange a callback when no appointment is available?

| **Legacy source** | Original Q62     |
|-------------------|------------------|
| **Control**       | Yes / No         |
| **Required**      | Yes              |
| **Data mapping**  | callback_ability |

### Q59. What phone number should Alexander use for the callback?

| **Legacy source** | Original Q63 - simplified             |
|-------------------|---------------------------------------|
| **Control**       | Single choice                         |
| **Required**      | Conditional - required when Q58 = Yes |
| **Data mapping**  | callback_number                       |

**Options**

- The number the customer is calling from

- Ask the customer for their preferred callback number

**Defaults**

Default to the number the customer is calling from.

### Q60. Who should receive or handle scheduling callbacks?

| **Legacy source** | Original Q64                                     |
|-------------------|--------------------------------------------------|
| **Control**       | Existing contact selector + optional new contact |
| **Required**      | Conditional - required when Q58 = Yes            |
| **Data mapping**  | waitlist_callback.owner_contact_id               |

### Q61. Are there any jobs that require a particular technician?

| **Legacy source** | Original Q65 - redesigned                        |
|-------------------|--------------------------------------------------|
| **Control**       | Yes / No + repeatable assignment cards           |
| **Required**      | Yes                                              |
| **Data mapping**  | technician_policy.required_technician_by_service |

**Conditional logic**

- Yes -\> choose a job/service from the shared service registry and enter/select the required technician.

- Allow Other job when the required work is not in the registry.

- Prefer a shared technician/contact record when available; allow a plain technician name during MVP onboarding.

### Q62. What should Alexander do if a customer asks for a specific technician?

| **Legacy source** | Original Q66 - simplified                     |
|-------------------|-----------------------------------------------|
| **Control**       | Single choice                                 |
| **Required**      | Yes                                           |
| **Data mapping**  | technician_policy.specific_technician_request |

**Options**

- Book that technician if confirmed available

- Try to honor the request, but another technician may be assigned

- Submit the request for team review

- We do not accept specific-technician requests

### Q63. If a customer wants help with more than one plumbing problem, what should Alexander normally do?

| **Legacy source** | Original Q68 - simplified |
|-------------------|---------------------------|
| **Control**       | Single choice             |
| **Required**      | Yes                       |
| **Data mapping**  | multiissue_policy.mode    |

**Options**

- Put all eligible issues into one appointment

- Certain issues must be scheduled separately

- Ask our team to decide

**Conditional logic**

Certain issues must be scheduled separately -\> show Q64.

### Q64. Which issues need their own appointment?

| **Legacy source** | Original Q70 (Q69 deleted)                                                    |
|-------------------|-------------------------------------------------------------------------------|
| **Control**       | Multi-select from service registry + Other                                    |
| **Required**      | Conditional - required when Q63 = Certain issues must be scheduled separately |
| **Data mapping**  | multiissue_policy.separate_workflows                                          |

## Section 5 - Pricing and Payments (Q65-Q82)

### Q65. How does your company normally determine what a customer pays?

| **Legacy source** | Original Q71            |
|-------------------|-------------------------|
| **Control**       | Multi-select checkboxes |
| **Required**      | Yes                     |
| **Data mapping**  | pricing_model           |

**Options**

- Flat-rate / upfront pricing

- Hourly labor + materials

- Fixed prices for certain services

- Price determined after technician diagnosis

- Estimate or quote required for larger work

- Other

**Conditional logic**

Other -\> show required custom pricing method.

### Q66. Does your company add a markup to parts or materials?

| **Legacy source** | Original Q72 - Not sure removed |
|-------------------|---------------------------------|
| **Control**       | Single choice                   |
| **Required**      | Yes                             |
| **Data mapping**  | markup_policy                   |

**Options**

- Yes

- Sometimes

- No

**Conditional logic**

Yes or Sometimes -\> show “What is Alexander allowed to tell customers about your material pricing?”

### Q67. If Alexander does not know the exact price, what should he normally tell the customer?

| **Legacy source** | Original Q73                          |
|-------------------|---------------------------------------|
| **Control**       | Single choice                         |
| **Required**      | Yes                                   |
| **Data mapping**  | pricing_policy.unknown_price_behavior |

**Options**

- Explain that the technician will provide pricing after evaluating the job

- Give an approved price or range when one is available

- Explain the applicable service / diagnostic fee and that additional work is quoted separately

- Arrange for our team to provide pricing

- Follow another rule

**Conditional logic**

Follow another rule -\> show required custom rule.

### Q68. What fees does your company charge?

| **Legacy source** | Original Q74 + final fee addendum                                                      |
|-------------------|----------------------------------------------------------------------------------------|
| **Control**       | Repeatable vertical fee cards                                                          |
| **Required**      | Conditional section - user must either add fee(s) or select No separate fees           |
| **Data mapping**  | diagnostic_service_fee, fee_policy, minimum_price, travelfee_table, waived_reduced_fee |

**Help text:** Add only the fees your company actually charges. For each fee, tell us when it applies and whether Alexander may quote it to customers.

**Conditional logic**

- Initial state: No fees added yet + “+ Add a fee”.

- Optional category templates: Diagnostic/service-call; Emergency/after-hours; Travel; Cancellation/no-show; Minimum service charge; Permit/inspection; Other. Templates prefill category only.

- Fee card fields: name/type; amount; application rule; quote authority; credited toward work; waiver policy; conditional waiver rule.

- Amount supports fixed, range, percentage, or “Varies - team must confirm”.

- Quote authority: Yes, Alexander may quote it / No / Only after team confirmation.

- Credit toward approved work: Yes / No / Sometimes.

- Can fee be waived: Yes / No / Sometimes. Yes/Sometimes -\> required waiver rule.

- Empty-state alternative: “My company does not charge separate service, diagnostic, travel, or similar fees.”

**Validation**

- Any started fee card must complete all required fields.

- Yes/Sometimes waiver requires waiver rule.

- Only after team confirmation requires an application rule.

- No-fees state hides fee cards and is mutually exclusive with existing fee records.

**UX / UI notes**

- Vertical cards only; never use a horizontally scrolling fee table.

- Card controls: Remove, Duplicate, optional Collapse.

- Use “quote” rather than “tell customers.”

### Q69. Do any areas have a travel fee or minimum charge?

| **Legacy source** | Original Q75                            |
|-------------------|-----------------------------------------|
| **Control**       | Yes / No + repeatable area-pricing rows |
| **Required**      | Yes                                     |
| **Data mapping**  | travelfee_table, minimum_price          |

**Conditional logic**

Yes -\> Area + travel fee + minimum charge (each optional as applicable). Reuse territory values from Section 2 where possible.

### Q70. How should Alexander handle these types of visits?

| **Legacy source** | Original Q76 - service-registry version                                                             |
|-------------------|-----------------------------------------------------------------------------------------------------|
| **Control**       | Matrix / one visit type per service                                                                 |
| **Required**      | Yes                                                                                                 |
| **Data mapping**  | estimate_diagnostic_policy, estimate_policy, estimate_requirement, inspection_vs_repair_vs_estimate |

**Columns / states**

- Free estimate

- Paid diagnostic / service visit

- Inspection visit

- Normal service appointment

- Ask our team first

- We do not offer this

**Rows / items**

- Populate dynamically from the shared service registry, including offered, conditional, human-review, and not-offered services.

**Implementation notes**

“We do not offer this” was briefly removed during the meeting and then explicitly added back; the later decision controls.

### Q71. What should Alexander tell customers about paid diagnostic visits?

| **Legacy source** | Original Q78 (Q77 deleted)                                                      |
|-------------------|---------------------------------------------------------------------------------|
| **Control**       | Long text                                                                       |
| **Required**      | Conditional - show when any service in Q70 uses Paid diagnostic / service visit |
| **Data mapping**  | estimate_diagnostic_policy.customer_explanation                                 |

**Implementation notes**

Reference existing fee records from Q68; do not make the customer re-enter the diagnostic amount.

### Q72. When a customer asks “How much will this cost?”, what is Alexander normally allowed to do?

| **Legacy source** | Original Q79 - simplified      |
|-------------------|--------------------------------|
| **Control**       | Single choice                  |
| **Required**      | Yes                            |
| **Data mapping**  | pricing_authority.default_mode |

**Options**

- Give exact prices only from our approved price list

- Explain fees, but do not quote repair prices

- Tell the customer pricing is determined after evaluation

- Ask our team whenever a customer requests a price

**Implementation notes**

This resolves the on-screen ordinal references from the meeting by retaining the explicitly indicated first, third, fourth, and fifth source options; service-specific exceptions are handled in Q73.

### Q73. Which service prices may Alexander discuss with customers?

| **Legacy source** | Original Q80 - redesigned; Q81 merged/deleted                       |
|-------------------|---------------------------------------------------------------------|
| **Control**       | Per-service pricing instruction cards                               |
| **Required**      | Yes                                                                 |
| **Data mapping**  | price_availability, pricing_authority, pricing_policy.service_rules |

**Options**

- Alexander may quote an approved price or range

- Alexander may explain the applicable fee, but not the repair price

- Alexander should ask our team about pricing

- Alexander should not discuss pricing

- No approved pricing yet

**Rows / items**

- Display only services from the shared service registry that were marked offered, conditional, or ask-team-first.

**Conditional logic**

- Quote price/range -\> show Approved price or range + optional pricing conditions.

- Explain fee only -\> link to Q68 fee records; no duplicate fee entry.

- Ask our team -\> show “What pricing information should Alexander ask the team to confirm?”

- Should not discuss / No approved pricing yet -\> no price field.

### Q74. What should Alexander never say about pricing?

| **Legacy source** | Original Q82 - wording updated      |
|-------------------|-------------------------------------|
| **Control**       | Multi-select checkboxes             |
| **Required**      | Yes                                 |
| **Data mapping**  | pricing_policy.forbidden_statements |

**Options**

- Never guarantee a final repair price before diagnosis unless it is an approved fixed price

- Never invent a price

- Never promise there will not be additional charges

- Never disclose internal material markup

- Never promise a discount that has not been authorized

- Other

**Defaults**

Preselect the first five rules.

**Conditional logic**

Other -\> show custom prohibited pricing statement.

### Q75. Does your company currently offer discounts, coupons, or promotions?

| **Legacy source** | Original Q83                          |
|-------------------|---------------------------------------|
| **Control**       | Yes / No                              |
| **Required**      | Yes                                   |
| **Data mapping**  | discount_promotion_policy, promotions |

**Conditional logic**

Yes -\> show repeatable offer cards with Offer name, benefit, eligibility, qualifying services, expiration, and proactive-use policy.

### Q76. Can discounts or promotions be combined?

| **Legacy source** | Original Q84                       |
|-------------------|------------------------------------|
| **Control**       | Single choice                      |
| **Required**      | Conditional - show when Q75 = Yes  |
| **Data mapping**  | discount_promotion_policy.stacking |

**Options**

- Yes

- No

- Only under certain conditions

- Human approval required

**Conditional logic**

Only under certain conditions -\> show required rule.

### Q77. May Alexander waive or modify a fee or discount?

| **Legacy source** | Original Q85 - simplified                                                                     |
|-------------------|-----------------------------------------------------------------------------------------------|
| **Control**       | Single choice                                                                                 |
| **Required**      | Conditional - show when Q75 = Yes for discounts; fee-specific waiver authority remains in Q68 |
| **Data mapping**  | discount_promotion_policy.modification_authority                                              |

**Options**

- Yes, within rules we provide

- Human approval required

- No

**Conditional logic**

Yes, within rules -\> show rule/limits for promotion or discount changes if needed.

### Q78. What payment methods do you accept?

| **Legacy source** | Original Q86                   |
|-------------------|--------------------------------|
| **Control**       | Multi-select checkboxes        |
| **Required**      | Yes                            |
| **Data mapping**  | payment_policy.payment_methods |

**Options**

- Credit card

- Debit card

- Cash

- Check

- ACH / bank transfer

- Financing

- Invoice / account billing

- Other

**Conditional logic**

Other -\> show custom payment method.

### Q79. When is payment normally due?

| **Legacy source** | Original Q87 - structured follow-ups |
|-------------------|--------------------------------------|
| **Control**       | Multi-select checkboxes              |
| **Required**      | Yes                                  |
| **Data mapping**  | payment_process                      |

**Options**

- At time of service

- When work is completed

- Deposit required before certain work

- Progress payments for larger projects

- Invoice after service for approved customers

- Other

**Conditional logic**

- Deposit -\> separate required field: which work + deposit rule.

- Progress payments -\> separate required field: which projects + progress-payment rule.

- Invoice -\> separate required field: which customers + invoice terms.

- Other -\> separate custom rule.

### Q80. Do you offer financing?

| **Legacy source** | Original Q88 - label updated |
|-------------------|------------------------------|
| **Control**       | Yes / No                     |
| **Required**      | Yes                          |
| **Data mapping**  | financing_policy             |

**Help text:** Alexander must not promise financing approval.

**Conditional logic**

Yes -\> capture Financing provider and terms; permissions for Alexander (explain availability/options, send application link, help begin application, transfer to team, Other); and approved eligibility statement.

### Q81. What financial remedies may Alexander approve?

| **Legacy source** | Original Q89 + Q90 merged                     |
|-------------------|-----------------------------------------------|
| **Control**       | Per-remedy authority matrix with inline rules |
| **Required**      | Yes                                           |
| **Data mapping**  | refund_goodwill_authority                     |

**Columns / states**

- Alexander may approve within our rules

- Human approval required

- Never offered

**Rows / items**

- Refund

- Account credit

- Fee waiver

- Discount / goodwill adjustment

- Free or reduced-price return visit

**Conditional logic**

For each row marked Alexander may approve within our rules, reveal a condition/limit field tied to that exact remedy.

### Q82. Who should Alexander contact when human approval is required for a financial remedy?

| **Legacy source** | Original Q91                                                    |
|-------------------|-----------------------------------------------------------------|
| **Control**       | Existing contact selector + Add new person                      |
| **Required**      | Conditional - required when any Q81 row requires human approval |
| **Data mapping**  | refund_goodwill_authority.approver_contact_id                   |

**Conditional logic**

New person -\> capture name, role, and phone/contact details, then add to shared contact registry.

## Section 6 - Customer Care (Q83-Q91)

### Q83. When a customer calls about a problem with previous work, what should Alexander normally do first?

| **Legacy source** | Original Q97                             |
|-------------------|------------------------------------------|
| **Control**       | Single choice                            |
| **Required**      | Yes                                      |
| **Data mapping**  | callback_policy, service_recovery_policy |

**Options**

- Collect the details and schedule a return visit when allowed

- Collect the details and submit the request for team review

- Try to connect the customer with someone on our team

- Arrange a callback

- Follow another rule

**Conditional logic**

- Schedule return visit -\> show required “When is a return visit allowed?” rule.

- Follow another rule -\> custom rule.

### Q84. What should Alexander do if the customer has already called back about the same problem?

| **Legacy source** | Original Q101; Q98-Q100 warranties deleted |
|-------------------|--------------------------------------------|
| **Control**       | Single choice                              |
| **Required**      | Yes                                        |
| **Data mapping**  | callback_policy.repeat_issue               |

**Options**

- Schedule another return visit when allowed

- Human review required after the first callback

- Try to connect the customer with a manager

**Implementation notes**

When “schedule another return visit” is selected, reuse the return-visit eligibility rule captured in Q83 rather than asking again.

### Q85. When should Alexander escalate an unhappy customer to your team?

| **Legacy source** | Original Q102                               |
|-------------------|---------------------------------------------|
| **Control**       | Multi-select checkboxes                     |
| **Required**      | Yes                                         |
| **Data mapping**  | service_recovery_policy.escalation_triggers |

**Options**

- Customer explicitly asks for a manager or person

- Customer says the previous repair did not solve the problem

- Customer disputes a charge

- Customer requests a refund or credit

- Customer says your company caused property damage

- Customer threatens legal action

- Customer threatens a chargeback

- Customer is repeatedly dissatisfied after attempts to resolve the issue

- Other

**Defaults**

Preselect the first eight.

**Conditional logic**

Other -\> show custom escalation trigger.

### Q86. What should Alexander never promise an unhappy customer?

| **Legacy source** | Original Q103 - warranty promise removed   |
|-------------------|--------------------------------------------|
| **Control**       | Multi-select checkboxes                    |
| **Required**      | Yes                                        |
| **Data mapping**  | service_recovery_policy.forbidden_promises |

**Options**

- Never admit company fault or liability

- Never promise a refund unless authorized

- Never promise free work unless authorized

- Never promise compensation unless authorized

- Never promise a specific outcome from management

- Other

**Defaults**

Preselect the first five.

**Conditional logic**

Other -\> show custom prohibited promise.

### Q87. How should Alexander handle these types of calls?

| **Legacy source** | Original Q109 + Q110 merged; referrals removed |
|-------------------|------------------------------------------------|
| **Control**       | Matrix / one disposition per caller type       |
| **Required**      | Yes                                            |
| **Data mapping**  | non_service_routing_policy                     |

**Columns / states**

- Send to someone specific

- Take a message / callback

- Politely decline

- Human review

**Rows / items**

- Vendor or supplier

- Sales solicitation

- Job applicant

- Current employee

- Media inquiry

- Attorney / legal inquiry

- Government / regulator

- Customer requesting a service you do not offer

- Customer outside your service area

- Wrong number / spam

**Conditional logic**

For each row set to Send to someone specific, reveal an existing-contact selector for that exact row.

### Q88. What customer information may Alexander use when helping an existing customer?

| **Legacy source** | Original Q113 - simplified          |
|-------------------|-------------------------------------|
| **Control**       | Single choice                       |
| **Required**      | Yes                                 |
| **Data mapping**  | privacy_policy.customer_history_use |

**Help text:** This policy applies only when the information is available through connected software and the caller is authorized to access it.

**Options**

- Use available customer and service history when it helps resolve the call

- Human review required before discussing previous service details

- Follow another rule

**Conditional logic**

Follow another rule -\> custom rule.

### Q89. Are there customer records or documents Alexander should never disclose?

| **Legacy source** | Original Q114                         |
|-------------------|---------------------------------------|
| **Control**       | Multi-select checkboxes               |
| **Required**      | Yes                                   |
| **Data mapping**  | privacy_policy.restricted_information |

**Options**

- Payment information

- Internal company notes

- Technician-only notes

- Information about another customer

- Sensitive account information

- Other

**Defaults**

- Preselect Payment information.

- Preselect Information about another customer.

- Preselect Sensitive account information.

- Leave Internal company notes and Technician-only notes available but not preselected.

**Conditional logic**

Other -\> custom restricted-information field.

### Q90. How proactive should Alexander be about recommending additional services?

| **Legacy source** | Original Q115 |
|-------------------|---------------|
| **Control**       | Single choice |
| **Required**      | Yes           |
| **Data mapping**  | sales_policy  |

**Help text:** This does not authorize unsupported diagnosis, pressure tactics, or invented needs.

**Options**

- Mention relevant services when they clearly relate to what the customer needs

- Mention only approved offers, promotions, or services

- Only discuss additional services when the customer asks

- Do not proactively recommend additional services

- Follow another rule

**Conditional logic**

Follow another rule -\> custom sales-boundary rule.

### Q91. Is there anything else Alexander should know about calls that do not fit your normal service process?

| **Legacy source** | Original Q116                        |
|-------------------|--------------------------------------|
| **Control**       | Long text                            |
| **Required**      | No                                   |
| **Data mapping**  | non_service_routing_policy.catch_all |

## Section 7 - Voice and Conversation (Q92-Q103)

### Q92. Which language or languages should Alexander support with callers?

| **Legacy source** | Addendum Q129                                        |
|-------------------|------------------------------------------------------|
| **Control**       | Multi-select checkboxes                              |
| **Required**      | Yes                                                  |
| **Data mapping**  | voice_profile.primary_language + supported_languages |

**Help text:** If more than one language is selected, Alexander should respond in the caller’s language when it can do so reliably.

**Options**

- English

- Spanish

- Other supported language

- English only

**Conditional logic**

- Other supported language -\> enter the language; accept only languages verified for the selected voice.

- English only is mutually exclusive with other language selections.

### Q93. Which voice should Alexander use?

| **Legacy source** | Addendum Q130                     |
|-------------------|-----------------------------------|
| **Control**       | Single choice with audio previews |
| **Required**      | Yes                               |
| **Data mapping**  | voice_profile.voice_id            |

**Help text:** Choose from the approved Alexander voice library. The preview is more reliable than asking you to describe a voice abstractly.

**Options**

- Voice A - Warm, calm, professional

- Voice B - Friendly, energetic, approachable

- Voice C - Direct, steady, highly efficient

- Another approved voice

**Conditional logic**

Another approved voice -\> select/enter only an approved library voice.

### Q94. How should Alexander’s communication style feel?

| **Legacy source** | Addendum Q131                            |
|-------------------|------------------------------------------|
| **Control**       | Single choice                            |
| **Required**      | Yes                                      |
| **Data mapping**  | voice_profile.communication_style_preset |

**Help text:** This changes the surface tone, not the underlying safety, reasoning, or conversation rules.

**Options**

- Warm and professional

- Friendly and relaxed

- Direct and efficient

- Calm and reassuring

### Q95. What name should Alexander use when introducing himself?

| **Legacy source** | Addendum Q132              |
|-------------------|----------------------------|
| **Control**       | Single choice + short text |
| **Required**      | Yes                        |
| **Data mapping**  | voice_profile.display_name |

**Help text:** Alexander remains the product name. This controls the spoken receptionist name.

**Options**

- Alexander

- A company-specific name

- Another approved name

**Conditional logic**

- Company-specific name / Another approved name -\> short text input.

**Example**

“Thanks for calling Lancaster Plumbing & Rooter. This is Alexander, the company’s AI receptionist.”

### Q96. How should Alexander identify himself as an AI?

| **Legacy source** | Addendum Q133                     |
|-------------------|-----------------------------------|
| **Control**       | Single choice                     |
| **Required**      | Yes                               |
| **Data mapping**  | voice_profile.ai_disclosure_style |

**Help text:** Alexander should be transparent without making the disclosure awkward or repetitive. Mandatory legal/platform disclosure requirements override a company preference where applicable.

**Options**

- Say he is the company’s AI receptionist in the opening

- Say he is an AI receptionist only if the caller asks

- Use another approved disclosure

**Conditional logic**

Another approved disclosure -\> custom disclosure text.

### Q97. Are there any company, people, city, neighborhood, or brand names that Alexander must pronounce correctly?

| **Legacy source** | Addendum Q134                                 |
|-------------------|-----------------------------------------------|
| **Control**       | None / Yes + repeatable pronunciation entries |
| **Required**      | Yes                                           |
| **Data mapping**  | voice_profile.pronunciation_dictionary        |

**Options**

- None

- Yes - enter pronunciation details

**Conditional logic**

Yes -\> repeatable entries: spelling/name, preferred pronunciation, optional audio example.

**Example**

Lancaster - LAN-cas-ter; Zayden - ZAY-den; Rheem - REEM

### Q98. If a caller speaks a supported second language, what should Alexander normally do?

| **Legacy source** | Addendum Q135                           |
|-------------------|-----------------------------------------|
| **Control**       | Single choice                           |
| **Required**      | Yes                                     |
| **Data mapping**  | voice_profile.language_switching_policy |

**Options**

- Continue in the caller’s language

- Ask whether the caller prefers English or the supported second language

- Continue in English and offer a human who speaks the other language

- Follow another rule

**Conditional logic**

Follow another rule -\> custom language-switching rule.

### Q99. Do you have a preference for the perceived voice presentation?

| **Legacy source** | Addendum Q136                            |
|-------------------|------------------------------------------|
| **Control**       | Single choice                            |
| **Required**      | No                                       |
| **Data mapping**  | voice_profile.perceived_voice_preference |

**Help text:** The voice preview is the source of truth; callers may perceive a voice differently.

**Options**

- No preference

- Masculine-presenting

- Feminine-presenting

- Neutral or androgynous

### Q100. Do you have a preferred accent or regional character?

| **Legacy source** | Addendum Q137                   |
|-------------------|---------------------------------|
| **Control**       | Single choice                   |
| **Required**      | No                              |
| **Data mapping**  | voice_profile.accent_preference |

**Help text:** Expose only options available in the approved voice library and clear for the service area.

**Options**

- Neutral American

- Regional American, if available

- Spanish-influenced English, if available

- Other approved option

- No preference

**Conditional logic**

Other approved option -\> approved accent selector/text.

### Q101. How formal should Alexander sound?

| **Legacy source** | Addendum Q138                      |
|-------------------|------------------------------------|
| **Control**       | Single choice                      |
| **Required**      | No                                 |
| **Data mapping**  | voice_profile.formality_preference |

**Help text:** Alexander remains professional in every configuration; this only changes ordinary phrasing.

**Options**

- Conversational and natural

- Balanced professional

- More formal and traditional

### Q102. Are there any phrases Alexander should use or avoid because of your company’s brand?

| **Legacy source** | Addendum Q139                                 |
|-------------------|-----------------------------------------------|
| **Control**       | Long text                                     |
| **Required**      | No                                            |
| **Data mapping**  | voice_profile.approved_phrases_and_avoidances |

**Help text:** Do not use this field to define safety, pricing, or appointment policy. Those belong in the earlier sections.

### Q103. Is there anything else about Alexander’s voice or identity that we should review with you?

| **Legacy source** | Addendum Q140                         |
|-------------------|---------------------------------------|
| **Control**       | Long text                             |
| **Required**      | No                                    |
| **Data mapping**  | voice_profile.additional_review_notes |

**Help text:** Use this only for a preference not covered above. The Alexander standard may be recommended when a request would reduce clarity, trust, or reliability.

## Section 8 - Integration Systems and Final Setup (Q104-Q114)

### Q104. What system do you use to manage customers, jobs, or field-service operations?

| **Legacy source** | Original Q117               |
|-------------------|-----------------------------|
| **Control**       | Single choice               |
| **Required**      | Yes                         |
| **Data mapping**  | integration_profile.crm_fsm |

**Options**

- ServiceTitan

- Housecall Pro

- Jobber

- GoHighLevel

- HubSpot

- Salesforce

- Another system

- We do not use one

**Conditional logic**

Another system -\> system-name field.

### Q105. Where does your company manage appointments and availability?

| **Legacy source** | Original Q118                         |
|-------------------|---------------------------------------|
| **Control**       | Single choice                         |
| **Required**      | Yes                                   |
| **Data mapping**  | integration_profile.scheduling_system |

**Options**

- Same system selected above

- Google Calendar

- Microsoft Outlook / Microsoft 365

- Cal.com

- Another scheduling system

- We do not use scheduling software

**Conditional logic**

Another scheduling system -\> system-name field.

### Q106. Where does your team manage technician schedules or dispatch?

| **Legacy source** | Original Q119                       |
|-------------------|-------------------------------------|
| **Control**       | Single choice                       |
| **Required**      | Yes                                 |
| **Data mapping**  | integration_profile.dispatch_system |

**Options**

- Same system selected above

- We use another system

- We do not use dispatch software

**Conditional logic**

Another system -\> system-name field.

### Q107. What system currently handles your business phone calls?

| **Legacy source** | Original Q120                    |
|-------------------|----------------------------------|
| **Control**       | Single choice                    |
| **Required**      | Yes                              |
| **Data mapping**  | integration_profile.phone_system |

**Options**

- RingCentral

- Dialpad

- Zoom Phone

- GoHighLevel

- Traditional landline / carrier

- Mobile phones

- Another phone system

- Not sure

**Conditional logic**

Another phone system -\> system-name field.

**Implementation notes**

“Not sure” remains because this is technical system identification, not an operational-policy ambiguity.

### Q108. Do you use any other software Alexander may need to work with?

| **Legacy source** | Original Q121 - structured follow-ups              |
|-------------------|----------------------------------------------------|
| **Control**       | Multi-select categories + per-category system card |
| **Required**      | No                                                 |
| **Data mapping**  | integration_profile.additional_systems             |

**Options**

- Separate customer database

- Separate price book / estimating software

- Financing system

- Payment system

- SMS / texting platform

- Email / shared inbox

- Other

- None

**Conditional logic**

- For every selected category, show a separate card asking the exact software name and what Alexander should be able to access.

- Other -\> category/name/details.

- None is mutually exclusive.

### Q109. Which of these should Alexander be able to do when your software supports it?

| **Legacy source** | Original Q122                               |
|-------------------|---------------------------------------------|
| **Control**       | Multi-select checkboxes                     |
| **Required**      | Yes                                         |
| **Data mapping**  | integration_profile.authorized_capabilities |

**Help text:** Selecting a capability authorizes configuration when technically supported; it does not guarantee the integration can provide it.

**Options**

- Find an existing customer

- View customer contact information

- View upcoming appointments

- View previous jobs / service history

- View the technician who previously serviced a customer

- View membership/service-plan status

- View relevant warranty information

- Check real-time appointment availability

- Create appointments

- Reschedule appointments

- Cancel appointments

- View technician availability

- View technician skills or assignment information

- Add notes or call information to customer/job records

- Send approved customer communications

- Other

**Defaults**

Preselect all capabilities. Customer deselects anything they do not want.

**Conditional logic**

Other -\> custom capability.

**Implementation notes**

Membership/warranty operational questionnaire sections were removed, but these read-only integration capabilities remain in the original software authorization list. If the MVP product will not expose them at all, they may be hidden behind capability flags at implementation time rather than deleted from the source-of-truth authorization model.

### Q110. Are you an administrator or authorized person for these systems?

| **Legacy source** | Original Q123                        |
|-------------------|--------------------------------------|
| **Control**       | Single choice                        |
| **Required**      | Yes                                  |
| **Data mapping**  | integration_profile.connection_owner |

**Options**

- Yes

- No

- Someone else on our team handles this

**Conditional logic**

Someone else -\> capture name, email, and phone for the connection owner.

### Q111. Software connection notice

| **Legacy source** | Original Q124                                      |
|-------------------|----------------------------------------------------|
| **Control**       | Required acknowledgement checkbox                  |
| **Required**      | Yes                                                |
| **Data mapping**  | integration_profile.connection_notice_acknowledged |

**Help text:** You will connect supported software securely after submitting this questionnaire. Do not enter passwords or private API credentials here. Our team will handle configuration and testing.

**Options**

- I understand

### Q112. If Alexander temporarily cannot access information or complete an action through your software, what should he normally do?

| **Legacy source** | Original Q125                        |
|-------------------|--------------------------------------|
| **Control**       | Single choice                        |
| **Required**      | Yes                                  |
| **Data mapping**  | integration_profile.failure_fallback |

**Help text:** Alexander will never claim an appointment, change, cancellation, dispatch, or other action succeeded unless it was actually confirmed.

**Options**

- Collect the customer’s information and send the request to our team

- Arrange a callback

- Try to connect the customer with someone on our team

- Follow another rule

**Conditional logic**

Follow another rule -\> custom fallback.

### Q113. Anything else Alexander should know about how your company operates?

| **Legacy source** | Original Q126         |
|-------------------|-----------------------|
| **Control**       | Long text             |
| **Required**      | No                    |
| **Data mapping**  | final_setup.catch_all |

### Q114. Confirm your answers

| **Legacy source** | Original Q128; Q127 is review screen   |
|-------------------|----------------------------------------|
| **Control**       | Three required confirmation checkboxes |
| **Required**      | Yes                                    |
| **Data mapping**  | submission.confirmations               |

**Options**

- I confirm that these answers accurately describe how I want Alexander to represent and operate for my company.

- I understand that some capabilities depend on the software and integrations my company uses.

- I understand that Alexander will only perform actions that are supported, authorized, and successfully confirmed.

**Validation**

All three confirmations are required before Submit Questionnaire is enabled.

# 4. Review, Submission, and Completion Flow

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Review Your Setup</strong><br />
Show eight section summary cards with Edit actions:<br />
1. Your Company - identity, hours, approved claims<br />
2. Your Services - services, customers/properties, service area<br />
3. Emergencies - emergency rules, after-hours, escalation<br />
4. Scheduling - authorization, booking, cancellation, technician rules<br />
5. Pricing and Payments - pricing, fees, payments, promotions, financial authority<br />
6. Customer Care - callbacks, complaints, privacy, unusual calls<br />
7. Voice and Conversation - voice, identity, language, pronunciation<br />
8. Integration Systems and Final Setup - CRM, scheduling, dispatch, phone, integrations and permissions</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

Final review copy:

You have finished the setup questionnaire. Thank you for taking the time to teach Alexander how your company operates. Your answers will now be reviewed and converted into Alexander’s company-specific configuration. We will test routine calls, urgent situations, scheduling requests, customer-care situations, escalation failures, and other important edge cases before your receptionist goes live. If anything requires clarification, our team will contact you before enabling that behavior. You are not expected to configure the underlying AI technology yourself. That is our responsibility.

**What happens next**

1.  We review and normalize your answers.

2.  We configure Alexander around your approved policies.

3.  We test his behavior using realistic customer scenarios.

4.  You review and approve the final experience.

5.  Alexander goes live when the configuration is ready.

Button: Submit Questionnaire

**Submission confirmation:** Thank you. We have received your setup information. Your Alexander configuration is now being prepared. Our team will review your answers and contact you if we need clarification. Before Alexander goes live, you will have the opportunity to review and approve how he represents your company. You have completed the most important part of the process. We’ll take it from here.

# 5. Technical Data Model and Interconnection Rules

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Core principle</strong><br />
Do not store this as 114 isolated strings. Store normalized records with stable IDs and references. The UI questions are views/editors over these records.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## company_profile

- customer_facing_name

- legal_name

- main_phone

- website

- approved_claims

- credential_details

- forbidden_claims

## schedule_profile

- office_hours

- service_hours

- answering_mode

- answering_schedule

- recurring_availability_rule

## service_policy

- service_id

- category

- state: normal \| conditional \| human_first \| denied

- condition_text?

## service_area_policy

- definition_mode

- core_territory

- excluded_territory

- conditional_territories\[\]

- after_hours_modifier

## contact

- contact_id

- name_or_role

- phone

- availability_schedule

- routing_categories\[\]

## emergency_policy

- scenario_id

- classification

- recommended_default_authorized

- dispatch_approval_required

- after_hours_disposition

- capacity_override

## authorization_policy

- caller_type

- permissions\[\]

- spending_limit?

- emergency_modifier

## booking_policy

- default_booking_mode

- booking_horizon

- appointment_windows\[\]

- confirmation_information\[\]

- job_exceptions\[\]

- same_day_policy

- holiday_policy

- reschedule_policy

- cancellation_policy

- no_availability_priority\[\]

## technician_policy

- service_id

- required_technician?

- specific_request_policy

## fee

- fee_id

- name

- amount_type

- amount_value_or_range

- application_rule

- quote_authority

- credited_policy

- waiver_policy

- waiver_rule?

## service_pricing_policy

- service_id

- instruction

- approved_price_or_range?

- conditions?

- linked_fee_ids\[\]

- team_confirmation_instruction?

## financial_authority

- remedy_type

- authority

- limits_conditions?

- approver_contact_id?

## customer_care_policy

- previous_work_first_action

- return_visit_rule

- repeat_callback_rule

- unhappy_escalation_triggers\[\]

- forbidden_promises\[\]

- non_service_routing\[\]

- privacy_rules

- sales_policy

## voice_profile

- primary_language

- supported_languages

- voice_id

- communication_style_preset

- display_name

- ai_disclosure_style

- pronunciation_dictionary\[\]

- language_switching_policy

- perceived_voice_preference

- accent_preference

- formality_preference

- approved_phrases_and_avoidances

- additional_review_notes

## integration_profile

- crm_fsm

- scheduling_system

- dispatch_system

- phone_system

- additional_systems\[\]

- authorized_capabilities\[\]

- connection_owner

- failure_fallback

## 5.1 Referential Rules

- Service dropdowns in scheduling, technician assignment, visit type, and pricing reference service_id values created in Section 2.

- Every later approver/recipient selector references contact_id from the shared contact registry; creating a new person adds a registry record rather than a one-off field.

- Cancellation/no-show fee configuration may create fee records before Section 5; Q68 should surface them for confirmation rather than duplicate entry.

- Diagnostic visit explanations reference fee_id records when available.

- Software capabilities represent authorization only. Runtime capability must still be gated by connector support and real-time action confirmation.

## 5.2 Validation and State Consistency

- A conditional state requires its condition field; a human-first state must never be interpreted as an autonomous condition.

- None / No service / Not offered states are mutually exclusive with positive selections in the same semantic group.

- Required conditional fields are validated only when their parent state makes them visible.

- Deleting a referenced registry item must either be blocked or require reassignment/confirmation wherever it is referenced.

- Schema-version every saved draft and every submitted configuration.

## 5.3 Voice Constitution Boundary

- Do not expose filler frequency

- Do not expose pause duration

- Do not expose pitch

- Do not expose model temperature

- Do not expose turn-end detection

- Do not expose interruption thresholds

- Do not expose response-length logic

- Do not expose low-level cadence controls

These are governed by Alexander’s standard voice constitution, not company onboarding.

# 6. UI Component Specification

**SectionShell** - Title, section number, intro copy, estimated time, progress, autosave state, Back/Continue controls.

**WeeklySchedule** - Seven day rows; start/end times; closed/not-available/24-hour state according to context; keyboard accessible and responsive.

**PolicyMatrix** - Row-based single-state selector; responsive stacked layout on narrow screens; optional per-row conditional panel.

**ConditionPanel** - Appears directly beneath the triggering row; knows parent entity ID; supports required validation.

**ContactCard** - Name/role, phone, weekly availability, routing categories; writes to Contact registry.

**ContactPicker** - Search/select existing contact + Add new person.

**ServicePicker** - Uses stable service IDs and displays current customer-facing service labels.

**FeeCard** - Vertical repeatable card implementing the final fee UX addendum.

**PricingRuleCard** - One service + pricing instruction + conditional price/fee/team fields.

**PronunciationCard** - Name/spelling + pronunciation + optional audio sample reference.

**SystemCard** - Software category, system name, desired access/capability information.

**ReviewCard** - Section summary + Edit action + incomplete-warning state.

## 6.1 Responsive Behavior

- Never require horizontal scrolling to discover a decision column.

- On mobile, matrix rows become stacked cards with the row label first and states below.

- Sticky bottom action bar is acceptable on mobile, but must not cover form content.

- Long repeatable sections should support card collapse after completion.

- Audio preview controls in Voice & Conversation must expose play/pause, duration, and an accessible text label.

## 6.2 Accessibility and Form Semantics - implementation recommendation

- Every control has a programmatic label and visible focus state.

- Radio groups and checkbox groups expose fieldset/legend semantics.

- Required and error states are conveyed by text, not color alone.

- Keyboard navigation works through all matrices/cards.

- Inline errors identify both the row/entity and the missing requirement.

# 7. QA and Acceptance Strategy

- Source parity QA: confirm every active legacy requirement appears once in the final implementation and every deleted requirement stays deleted.

- Form-logic QA: exercise every conditional branch, mutual exclusion, and hidden-field reset behavior.

- Data-binding QA: verify conditions are stored against the correct service, caller type, fee, remedy, contact, or routing row.

- Persistence QA: leave mid-section, resume in same browser, resume from another authenticated session, and verify exact state restoration.

- Normalization QA: inspect the submitted structured payload, not only the visible UI.

- Runtime acceptance QA: use a deliberately nuanced plumbing-company test configuration, build the bot, and call it with scenarios that test every configured rule.

- Truthfulness QA: simulate failed transfers, unavailable integrations, and unconfirmed appointments; Alexander must not claim success.

- Regression generation: every stored business rule should be convertible into one or more acceptance-test scenarios so questionnaire changes can automatically produce test cases.

## 7.1 Question-by-question reviewer checklist

- What business decision are we learning?

- Is the answer bound to the correct business object?

- Could two users express the same rule in incompatible formats?

- Can Alexander deterministically act from the stored value?

- Is anything already captured elsewhere?

- Can a previous service/contact/fee/system be reused?

- Would a default reduce unnecessary work?

- Does selecting one state logically disable another?

- Is an important option hidden by layout or scrolling?

- Does this add complexity that is outside the inbound-voice MVP?

# Appendix A - Legacy Reconciliation and Explicit Deletions

| Legacy item                                                        | Final treatment                                                                                                              |
|--------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------|
| Q15                                                                | Merged into final Q14 as per-service inline conditions; generic condition box removed.                                       |
| Q17                                                                | Merged into final Q15 as per-service inline conditions.                                                                      |
| Q19                                                                | Merged into final Q16 as per customer/property inline conditions.                                                            |
| Q31 original implementation issue                                  | Must be dropdown matrix, not radio-button matrix.                                                                            |
| Q38 option “use our emergency fallback”                            | Removed; the question itself defines the fallback.                                                                           |
| Q38 “Not sure yet”                                                 | Removed.                                                                                                                     |
| Q45 “Try next authorized person”                                   | Removed because no universal approver hierarchy was defined.                                                                 |
| Q46                                                                | Homeowner row added.                                                                                                         |
| Q49 “Different jobs follow different rules”                        | Removed; job-specific rules live in final Q50.                                                                               |
| Q52 old promise matrix                                             | Replaced with final Q49 confirmation-information checklist + universal no-unconfirmed-promises rule.                         |
| Q55                                                                | Merged into final Q51 per-row conditions.                                                                                    |
| Q56/Q57 “Alexander should not…” options                            | Removed; human approval/callback already represent non-autonomous handling.                                                  |
| Q61 scheduling exception + Other                                   | Removed from no-availability ranking.                                                                                        |
| Q63 CRM-number + Other                                             | Removed for MVP.                                                                                                             |
| Q67                                                                | Deleted: same-technician continuity overcomplicated MVP.                                                                     |
| Q69                                                                | Deleted: maximum issue count removed.                                                                                        |
| Q77                                                                | Deleted: free-estimate conditions removed.                                                                                   |
| Q81                                                                | Deleted/merged: team-pricing logic moved into final Q73 per-service pricing rules.                                           |
| Q90                                                                | Merged into final Q81 per-remedy inline rules.                                                                               |
| Q92-Q96                                                            | Entire Memberships section deleted.                                                                                          |
| Q98-Q100                                                           | Entire Warranty section deleted.                                                                                             |
| Q101 callback-count branch                                         | Removed; no “after N callbacks” logic.                                                                                       |
| Q104-Q108                                                          | Old customer communications + language block deleted for inbound-phone MVP.                                                  |
| Q108 language                                                      | Functionality reintroduced correctly in dedicated Voice & Conversation section.                                              |
| Q110                                                               | Merged into final Q87 row-specific routing contacts.                                                                         |
| Q111-Q112                                                          | Referral section deleted.                                                                                                    |
| Q127                                                               | Not a question; implemented as 8-section review screen.                                                                      |
| 7-section progress                                                 | Superseded by the 8-section flow after Voice & Conversation addendum.                                                        |
| Section 6 sales copy references warranties/memberships             | Corrected in this specification because those features were explicitly deleted in the later meeting.                         |
| Section 8 sales copy references notification/recording preferences | Corrected to systems, permissions, connection owner, and integrations because no matching active questionnaire block exists. |

# Appendix B - Final Number to Legacy Source Map

| Final Q | Section | Legacy source |
|---------|---------|---------------|
| 1       | 1       | Original Q1   |
| 2       | 1       | Original Q2   |
| 3       | 1       | Original Q3   |
| 4       | 1       | Original Q4   |
| 5       | 1       | Original Q5   |
| 6       | 1       | Original Q6   |
| 7       | 1       | Original Q7   |
| 8       | 1       | Original Q8   |
| 9       | 1       | Original Q9   |
| 10      | 1       | Original Q10  |
| 11      | 1       | Original Q11  |
| 12      | 1       | Original Q12  |
| 13      | 1       | Original Q13  |
| 14      | 2       | Original Q14  |
| 15      | 2       | Original Q16  |
| 16      | 2       | Original Q18  |
| 17      | 2       | Original Q20  |
| 18      | 2       | Original Q21  |
| 19      | 2       | Original Q22  |
| 20      | 2       | Original Q23  |
| 21      | 2       | Original Q24  |
| 22      | 2       | Original Q25  |
| 23      | 2       | Original Q26  |
| 24      | 2       | Original Q27  |
| 25      | 2       | Original Q28  |
| 26      | 3       | Original Q29  |
| 27      | 3       | Original Q30  |
| 28      | 3       | Original Q31  |
| 29      | 3       | Original Q32  |
| 30      | 3       | Original Q33  |
| 31      | 3       | Original Q34  |
| 32      | 3       | Original Q35  |
| 33      | 3       | Original Q36  |
| 34      | 3       | Original Q37  |
| 35      | 3       | Original Q38  |
| 36      | 3       | Original Q39  |
| 37      | 3       | Original Q40  |
| 38      | 3       | Original Q41  |
| 39      | 4       | Original Q42  |
| 40      | 4       | Original Q43  |
| 41      | 4       | Original Q44  |
| 42      | 4       | Original Q45  |
| 43      | 4       | Original Q46  |
| 44      | 4       | Original Q47  |
| 45      | 4       | Original Q48  |
| 46      | 4       | Original Q49  |
| 47      | 4       | Original Q50  |
| 48      | 4       | Original Q51  |
| 49      | 4       | Original Q52  |
| 50      | 4       | Original Q53  |
| 51      | 4       | Original Q54  |
| 52      | 4       | Original Q56  |
| 53      | 4       | Original Q57  |
| 54      | 4       | Original Q58  |
| 55      | 4       | Original Q59  |
| 56      | 4       | Original Q60  |
| 57      | 4       | Original Q61  |
| 58      | 4       | Original Q62  |
| 59      | 4       | Original Q63  |
| 60      | 4       | Original Q64  |
| 61      | 4       | Original Q65  |
| 62      | 4       | Original Q66  |
| 63      | 4       | Original Q68  |
| 64      | 4       | Original Q70  |
| 65      | 5       | Original Q71  |
| 66      | 5       | Original Q72  |
| 67      | 5       | Original Q73  |
| 68      | 5       | Original Q74  |
| 69      | 5       | Original Q75  |
| 70      | 5       | Original Q76  |
| 71      | 5       | Original Q78  |
| 72      | 5       | Original Q79  |
| 73      | 5       | Original Q80  |
| 74      | 5       | Original Q82  |
| 75      | 5       | Original Q83  |
| 76      | 5       | Original Q84  |
| 77      | 5       | Original Q85  |
| 78      | 5       | Original Q86  |
| 79      | 5       | Original Q87  |
| 80      | 5       | Original Q88  |
| 81      | 5       | Original Q89  |
| 82      | 5       | Original Q91  |
| 83      | 6       | Original Q97  |
| 84      | 6       | Original Q101 |
| 85      | 6       | Original Q102 |
| 86      | 6       | Original Q103 |
| 87      | 6       | Original Q109 |
| 88      | 6       | Original Q113 |
| 89      | 6       | Original Q114 |
| 90      | 6       | Original Q115 |
| 91      | 6       | Original Q116 |
| 92      | 7       | Addendum Q129 |
| 93      | 7       | Addendum Q130 |
| 94      | 7       | Addendum Q131 |
| 95      | 7       | Addendum Q132 |
| 96      | 7       | Addendum Q133 |
| 97      | 7       | Addendum Q134 |
| 98      | 7       | Addendum Q135 |
| 99      | 7       | Addendum Q136 |
| 100     | 7       | Addendum Q137 |
| 101     | 7       | Addendum Q138 |
| 102     | 7       | Addendum Q139 |
| 103     | 7       | Addendum Q140 |
| 104     | 8       | Original Q117 |
| 105     | 8       | Original Q118 |
| 106     | 8       | Original Q119 |
| 107     | 8       | Original Q120 |
| 108     | 8       | Original Q121 |
| 109     | 8       | Original Q122 |
| 110     | 8       | Original Q123 |
| 111     | 8       | Original Q124 |
| 112     | 8       | Original Q125 |
| 113     | 8       | Original Q126 |
| 114     | 8       | Original Q128 |

# Appendix C - Source Basis and Precedence

- Original source: Master Questionnaire Questions.pdf - 85 pages, original Sections 1-7, original Questions 1-128.

- Meeting 1 transcript: detailed review from the start through Scheduling around original Q64; introduced custom-app direction, defaults, per-entity conditions, no horizontal scroll, reusable contacts, and policy simplification.

- Meeting 2 transcript: continued from Technician Assignment through final setup; removed memberships, warranties, referrals, old communications/language block, and other non-MVP complexity; finalized much of pricing and customer-care behavior.

- Addendum New Section.docx: authoritative Voice & Conversation section, original addendum Q129-Q140.

- fee question details.docx: authoritative final UX for the fee question.

- Sections 1-8 onboarding sales copy progress bar.docx: authoritative 8-section journey and section transition copy, with stale warranty/membership and notification/recording references corrected by the later meeting decisions in this master specification.

## Precedence used in this document

6.  Latest explicit Phillip meeting decision

7.  Specific final addendum on that topic

8.  Earlier meeting decision

9.  Original master questionnaire

# Appendix D - Engineering Handoff Checklist

- Create schema/versioned data model and registries before implementing question pages.

- Implement shared Schedule, Policy Matrix, Contact, Service Picker, Fee Card, Pricing Rule, Pronunciation, and System components.

- Implement section-level autosave, resume, and progress state.

- Encode all 114 top-level questions and their conditional sub-fields exactly from this specification.

- Implement review/edit screen across all 8 sections.

- Validate full payload and confirmations before submission.

- Generate normalized Alexander configuration and acceptance tests from the submitted answer set.

- Run the nuanced plumbing-company end-to-end test described in the meetings before launch.
