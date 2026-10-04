# Alexander Final Questionnaire Specification v1.0

## Questionnaire Overview

Questionnaire:  
Alexander Customer Onboarding Questionnaire

Specification version:  
1.0

Frozen questionnaire schema version:  
10

Frozen application commit:  
`b1cff2e5fee08c895fafe7b50d2ad01609590df0` (`b1cff2e`)

Frozen date:  
2026-10-04

Total questionnaire sections:  
8

Sections in exact order:

1. Your Company
2. Your Services
3. Emergencies
4. Scheduling
5. Pricing and Payments
6. Customer Care
7. Voice and Conversation
8. Integration Systems and Final Setup

Root questions:  
**93**

Conditional child questions:  
**44**

Total registered logical Q-IDs:  
**137**

These 137 IDs are not 137 top-level questions. 93 are root questions. 44 are conditional children.

Final root Q-ID:  
**Q93**

Final Review and Submission:  
Included after Section 8. It is not a ninth section. Permanent Q-ID: **Q93**.

This document describes the current questionnaire and UI only. It does not define Company Truth, Prompt Zero, normalization, or downstream decisions.

### Numbering rules (v1.0)

- `Q` numbers identify logical questionnaire questions.
- Letter suffixes identify conditional child questions.
- Matrix rows and repeater instances are not new Q numbers.
- IDs assigned in v1.0 stay permanent.

---

## Section 1 — Your Company

### Q1

- Section: Your Company
- Exact question: What name do your customers know your company by?
- Input type: Short text
- Required/Optional: Required
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Company name is required.
- Raw storage path: `section1.customerFacingName`
- Stored option IDs: n/a

### Q2

- Section: Your Company
- Exact question: What is your legal business name?
- Input type: Short text
- Required/Optional: Optional
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Optional
- Validation/restrictions: None
- Raw storage path: `section1.legalName`
- Stored option IDs: n/a

### Q3

- Section: Your Company
- Exact question: What is your main business phone number?
- Input type: Phone number
- Required/Optional: Required
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Required non-empty phone number.
- Raw storage path: `section1.mainPhone`
- Stored option IDs: n/a

### Q4

- Section: Your Company
- Exact question: What is your website?
- Input type: URL
- Required/Optional: Optional
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Optional
- Validation/restrictions: Optional. If a website is entered, it must be a valid URL.
- Raw storage path: `section1.website`
- Stored option IDs: n/a

### Q5

- Section: Your Company
- Exact question: Which of these may Alexander tell customers about your company?
- Input type: Multi-select / checkboxes
- Required/Optional: Required
- Answer choices: Exact order:
  - Licensed (`licensed`)
  - Insured (`insured`)
  - Bonded (`bonded`)
  - Locally owned (`locally_owned`)
  - Family owned (`family_owned`)
  - Other (`other`)
  - None of these (`none`)
- Allows Other/free text: Yes — selecting “Other” displays Q5A, a required short-text field.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select at least one option.
- Raw storage path: `section1.approvedClaims`
- Stored option IDs: `licensed`, `insured`, `bonded`, `locally_owned`, `family_owned`, `other`, `none`

### Q5A

- Section: Your Company
- Exact question: What other credential or trust claim may Alexander tell customers?
- Input type: Short text
- Required/Optional: Required
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q5 includes other
- Required when displayed: Required
- Validation/restrictions: Please describe what else Alexander may tell customers.
- Raw storage path: `section1.otherApprovedClaim`
- Stored option IDs: n/a

### Q6

- Section: Your Company
- Exact question: Are there any license numbers or credential details Alexander may give customers?
- Input type: Long/open text
- Required/Optional: Optional
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Optional
- Validation/restrictions: None
- Raw storage path: `section1.licensingDetails`
- Stored option IDs: n/a

### Q7

- Section: Your Company
- Exact question: Is there anything Alexander should never claim about your company?
- Input type: Long/open text
- Required/Optional: Optional
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Optional
- Validation/restrictions: None
- Raw storage path: `section1.forbiddenClaims`
- Stored option IDs: n/a

### Q8

- Section: Your Company
- Exact question: What are your normal office hours?
- Input type: Weekly schedule
- Required/Optional: Required
- Answer choices: Weekly schedule. Days in order: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday. Each day has Closed (checkbox) and, when open, Start and End times. Default: Monday–Friday open 08:00–17:00; Saturday and Sunday closed.
- Allows Other/free text: No
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Each open office day requires opening and closing times.
- Raw storage path: `section1.officeHours`
- Stored option IDs: n/a

### Q9

- Section: Your Company
- Exact question: When are service appointments normally available?
- Input type: Weekly schedule
- Required/Optional: Required
- Answer choices: Weekly schedule. Days in order: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday. Each day is Regular hours, 24 hours, or No service. Regular hours require Start and End. Default: Monday–Saturday regular 08:00–18:00; Sunday no service.
- Allows Other/free text: No
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Each regular-hours day requires service start and end times.
- Raw storage path: `section1.serviceHours`
- Stored option IDs: n/a

### Q10

- Section: Your Company
- Exact question: When should Alexander answer your calls?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - 24 hours a day, 7 days a week (`24_7`)
  - Only when our office is closed (`office_closed_only`)
  - Only during specific hours (`specific_hours`)
- Allows Other/free text: Yes — selecting specific hours displays Q10A, a required weekly schedule.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select when Alexander should answer your calls.
- Raw storage path: `section1.answeringMode`
- Stored option IDs: `24_7`, `office_closed_only`, `specific_hours`

### Q10A

- Section: Your Company
- Exact question: What hours should Alexander answer your calls?
- Input type: Weekly schedule
- Required/Optional: Required
- Answer choices: Weekly schedule shown only for specific answering hours. Days in order: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday. Each day is Closed or open with Start and End. At least one open day is required.
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q10 = specific_hours
- Required when displayed: Required
- Validation/restrictions: Specify at least one day when Alexander should answer calls.
- Raw storage path: `section1.answeringSchedule`
- Stored option IDs: n/a

### Q11

- Section: Your Company
- Exact question: Is there any recurring availability rule Alexander should know?
- Input type: Long/open text
- Required/Optional: Optional
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Optional
- Validation/restrictions: None
- Raw storage path: `section1.recurringAvailabilityNotes`
- Stored option IDs: n/a

## Section 2 — Your Services

### Q12

- Section: Your Services
- Exact question: Which plumbing services does your company provide?
- Input type: Matrix — single select per row
- Required/Optional: Required
- Answer choices: Rows, exact order:
  - General plumbing repair (`general-plumbing-repair`)
  - Toilet repair or replacement (`toilet-repair-replacement`)
  - Faucet or sink repair (`faucet-sink-repair`)
  - Garbage disposal (`garbage-disposal`)
  - Shower or tub repair (`shower-tub-repair`)
  - Water heater repair (`water-heater-repair`)
  - Water heater replacement (`water-heater-replacement`)
  - Tankless water heaters (`tankless-water-heaters`)
  - Shutoff or main valves (`shutoff-main-valves`)
  - Pressure regulators (`pressure-regulators`)
  - Water service lines (`water-service-lines`)
  - Frozen pipes (`frozen-pipes`)
  - Slab leaks (`slab-leaks`)
  - Repiping (`repiping`)
  - Fixture installation (`fixture-installation`)
  - Appliance plumbing connections (`appliance-plumbing-connections`)
  - Gas-line plumbing (non-emergency) (`gas-line-plumbing-non-emergency`)
  - Excavation (`excavation`)
  - Trenchless sewer/service-line work (`trenchless-sewer-service-line-work`)
  - Water filtration / softening / reverse osmosis (`water-filtration-softening-ro`)
  - Remodel or project plumbing (`remodel-project-work`)
  - Specialty plumbing (`other-specialty-plumbing`)
Choices for each row, exact order:
  - We offer this (`offered`)
  - With conditions (`with_conditions`)
  - Ask our team first (`ask_team`)
  - We don’t offer this (`not_offered`)
- Allows Other/free text: Yes — “With conditions” on a row shows a required conditions text field for that service.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select one policy for every plumbing service.
- Raw storage path: `section2.plumbingServices[serviceId].{policy,condition}`
- Stored option IDs: `offered`, `with_conditions`, `ask_team`, `not_offered`

### Q13

- Section: Your Services
- Exact question: Which diagnostic and drain services does your company provide?
- Input type: Matrix — single select per row
- Required/Optional: Required
- Answer choices: Rows, exact order:
  - General diagnostic/service visit (`general-diagnostic-service-visits`)
  - Plumbing inspection (`plumbing-inspections`)
  - Leak detection (`leak-detection`)
  - Drain cleaning (`drain-cleaning`)
  - Sewer/drain camera inspection (`sewer-drain-camera-inspections`)
  - Hydro-jetting (`hydro-jetting-advanced-drain-cleaning`)
Choices for each row, exact order:
  - We offer this (`offered`)
  - With conditions (`with_conditions`)
  - Ask our team first (`ask_team`)
  - We don’t offer this (`not_offered`)
- Allows Other/free text: Yes — “With conditions” on a row shows a required conditions text field for that service.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select one policy for every diagnostic and drain service.
- Raw storage path: `section2.diagnosticServices[serviceId].{policy,condition}`
- Stored option IDs: `offered`, `with_conditions`, `ask_team`, `not_offered`

### Q14

- Section: Your Services
- Exact question: Who does your company serve?
- Input type: Matrix — single select per row
- Required/Optional: Required
- Answer choices: Rows, exact order:
  - Homeowners (`homeowners`)
  - Tenants (`tenants`)
  - Landlords / property managers (`landlords-property-managers`)
  - Single-family homes (`single-family-homes`)
  - Condos / HOAs (`condos-hoas`)
  - Multifamily properties (`multifamily-properties`)
  - Commercial properties (`commercial-properties`)
  - Real-estate inspection / transaction work (`real-estate-inspection-transaction-work`)
  - Insurance-related work (`insurance-related-work`)
Choices for each row, exact order:
  - We offer this (`offered`)
  - With conditions (`with_conditions`)
  - Ask our team first (`ask_team`)
  - We don’t offer this (`not_offered`)
- Allows Other/free text: Yes — “With conditions” on a row shows a required conditions text field for that customer type.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select one policy for every customer type.
- Raw storage path: `section2.customerPropertyTypes[typeId].{policy,condition}`
- Stored option IDs: `offered`, `with_conditions`, `ask_team`, `not_offered`

### Q15

- Section: Your Services
- Exact question: Will you install or work with items supplied by the customer?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - We offer this (`offered`)
  - With conditions (`with_conditions`)
  - Ask our team first (`ask_team`)
  - We don’t offer this (`not_offered`)
- Allows Other/free text: Yes — selecting “Yes, with conditions” displays Q15A, a required open field.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select an option.
- Raw storage path: `section2.customerSuppliedMaterialsPolicy`
- Stored option IDs: `offered`, `with_conditions`, `ask_team`, `not_offered`

### Q15A

- Section: Your Services
- Exact question: What are the conditions?
- Input type: Long/open text
- Required/Optional: Required
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q15 = with_conditions
- Required when displayed: Required
- Validation/restrictions: Describe the conditions for this service.
- Raw storage path: `section2.customerSuppliedMaterialsCondition`
- Stored option IDs: n/a

### Q16

- Section: Your Services
- Exact question: Will you repair or finish work another plumber started?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - We offer this (`offered`)
  - With conditions (`with_conditions`)
  - Ask our team first (`ask_team`)
  - We don’t offer this (`not_offered`)
- Allows Other/free text: Yes — selecting “Yes, with conditions” displays Q16A, a required open field.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select an option.
- Raw storage path: `section2.correctiveWorkPolicy`
- Stored option IDs: `offered`, `with_conditions`, `ask_team`, `not_offered`

### Q16A

- Section: Your Services
- Exact question: What are the conditions?
- Input type: Long/open text
- Required/Optional: Required
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q16 = with_conditions
- Required when displayed: Required
- Validation/restrictions: Describe the conditions for this service.
- Raw storage path: `section2.correctiveWorkCondition`
- Stored option IDs: n/a

### Q17

- Section: Your Services
- Exact question: How would you like to define your normal service area?
- Input type: Single select + composite structured input
- Required/Optional: Required
- Answer choices: Exact order:
  - ZIP codes (`zip_codes`)
  - Cities / communities (`cities`)
  - Distance from our business location (`distance`)
Single select, then one geography branch. ZIP codes: repeatable ZIP list. Cities / communities: repeatable city list. Distance: Business address (open field) and Radius in miles (open field).
- Allows Other/free text: Yes — the selected geography mode shows ZIP codes, cities, or address and radius.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select how you define your service area. ZIP codes: at least one ZIP. Cities: at least one city. Distance: business address required and radius must be a positive number.
- Raw storage path: `section2.serviceAreaDefinitionMode + active geo branch fields`
- Stored option IDs: `zip_codes`, `cities`, `distance`

### Q18

- Section: Your Services
- Exact question: Are there any areas inside or near your service area that you do not serve?
- Input type: Composite structured input
- Required/Optional: Optional
- Answer choices: Open Field labeled “Areas you do not serve”.
- Allows Other/free text: No
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Optional
- Validation/restrictions: None
- Raw storage path: `section2 excluded-area fields`
- Stored option IDs: n/a

### Q19

- Section: Your Services
- Exact question: Are there areas you serve only under certain conditions?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - Yes (`yes`)
  - No (`no`)
- Allows Other/free text: Yes — selecting Yes displays Q19A, a required repeater of area and condition.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select yes or no.
- Raw storage path: `section2.hasConditionalTerritory`
- Stored option IDs: `yes`, `no`

### Q19A

- Section: Your Services
- Exact question: Tell us about those conditional service areas.
- Input type: Repeatable structured rows
- Required/Optional: Required
- Answer choices: Repeater. Each row: Area (open field, required) and Condition (open field, required). Add and remove rows.
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q19 = yes
- Required when displayed: Required
- Validation/restrictions: Add at least one area and its condition.
- Raw storage path: `section2.conditionalTerritories[]`
- Stored option IDs: n/a

### Q20

- Section: Your Services
- Exact question: Is your after-hours service area different?
- Input type: Single select + composite structured input
- Required/Optional: Required
- Answer choices: Exact order:
  - Same service area as normal (`same`)
  - A smaller service area (`smaller`)
  - We don’t provide after-hours field service (`none`)
Single select. “A smaller service area” reveals the same geography controls as Q17 (ZIP codes, cities, or distance).
- Allows Other/free text: Yes — “A smaller service area” shows the geography controls.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select an option. A smaller area uses the same ZIP, city, or distance rules as Q17.
- Raw storage path: `section2.afterHoursAreaMode + after-hours geo`
- Stored option IDs: `same`, `smaller`, `none`

## Section 3 — Emergencies

### Q21

- Section: Emergencies
- Exact question: How should Alexander treat each of these situations?
- Input type: Matrix — single select per row
- Required/Optional: Required
- Answer choices: Rows, exact order:
  - Uncontrolled water leaking inside the property (`uncontrolled-water-leak-inside-property`) — preselected `emergency`
  - Water leaking near electrical equipment (`water-leak-near-electrical-equipment`) — preselected `emergency`
  - Suspected gas leak or gas odor (`suspected-gas-leak-or-odor`) — preselected `emergency`
  - Sewage actively entering the property (`sewage-entering-property`) — preselected `emergency`
  - Multiple fixtures backing up at the same time (`multiple-fixtures-backing-up`) — preselected `urgent`
  - Toilet overflowing and the customer cannot stop it (`toilet-overflowing-uncontrolled`) — preselected `emergency`
  - The property's only usable toilet is not working (`only-usable-toilet-not-working`) — preselected `urgent`
  - Major water-heater leak or rupture (`major-water-heater-leak-or-rupture`) — preselected `emergency`
  - Potentially dangerous water-heater symptoms (`dangerous-water-heater-symptoms`) — preselected `emergency`
  - Sump-pump failure with active or imminent flooding (`sump-pump-failure-flooding`) — preselected `emergency`
  - Frozen pipe with a confirmed leak (`frozen-pipe-confirmed-leak`) — preselected `emergency`
  - Complete loss of water to the property (`complete-loss-of-water`) — preselected `urgent`
  - Major water-service-line leak (`major-water-service-line-leak`) — preselected `emergency`
  - Serious standing water from an unknown source (`serious-standing-water-unknown-source`) — preselected `emergency`
  - An unclear situation that may be dangerous (`unclear-situation-may-be-dangerous`) — preselected `human_review`
Choices for each row, exact order:
  - Emergency (`emergency`)
  - Urgent, but not an emergency (`urgent`)
  - Routine (`routine`)
  - Human review required (`human_review`)
- Allows Other/free text: No
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Classify every situation listed above.
- Raw storage path: `section3.emergencyClassifications[scenarioId]`
- Stored option IDs: `emergency`, `urgent`, `routine`, `human_review`

### Q22

- Section: Emergencies
- Exact question: Are there any emergencies where Alexander must get human approval before arranging emergency dispatch?
- Input type: Multi-select / checkboxes
- Required/Optional: Required
- Answer choices: Exact order:
  - Uncontrolled water leaking inside the property (`uncontrolled-water-leak-inside-property`)
  - Water leaking near electrical equipment (`water-leak-near-electrical-equipment`)
  - Suspected gas leak or gas odor (`suspected-gas-leak-or-odor`)
  - Sewage actively entering the property (`sewage-entering-property`)
  - Multiple fixtures backing up at the same time (`multiple-fixtures-backing-up`)
  - Toilet overflowing and the customer cannot stop it (`toilet-overflowing-uncontrolled`)
  - The property's only usable toilet is not working (`only-usable-toilet-not-working`)
  - Major water-heater leak or rupture (`major-water-heater-leak-or-rupture`)
  - Potentially dangerous water-heater symptoms (`dangerous-water-heater-symptoms`)
  - Sump-pump failure with active or imminent flooding (`sump-pump-failure-flooding`)
  - Frozen pipe with a confirmed leak (`frozen-pipe-confirmed-leak`)
  - Complete loss of water to the property (`complete-loss-of-water`)
  - Major water-service-line leak (`major-water-service-line-leak`)
  - Serious standing water from an unknown source (`serious-standing-water-unknown-source`)
  - An unclear situation that may be dangerous (`unclear-situation-may-be-dangerous`)
  - Other (`other`)
  - None (`none`)
Multi-select. “Other” reveals Q-level text “Other situation” (required). “None” cannot be combined with another selection.
- Allows Other/free text: Yes — selecting “Other” displays a required “Other situation” field.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select at least one option, or None. None cannot be combined with other selections. Other requires a description.
- Raw storage path: `section3.dispatchApproval (+ dispatchApprovalOtherDetail)`
- Stored option IDs: `uncontrolled-water-leak-inside-property`, `water-leak-near-electrical-equipment`, `suspected-gas-leak-or-odor`, `sewage-entering-property`, `multiple-fixtures-backing-up`, `toilet-overflowing-uncontrolled`, `only-usable-toilet-not-working`, `major-water-heater-leak-or-rupture`, `dangerous-water-heater-symptoms`, `sump-pump-failure-flooding`, `frozen-pipe-confirmed-leak`, `complete-loss-of-water`, `major-water-service-line-leak`, `serious-standing-water-unknown-source`, `unclear-situation-may-be-dangerous`, `other`, `none`

### Q23

- Section: Emergencies
- Exact question: What should Alexander do with calls that come in after hours?
- Input type: Matrix — single select per row
- Required/Optional: Required
- Answer choices: Rows, exact order:
  - Emergency (`emergency`) — preselected `contact_on_call`
  - Urgent, but not an emergency (`urgent_contained`) — preselected `schedule_service`
  - Routine / non-urgent (`routine`) — preselected `schedule_service`
Choices for each row, exact order:
  - Contact our on-call team (`contact_on_call`)
  - Schedule service (`schedule_service`)
  - Take a message for follow-up (`take_message`)
One dropdown per row. Preselected defaults: Emergency → Contact our on-call team; Urgent, but not an emergency → Schedule service; Routine / non-urgent → Schedule service.
- Allows Other/free text: No
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select an option for every row.
- Raw storage path: `section3.afterHoursDisposition.{emergency,urgent_contained,routine}`
- Stored option IDs: `contact_on_call`, `schedule_service`, `take_message`

### Q24

- Section: Emergencies
- Exact question: When is after-hours emergency field service available?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - 24 hours a day, 7 days a week (`24_7`)
  - Only during certain hours (`certain_hours`)
  - We don’t provide after-hours emergency field service (`none`)
- Allows Other/free text: Yes — “Only during certain hours” shows a required weekly emergency schedule.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select an option. Certain hours requires at least one day emergency service is available.
- Raw storage path: `section3.emergencyServiceMode`
- Stored option IDs: `24_7`, `certain_hours`, `none`

### Q25

- Section: Emergencies
- Exact question: Who should Alexander contact first when a call requires immediate human attention?
- Input type: Contact selector / contact editor
- Required/Optional: Required
- Answer choices: Contact picker plus contact card. Card fields: Person or role (required), Phone (required), weekly availability (at least one open day), call categories (at least one), and Other category text when Other is selected.
- Allows Other/free text: No
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Enter a person or role, a phone number, at least one available day, and at least one call category.
- Raw storage path: `section3.primaryContactId → contacts[]`
- Stored option IDs: n/a

### Q26

- Section: Emergencies
- Exact question: Is there a backup person Alexander should contact?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - Yes (`yes`)
  - No (`no`)
- Allows Other/free text: Yes — selecting Yes displays Q26A, a required backup contact card.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select yes or no.
- Raw storage path: `section3.hasBackupContact`
- Stored option IDs: `yes`, `no`

### Q26A

- Section: Emergencies
- Exact question: Person or role
- Input type: Contact selector / contact editor
- Required/Optional: Required
- Answer choices: Same contact card as Q25 for the backup person.
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q26 = yes
- Required when displayed: Required
- Validation/restrictions: Same contact requirements as Q25.
- Raw storage path: `section3.backupContactId → contacts[]`
- Stored option IDs: n/a

### Q27

- Section: Emergencies
- Exact question: What should Alexander do if nobody on your team answers?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - Take the customer's information and arrange a callback (`callback`)
  - Schedule the next available appointment, if appropriate (`schedule_next_available`)
  - Send the appropriate team notification and use the approved fallback (`team_notification_fallback`)
  - Follow another rule (`custom`)
- Allows Other/free text: Yes — selecting “Follow another rule” displays Q27A, a required open field.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select an option.
- Raw storage path: `section3.nobodyRespondsFallback`
- Stored option IDs: `callback`, `schedule_next_available`, `team_notification_fallback`, `custom`

### Q27A

- Section: Emergencies
- Exact question: What rule should Alexander follow?
- Input type: Long/open text
- Required/Optional: Required
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q27 = custom
- Required when displayed: Required
- Validation/restrictions: Describe the rule Alexander should follow.
- Raw storage path: `section3.nobodyRespondsCustom`
- Stored option IDs: n/a

### Q28

- Section: Emergencies
- Exact question: How should Alexander retry an unanswered contact?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - Try once, then move to the next person (`try_once_then_next`)
  - Try the same person one more time, then move to the next person (`try_same_again_then_next`)
  - Move immediately to the next person (`move_immediately_to_next`)
  - Use another rule (`custom`)
- Allows Other/free text: Yes — selecting “Use another rule” displays Q28A, a required open field.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select an option.
- Raw storage path: `section3.retryPolicy`
- Stored option IDs: `try_once_then_next`, `try_same_again_then_next`, `move_immediately_to_next`, `custom`

### Q28A

- Section: Emergencies
- Exact question: What retry rule should Alexander follow?
- Input type: Long/open text
- Required/Optional: Required
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q28 = custom
- Required when displayed: Required
- Validation/restrictions: Describe the retry rule.
- Raw storage path: `section3.retryCustom`
- Stored option IDs: n/a

### Q29

- Section: Emergencies
- Exact question: What should Alexander do if an emergency comes in and your schedule is already full?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - Use capacity we reserve for emergencies (`reserved_capacity`)
  - Allow an emergency override under certain conditions (`emergency_override`)
  - Ask an authorized person to approve an exception (`authorized_approval`)
  - Take the customer’s information and arrange a callback (`arrange_callback`)
- Allows Other/free text: Yes — reserved capacity, emergency override, and authorized approval each display Q29A’s matching required field.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select an option.
- Raw storage path: `section3.capacityMode`
- Stored option IDs: `reserved_capacity`, `emergency_override`, `authorized_approval`, `arrange_callback`

### Q29A

- Section: Emergencies
- Exact question: How much capacity do you reserve for emergencies?
- Input type: Composite structured input
- Required/Optional: Required
- Answer choices: One visible label matches the Q29 choice. Reserved capacity: “How much capacity do you reserve for emergencies?” (required). Emergency override: “When is an emergency override allowed?” (required). Authorized approval: “Who can approve an emergency scheduling exception?” (required contact).
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q29 selects a branch that reveals notes/approver fields
- Required when displayed: Required
- Validation/restrictions: The revealed branch is required: reserved-capacity text, override conditions, or a valid approver contact.
- Raw storage path: `section3.reservedCapacityNotes | emergencyOverrideNotes | capacityApproverContactId`
- Stored option IDs: n/a

## Section 4 — Scheduling

### Q30

- Section: Scheduling
- Exact question: What should Alexander do if a caller asks to speak with a person?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - Try to connect them to someone right away (`connect_right_away`)
  - Ask briefly what they need, then connect them to the right person (`ask_briefly_then_connect`)
  - Take their information and arrange a callback (`callback`)
  - Follow another rule (`custom`)
- Allows Other/free text: Yes — selecting “Follow another rule” displays Q30A, a required open field.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select an option.
- Raw storage path: `section4.humanRequestPolicy (+ humanRequestCustomRule)`
- Stored option IDs: `connect_right_away`, `ask_briefly_then_connect`, `callback`, `custom`

### Q30A

- Section: Scheduling
- Exact question: What rule should Alexander follow?
- Input type: Long/open text
- Required/Optional: Required
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q30 = custom
- Required when displayed: Required
- Validation/restrictions: Required non-empty text.
- Raw storage path: `section4.humanRequestCustomRule`
- Stored option IDs: n/a

### Q31

- Section: Scheduling
- Exact question: What should Alexander do if a caller doesn’t want to speak with AI?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - Try to connect them to a person (`connect_to_person`)
  - Take their information and arrange a callback (`callback`)
  - Follow another rule (`custom`)
- Allows Other/free text: Yes — selecting “Follow another rule” displays Q31A, a required open field.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select an option.
- Raw storage path: `section4.aiRefusalPolicy (+ aiRefusalCustomRule)`
- Stored option IDs: `connect_to_person`, `callback`, `custom`

### Q31A

- Section: Scheduling
- Exact question: What rule should Alexander follow?
- Input type: Long/open text
- Required/Optional: Required
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q31 = custom
- Required when displayed: Required
- Validation/restrictions: Required non-empty text.
- Raw storage path: `section4.aiRefusalCustomRule`
- Stored option IDs: n/a

### Q32

- Section: Scheduling
- Exact question: Who can approve these types of exceptions?
- Input type: Matrix — single select per row
- Required/Optional: Required
- Answer choices: Rows, exact order:
  - Scheduling exception (`scheduling`)
  - Service-area exception (`service_area`)
  - Fee or price exception (`fee_or_price`)
  - Discount or promotion exception (`discount_or_promotion`)
  - Refund, credit or goodwill exception (`refund_credit_goodwill`)
  - Warranty or callback exception (`callback_previous_work`)
  - Other exception (`other`)
Choices for each row, exact order:
  - Alexander (`alexander`)
  - Dispatcher (`dispatcher`)
  - Manager (`manager`)
  - Owner (`owner`)
  - Another person or role (`another_person`)
  - Never allowed (`never_allowed`)
Matrix. One authority choice per exception row. “Another person or role” asks for an approver contact.
- Allows Other/free text: Yes — “Another person or role” asks for an approver contact on that row.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select who may approve each exception type.
- Raw storage path: `section4.exceptionAuthority[exceptionTypeId]`
- Stored option IDs: `alexander`, `dispatcher`, `manager`, `owner`, `another_person`, `never_allowed`

### Q33

- Section: Scheduling
- Exact question: What should Alexander do if the person who must approve an exception isn’t available?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - Take the request and arrange a callback (`callback`)
  - Follow the normal rule without making an exception (`follow_normal_rule`)
  - Other (`other`)
- Allows Other/free text: Yes — selecting “Other” displays Q33A, a required open field.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select an option.
- Raw storage path: `section4.approverUnavailablePolicy`
- Stored option IDs: `callback`, `follow_normal_rule`, `other`

### Q33A

- Section: Scheduling
- Exact question: What should Alexander do?
- Input type: Long/open text
- Required/Optional: Required
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q33 = other
- Required when displayed: Required
- Validation/restrictions: Describe what Alexander should do.
- Raw storage path: `section4.approverUnavailableOther`
- Stored option IDs: n/a

### Q34

- Section: Scheduling
- Exact question: What can different types of callers authorize?
- Input type: Matrix — single select per row
- Required/Optional: Required
- Answer choices: Rows, exact order:
  - Homeowner (`homeowner`) — preselected `full_authorization`
  - Tenant (`tenant`) — preselected `schedule_only`
  - Landlord / property manager (`landlord_property_manager`) — preselected `full_authorization`
  - Spouse / family member (`spouse_family`) — preselected `full_authorization`
  - Remote family member (`remote_family`) — preselected `full_authorization`
  - Realtor (`realtor_buyer_seller`) — preselected `schedule_only`
  - Other third party (`other_third_party`) — preselected `human_approval_required`
Choices for each row, exact order:
  - Schedule only (`schedule_only`)
  - Schedule + diagnostic fee (`schedule_diagnostic`)
  - Full authorization (`full_authorization`)
  - Human approval required (`human_approval_required`)
Matrix. One authority choice per caller row. Preselected defaults: Homeowner, Landlord / property manager, Spouse / family member, and Remote family member → Full authorization; Tenant and Realtor → Schedule only; Other third party → Human approval required.
- Allows Other/free text: No
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select one authority level for every caller.
- Raw storage path: `section4.callerPermissions[callerTypeId]`
- Stored option IDs: `schedule_only`, `schedule_diagnostic`, `full_authorization`, `human_approval_required`

### Q35

- Section: Scheduling
- Exact question: Are there spending limits for any of these callers?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - Yes (`yes`)
  - No (`no`)
- Allows Other/free text: Yes — selecting Yes displays Q35A, a required spending-limit repeater.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select yes or no.
- Raw storage path: `section4.hasSpendingLimits`
- Stored option IDs: `yes`, `no`

### Q35A

- Section: Scheduling
- Exact question: Maximum amount
- Input type: Repeatable structured rows
- Required/Optional: Required
- Answer choices: Repeater. Each row: Caller type (required) and Maximum amount (required).
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q35 = yes
- Required when displayed: Required
- Validation/restrictions: Add at least one spending limit.
- Raw storage path: `section4.spendingLimits[]`
- Stored option IDs: n/a

### Q36

- Section: Scheduling
- Exact question: Do emergency situations change any of these authorization rules?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - Yes - use the same rules (`same_rules`)
  - No - emergencies have special rules (`special_rules`)
  - Human review is always required when the work is classified as an emergency (`human_review_always`)
- Allows Other/free text: Yes — selecting “No - emergencies have special rules” displays Q36A, a required open field.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select an option.
- Raw storage path: `section4.emergencyAuthorizationMode`
- Stored option IDs: `same_rules`, `special_rules`, `human_review_always`

### Q36A

- Section: Scheduling
- Exact question: How does emergency authorization differ?
- Input type: Long/open text
- Required/Optional: Required
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q36 = special_rules
- Required when displayed: Required
- Validation/restrictions: Describe how emergency authorization differs.
- Raw storage path: `section4.emergencyAuthorizationRules`
- Stored option IDs: n/a

### Q37

- Section: Scheduling
- Exact question: What is Alexander normally allowed to do when a customer wants an appointment?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - Book an available appointment (`book_appointment`)
  - Send the request to our team (`send_to_team`)
- Allows Other/free text: No
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select an option.
- Raw storage path: `section4.defaultBookingMode`
- Stored option IDs: `book_appointment`, `send_to_team`

### Q38

- Section: Scheduling
- Exact question: How far in advance may Alexander schedule appointments?
- Input type: Composite structured input
- Required/Optional: Required
- Answer choices: Checkbox “No maximum”, or open field “Maximum days ahead” (positive whole number). Those two cannot both be set.
- Allows Other/free text: No
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Enter a positive whole number of days, or select No maximum. Do not set both.
- Raw storage path: `section4 booking-horizon fields`
- Stored option IDs: n/a

### Q39

- Section: Scheduling
- Exact question: What appointment windows do you offer?
- Input type: Repeatable structured rows
- Required/Optional: Required
- Answer choices: Rows, exact order:
  - Morning (`morning`)
  - Late morning (`late_morning`)
  - Early afternoon (`early_afternoon`)
  - Afternoon (`afternoon`)
  - Late afternoon (`late_afternoon`)
Five named windows in order: Morning, Late morning, Early afternoon, Afternoon, Late afternoon. Each window: Enabled checkbox, Window label, Start, End. An enabled window requires Start earlier than End.
- Allows Other/free text: No
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Enable at least one appointment window. Each enabled window requires start earlier than end.
- Raw storage path: `section4.appointmentWindows[]`
- Stored option IDs: n/a

### Q40

- Section: Scheduling
- Exact question: When an appointment is successfully confirmed, what information may Alexander repeat to the customer?
- Input type: Multi-select / checkboxes
- Required/Optional: Required
- Answer choices: Exact order:
  - Appointment date (`appointment_date`)
  - Appointment time or arrival window (`appointment_time_or_window`)
  - Requested service (`requested_service`)
  - Customer name and service address (`customer_name_and_address`)
  - Callback phone number (`callback_phone`)
  - Email address provided (`email_address`)
- Allows Other/free text: No
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select at least one type of information Alexander may repeat.
- Raw storage path: `section4.confirmationInfo[]`
- Stored option IDs: `appointment_date`, `appointment_time_or_window`, `requested_service`, `customer_name_and_address`, `callback_phone`, `email_address`

### Q41

- Section: Scheduling
- Exact question: Do any types of jobs follow different booking rules?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - Yes (`yes`)
  - No (`no`)
- Allows Other/free text: Yes — selecting Yes displays Q41A, a required booking-rule repeater.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select yes or no.
- Raw storage path: `section4.hasServiceBookingRules`
- Stored option IDs: `yes`, `no`

### Q41A

- Section: Scheduling
- Exact question: Special booking rule
- Input type: Repeatable structured rows
- Required/Optional: Required
- Answer choices: Repeater. Each row: eligible Section 2 service (required) and Special booking rule (open field, required).
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q41 = yes
- Required when displayed: Required
- Validation/restrictions: Add at least one special booking rule.
- Raw storage path: `section4.serviceBookingRules[]`
- Stored option IDs: n/a

### Q42

- Section: Scheduling
- Exact question: When may Alexander offer same-day or holiday appointments?
- Input type: Matrix — single select per row
- Required/Optional: Required
- Answer choices: Rows, exact order:
  - Same-day service (`same_day`)
  - Holiday service (`holiday`)
Choices for each row, exact order:
  - Allowed (`allowed`)
  - Allowed with conditions (`with_conditions`)
  - Human approval required (`human_approval`)
  - Not offered (`not_offered`)
Matrix. Choices per row are listed below. “Allowed with conditions” reveals Conditions (open field) on that row.
- Allows Other/free text: Yes — “Allowed with conditions” shows a conditions text field on that row.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select a policy for same-day and holiday service.
- Raw storage path: `section4.capacityPolicies.{same_day,holiday}.{policy,condition}`
- Stored option IDs: `allowed`, `with_conditions`, `human_approval`, `not_offered`

### Q43

- Section: Scheduling
- Exact question: What may Alexander do when a customer wants to reschedule?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - Reschedule directly (`direct`)
  - Reschedule only under certain conditions (`conditional`)
  - Submit for human approval (`human_approval`)
  - Arrange a callback (`callback`)
- Allows Other/free text: Yes — selecting “Reschedule only under certain conditions” displays Q43A, a required open field.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select an option.
- Raw storage path: `section4.rescheduleAuthority`
- Stored option IDs: `direct`, `conditional`, `human_approval`, `callback`

### Q43A

- Section: Scheduling
- Exact question: When may Alexander reschedule?
- Input type: Long/open text
- Required/Optional: Required
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q43 = conditional
- Required when displayed: Required
- Validation/restrictions: Describe when Alexander may reschedule.
- Raw storage path: `section4.rescheduleConditions`
- Stored option IDs: n/a

### Q44

- Section: Scheduling
- Exact question: What may Alexander do when a customer wants to cancel?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - Cancel directly (`direct`)
  - Cancel only under certain conditions (`conditional`)
  - Submit for human approval (`human_approval`)
  - Arrange a callback (`callback`)
- Allows Other/free text: Yes — selecting “Cancel only under certain conditions” displays Q44A, a required open field.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select an option.
- Raw storage path: `section4.cancellationAuthority`
- Stored option IDs: `direct`, `conditional`, `human_approval`, `callback`

### Q44A

- Section: Scheduling
- Exact question: When may Alexander cancel?
- Input type: Long/open text
- Required/Optional: Required
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q44 = conditional
- Required when displayed: Required
- Validation/restrictions: Describe when Alexander may cancel.
- Raw storage path: `section4.cancellationConditions`
- Stored option IDs: n/a

### Q45

- Section: Scheduling
- Exact question: Do you charge a late-cancellation fee?
- Input type: Single select + composite structured input
- Required/Optional: Required
- Answer choices: Exact order:
  - Yes (`yes`)
  - Only under certain conditions (`conditional`)
  - No (`no`)
- Allows Other/free text: Yes — Yes or Only under certain conditions displays Q45A fee-detail fields.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select an option.
- Raw storage path: `section4.lateCancellationFeeMode (+ linked fee notice/when; NO amount in Scheduling)`
- Stored option IDs: `yes`, `conditional`, `no`

### Q45A

- Section: Scheduling
- Exact question: Notice required before cancellation
- Input type: Composite structured input
- Required/Optional: Required
- Answer choices: When Yes or Only under certain conditions: Notice required before cancellation (open field) and When does this fee apply? (open field). Amount is not collected in Scheduling.
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q45 = yes or conditional
- Required when displayed: Required
- Validation/restrictions: Notice and when-it-applies text are collected with the fee. Amount is not required here.
- Raw storage path: `linked FeeRecord fields + late-cancellation when/notice`
- Stored option IDs: n/a

### Q46

- Section: Scheduling
- Exact question: Do you charge a no-show fee?
- Input type: Single select + composite structured input
- Required/Optional: Required
- Answer choices: Exact order:
  - Yes (`yes`)
  - Only under certain conditions (`conditional`)
  - No (`no`)
- Allows Other/free text: Yes — Yes or Only under certain conditions displays Q46A fee-detail fields.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select an option.
- Raw storage path: `section4.noShowFeeMode (+ linked fee when; NO amount in Scheduling)`
- Stored option IDs: `yes`, `conditional`, `no`

### Q46A

- Section: Scheduling
- Exact question: When does this fee apply?
- Input type: Composite structured input
- Required/Optional: Required
- Answer choices: When Yes or Only under certain conditions: When does this fee apply? (open field). Amount is not collected in Scheduling.
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q46 = yes or conditional
- Required when displayed: Required
- Validation/restrictions: When-it-applies text is collected with the fee. Amount is not required here.
- Raw storage path: `linked FeeRecord + no-show when`
- Stored option IDs: n/a

### Q47

- Section: Scheduling
- Exact question: Are there exceptions to your cancellation or no-show rules?
- Input type: Long/open text
- Required/Optional: Optional
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Optional
- Validation/restrictions: None
- Raw storage path: `section4.cancellationNoShowExceptions`
- Stored option IDs: n/a

### Q48

- Section: Scheduling
- Exact question: What should Alexander do if the customer needs service but there are no appropriate appointments available?
- Input type: Ordered multi-select
- Required/Optional: Required
- Answer choices: Exact order:
  - Offer the next available appointment (`offer_next_available`)
  - Look for another approved appointment window (`look_for_approved_window`)
  - Add the customer to a callback/waitlist (`add_to_callback_waitlist`)
  - Ask the team for help (`ask_team_for_help`)
- Allows Other/free text: No
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Set the priority order for all four fallback options.
- Raw storage path: `section4.noAvailabilityFallbackOrder[]`
- Stored option IDs: `offer_next_available`, `look_for_approved_window`, `add_to_callback_waitlist`, `ask_team_for_help`

### Q49

- Section: Scheduling
- Exact question: May Alexander arrange a callback when no appointment is available?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - Yes (`yes`)
  - No (`no`)
- Allows Other/free text: Yes — selecting Yes displays Q49A and Q49B, both required.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select yes or no.
- Raw storage path: `section4.mayArrangeCallback`
- Stored option IDs: `yes`, `no`

### Q49A

- Section: Scheduling
- Exact question: What phone number should Alexander use for the callback?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - The number the customer is calling from (`calling_from`)
  - Ask the customer for their preferred callback number (`ask_preferred`)
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q49 = yes
- Required when displayed: Required
- Validation/restrictions: Select which callback number Alexander should use.
- Raw storage path: `section4.callbackNumberPolicy`
- Stored option IDs: `calling_from`, `ask_preferred`

### Q49B

- Section: Scheduling
- Exact question: Who should receive or handle scheduling callbacks?
- Input type: Contact selector / contact editor
- Required/Optional: Required
- Answer choices: Contact picker plus the same contact card as Q25.
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q49 = yes
- Required when displayed: Required
- Validation/restrictions: Select who should handle scheduling callbacks.
- Raw storage path: `section4.callbackOwnerContactId → contacts[]`
- Stored option IDs: n/a

### Q50

- Section: Scheduling
- Exact question: Are there any jobs that require a particular technician?
- Input type: Single select + composite structured input
- Required/Optional: Required
- Answer choices: Exact order:
  - Yes (`yes`)
  - No (`no`)
- Allows Other/free text: Yes — selecting Yes displays Q50A, a required assignment repeater. Other job description is an open field on a row.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select yes or no.
- Raw storage path: `section4 technician-requirement fields`
- Stored option IDs: `yes`, `no`

### Q50A

- Section: Scheduling
- Exact question: Job or service
- Input type: Composite structured input
- Required/Optional: Required
- Answer choices: Repeater headed “Assignment” plus a number. Each row: Job or service (required; includes “Other job” and “Other job description”), Required technician with “Select from contacts” or “Enter technician name”, and Technician name when entering a name.
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q50 = yes (reveals detail panel)
- Required when displayed: Required
- Validation/restrictions: Add at least one job that requires a particular technician.
- Raw storage path: `section4 technician requirement detail fields`
- Stored option IDs: n/a

### Q51

- Section: Scheduling
- Exact question: What should Alexander do if a customer asks for a specific technician?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - Book that technician if confirmed available (`book_if_confirmed_available`)
  - Try to honor the request, but another technician may be assigned (`try_honor_may_reassign`)
  - Submit the request for team review (`submit_for_review`)
  - We don’t accept specific-technician requests (`do_not_accept`)
- Allows Other/free text: No
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select an option.
- Raw storage path: `section4.specificTechnicianPolicy`
- Stored option IDs: `book_if_confirmed_available`, `try_honor_may_reassign`, `submit_for_review`, `do_not_accept`

### Q52

- Section: Scheduling
- Exact question: What should Alexander do when a customer has several plumbing issues?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - Put all eligible issues into one appointment (`one_appointment`)
  - Certain issues must be scheduled separately (`separate_issues`)
  - Ask our team to decide (`ask_team`)
- Allows Other/free text: Yes — “Certain issues must be scheduled separately” displays Q52A. Other on that checklist shows a required open field.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select an option.
- Raw storage path: `section4.multiIssuePolicy`
- Stored option IDs: `one_appointment`, `separate_issues`, `ask_team`

### Q52A

- Section: Scheduling
- Exact question: Which issues need their own appointment?
- Input type: Composite structured input
- Required/Optional: Required
- Answer choices: Checklist of eligible Section 2 services plus Other. Other reveals “Describe other work that needs its own appointment” (required).
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q52 selects a branch that reveals extra fields
- Required when displayed: Required
- Validation/restrictions: Select at least one issue. Other requires a description.
- Raw storage path: `section4 multi-issue conditional fields`
- Stored option IDs: n/a

## Section 5 — Pricing and Payments

### Q53

- Section: Pricing and Payments
- Exact question: How does your company normally price plumbing work?
- Input type: Multi-select / checkboxes
- Required/Optional: Required
- Answer choices: Exact order:
  - Flat-rate / upfront pricing (`flat_rate`)
  - Hourly labor + materials (`hourly_labor_materials`)
  - Fixed prices for certain services (`fixed_prices_certain_services`)
  - Price determined after the technician evaluates the job (`after_diagnosis`)
  - Estimate or quote required for larger work (`estimate_required`)
  - Other (`other`)
- Allows Other/free text: Yes — selecting “Other” displays Q53A, a required short-text field.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select at least one pricing model.
- Raw storage path: `section5.pricingModels (+ pricingModelOther)`
- Stored option IDs: `flat_rate`, `hourly_labor_materials`, `fixed_prices_certain_services`, `after_diagnosis`, `estimate_required`, `other`

### Q53A

- Section: Pricing and Payments
- Exact question: Describe your other pricing method
- Input type: Short text
- Required/Optional: Required
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q53 includes other
- Required when displayed: Required
- Validation/restrictions: Describe your other pricing method.
- Raw storage path: `section5.pricingModelOther`
- Stored option IDs: n/a

### Q54

- Section: Pricing and Payments
- Exact question: May Alexander quote prices for your services?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - Yes - Alexander may quote the prices we provide below (`allowed`)
  - No - Alexander should not quote service prices (`not_allowed`)
- Allows Other/free text: Yes — Allowed displays Q54A. Each price row has an optional conditions open field.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select whether Alexander may quote service prices.
- Raw storage path: `section5.mayQuoteServicePrices`
- Stored option IDs: `allowed`, `not_allowed`

### Q54A

- Section: Pricing and Payments
- Exact question: What service prices may Alexander quote?
- Input type: Repeatable structured rows
- Required/Optional: Optional
- Answer choices: Repeater of offered Section 2 services. Each row: price mode, the amount fields for that mode only (Exact price, Starting at, Minimum and Maximum, or Hourly rate), and “Any conditions or details Alexander should know?” (open field).
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q54 = allowed
- Required when displayed: Optional
- Validation/restrictions: None beyond the fields shown for the selected price mode.
- Raw storage path: `section5.servicePrices[]`
- Stored option IDs: n/a

### Q55

- Section: Pricing and Payments
- Exact question: What should Alexander do when he doesn't have an approved price?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - Explain that pricing will be provided after the job is evaluated (`technician_after_evaluation`)
  - Have our team provide the price (`team_provides_pricing`)
- Allows Other/free text: No
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select an option.
- Raw storage path: `section5.unknownPriceBehavior`
- Stored option IDs: `technician_after_evaluation`, `team_provides_pricing`

### Q56

- Section: Pricing and Payments
- Exact question: Which additional fees does your company charge?
- Input type: Multi-select / checkboxes + composite per selected fee
- Required/Optional: Required
- Answer choices: Exact order:
  - Service / diagnostic fee (`service_diagnostic`)
  - After-hours / emergency fee (`after_hours`)
  - Travel fee (`travel`)
  - Cancellation fee (`cancellation`)
  - No-show fee (`no_show`)
  - Minimum service charge (`minimum_service`)
  - Estimate / consultation fee (`estimate_consultation`)
  - Other (`other`)
  - We don’t charge additional fees (`none`)
Multi-select. Each selected fee except “We don’t charge additional fees” shows Amount, When does it apply?, credit choice (Always; Sometimes; Never), and “When is it credited?” only when credit is Sometimes. “We don’t charge additional fees” cannot be combined with a fee and shows no fee details.
- Allows Other/free text: Yes — each selected fee shows amount, applicability, and credit fields. Sometimes shows “When is it credited?”. “We don’t charge additional fees” shows no detail fields.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select at least one option. “We don’t charge additional fees” cannot be combined with a fee. A selected fee requires its visible detail fields; “When is it credited?” is required only when credit is Sometimes.
- Raw storage path: `section5.additionalFeeSelection + additionalFeeDetails[category]`
- Stored option IDs: `service_diagnostic`, `after_hours`, `travel`, `cancellation`, `no_show`, `minimum_service`, `estimate_consultation`, `other`, `none`

### Q57

- Section: Pricing and Payments
- Exact question: Do any areas have different travel fees or minimum charges?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - No (`no`)
  - Yes (`yes`)
- Allows Other/free text: Yes — selecting Yes displays Q57A, a required area repeater.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select yes or no.
- Raw storage path: `section5.hasAreaTravelOrMinimum`
- Stored option IDs: `no`, `yes`

### Q57A

- Section: Pricing and Payments
- Exact question: Area
- Input type: Repeatable structured rows
- Required/Optional: Required
- Answer choices: Repeater. Each row: Area (required) and Fee or minimum (required).
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q57 = yes
- Required when displayed: Required
- Validation/restrictions: Add at least one area.
- Raw storage path: `section5.areaPricingRows[]`
- Stored option IDs: n/a

### Q58

- Section: Pricing and Payments
- Exact question: Does your company mark up parts or materials?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - Yes (`yes`)
  - Sometimes (`sometimes`)
  - No (`no`)
- Allows Other/free text: Yes — Yes or Sometimes displays Q58A, a required open field.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select an option.
- Raw storage path: `section5.materialMarkupPolicy`
- Stored option IDs: `yes`, `sometimes`, `no`

### Q58A

- Section: Pricing and Payments
- Exact question: What may Alexander tell customers about material pricing?
- Input type: Long/open text
- Required/Optional: Required
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q58 = yes or sometimes
- Required when displayed: Required
- Validation/restrictions: Required non-empty explanation when displayed.
- Raw storage path: `section5.materialMarkupCustomerExplanation`
- Stored option IDs: n/a

### Q59

- Section: Pricing and Payments
- Exact question: What payment methods do you accept?
- Input type: Multi-select / checkboxes
- Required/Optional: Required
- Answer choices: Exact order:
  - Credit card (`credit_card`)
  - Debit card (`debit_card`)
  - Cash (`cash`)
  - Check (`check`)
  - ACH or bank transfer (`ach`)
  - Financing (`financing`)
  - Invoice or account billing (`invoice`)
  - Other (`other`)
- Allows Other/free text: Yes — selecting “Other” displays Q59A, a required short-text field.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select at least one payment method.
- Raw storage path: `section5.paymentMethods (+ paymentMethodOther)`
- Stored option IDs: `credit_card`, `debit_card`, `cash`, `check`, `ach`, `financing`, `invoice`, `other`

### Q59A

- Section: Pricing and Payments
- Exact question: Other payment method
- Input type: Short text
- Required/Optional: Required
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q59 includes other
- Required when displayed: Required
- Validation/restrictions: Describe the other payment method.
- Raw storage path: `section5.paymentMethodOther`
- Stored option IDs: n/a

### Q60

- Section: Pricing and Payments
- Exact question: When is payment normally due?
- Input type: Multi-select / checkboxes
- Required/Optional: Required
- Answer choices: Exact order:
  - At time of service (`at_time_of_service`)
  - When work is completed (`when_work_completed`)
  - Deposit required before certain work (`deposit_required`)
  - Progress payments for larger projects (`progress_payments`)
  - Invoice after service for approved customers (`invoice_after_service`)
  - Other (`other`)
- Allows Other/free text: No
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select at least one payment-due policy.
- Raw storage path: `section5.paymentDuePolicies`
- Stored option IDs: `at_time_of_service`, `when_work_completed`, `deposit_required`, `progress_payments`, `invoice_after_service`, `other`

### Q61

- Section: Pricing and Payments
- Exact question: Can Alexander help customers make a payment?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - Yes - Alexander may send customers a secure payment link (`secure_link`)
  - Yes - Alexander may send a secure payment link and use an approved payment method already on file when authorized (`secure_link_and_authorized_method`)
  - No - Alexander should send payment requests to our team (`send_to_team`)
- Allows Other/free text: No
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select whether Alexander may help customers make a payment.
- Raw storage path: `section5.paymentAssistance`
- Stored option IDs: `secure_link`, `secure_link_and_authorized_method`, `send_to_team`

### Q62

- Section: Pricing and Payments
- Exact question: What may Alexander help collect payment for?
- Input type: Multi-select / checkboxes
- Required/Optional: Required
- Answer choices: Exact order:
  - Booking or service fees (`booking_or_service_fees`)
  - Deposits (`deposits`)
  - Completed service invoices (`completed_invoices`)
  - Outstanding balances (`outstanding_balances`)
  - Progress payments (`progress_payments`)
  - Other (`other`)
- Allows Other/free text: Yes — selecting Other displays Q62A, a required short-text field.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select at least one type of payment.
- Raw storage path: `section5.paymentCollectionScope (+ paymentCollectionOther)`
- Stored option IDs: `booking_or_service_fees`, `deposits`, `completed_invoices`, `outstanding_balances`, `progress_payments`, `other`

### Q62A

- Section: Pricing and Payments
- Exact question: Other payment
- Input type: Short text
- Required/Optional: Required
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q62 includes other
- Required when displayed: Required
- Validation/restrictions: Describe the other payment Alexander may collect.
- Raw storage path: `section5.paymentCollectionOther`
- Stored option IDs: n/a

### Q63

- Section: Pricing and Payments
- Exact question: What financial remedies may Alexander approve without human approval?
- Input type: Multi-select / checkboxes + per-selected rule text
- Required/Optional: Required
- Answer choices: Exact order:
  - Refund (`refund`)
  - Account credit (`account_credit`)
  - Fee waiver (`fee_waiver`)
  - Discount / goodwill adjustment (`discount_goodwill`)
  - Free or reduced-price return visit (`return_visit`)
  - None - human approval is required (`none`)
Multi-select. Each selected remedy except “None - human approval is required” shows that remedy’s rule text. None cannot be combined with a remedy.
- Allows Other/free text: Yes — each selected remedy shows its rule text. None shows no rule fields.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select at least one option. “None - human approval is required” cannot be combined with a remedy.
- Raw storage path: `section5.financialRemedies + remedyRules[remedyId]`
- Stored option IDs: `refund`, `account_credit`, `fee_waiver`, `discount_goodwill`, `return_visit`, `none`

## Section 6 — Customer Care

### Q64

- Section: Customer Care
- Exact question: What should Alexander do when a customer says there’s a problem with work your company already performed?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - Collect the details and schedule a return visit when allowed (`schedule_return_visit`)
  - Collect the details and submit the request for team review (`submit_team_review`)
  - Try to connect the customer with someone on our team (`connect_team`)
  - Arrange a callback (`arrange_callback`)
  - Follow another rule (`custom`)
- Allows Other/free text: Yes — Schedule a return visit shows an eligibility open field. Custom shows a custom-rule open field.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select an option. Schedule a return visit requires the eligibility rule. Custom requires the custom rule.
- Raw storage path: `section6.previousWorkInitialAction (+ related fields)`
- Stored option IDs: `schedule_return_visit`, `submit_team_review`, `connect_team`, `arrange_callback`, `custom`

### Q65

- Section: Customer Care
- Exact question: What should Alexander do if the customer has already called back about the same problem?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - Schedule another return visit when allowed (`schedule_another_return`)
  - Human review required after the first callback (`human_review_after_first`)
  - Try to connect the customer with a manager (`connect_manager`)
- Allows Other/free text: No
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select an option.
- Raw storage path: `section6.repeatCallbackAction (+ related fields)`
- Stored option IDs: `schedule_another_return`, `human_review_after_first`, `connect_manager`

### Q66

- Section: Customer Care
- Exact question: When should Alexander involve someone on your team because a customer is unhappy?
- Input type: Multi-select / checkboxes
- Required/Optional: Required
- Answer choices: Exact order:
  - Customer explicitly asks for a manager or person (`asks_manager`)
  - Customer says the previous repair didn’t solve the problem (`repair_not_solved`)
  - Customer disputes a charge (`disputes_charge`)
  - Customer requests a refund or credit (`refund_credit_request`)
  - Customer says your company caused property damage (`property_damage`)
  - Customer threatens legal action (`legal_threat`)
  - Customer threatens a chargeback (`chargeback_threat`)
  - Customer is repeatedly dissatisfied after attempts to resolve the issue (`repeated_dissatisfaction`)
  - Other (`other`)
- Allows Other/free text: Yes — selecting Other displays Q66A, a required short-text field.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select at least one escalation trigger.
- Raw storage path: `section6.escalationTriggers (+ other detail)`
- Stored option IDs: `asks_manager`, `repair_not_solved`, `disputes_charge`, `refund_credit_request`, `property_damage`, `legal_threat`, `chargeback_threat`, `repeated_dissatisfaction`, `other`

### Q66A

- Section: Customer Care
- Exact question: Other escalation trigger detail
- Input type: Short text
- Required/Optional: Required
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q66 includes other
- Required when displayed: Required
- Validation/restrictions: Describe the other escalation trigger.
- Raw storage path: `section6.escalationTriggerOther`
- Stored option IDs: n/a

### Q67

- Section: Customer Care
- Exact question: What should Alexander never promise an unhappy customer?
- Input type: Multi-select / checkboxes
- Required/Optional: Required
- Answer choices: Exact order:
  - Never admit company fault or liability (`no_admit_fault`)
  - Never promise a refund unless authorized (`no_refund_unauthorized`)
  - Never promise free work unless authorized (`no_free_work_unauthorized`)
  - Never promise compensation unless authorized (`no_compensation_unauthorized`)
  - Never promise a specific outcome from management (`no_specific_outcome`)
  - Other (`other`)
- Allows Other/free text: Yes — selecting Other displays Q67A, a required short-text field.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select at least one prohibited promise.
- Raw storage path: `section6.forbiddenUnhappyPromises (+ other)`
- Stored option IDs: `no_admit_fault`, `no_refund_unauthorized`, `no_free_work_unauthorized`, `no_compensation_unauthorized`, `no_specific_outcome`, `other`

### Q67A

- Section: Customer Care
- Exact question: Other forbidden promise
- Input type: Short text
- Required/Optional: Required
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q67 includes other
- Required when displayed: Required
- Validation/restrictions: Describe the other prohibited promise.
- Raw storage path: `section6.forbiddenUnhappyPromiseOther`
- Stored option IDs: n/a

### Q68

- Section: Customer Care
- Exact question: How should Alexander handle other types of calls?
- Input type: Matrix — single select per row
- Required/Optional: Required
- Answer choices: Rows, exact order:
  - Vendor or supplier (`vendor_supplier`) — preselected `take_message`
  - Sales solicitation (`sales_solicitation`) — preselected `politely_decline`
  - Job applicant (`job_applicant`) — preselected `take_message`
  - Current employee (`current_employee`) — preselected `send_specific`
  - Media inquiry (`media_inquiry`) — preselected `human_review`
  - Attorney / legal inquiry (`attorney_legal`) — preselected `human_review`
  - Government / regulator (`government_regulator`) — preselected `human_review`
  - Wrong number / spam (`wrong_number_spam`) — preselected `politely_decline`
Choices for each row, exact order:
  - Transfer the call (`send_specific`)
  - Take a message (`take_message`)
  - Politely decline (`politely_decline`)
  - Human review (`human_review`)
Matrix. One disposition per non-service call type. “Send to a specific person” reveals a contact selector on that row.
- Allows Other/free text: Yes — “Send to a specific person” shows a contact selector on that row.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select a disposition for every call type.
- Raw storage path: `section6.nonServiceCallPolicies[]`
- Stored option IDs: `send_specific`, `take_message`, `politely_decline`, `human_review`

### Q69

- Section: Customer Care
- Exact question: What customer information may Alexander use when helping an existing customer?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - Use available customer information and service history when it helps resolve the call (`use_available_history`)
  - Human review required before discussing previous service details (`human_review_before_details`)
  - Follow another rule (`custom`)
- Allows Other/free text: Yes — Custom shows a custom-rule open field.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select an option.
- Raw storage path: `section6.customerHistoryPolicy`
- Stored option IDs: `use_available_history`, `human_review_before_details`, `custom`

### Q70

- Section: Customer Care
- Exact question: Are there customer records or documents Alexander should never disclose?
- Input type: Multi-select / checkboxes
- Required/Optional: Required
- Answer choices: Exact order:
  - Payment information (`payment_information`)
  - Internal company notes (`internal_company_notes`)
  - Technician-only notes (`technician_notes`)
  - Information about another customer (`another_customer`)
  - Sensitive account information (`sensitive_account`)
  - Other (`other`)
- Allows Other/free text: Yes — selecting Other displays Q70A, a required short-text field.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select at least one restriction.
- Raw storage path: `section6.restrictedInformation (+ other)`
- Stored option IDs: `payment_information`, `internal_company_notes`, `technician_notes`, `another_customer`, `sensitive_account`, `other`

### Q70A

- Section: Customer Care
- Exact question: Other restricted information
- Input type: Short text
- Required/Optional: Required
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q70 includes other
- Required when displayed: Required
- Validation/restrictions: Describe the other restricted information.
- Raw storage path: `section6.restrictedInformationOther`
- Stored option IDs: n/a

### Q71

- Section: Customer Care
- Exact question: How proactive should Alexander be about recommending additional services?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - Mention relevant services when they clearly relate to what the customer needs (`mention_relevant`)
  - Mention only approved offers, memberships, or services (`mention_approved_only`)
  - Only discuss additional services when the customer asks (`only_when_asked`)
  - Don’t proactively recommend additional services (`do_not_proactive`)
  - Follow another rule (`custom`)
- Allows Other/free text: Yes — Custom shows a custom-rule open field.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select an option.
- Raw storage path: `section6.additionalServicePolicy`
- Stored option IDs: `mention_relevant`, `mention_approved_only`, `only_when_asked`, `do_not_proactive`, `custom`

### Q72

- Section: Customer Care
- Exact question: Are there any other rules Alexander should follow for unusual calls?
- Input type: Long/open text
- Required/Optional: Optional
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Optional
- Validation/restrictions: None
- Raw storage path: `section6.unusualCallNotes`
- Stored option IDs: n/a

## Section 7 — Voice and Conversation

### Q73

- Section: Voice and Conversation
- Exact question: Which language or languages should Alexander support with callers?
- Input type: Multi-select / checkboxes
- Required/Optional: Required
- Answer choices: Exact order:
  - English (`english`)
  - Spanish (`spanish`)
  - Other supported language (`other`)
  - English only (`english_only`)
- Allows Other/free text: Yes — Other, when English only is not selected, displays Q73A, a required short-text field.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select at least one language option. English only cannot be combined with other language selections.
- Raw storage path: `section7.englishOnly + section7.callerLanguages`
- Stored option IDs: `english`, `spanish`, `other`, `english_only`

### Q73A

- Section: Voice and Conversation
- Exact question: Other supported language
- Input type: Short text
- Required/Optional: Required
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q73 includes other and not english_only
- Required when displayed: Required
- Validation/restrictions: Enter the other supported language.
- Raw storage path: `section7.otherSupportedLanguage`
- Stored option IDs: n/a

### Q74

- Section: Voice and Conversation
- Exact question: Which voice should Alexander use?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - Voice A — Warm, calm, professional (`voice_a`)
  - Voice B — Friendly, energetic, approachable (`voice_b`)
  - Voice C — Direct, steady, highly efficient (`voice_c`)
  - Another approved voice (`another_approved`)
- Allows Other/free text: Yes — “Another approved voice” displays Q74A only when an additional approved voice exists in the catalog.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select an approved voice.
- Raw storage path: `section7.voiceSelection (+ anotherApprovedVoiceId)`
- Stored option IDs: `voice_a`, `voice_b`, `voice_c`, `another_approved`

### Q74A

- Section: Voice and Conversation
- Exact question: Another approved voice selection
- Input type: Single select
- Required/Optional: Required
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q74 = another_approved AND additional voices catalog non-empty
- Required when displayed: Required
- Validation/restrictions: Select an approved library voice. This control is hidden while the additional-voice catalog is empty.
- Raw storage path: `section7.anotherApprovedVoiceId`
- Stored option IDs: n/a

### Q75

- Section: Voice and Conversation
- Exact question: How should Alexander’s communication style feel?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - Warm and professional (`warm_professional`)
  - Friendly and relaxed (`friendly_relaxed`)
  - Direct and efficient (`direct_efficient`)
  - Calm and reassuring (`calm_reassuring`)
- Allows Other/free text: No
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select a communication style.
- Raw storage path: `section7.communicationStyle`
- Stored option IDs: `warm_professional`, `friendly_relaxed`, `direct_efficient`, `calm_reassuring`

### Q76

- Section: Voice and Conversation
- Exact question: What name should Alexander use when introducing himself?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - Alexander (`alexander`)
  - A company-specific name (`company_specific`)
  - Another approved name (`another_approved`)
- Allows Other/free text: Yes — company-specific or another approved name displays Q76A, a required short-text field.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select how Alexander should introduce himself.
- Raw storage path: `section7.spokenNameMode`
- Stored option IDs: `alexander`, `company_specific`, `another_approved`

### Q76A

- Section: Voice and Conversation
- Exact question: Spoken receptionist name
- Input type: Short text
- Required/Optional: Required
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q76 = company_specific or another_approved
- Required when displayed: Required
- Validation/restrictions: Enter the spoken receptionist name.
- Raw storage path: `section7.spokenDisplayName`
- Stored option IDs: n/a

### Q77

- Section: Voice and Conversation
- Exact question: How should Alexander identify himself as an AI?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - Say he is the company’s AI receptionist in the opening (`opening_ai_receptionist`)
  - Say he is an AI receptionist only if the caller asks (`only_if_asked`)
  - Use another approved disclosure (`custom`)
- Allows Other/free text: Yes — custom disclosure displays Q77A, an optional open field.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select how Alexander should identify himself as an AI.
- Raw storage path: `section7.aiDisclosureStyle`
- Stored option IDs: `opening_ai_receptionist`, `only_if_asked`, `custom`

### Q77A

- Section: Voice and Conversation
- Exact question: Approved disclosure wording
- Input type: Long/open text
- Required/Optional: Optional
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q77 = custom
- Required when displayed: Optional
- Validation/restrictions: None
- Raw storage path: `section7.aiDisclosureCustom`
- Stored option IDs: n/a

### Q78

- Section: Voice and Conversation
- Exact question: Are there any company, people, city, neighborhood, or brand names that Alexander must pronounce correctly?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - None (`none`)
  - Yes — enter the pronunciation details below (`yes`)
- Allows Other/free text: Yes — Yes displays Q78A, a required pronunciation repeater.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select whether pronunciation details are needed.
- Raw storage path: `section7.pronunciationMode`
- Stored option IDs: `none`, `yes`

### Q78A

- Section: Voice and Conversation
- Exact question: Term
- Input type: Repeatable structured rows
- Required/Optional: Required
- Answer choices: Repeater. Each row: Term (required), Pronunciation (required), and optional audio sample reference.
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q78 = yes
- Required when displayed: Required
- Validation/restrictions: Add at least one complete pronunciation entry.
- Raw storage path: `section7.pronunciationEntries[]`
- Stored option IDs: n/a

### Q79

- Section: Voice and Conversation
- Exact question: If a caller speaks a supported second language, what should Alexander normally do?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - Continue in the caller’s language (`continue_caller_language`)
  - Ask whether the caller prefers English or the supported second language (`ask_preference`)
  - Continue in English and offer a human who speaks the other language (`english_offer_human`)
  - Follow another rule (`custom`)
- Allows Other/free text: Yes — custom displays Q79A, an optional open field.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select second-language behavior.
- Raw storage path: `section7.languageSwitchingPolicy`
- Stored option IDs: `continue_caller_language`, `ask_preference`, `english_offer_human`, `custom`

### Q79A

- Section: Voice and Conversation
- Exact question: Language-switching rule
- Input type: Long/open text
- Required/Optional: Optional
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q79 = custom
- Required when displayed: Optional
- Validation/restrictions: None
- Raw storage path: `section7.languageSwitchingCustomRule`
- Stored option IDs: n/a

### Q80

- Section: Voice and Conversation
- Exact question: Do you have a preference for the perceived voice presentation?
- Input type: Single select
- Required/Optional: Optional
- Answer choices: Exact order:
  - No preference (`no_preference`)
  - Masculine-presenting (`masculine_presenting`)
  - Feminine-presenting (`feminine_presenting`)
  - Neutral or androgynous (`neutral_androgynous`)
- Allows Other/free text: No
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Optional
- Validation/restrictions: None
- Raw storage path: `section7.perceivedVoicePreference`
- Stored option IDs: `no_preference`, `masculine_presenting`, `feminine_presenting`, `neutral_androgynous`

### Q81

- Section: Voice and Conversation
- Exact question: Do you have a preferred accent or regional character?
- Input type: Single select
- Required/Optional: Optional
- Answer choices: Exact order:
  - Neutral American (`neutral_american`)
  - Regional American, if available (`regional_american`)
  - Spanish-influenced English, if available (`spanish_influenced_english`)
  - Other approved option (`other_approved`)
  - No preference (`no_preference`)
- Allows Other/free text: Yes — other approved accent displays Q81A, a required short-text field.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Optional
- Validation/restrictions: None, unless the accent is not available for the selected voice.
- Raw storage path: `section7.accentPreference`
- Stored option IDs: `neutral_american`, `regional_american`, `spanish_influenced_english`, `other_approved`, `no_preference`

### Q81A

- Section: Voice and Conversation
- Exact question: Other approved accent
- Input type: Short text
- Required/Optional: Required
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q81 = other_approved
- Required when displayed: Required
- Validation/restrictions: Enter the other approved accent option.
- Raw storage path: `section7.accentOtherApproved`
- Stored option IDs: n/a

### Q82

- Section: Voice and Conversation
- Exact question: How formal should Alexander sound?
- Input type: Single select
- Required/Optional: Optional
- Answer choices: Exact order:
  - Conversational and natural (`conversational`)
  - Balanced professional (`balanced_professional`)
  - More formal and traditional (`formal_traditional`)
- Allows Other/free text: No
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Optional
- Validation/restrictions: None
- Raw storage path: `section7.formalityPreference`
- Stored option IDs: `conversational`, `balanced_professional`, `formal_traditional`

### Q83

- Section: Voice and Conversation
- Exact question: Are there any phrases Alexander should use or avoid because of your company’s brand?
- Input type: Long/open text
- Required/Optional: Optional
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Optional
- Validation/restrictions: None
- Raw storage path: `section7.brandPhrasesAndAvoidances`
- Stored option IDs: n/a

### Q84

- Section: Voice and Conversation
- Exact question: Is there anything else about Alexander’s voice or identity that we should review with you?
- Input type: Long/open text
- Required/Optional: Optional
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Optional
- Validation/restrictions: None
- Raw storage path: `section7.additionalReviewNotes`
- Stored option IDs: n/a

## Section 8 — Integration Systems and Final Setup

### Q85

- Section: Integration Systems and Final Setup
- Exact question: What software does your company use to manage customers and jobs?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - ServiceTitan (`servicetitan`)
  - Housecall Pro (`housecall_pro`)
  - Jobber (`jobber`)
  - GoHighLevel (`gohighlevel`)
  - HubSpot (`hubspot`)
  - Salesforce (`salesforce`)
  - Another system (`custom`)
  - We don’t use one (`none`)
- Allows Other/free text: Yes — “Another system” displays Q85A, a required short-text field.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select a CRM or field-service system.
- Raw storage path: `section8.crmFsmProvider`
- Stored option IDs: `servicetitan`, `housecall_pro`, `jobber`, `gohighlevel`, `hubspot`, `salesforce`, `custom`, `none`

### Q85A

- Section: Integration Systems and Final Setup
- Exact question: What system do you use?
- Input type: Short text
- Required/Optional: Required
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q85 = custom (Another system)
- Required when displayed: Required
- Validation/restrictions: Enter the system name.
- Raw storage path: `section8.crmFsmCustomName`
- Stored option IDs: n/a

### Q86

- Section: Integration Systems and Final Setup
- Exact question: Where does your company manage appointment availability?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - Same system selected above (`same_as_crm`)
  - Google Calendar (`google_calendar`)
  - Microsoft Outlook / Microsoft 365 (`microsoft_outlook`)
  - Cal.com (`cal_com`)
  - Another scheduling system (`custom`)
  - We don’t use scheduling software (`none`)
- Allows Other/free text: Yes — “Another scheduling system” displays Q86A, a required short-text field.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select where appointments are managed.
- Raw storage path: `section8.schedulingProvider`
- Stored option IDs: `same_as_crm`, `google_calendar`, `microsoft_outlook`, `cal_com`, `custom`, `none`

### Q86A

- Section: Integration Systems and Final Setup
- Exact question: What scheduling system do you use?
- Input type: Short text
- Required/Optional: Required
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q86 = custom
- Required when displayed: Required
- Validation/restrictions: Enter the scheduling system name.
- Raw storage path: `section8.schedulingCustomName`
- Stored option IDs: n/a

### Q87

- Section: Integration Systems and Final Setup
- Exact question: What phone system do you currently use?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - RingCentral (`ringcentral`)
  - Dialpad (`dialpad`)
  - Zoom Phone (`zoom_phone`)
  - GoHighLevel (`gohighlevel`)
  - Traditional landline / carrier (`traditional_landline`)
  - Mobile phones (`mobile_phones`)
  - Another phone system (`custom`)
  - Not sure (`not_sure`)
- Allows Other/free text: Yes — “Another phone system” displays Q87A, a required short-text field.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select your business phone system.
- Raw storage path: `section8.phoneProvider`
- Stored option IDs: `ringcentral`, `dialpad`, `zoom_phone`, `gohighlevel`, `traditional_landline`, `mobile_phones`, `custom`, `not_sure`

### Q87A

- Section: Integration Systems and Final Setup
- Exact question: What phone system do you use?
- Input type: Short text
- Required/Optional: Required
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q87 = custom
- Required when displayed: Required
- Validation/restrictions: Enter the phone system name.
- Raw storage path: `section8.phoneCustomName`
- Stored option IDs: n/a

### Q88

- Section: Integration Systems and Final Setup
- Exact question: Do you use any other software Alexander may need to work with?
- Input type: Multi-select / checkboxes + per-category software name
- Required/Optional: Required
- Answer choices: Exact order:
  - Separate customer database (`separate_customer_database`)
  - Separate price book / estimating software (`price_book_estimating`)
  - Membership / service-plan software (`membership`)
  - Financing system (`financing`)
  - Payment system (`payment`)
  - SMS / texting platform (`sms_texting`)
  - Email / shared inbox (`email_inbox`)
  - Other (`other`)
  - None (`none`)
Multi-select of software categories. Each selected category except None shows system name and desired access. Other also shows other-category label and other details. None cannot be combined with another category.
- Allows Other/free text: Yes — Other shows other-category label and details. None shows no software cards.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select at least one option, or None. None cannot be combined with other categories.
- Raw storage path: `section8.additionalSoftwareCategories + additionalSoftwareCards[]`
- Stored option IDs: `separate_customer_database`, `price_book_estimating`, `membership`, `financing`, `payment`, `sms_texting`, `email_inbox`, `other`, `none`

### Q89

- Section: Integration Systems and Final Setup
- Exact question: Who can authorize Alexander to connect to these systems?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - I can (`self_authorized`)
  - Someone else on our team (`someone_else`)
- Allows Other/free text: Yes — someone else displays Q89A (name and email required, phone optional).
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select who can authorize Alexander to connect to these systems.
- Raw storage path: `section8.connectionOwnerMode`
- Stored option IDs: `self_authorized`, `someone_else`

### Q89A

- Section: Integration Systems and Final Setup
- Exact question: Who should we work with?
- Input type: Composite structured input
- Required/Optional: Required
- Answer choices: Name (required), Email (required), Phone (optional).
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q89 = someone_else
- Required when displayed: Required
- Validation/restrictions: Name and a valid email are required. Phone is optional.
- Raw storage path: `section8.connectionOwnerName / connectionOwnerEmail / connectionOwnerPhone`
- Stored option IDs: n/a

### Q90

- Section: Integration Systems and Final Setup
- Exact question: Software connection notice
- Input type: Single select (required acknowledgment checkbox: I understand)
- Required/Optional: Required
- Answer choices: Notice text, then one required checkbox labeled “I understand”. Notice: You’ll connect supported software securely after submitting this questionnaire. For supported integrations, you’ll sign into your own software account and authorize Alexander to access the information and actions required for your setup. Do not enter passwords or private API credentials in this questionnaire. Our team will handle the configuration and testing for you.
- Allows Other/free text: No
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Acknowledge the software connection notice to continue.
- Raw storage path: `section8.connectionNoticeAcknowledged`
- Stored option IDs: n/a

### Q91

- Section: Integration Systems and Final Setup
- Exact question: If Alexander can’t access a system or complete an action, what should he normally do?
- Input type: Single select
- Required/Optional: Required
- Answer choices: Exact order:
  - Collect the customer’s information and send the request to our team (`collect_and_send`)
  - Try to connect the customer with someone on our team (`connect_team`)
  - Follow another rule (`custom`)
- Allows Other/free text: Yes — “Follow another rule” displays Q91A, a required open field.
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: Select what Alexander should do when he can’t access a system.
- Raw storage path: `section8.failureFallback`
- Stored option IDs: `collect_and_send`, `connect_team`, `custom`

### Q91A

- Section: Integration Systems and Final Setup
- Exact question: What should Alexander do?
- Input type: Long/open text
- Required/Optional: Required
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: Yes
- Display condition: Q91 = custom (Follow another rule)
- Required when displayed: Required
- Validation/restrictions: Tell us how you’d like Alexander to handle it.
- Raw storage path: `section8.failureFallbackCustom`
- Stored option IDs: n/a

### Q92

- Section: Integration Systems and Final Setup
- Exact question: Is there anything important about your company that we haven’t asked?
- Input type: Long/open text
- Required/Optional: Optional
- Answer choices: Open Field
- Allows Other/free text: No
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Optional
- Validation/restrictions: None
- Raw storage path: `section8.finalOperatingNotes`
- Stored option IDs: n/a

## Final Review and Submission

This heading is not Section 9. The questionnaire has eight sections.

### Q93

- Section: Final Review and Submission
- Exact question: Final confirmations
- Input type: Multi-select / checkboxes (grouped confirmation control)
- Required/Optional: Required
- Answer choices: Exact order:
  - I confirm that these answers accurately describe how I want Alexander to represent and operate for my company. (`answersAccurate`)
  - I understand that some capabilities depend on the software and integrations my company uses. (`capabilitiesDependOnIntegrations`)
  - I understand that Alexander will only perform actions that are supported, authorized, and successfully confirmed. (`actionsRequireSupportAuthorizationConfirmation`)
Three grouped checkboxes. All three must be checked. Submit stays blocked until every required questionnaire condition is satisfied and all three are checked.
- Allows Other/free text: No
- Conditional: No
- Display condition: Always, on its section form.
- Required when displayed: Required
- Validation/restrictions: All three confirmation statements must be checked. Submit is blocked until required questionnaire conditions are satisfied.
- Raw storage path: `draft.submission.confirmations.{answersAccurate,capabilitiesDependOnIntegrations,actionsRequireSupportAuthorizationConfirmation}`
- Stored option IDs: `answersAccurate`, `capabilitiesDependOnIntegrations`, `actionsRequireSupportAuthorizationConfirmation`

## Final QA Check

- Every section included: PASS
- Every registered Q-ID included exactly once: PASS
- Question order correct: PASS
- Exact question wording matches UI: PASS
- Every option included and ordered correctly: PASS
- Required/optional captured: PASS
- Conditional triggers captured: PASS
- Conditional requiredness captured: PASS
- Input/control types correct: PASS
- Validation/restrictions captured: PASS
- Nothing invented: PASS

## Items Requiring Confirmation

None.
