# Alexander Final Questionnaire Specification v1.0

# Questionnaire Overview

Questionnaire name:  
Alexander Customer Onboarding Questionnaire

Specification version:  
1.0

- **Questionnaire schema version:** 10
- **Questionnaire specification version:** 1.0
- **Q-ID registry freeze commit:** `f6feb475ddb8d3f8d2ff03d3b8af280eee6713f1` (`f6feb47`). This identifies the permanent Q-ID registry. It is not a claim that every later questionnaire behavior change is absent.
- **Questionnaire source commit:** `2f5d030145f110c95a0beca98cc1ecd6da5a21f3`
- **Specification generated from commit/date:** `2f5d030145f110c95a0beca98cc1ecd6da5a21f3` / 2026-10-05

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

Final root Q-ID:  
**Q93**

Final Review and Submission appears after Section 8. It is not a ninth questionnaire section. Permanent Q-ID: **Q93**.

Numbered Q-IDs represent main/root questions. Letter suffixes represent conditional child questions. Matrix rows, repeater rows, contacts, services, fees, and similar structures do not become separate Q-IDs unless explicitly registered as questions.

Question counts follow the production Q-ID registry. Some composite questions contain conditional inline fields that do not have independent Q-IDs; those fields are documented inside their parent Q-ID. If every separately rendered prompt must receive its own Q-ID, that is a product decision and is listed under Items Requiring Confirmation. Production IDs are not renumbered here.

---

## Section 1 — Your Company

### Q1

- **Question ID:** Q1
- **Section:** Your Company
- **Exact question:** What name do your customers know your company by?
- **Input type:** Short text
- **Required/Optional:** Required
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Company name is required.
- **Preselected/default:** None

### Q2

- **Question ID:** Q2
- **Section:** Your Company
- **Exact question:** What is your legal business name?
- **Input type:** Short text
- **Required/Optional:** Optional
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Optional
- **Validation/restrictions:** None
- **Preselected/default:** None

### Q3

- **Question ID:** Q3
- **Section:** Your Company
- **Exact question:** What is your main business phone number?
- **Input type:** Phone number
- **Required/Optional:** Required
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Required non-empty phone number.
- **Preselected/default:** None

### Q4

- **Question ID:** Q4
- **Section:** Your Company
- **Exact question:** What is your website?
- **Input type:** URL
- **Required/Optional:** Optional
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Optional
- **Validation/restrictions:** Optional. If a website is entered, it must be a valid URL.
- **Preselected/default:** None

### Q5

- **Question ID:** Q5
- **Section:** Your Company
- **Exact question:** Which of these may Alexander tell customers about your company?
- **Input type:** Multi-select / checkboxes
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Licensed (`licensed`)
  - Insured (`insured`)
  - Bonded (`bonded`)
  - Locally owned (`locally_owned`)
  - Family owned (`family_owned`)
  - Other (`other`)
  - None of these (`none`)
- **Allows Other/free text:** Yes — selecting “Other” displays Q5A, a required short-text field.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select at least one option.
- **Preselected/default:** None

### Q5A

- **Question ID:** Q5A
- **Section:** Your Company
- **Exact question:** What other credential or trust claim may Alexander tell customers?
- **Input type:** Short text
- **Required/Optional:** Required
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q5 includes Other (`other`)
- **Required when displayed:** Required
- **Validation/restrictions:** Please describe what else Alexander may tell customers.
- **Preselected/default:** None

### Q6

- **Question ID:** Q6
- **Section:** Your Company
- **Exact question:** Are there any license numbers or credential details Alexander may give customers?
- **Input type:** Long/open text
- **Required/Optional:** Optional
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Optional
- **Validation/restrictions:** None
- **Preselected/default:** None

### Q7

- **Question ID:** Q7
- **Section:** Your Company
- **Exact question:** Is there anything Alexander should never claim about your company?
- **Input type:** Long/open text
- **Required/Optional:** Optional
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Optional
- **Validation/restrictions:** None
- **Preselected/default:** None

### Q8

- **Question ID:** Q8
- **Section:** Your Company
- **Exact question:** What are your normal office hours?
- **Input type:** Weekly schedule
- **Required/Optional:** Required
- **Answer choices:** Weekly schedule. Days in order: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday. Each day has Closed (checkbox) and, when open, Start and End times. Default: Monday–Friday open 08:00–17:00; Saturday and Sunday closed.
- **Allows Other/free text:** No
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Each open office day requires opening and closing times.
- **Preselected/default:** Monday–Friday open 08:00–17:00; Saturday and Sunday closed.

### Q9

- **Question ID:** Q9
- **Section:** Your Company
- **Exact question:** When are service appointments normally available?
- **Input type:** Weekly schedule
- **Required/Optional:** Required
- **Answer choices:** Weekly schedule. Days in order: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday. Each day is Regular hours, 24 hours, or No service. Regular hours require Start and End. Default: Monday–Saturday regular 08:00–18:00; Sunday no service.
- **Allows Other/free text:** No
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Each regular-hours day requires service start and end times.
- **Preselected/default:** Monday–Saturday regular hours 08:00–18:00; Sunday no service.

### Q10

- **Question ID:** Q10
- **Section:** Your Company
- **Exact question:** When should Alexander answer your calls?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - 24 hours a day, 7 days a week (`24_7`)
  - Only when our office is closed (`office_closed_only`)
  - Only during specific hours (`specific_hours`)
- **Allows Other/free text:** No. Selecting specific hours displays Q10A, a required weekly schedule.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select when Alexander should answer your calls.
- **Preselected/default:** None

### Q10A

- **Question ID:** Q10A
- **Section:** Your Company
- **Exact question:** What hours should Alexander answer your calls?
- **Input type:** Weekly schedule
- **Required/Optional:** Required
- **Answer choices:** Weekly schedule shown only for specific answering hours. Days in order: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday. Each day is Closed or open with Start and End. At least one open day is required.
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q10 = `specific_hours`
- **Required when displayed:** Required
- **Validation/restrictions:** Specify at least one day when Alexander should answer calls.
- **Preselected/default:** None

### Q11

- **Question ID:** Q11
- **Section:** Your Company
- **Exact question:** Is there any recurring availability rule Alexander should know?
- **Input type:** Long/open text
- **Required/Optional:** Optional
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Optional
- **Validation/restrictions:** None
- **Preselected/default:** None

## Section 2 — Your Services

### Q12

- **Question ID:** Q12
- **Section:** Your Services
- **Exact question:** Which plumbing services does your company provide?
- **Input type:** Matrix — single select per row
- **Required/Optional:** Required
- **Answer choices:** Rows, exact order:
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
- **Allows Other/free text:** Yes — “With conditions” on a row shows a required conditions text field for that service.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select one policy for every plumbing service.
- **Preselected/default:** None

### Q13

- **Question ID:** Q13
- **Section:** Your Services
- **Exact question:** Which diagnostic and drain services does your company provide?
- **Input type:** Matrix — single select per row
- **Required/Optional:** Required
- **Answer choices:** Rows, exact order:
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
- **Allows Other/free text:** Yes — “With conditions” on a row shows a required conditions text field for that service.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select one policy for every diagnostic and drain service.
- **Preselected/default:** None

### Q14

- **Question ID:** Q14
- **Section:** Your Services
- **Exact question:** Who does your company serve?
- **Input type:** Matrix — single select per row
- **Required/Optional:** Required
- **Answer choices:** Rows, exact order:
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
- **Allows Other/free text:** Yes — “With conditions” on a row shows a required conditions text field for that customer type.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select one policy for every customer type.
- **Preselected/default:** None

### Q15

- **Question ID:** Q15
- **Section:** Your Services
- **Exact question:** Will you install or work with items supplied by the customer?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Yes, normally (`offered`)
  - Yes, with conditions (`with_conditions`)
  - Ask our team first (`ask_team`)
  - No (`not_offered`)
- **Allows Other/free text:** Yes — selecting “Yes, with conditions” shows an inline required open field labeled “What are the conditions?” (registered as Q15A).
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select an option.
- **Preselected/default:** None

### Q15A

- **Question ID:** Q15A
- **Section:** Your Services
- **Exact question:** What are the conditions?
- **Input type:** Long/open text
- **Required/Optional:** Required
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q15 = `with_conditions` (Yes, with conditions)
- **Required when displayed:** Required
- **Validation/restrictions:** Describe the conditions for this service.
- **Preselected/default:** None

### Q16

- **Question ID:** Q16
- **Section:** Your Services
- **Exact question:** Will you repair or finish work another plumber started?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Yes, normally (`offered`)
  - Yes, with conditions (`with_conditions`)
  - Ask our team first (`ask_team`)
  - No (`not_offered`)
- **Allows Other/free text:** Yes — selecting “Yes, with conditions” shows an inline required open field labeled “What are the conditions?” (registered as Q16A).
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select an option.
- **Preselected/default:** None

### Q16A

- **Question ID:** Q16A
- **Section:** Your Services
- **Exact question:** What are the conditions?
- **Input type:** Long/open text
- **Required/Optional:** Required
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q16 = `with_conditions` (Yes, with conditions)
- **Required when displayed:** Required
- **Validation/restrictions:** Describe the conditions for this service.
- **Preselected/default:** None

### Q17

- **Question ID:** Q17
- **Section:** Your Services
- **Exact question:** How would you like to define your normal service area?
- **Input type:** Single select / dropdown + composite structured input
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - ZIP codes (`zip_codes`)
  - Cities / communities (`cities`)
  - Distance from our business location (`distance`)
Single select, then one geography branch. ZIP codes: repeatable ZIP list. Cities / communities: repeatable city list. Distance: Business address (open field) and Radius in miles (open field).
- **Allows Other/free text:** No. The selected geography mode shows ZIP codes, cities, or address and radius.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select how you define your service area. ZIP codes: at least one ZIP. Cities: at least one city. Distance: business address required and radius must be a positive number.
- **Preselected/default:** None

### Q18

- **Question ID:** Q18
- **Section:** Your Services
- **Exact question:** Are there any areas inside or near your service area that you do not serve?
- **Input type:** Composite structured input
- **Required/Optional:** Optional
- **Answer choices:** Open Field labeled “Areas you do not serve”.
- **Allows Other/free text:** No
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Optional
- **Validation/restrictions:** None
- **Preselected/default:** None

### Q19

- **Question ID:** Q19
- **Section:** Your Services
- **Exact question:** Are there areas you serve only under certain conditions?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Yes (`yes`)
  - No (`no`)
- **Allows Other/free text:** No. Selecting Yes displays Q19A, a required repeater of area and condition text.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select yes or no.
- **Preselected/default:** None

### Q19A

- **Question ID:** Q19A
- **Section:** Your Services
- **Exact question(s):**
  1. Area {n}
  2. City, ZIP, neighborhood, radius segment, or other area
  3. Travel fee, minimum job, selected hours, manager approval, or other approved condition
- **Input type:** Repeatable structured rows
- **Required/Optional:** Required
- **Answer choices:** Repeater. Each row: Area (open field, required) and Condition (open field, required). Add and remove rows.
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q19 = `yes` (Yes)
- **Required when displayed:** Required
- **Validation/restrictions:** Add at least one area and its condition.
- **Preselected/default:** None

### Q20

- **Question ID:** Q20
- **Section:** Your Services
- **Exact question:** Is your after-hours service area different?
- **Input type:** Single select + composite structured input
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Same service area as normal (`same`)
  - A smaller service area (`smaller`)
  - We don’t provide after-hours field service (`none`)
Single select. “A smaller service area” reveals the same geography controls as Q17 (ZIP codes, cities, or distance).
- **Allows Other/free text:** No. “A smaller service area” shows the geography controls.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select an option. A smaller area uses the same ZIP, city, or distance rules as Q17.
- **Preselected/default:** None

## Section 3 — Emergencies

### Q21

- **Question ID:** Q21
- **Section:** Emergencies
- **Exact question:** How should Alexander treat each of these situations?
- **Input type:** Matrix — single select per row
- **Required/Optional:** Required
- **Answer choices:** Rows, exact order:
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
- **Allows Other/free text:** No
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Classify every situation listed above.
- **Preselected/default:** Each emergency row is preselected from EMERGENCY_ROW_DEFAULTS (Emergency, Urgent, but not an emergency, or Human review required).

### Q22

- **Question ID:** Q22
- **Section:** Emergencies
- **Exact question:** Are there any emergencies where Alexander must get human approval before arranging emergency dispatch?
- **Input type:** Multi-select / checkboxes
- **Required/Optional:** Required
- **Answer choices:** Exact order:
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
- **Allows Other/free text:** Yes — selecting “Other” displays a required “Other situation” field.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select at least one option, or None. None cannot be combined with other selections. Other requires a description.
- **Preselected/default:** None

### Q23

- **Question ID:** Q23
- **Section:** Emergencies
- **Exact question:** What should Alexander do with calls that come in after hours?
- **Input type:** Matrix — single select per row
- **Required/Optional:** Required
- **Answer choices:** Rows, exact order:
  - Emergency (`emergency`) — preselected `contact_on_call`
  - Urgent, but not an emergency (`urgent_contained`) — preselected `schedule_service`
  - Routine / non-urgent (`routine`) — preselected `schedule_service`
Choices for each row, exact order:
  - Contact our on-call team (`contact_on_call`)
  - Schedule service (`schedule_service`)
  - Take a message for follow-up (`take_message`)
One dropdown per row. Preselected defaults: Emergency → Contact our on-call team; Urgent, but not an emergency → Schedule service; Routine / non-urgent → Schedule service.
- **Allows Other/free text:** No
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select an option for every row.
- **Preselected/default:** Emergency → Contact our on-call team; Urgent, but not an emergency → Schedule service; Routine / non-urgent → Schedule service.

### Q24

- **Question ID:** Q24
- **Section:** Emergencies
- **Exact question:** When is after-hours emergency field service available?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - 24 hours a day, 7 days a week (`24_7`)
  - Only during certain hours (`certain_hours`)
  - We don’t provide after-hours emergency field service (`none`)
- **Allows Other/free text:** No. “Only during certain hours” shows a required weekly emergency schedule.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select an option. Certain hours requires at least one day emergency service is available.
- **Preselected/default:** None

### Q25

- **Question ID:** Q25
- **Section:** Emergencies
- **Exact question:** Who should Alexander contact first when a call requires immediate human attention?
- **Input type:** Contact selector / contact editor
- **Required/Optional:** Required
- **Answer choices:** Contact picker plus contact card.
Contact card (escalation profile), exact visible structure:
  - Person or role (short text, required)
  - Phone number (phone number, required)
  - Weekly availability (weekly schedule; days Monday–Sunday; each day Closed or open with Start and End; at least one open day required)
  - Call categories (multi-select / checkboxes, required; at least one). Exact order:
        - Emergencies (`emergencies`)
    - Urgent calls (`urgent_calls`)
    - Scheduling exceptions (`scheduling_exceptions`)
    - Pricing or fee exceptions (`pricing_exceptions`)
    - Customer complaints (`customer_complaints`)
    - Warranty or callback issues (`callback_previous_work`)
    - Other (`other`)
  - When Other is selected: Other category (short text, required)
- **Allows Other/free text:** No
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Enter a person or role, a phone number, at least one available day, and at least one call category.
- **Preselected/default:** None

### Q26

- **Question ID:** Q26
- **Section:** Emergencies
- **Exact question:** Is there a backup person Alexander should contact?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Yes (`yes`)
  - No (`no`)
- **Allows Other/free text:** No. Selecting Yes displays Q26A, a required backup contact card.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select yes or no.
- **Preselected/default:** None

### Q26A

- **Question ID:** Q26A
- **Section:** Emergencies
- **Exact question(s):**
  1. Person or role
  2. Phone number
  3. Weekly availability
  4. Call categories
- **Input type:** Contact selector / contact editor
- **Required/Optional:** Required
- **Answer choices:** Contact picker plus contact card (same escalation profile as Q25).
Contact card (escalation profile), exact visible structure:
  - Person or role (short text, required)
  - Phone number (phone number, required)
  - Weekly availability (weekly schedule; days Monday–Sunday; each day Closed or open with Start and End; at least one open day required)
  - Call categories (multi-select / checkboxes, required; at least one). Exact order:
        - Emergencies (`emergencies`)
    - Urgent calls (`urgent_calls`)
    - Scheduling exceptions (`scheduling_exceptions`)
    - Pricing or fee exceptions (`pricing_exceptions`)
    - Customer complaints (`customer_complaints`)
    - Warranty or callback issues (`callback_previous_work`)
    - Other (`other`)
  - When Other is selected: Other category (short text, required)
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q26 = `yes` (Yes)
- **Required when displayed:** Required
- **Validation/restrictions:** Same contact requirements as Q25.
- **Preselected/default:** None

### Q27

- **Question ID:** Q27
- **Section:** Emergencies
- **Exact question:** What should Alexander do if nobody on your team answers?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Take the customer's information and arrange a callback (`callback`)
  - Schedule the next available appointment, if appropriate (`schedule_next_available`)
  - Send the appropriate team notification and use the approved fallback (`team_notification_fallback`)
  - Follow another rule (`custom`)
- **Allows Other/free text:** Yes — selecting “Follow another rule” displays Q27A, a required open field.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select an option.
- **Preselected/default:** None

### Q27A

- **Question ID:** Q27A
- **Section:** Emergencies
- **Exact question:** What rule should Alexander follow?
- **Input type:** Long/open text
- **Required/Optional:** Required
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q27 = `custom` (Follow another rule)
- **Required when displayed:** Required
- **Validation/restrictions:** Describe the rule Alexander should follow.
- **Preselected/default:** None

### Q28

- **Question ID:** Q28
- **Section:** Emergencies
- **Exact question:** How should Alexander retry an unanswered contact?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Try once, then move to the next person (`try_once_then_next`)
  - Try the same person one more time, then move to the next person (`try_same_again_then_next`)
  - Move immediately to the next person (`move_immediately_to_next`)
  - Use another rule (`custom`)
- **Allows Other/free text:** Yes — selecting “Use another rule” displays Q28A, a required open field.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select an option.
- **Preselected/default:** None

### Q28A

- **Question ID:** Q28A
- **Section:** Emergencies
- **Exact question:** What retry rule should Alexander follow?
- **Input type:** Long/open text
- **Required/Optional:** Required
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q28 = `custom` (Use another rule)
- **Required when displayed:** Required
- **Validation/restrictions:** Describe the retry rule.
- **Preselected/default:** None

### Q29

- **Question ID:** Q29
- **Section:** Emergencies
- **Exact question:** What should Alexander do if an emergency comes in and your schedule is already full?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Use capacity we reserve for emergencies (`reserved_capacity`)
  - Allow an emergency override under certain conditions (`emergency_override`)
  - Ask an authorized person to approve an exception (`authorized_approval`)
  - Take the customer’s information and arrange a callback (`arrange_callback`)
- **Allows Other/free text:** Yes — reserved capacity, emergency override, and authorized approval each display Q29A’s matching required field.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select an option.
- **Preselected/default:** None

### Q29A

- **Question ID:** Q29A
- **Section:** Emergencies
- **Exact question(s):**
  1. Reserved capacity: How much capacity do you reserve for emergencies?
  2. Emergency override: When is an emergency override allowed?
  3. Authorized approval: Who can approve an emergency scheduling exception?
- **Input type:** Composite structured input
- **Required/Optional:** Required
- **Answer choices:** One visible label matches the Q29 choice. Reserved capacity: “How much capacity do you reserve for emergencies?” (required). Emergency override: “When is an emergency override allowed?” (required). Authorized approval: “Who can approve an emergency scheduling exception?” (required contact).
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q29 = `reserved_capacity`, `emergency_override`, or `authorized_approval`
- **Required when displayed:** Required
- **Validation/restrictions:** The revealed branch is required: reserved-capacity text, override conditions, or a valid approver contact.
- **Preselected/default:** None

## Section 4 — Scheduling

### Q30

- **Question ID:** Q30
- **Section:** Scheduling
- **Exact question:** What should Alexander do if a caller asks to speak with a person?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Try to connect them to someone right away (`connect_right_away`)
  - Ask briefly what they need, then connect them to the right person (`ask_briefly_then_connect`)
  - Take their information and arrange a callback (`callback`)
  - Follow another rule (`custom`)
- **Allows Other/free text:** Yes — selecting “Follow another rule” displays Q30A, a required open field.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select an option.
- **Preselected/default:** None

### Q30A

- **Question ID:** Q30A
- **Section:** Scheduling
- **Exact question:** What rule should Alexander follow?
- **Input type:** Long/open text
- **Required/Optional:** Required
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q30 = `custom` (Follow another rule)
- **Required when displayed:** Required
- **Validation/restrictions:** Required non-empty text.
- **Preselected/default:** None

### Q31

- **Question ID:** Q31
- **Section:** Scheduling
- **Exact question:** What should Alexander do if a caller doesn’t want to speak with AI?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Try to connect them to a person (`connect_to_person`)
  - Take their information and arrange a callback (`callback`)
  - Follow another rule (`custom`)
- **Allows Other/free text:** Yes — selecting “Follow another rule” displays Q31A, a required open field.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select an option.
- **Preselected/default:** None

### Q31A

- **Question ID:** Q31A
- **Section:** Scheduling
- **Exact question:** What rule should Alexander follow?
- **Input type:** Long/open text
- **Required/Optional:** Required
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q31 = `custom` (Follow another rule)
- **Required when displayed:** Required
- **Validation/restrictions:** Required non-empty text.
- **Preselected/default:** None

### Q32

- **Question ID:** Q32
- **Section:** Scheduling
- **Exact question:** Who can approve these types of exceptions?
- **Input type:** Matrix — single select per row
- **Required/Optional:** Required
- **Answer choices:** Rows, exact order:
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
- **Allows Other/free text:** No. “Another person or role” asks for an approver contact on that row.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select who may approve each exception type.
- **Preselected/default:** None

### Q33

- **Question ID:** Q33
- **Section:** Scheduling
- **Exact question:** What should Alexander do if the person who must approve an exception isn’t available?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Take the request and arrange a callback (`callback`)
  - Follow the normal rule without making an exception (`follow_normal_rule`)
  - Other (`other`)
- **Allows Other/free text:** Yes — selecting “Other” displays Q33A, a required open field.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select an option.
- **Preselected/default:** None

### Q33A

- **Question ID:** Q33A
- **Section:** Scheduling
- **Exact question:** What should Alexander do?
- **Input type:** Long/open text
- **Required/Optional:** Required
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q33 = `other` (Other)
- **Required when displayed:** Required
- **Validation/restrictions:** Describe what Alexander should do.
- **Preselected/default:** None

### Q34

- **Question ID:** Q34
- **Section:** Scheduling
- **Exact question:** What can different types of callers authorize?
- **Input type:** Matrix — single select per row
- **Required/Optional:** Required
- **Answer choices:** Rows, exact order:
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
- **Allows Other/free text:** No
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select one authority level for every caller.
- **Preselected/default:** Homeowner, Landlord / property manager, Spouse / family member, and Remote family member → Full authorization; Tenant and Realtor → Schedule only; Other third party → Human approval required.

### Q35

- **Question ID:** Q35
- **Section:** Scheduling
- **Exact question:** Are there spending limits for any of these callers?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Yes (`yes`)
  - No (`no`)
- **Allows Other/free text:** No. Selecting Yes displays Q35A, a required spending-limit repeater.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select yes or no.
- **Preselected/default:** None

### Q35A

- **Question ID:** Q35A
- **Section:** Scheduling
- **Exact question(s):**
  1. Caller type
  2. Maximum amount
- **Input type:** Repeatable structured rows
- **Required/Optional:** Required
- **Answer choices:** Repeater. Each row: Caller type (required) and Maximum amount (required).
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q35 = `yes` (Yes)
- **Required when displayed:** Required
- **Validation/restrictions:** Add at least one spending limit.
- **Preselected/default:** None

### Q36

- **Question ID:** Q36
- **Section:** Scheduling
- **Exact question:** Do emergency situations change any of these authorization rules?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Yes - use the same rules (`same_rules`)
  - No - emergencies have special rules (`special_rules`)
  - Human review is always required when the work is classified as an emergency (`human_review_always`)
- **Allows Other/free text:** Yes — selecting “No - emergencies have special rules” displays Q36A, a required open field.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select an option.
- **Preselected/default:** None

### Q36A

- **Question ID:** Q36A
- **Section:** Scheduling
- **Exact question:** How does emergency authorization differ?
- **Input type:** Long/open text
- **Required/Optional:** Required
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q36 = `special_rules` (No - emergencies have special rules)
- **Required when displayed:** Required
- **Validation/restrictions:** Describe how emergency authorization differs.
- **Preselected/default:** None

### Q37

- **Question ID:** Q37
- **Section:** Scheduling
- **Exact question:** What is Alexander normally allowed to do when a customer wants an appointment?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Book an available appointment (`book_appointment`)
  - Send the request to our team (`send_to_team`)
- **Allows Other/free text:** No
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select an option.
- **Preselected/default:** Book an available appointment (`book_appointment`).

### Q38

- **Question ID:** Q38
- **Section:** Scheduling
- **Exact question:** How far in advance may Alexander schedule appointments?
- **Input type:** Composite structured input
- **Required/Optional:** Required
- **Answer choices:** Checkbox “No maximum”, or open field “Maximum days ahead” (positive whole number). Those two cannot both be set.
- **Allows Other/free text:** No
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Enter a positive whole number of days, or select No maximum. Do not set both.
- **Preselected/default:** None

### Q39

- **Question ID:** Q39
- **Section:** Scheduling
- **Exact question:** What appointment windows do you offer?
- **Input type:** Repeatable structured rows
- **Required/Optional:** Required
- **Answer choices:** Rows, exact order:
  - Morning (`morning`)
  - Late morning (`late_morning`)
  - Early afternoon (`early_afternoon`)
  - Afternoon (`afternoon`)
  - Late afternoon (`late_afternoon`)
Five named windows in order: Morning, Late morning, Early afternoon, Afternoon, Late afternoon. Each window: Enabled checkbox, Window label, Start, End. An enabled window requires Start earlier than End.
- **Allows Other/free text:** No
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Enable at least one appointment window. Each enabled window requires start earlier than end.
- **Preselected/default:** All five windows start enabled, with empty start and end times.

### Q40

- **Question ID:** Q40
- **Section:** Scheduling
- **Exact question:** When an appointment is successfully confirmed, what information may Alexander repeat to the customer?
- **Input type:** Multi-select / checkboxes
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Appointment date (`appointment_date`)
  - Appointment time or arrival window (`appointment_time_or_window`)
  - Requested service (`requested_service`)
  - Customer name and service address (`customer_name_and_address`)
  - Callback phone number (`callback_phone`)
  - Email address provided (`email_address`)
- **Allows Other/free text:** No
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select at least one type of information Alexander may repeat.
- **Preselected/default:** All confirmation-information options are preselected.

### Q41

- **Question ID:** Q41
- **Section:** Scheduling
- **Exact question:** Do any types of jobs follow different booking rules?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Yes (`yes`)
  - No (`no`)
- **Allows Other/free text:** Yes — selecting Yes displays Q41A, a required booking-rule repeater.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select yes or no.
- **Preselected/default:** None

### Q41A

- **Question ID:** Q41A
- **Section:** Scheduling
- **Exact question(s):**
  1. Service / job
  2. Special booking rule
- **Input type:** Repeatable structured rows
- **Required/Optional:** Required
- **Answer choices:** Repeater. Each row: eligible Section 2 service (required) and Special booking rule (open field, required).
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q41 = `yes` (Yes)
- **Required when displayed:** Required
- **Validation/restrictions:** Add at least one special booking rule.
- **Preselected/default:** None

### Q42

- **Question ID:** Q42
- **Section:** Scheduling
- **Exact question:** When may Alexander offer same-day or holiday appointments?
- **Input type:** Matrix — single select per row
- **Required/Optional:** Required
- **Answer choices:** Rows, exact order:
  - Same-day service (`same_day`)
  - Holiday service (`holiday`)
Choices for each row, exact order:
  - Allowed (`allowed`)
  - Allowed with conditions (`with_conditions`)
  - Human approval required (`human_approval`)
  - Not offered (`not_offered`)
Matrix. Choices per row are listed below. “Allowed with conditions” reveals Conditions (open field) on that row.
- **Allows Other/free text:** Yes — “Allowed with conditions” shows a conditions text field on that row.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select a policy for same-day and holiday service.
- **Preselected/default:** None

### Q43

- **Question ID:** Q43
- **Section:** Scheduling
- **Exact question:** What may Alexander do when a customer wants to reschedule?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Reschedule directly (`direct`)
  - Reschedule only under certain conditions (`conditional`)
  - Submit for human approval (`human_approval`)
  - Arrange a callback (`callback`)
- **Allows Other/free text:** Yes — selecting “Reschedule only under certain conditions” displays Q43A, a required open field.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select an option.
- **Preselected/default:** None

### Q43A

- **Question ID:** Q43A
- **Section:** Scheduling
- **Exact question:** When may Alexander reschedule?
- **Input type:** Long/open text
- **Required/Optional:** Required
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q43 = `conditional` (Reschedule only under certain conditions)
- **Required when displayed:** Required
- **Validation/restrictions:** Describe when Alexander may reschedule.
- **Preselected/default:** None

### Q44

- **Question ID:** Q44
- **Section:** Scheduling
- **Exact question:** What may Alexander do when a customer wants to cancel?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Cancel directly (`direct`)
  - Cancel only under certain conditions (`conditional`)
  - Submit for human approval (`human_approval`)
  - Arrange a callback (`callback`)
- **Allows Other/free text:** Yes — selecting “Cancel only under certain conditions” displays Q44A, a required open field.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select an option.
- **Preselected/default:** None

### Q44A

- **Question ID:** Q44A
- **Section:** Scheduling
- **Exact question:** When may Alexander cancel?
- **Input type:** Long/open text
- **Required/Optional:** Required
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q44 = `conditional` (Cancel only under certain conditions)
- **Required when displayed:** Required
- **Validation/restrictions:** Describe when Alexander may cancel.
- **Preselected/default:** None

### Q45

- **Question ID:** Q45
- **Section:** Scheduling
- **Exact question:** Do you charge a late-cancellation fee?
- **Input type:** Single select + composite structured input
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Yes (`yes`)
  - Only under certain conditions (`conditional`)
  - No (`no`)
- **Allows Other/free text:** Yes — Yes or Only under certain conditions displays Q45A fee-detail fields.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select an option. Yes or Only under certain conditions collects notice and when-it-applies text in Q45A (amount is collected in Section 5, not here). If Q45 is Yes or Only under certain conditions, Q56 must include Cancellation fee. If Q46 is Yes or Only under certain conditions, Q56 must include No-show fee. If Q45 is No, Q56 must not include Cancellation fee. If Q46 is No, Q56 must not include No-show fee. “We don’t charge additional fees” cannot be selected on Q56 while Q45 or Q46 is Yes or Only under certain conditions. Enforced when continuing from Section 5 (Pricing and Payments) and again on final questionnaire submit.
- **Preselected/default:** None

### Q45A

- **Question ID:** Q45A
- **Section:** Scheduling
- **Exact question(s):**
  1. Notice required before cancellation
  2. When does this fee apply?
- **Input type:** Composite structured input
- **Required/Optional:** Required
- **Answer choices:** When Yes or Only under certain conditions: Notice required before cancellation (open field) and When does this fee apply? (open field). Amount is not collected in Scheduling.
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q45 = `yes` or `conditional` (Yes / Only under certain conditions)
- **Required when displayed:** Required
- **Validation/restrictions:** Notice required before cancellation and When does this fee apply? are required open fields when displayed. Amount is not collected in Scheduling.
- **Preselected/default:** None

### Q46

- **Question ID:** Q46
- **Section:** Scheduling
- **Exact question:** Do you charge a no-show fee?
- **Input type:** Single select + composite structured input
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Yes (`yes`)
  - Only under certain conditions (`conditional`)
  - No (`no`)
- **Allows Other/free text:** Yes — Yes or Only under certain conditions displays Q46A fee-detail fields.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select an option. Yes or Only under certain conditions collects when-it-applies text in Q46A (amount is collected in Section 5, not here). If Q45 is Yes or Only under certain conditions, Q56 must include Cancellation fee. If Q46 is Yes or Only under certain conditions, Q56 must include No-show fee. If Q45 is No, Q56 must not include Cancellation fee. If Q46 is No, Q56 must not include No-show fee. “We don’t charge additional fees” cannot be selected on Q56 while Q45 or Q46 is Yes or Only under certain conditions. Enforced when continuing from Section 5 (Pricing and Payments) and again on final questionnaire submit.
- **Preselected/default:** None

### Q46A

- **Question ID:** Q46A
- **Section:** Scheduling
- **Exact question:** When does this fee apply?
- **Input type:** Composite structured input
- **Required/Optional:** Required
- **Answer choices:** When Yes or Only under certain conditions: When does this fee apply? (open field). Amount is not collected in Scheduling.
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q46 = `yes` or `conditional` (Yes / Only under certain conditions)
- **Required when displayed:** Required
- **Validation/restrictions:** When does this fee apply? is required when displayed. Amount is not collected in Scheduling.
- **Preselected/default:** None

### Q47

- **Question ID:** Q47
- **Section:** Scheduling
- **Exact question:** Are there exceptions to your cancellation or no-show rules?
- **Input type:** Long/open text
- **Required/Optional:** Optional
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Optional
- **Validation/restrictions:** None
- **Preselected/default:** None

### Q48

- **Question ID:** Q48
- **Section:** Scheduling
- **Exact question:** What should Alexander do if the customer needs service but there are no appropriate appointments available?
- **Input type:** Ordered multi-select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Offer the next available appointment (`offer_next_available`)
  - Look for another approved appointment window (`look_for_approved_window`)
  - Add the customer to a callback/waitlist (`add_to_callback_waitlist`)
  - Ask the team for help (`ask_team_for_help`)
- **Allows Other/free text:** No
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Set the priority order for all four fallback options.
- **Preselected/default:** None

### Q49

- **Question ID:** Q49
- **Section:** Scheduling
- **Exact question:** May Alexander arrange a callback when no appointment is available?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Yes (`yes`)
  - No (`no`)
- **Allows Other/free text:** No. Selecting Yes displays Q49A (callback-number single select) and Q49B (callback contact card), both required.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select yes or no.
- **Preselected/default:** None

### Q49A

- **Question ID:** Q49A
- **Section:** Scheduling
- **Exact question:** What phone number should Alexander use for the callback?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - The number the customer is calling from (`calling_from`)
  - Ask the customer for their preferred callback number (`ask_preferred`)
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q49 = `yes` (Yes)
- **Required when displayed:** Required
- **Validation/restrictions:** Select which callback number Alexander should use.
- **Preselected/default:** None

### Q49B

- **Question ID:** Q49B
- **Section:** Scheduling
- **Exact question:** Who should receive or handle scheduling callbacks?
- **Input type:** Contact selector / contact editor
- **Required/Optional:** Required
- **Answer choices:** Contact picker plus contact card (same escalation profile as Q25).
Contact card (escalation profile), exact visible structure:
  - Person or role (short text, required)
  - Phone number (phone number, required)
  - Weekly availability (weekly schedule; days Monday–Sunday; each day Closed or open with Start and End; at least one open day required)
  - Call categories (multi-select / checkboxes, required; at least one). Exact order:
        - Emergencies (`emergencies`)
    - Urgent calls (`urgent_calls`)
    - Scheduling exceptions (`scheduling_exceptions`)
    - Pricing or fee exceptions (`pricing_exceptions`)
    - Customer complaints (`customer_complaints`)
    - Warranty or callback issues (`callback_previous_work`)
    - Other (`other`)
  - When Other is selected: Other category (short text, required)
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q49 = `yes` (Yes)
- **Required when displayed:** Required
- **Validation/restrictions:** Select who should handle scheduling callbacks.
- **Preselected/default:** None

### Q50

- **Question ID:** Q50
- **Section:** Scheduling
- **Exact question:** Are there any jobs that require a particular technician?
- **Input type:** Single select + composite structured input
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Yes (`yes`)
  - No (`no`)
- **Allows Other/free text:** Yes — selecting Yes displays Q50A, a required assignment repeater. Other job description is an open field on a row.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select yes or no.
- **Preselected/default:** None

### Q50A

- **Question ID:** Q50A
- **Section:** Scheduling
- **Exact question(s):**
  1. Job or service
  2. Other job description
  3. Technician name
- **Input type:** Composite structured input
- **Required/Optional:** Required
- **Answer choices:** Repeater headed “Assignment” plus a number. Each row: Job or service (required; includes “Other job” and “Other job description”), Required technician with “Select from contacts” or “Enter technician name”, and Technician name when entering a name.
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q50 = `yes` (Yes)
- **Required when displayed:** Required
- **Validation/restrictions:** Add at least one job that requires a particular technician.
- **Preselected/default:** None

### Q51

- **Question ID:** Q51
- **Section:** Scheduling
- **Exact question:** What should Alexander do if a customer asks for a specific technician?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Book that technician if confirmed available (`book_if_confirmed_available`)
  - Try to honor the request, but another technician may be assigned (`try_honor_may_reassign`)
  - Submit the request for team review (`submit_for_review`)
  - We don’t accept specific-technician requests (`do_not_accept`)
- **Allows Other/free text:** No
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select an option.
- **Preselected/default:** None

### Q52

- **Question ID:** Q52
- **Section:** Scheduling
- **Exact question:** What should Alexander do when a customer has several plumbing issues?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Put all eligible issues into one appointment (`one_appointment`)
  - Certain issues must be scheduled separately (`separate_issues`)
  - Ask our team to decide (`ask_team`)
- **Allows Other/free text:** Yes — “Certain issues must be scheduled separately” displays Q52A. Other on that checklist shows a required open field.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select an option.
- **Preselected/default:** None

### Q52A

- **Question ID:** Q52A
- **Section:** Scheduling
- **Exact question:** Describe other work that needs its own appointment
- **Input type:** Composite structured input
- **Required/Optional:** Required
- **Answer choices:** Checklist of eligible Section 2 services plus Other. Other reveals “Describe other work that needs its own appointment” (required).
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q52 = `separate_issues` (Certain issues must be scheduled separately)
- **Required when displayed:** Required
- **Validation/restrictions:** Select at least one issue. Other requires a description.
- **Preselected/default:** None

## Section 5 — Pricing and Payments

### Q53

- **Question ID:** Q53
- **Section:** Pricing and Payments
- **Exact question:** How does your company normally price plumbing work?
- **Input type:** Multi-select / checkboxes
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Flat-rate / upfront pricing (`flat_rate`)
  - Hourly labor + materials (`hourly_labor_materials`)
  - Fixed prices for certain services (`fixed_prices_certain_services`)
  - Price determined after the technician evaluates the job (`after_diagnosis`)
  - Estimate or quote required for larger work (`estimate_required`)
  - Other (`other`)
- **Allows Other/free text:** Yes — selecting “Other” displays Q53A, a required short-text field.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select at least one pricing model.
- **Preselected/default:** None

### Q53A

- **Question ID:** Q53A
- **Section:** Pricing and Payments
- **Exact question:** Describe your other pricing method
- **Input type:** Short text
- **Required/Optional:** Required
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q53 includes Other (`other`)
- **Required when displayed:** Required
- **Validation/restrictions:** Describe your other pricing method.
- **Preselected/default:** None

### Q54

- **Question ID:** Q54
- **Section:** Pricing and Payments
- **Exact question:** May Alexander quote prices for your services?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Yes - Alexander may quote the prices we provide below (`allowed`)
  - No - Alexander should not quote service prices (`not_allowed`)
- **Allows Other/free text:** Yes — Allowed displays Q54A. Each price row has an optional conditions open field.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select whether Alexander may quote service prices.
- **Preselected/default:** No - Alexander should not quote service prices (`not_allowed`).

### Q54A

- **Question ID:** Q54A
- **Section:** Pricing and Payments
- **Exact question:** What service prices may Alexander quote?
- **Input type:** Repeatable structured rows
- **Required/Optional:** Optional
- **Answer choices:** Repeater of offered Section 2 services. Each row has a price-mode single select, exact order:
  - Exact price (`exact`) — shows Exact price (currency, required)
  - Starting at (`starting_at`) — shows Starting at (currency, required)
  - Price range (`range`) — shows Minimum (currency, required) and Maximum (currency, required)
  - Hourly (`hourly`) — shows Hourly rate (currency, required)
  - Requires an estimate / diagnosis (`estimate`) — no dollar amount
Then “Any conditions or details Alexander should know?” (open field, optional).
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q54 = `allowed` (Allowed)
- **Required when displayed:** Optional
- **Validation/restrictions:** None beyond the fields shown for the selected price mode.
- **Preselected/default:** None

### Q55

- **Question ID:** Q55
- **Section:** Pricing and Payments
- **Exact question:** What should Alexander do when he doesn't have an approved price?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Explain that pricing will be provided after the job is evaluated (`technician_after_evaluation`)
  - Have our team provide the price (`team_provides_pricing`)
- **Allows Other/free text:** No
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select an option.
- **Preselected/default:** Explain that pricing will be provided after the job is evaluated (`technician_after_evaluation`).

### Q56

- **Question ID:** Q56
- **Section:** Pricing and Payments
- **Exact question:** Which additional fees does your company charge?
- **Input type:** Multi-select / checkboxes + composite per selected fee
- **Required/Optional:** Required
- **Answer choices:** Exact order:
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
- **Allows Other/free text:** Yes — each selected fee shows amount, applicability, and credit fields. Sometimes shows “When is it credited?”. “We don’t charge additional fees” shows no detail fields.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select at least one option. “We don’t charge additional fees” cannot be combined with a fee. A selected fee requires its visible detail fields; “When is it credited?” is required only when credit is Sometimes. If Q45 is Yes or Only under certain conditions, Q56 must include Cancellation fee. If Q46 is Yes or Only under certain conditions, Q56 must include No-show fee. If Q45 is No, Q56 must not include Cancellation fee. If Q46 is No, Q56 must not include No-show fee. “We don’t charge additional fees” cannot be selected on Q56 while Q45 or Q46 is Yes or Only under certain conditions. Enforced when continuing from Section 5 (Pricing and Payments) and again on final questionnaire submit.
- **Preselected/default:** None

### Q57

- **Question ID:** Q57
- **Section:** Pricing and Payments
- **Exact question:** Do any areas have different travel fees or minimum charges?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - No (`no`)
  - Yes (`yes`)
- **Allows Other/free text:** No. Selecting Yes displays Q57A, a required repeater of open text fields.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select yes or no.
- **Preselected/default:** No (`no`).

### Q57A

- **Question ID:** Q57A
- **Section:** Pricing and Payments
- **Exact question(s):**
  1. Area
  2. Fee or minimum
- **Input type:** Repeatable structured rows
- **Required/Optional:** Required
- **Answer choices:** Repeater. Each row: Area (required) and Fee or minimum (required).
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q57 = `yes` (Yes)
- **Required when displayed:** Required
- **Validation/restrictions:** Add at least one area.
- **Preselected/default:** None

### Q58

- **Question ID:** Q58
- **Section:** Pricing and Payments
- **Exact question:** Does your company mark up parts or materials?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Yes (`yes`)
  - Sometimes (`sometimes`)
  - No (`no`)
- **Allows Other/free text:** Yes — Yes or Sometimes displays Q58A, a required open field.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select an option.
- **Preselected/default:** None

### Q58A

- **Question ID:** Q58A
- **Section:** Pricing and Payments
- **Exact question:** What may Alexander tell customers about material pricing?
- **Input type:** Long/open text
- **Required/Optional:** Required
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q58 = `yes` or `sometimes` (Yes / Sometimes)
- **Required when displayed:** Required
- **Validation/restrictions:** Required non-empty explanation when displayed.
- **Preselected/default:** None. The explanation starts empty.

### Q59

- **Question ID:** Q59
- **Section:** Pricing and Payments
- **Exact question:** What payment methods do you accept?
- **Input type:** Multi-select / checkboxes
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Credit card (`credit_card`)
  - Debit card (`debit_card`)
  - Cash (`cash`)
  - Check (`check`)
  - ACH or bank transfer (`ach`)
  - Financing (`financing`)
  - Invoice or account billing (`invoice`)
  - Other (`other`)
- **Allows Other/free text:** Yes — selecting “Other” displays Q59A, a required short-text field.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select at least one payment method.
- **Preselected/default:** None

### Q59A

- **Question ID:** Q59A
- **Section:** Pricing and Payments
- **Exact question:** Other payment method
- **Input type:** Short text
- **Required/Optional:** Required
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q59 includes Other (`other`)
- **Required when displayed:** Required
- **Validation/restrictions:** Describe the other payment method.
- **Preselected/default:** None

### Q60

- **Question ID:** Q60
- **Section:** Pricing and Payments
- **Exact question:** When is payment normally due?
- **Input type:** Multi-select / checkboxes
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - At time of service (`at_time_of_service`)
  - When work is completed (`when_work_completed`)
  - Deposit required before certain work (`deposit_required`)
  - Progress payments for larger projects (`progress_payments`)
  - Invoice after service for approved customers (`invoice_after_service`)
  - Other (`other`)
Other is a selectable choice but does not currently reveal a text field.
- **Allows Other/free text:** No
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select at least one payment-due policy. Other is a selectable choice but does not currently reveal a text field.
- **Preselected/default:** None

### Q61

- **Question ID:** Q61
- **Section:** Pricing and Payments
- **Exact question:** Can Alexander help customers make a payment?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Yes - Alexander may send customers a secure payment link (`secure_link`)
  - Yes - Alexander may send a secure payment link and use an approved payment method already on file when authorized (`secure_link_and_authorized_method`)
  - No - Alexander should send payment requests to our team (`send_to_team`)
- **Allows Other/free text:** No
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select whether Alexander may help customers make a payment.
- **Preselected/default:** Yes - Alexander may send customers a secure payment link (`secure_link`).

### Q62

- **Question ID:** Q62
- **Section:** Pricing and Payments
- **Exact question:** What may Alexander help collect payment for?
- **Input type:** Multi-select / checkboxes
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Booking or service fees (`booking_or_service_fees`)
  - Deposits (`deposits`)
  - Completed service invoices (`completed_invoices`)
  - Outstanding balances (`outstanding_balances`)
  - Progress payments (`progress_payments`)
  - Other (`other`)
- **Allows Other/free text:** Yes — selecting Other displays Q62A, a required short-text field.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select at least one type of payment.
- **Preselected/default:** Booking or service fees; Deposits; Completed invoices; Outstanding balances.

### Q62A

- **Question ID:** Q62A
- **Section:** Pricing and Payments
- **Exact question:** Other payment
- **Input type:** Short text
- **Required/Optional:** Required
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q62 includes Other (`other`)
- **Required when displayed:** Required
- **Validation/restrictions:** Describe the other payment Alexander may collect.
- **Preselected/default:** None

### Q63

- **Question ID:** Q63
- **Section:** Pricing and Payments
- **Exact question:** What financial remedies may Alexander approve without human approval?
- **Input type:** Multi-select / checkboxes + per-selected rule text
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Refund (`refund`)
  - Account credit (`account_credit`)
  - Fee waiver (`fee_waiver`)
  - Discount / goodwill adjustment (`discount_goodwill`)
  - Free or reduced-price return visit (`return_visit`)
  - None - human approval is required (`none`)
Multi-select. Each selected remedy except “None - human approval is required” shows that remedy’s rule text. None cannot be combined with a remedy.
- **Allows Other/free text:** Yes — each selected remedy shows its rule text. None shows no rule fields.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select at least one option. “None - human approval is required” cannot be combined with a remedy.
- **Preselected/default:** None - human approval is required (`none`).

## Section 6 — Customer Care

### Q64

- **Question ID:** Q64
- **Section:** Customer Care
- **Exact question:** What should Alexander do when a customer says there’s a problem with work your company already performed?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Collect the details and schedule a return visit when allowed (`schedule_return_visit`)
  - Collect the details and submit the request for team review (`submit_team_review`)
  - Try to connect the customer with someone on our team (`connect_team`)
  - Arrange a callback (`arrange_callback`)
  - Follow another rule (`custom`)
- **Allows Other/free text:** Yes — Schedule a return visit shows an eligibility open field. Custom shows a custom-rule open field.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select an option. Schedule a return visit requires the eligibility rule. Custom requires the custom rule.
- **Preselected/default:** None

### Q65

- **Question ID:** Q65
- **Section:** Customer Care
- **Exact question:** What should Alexander do if the customer has already called back about the same problem?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Schedule another return visit when allowed (`schedule_another_return`)
  - Human review required after the first callback (`human_review_after_first`)
  - Try to connect the customer with a manager (`connect_manager`)
- **Allows Other/free text:** No
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select an option.
- **Preselected/default:** None

### Q66

- **Question ID:** Q66
- **Section:** Customer Care
- **Exact question:** When should Alexander involve someone on your team because a customer is unhappy?
- **Input type:** Multi-select / checkboxes
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Customer explicitly asks for a manager or person (`asks_manager`)
  - Customer says the previous repair didn’t solve the problem (`repair_not_solved`)
  - Customer disputes a charge (`disputes_charge`)
  - Customer requests a refund or credit (`refund_credit_request`)
  - Customer says your company caused property damage (`property_damage`)
  - Customer threatens legal action (`legal_threat`)
  - Customer threatens a chargeback (`chargeback_threat`)
  - Customer is repeatedly dissatisfied after attempts to resolve the issue (`repeated_dissatisfaction`)
  - Other (`other`)
- **Allows Other/free text:** Yes — selecting Other displays Q66A, a required short-text field.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select at least one escalation trigger.
- **Preselected/default:** The first eight escalation triggers are preselected. Other is not preselected.

### Q66A

- **Question ID:** Q66A
- **Section:** Customer Care
- **Exact question:** Describe the other escalation trigger
- **Input type:** Short text
- **Required/Optional:** Required
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q66 includes Other (`other`)
- **Required when displayed:** Required
- **Validation/restrictions:** Describe the other escalation trigger.
- **Preselected/default:** None

### Q67

- **Question ID:** Q67
- **Section:** Customer Care
- **Exact question:** What should Alexander never promise an unhappy customer?
- **Input type:** Multi-select / checkboxes
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Never admit company fault or liability (`no_admit_fault`)
  - Never promise a refund unless authorized (`no_refund_unauthorized`)
  - Never promise free work unless authorized (`no_free_work_unauthorized`)
  - Never promise compensation unless authorized (`no_compensation_unauthorized`)
  - Never promise a specific outcome from management (`no_specific_outcome`)
  - Other (`other`)
- **Allows Other/free text:** Yes — selecting Other displays Q67A, a required short-text field.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select at least one prohibited promise.
- **Preselected/default:** The first five prohibited promises are preselected. Other is not preselected.

### Q67A

- **Question ID:** Q67A
- **Section:** Customer Care
- **Exact question:** Describe the other prohibited promise
- **Input type:** Short text
- **Required/Optional:** Required
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q67 includes Other (`other`)
- **Required when displayed:** Required
- **Validation/restrictions:** Describe the other prohibited promise.
- **Preselected/default:** None

### Q68

- **Question ID:** Q68
- **Section:** Customer Care
- **Exact question:** How should Alexander handle other types of calls?
- **Input type:** Matrix — single select per row
- **Required/Optional:** Required
- **Answer choices:** Rows, exact order:
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
Matrix — one disposition per non-service call type. “Transfer the call” reveals a contact selector on that row.
- **Allows Other/free text:** No. Selecting “Transfer the call” on a row shows a contact selector on that row.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select a disposition for every call type.
- **Preselected/default:** Vendor or supplier → Take a message; Sales solicitation → Politely decline; Job applicant → Take a message; Current employee → Transfer the call; Media inquiry, Attorney / legal inquiry, and Government / regulator → Human review; Wrong number / spam → Politely decline.

### Q69

- **Question ID:** Q69
- **Section:** Customer Care
- **Exact question:** What customer information may Alexander use when helping an existing customer?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Use available customer information and service history when it helps resolve the call (`use_available_history`)
  - Human review required before discussing previous service details (`human_review_before_details`)
  - Follow another rule (`custom`)
- **Allows Other/free text:** Yes — Custom shows a custom-rule open field.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select an option.
- **Preselected/default:** None

### Q70

- **Question ID:** Q70
- **Section:** Customer Care
- **Exact question:** Are there customer records or documents Alexander should never disclose?
- **Input type:** Multi-select / checkboxes
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Payment information (`payment_information`)
  - Internal company notes (`internal_company_notes`)
  - Technician-only notes (`technician_notes`)
  - Information about another customer (`another_customer`)
  - Sensitive account information (`sensitive_account`)
  - Other (`other`)
- **Allows Other/free text:** Yes — selecting Other displays Q70A, a required short-text field.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select at least one restriction.
- **Preselected/default:** Payment information; Information about another customer; Sensitive account information.

### Q70A

- **Question ID:** Q70A
- **Section:** Customer Care
- **Exact question:** Describe other restricted information
- **Input type:** Short text
- **Required/Optional:** Required
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q70 includes Other (`other`)
- **Required when displayed:** Required
- **Validation/restrictions:** Describe the other restricted information.
- **Preselected/default:** None

### Q71

- **Question ID:** Q71
- **Section:** Customer Care
- **Exact question:** How proactive should Alexander be about recommending additional services?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Mention relevant services when they clearly relate to what the customer needs (`mention_relevant`)
  - Mention only approved offers, memberships, or services (`mention_approved_only`)
  - Only discuss additional services when the customer asks (`only_when_asked`)
  - Don’t proactively recommend additional services (`do_not_proactive`)
  - Follow another rule (`custom`)
- **Allows Other/free text:** Yes — Custom shows a custom-rule open field.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select an option.
- **Preselected/default:** None

### Q72

- **Question ID:** Q72
- **Section:** Customer Care
- **Exact question:** Are there any other rules Alexander should follow for unusual calls?
- **Input type:** Long/open text
- **Required/Optional:** Optional
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Optional
- **Validation/restrictions:** None
- **Preselected/default:** None

## Section 7 — Voice and Conversation

### Q73

- **Question ID:** Q73
- **Section:** Voice and Conversation
- **Exact question:** Which language or languages should Alexander support with callers?
- **Input type:** Multi-select / checkboxes
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - English (`english`)
  - Spanish (`spanish`)
  - Other supported language (`other`)
  - English only (`english_only`)
- **Allows Other/free text:** Yes — Other, when English only is not selected, displays Q73A, a required short-text field.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select at least one language option. English only cannot be combined with other language selections.
- **Preselected/default:** None

### Q73A

- **Question ID:** Q73A
- **Section:** Voice and Conversation
- **Exact question:** Other supported language
- **Input type:** Short text
- **Required/Optional:** Required
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q73 includes Other (`other`) and English only is not the only language selection
- **Required when displayed:** Required
- **Validation/restrictions:** Enter the other supported language.
- **Preselected/default:** None

### Q74

- **Question ID:** Q74
- **Section:** Voice and Conversation
- **Exact question:** Which voice should Alexander use?
- **Input type:** Single select / radio (approved voice library cards)
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Voice A — Warm, calm, professional (`voice_a`)
  - Voice B — Friendly, energetic, approachable (`voice_b`)
  - Voice C — Direct, steady, highly efficient (`voice_c`)
  - Another approved voice (`another_approved`)
- **Allows Other/free text:** No. “Another approved voice” is visible but disabled while the additional approved voice catalog is empty. When the catalog has at least one voice, selecting it displays Q74A, a required radio list.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select an approved voice.
- **Preselected/default:** None

### Q74A

- **Question ID:** Q74A
- **Section:** Voice and Conversation
- **Exact question:** No separate question sentence. Choices are additional approved voice names.
- **Input type:** Single select / radio from additional approved voice catalog
- **Required/Optional:** Required
- **Answer choices:** No selectable options currently configured. Choices are dynamically populated from ADDITIONAL_APPROVED_VOICES. The catalog is currently empty, so this control is not displayed.
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q74 = `another_approved` (Another approved voice) and the additional approved voice catalog is non-empty
- **Required when displayed:** Required
- **Validation/restrictions:** Select an approved library voice (required when displayed). Control is not shown while the additional approved voice catalog is empty.
- **Preselected/default:** None

### Q75

- **Question ID:** Q75
- **Section:** Voice and Conversation
- **Exact question:** How should Alexander’s communication style feel?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Warm and professional (`warm_professional`)
  - Friendly and relaxed (`friendly_relaxed`)
  - Direct and efficient (`direct_efficient`)
  - Calm and reassuring (`calm_reassuring`)
- **Allows Other/free text:** No
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select a communication style.
- **Preselected/default:** None

### Q76

- **Question ID:** Q76
- **Section:** Voice and Conversation
- **Exact question:** What name should Alexander use when introducing himself?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Alexander (`alexander`)
  - A company-specific name (`company_specific`)
  - Another approved name (`another_approved`)
- **Allows Other/free text:** Yes — company-specific or another approved name displays Q76A, a required short-text field.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select how Alexander should introduce himself.
- **Preselected/default:** None

### Q76A

- **Question ID:** Q76A
- **Section:** Voice and Conversation
- **Exact question:** Spoken receptionist name
- **Input type:** Short text
- **Required/Optional:** Required
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q76 = `company_specific` or `another_approved`
- **Required when displayed:** Required
- **Validation/restrictions:** Enter the spoken receptionist name.
- **Preselected/default:** None

### Q77

- **Question ID:** Q77
- **Section:** Voice and Conversation
- **Exact question:** How should Alexander identify himself as an AI?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Say he is the company’s AI receptionist in the opening (`opening_ai_receptionist`)
  - Say he is an AI receptionist only if the caller asks (`only_if_asked`)
  - Use another approved disclosure (`custom`)
- **Allows Other/free text:** Yes — custom disclosure displays Q77A, an optional open field.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select how Alexander should identify himself as an AI.
- **Preselected/default:** None

### Q77A

- **Question ID:** Q77A
- **Section:** Voice and Conversation
- **Exact question:** Approved disclosure wording
- **Input type:** Long/open text
- **Required/Optional:** Optional
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q77 = `custom` (Custom disclosure)
- **Required when displayed:** Optional
- **Validation/restrictions:** None
- **Preselected/default:** None

### Q78

- **Question ID:** Q78
- **Section:** Voice and Conversation
- **Exact question:** Are there any company, people, city, neighborhood, or brand names that Alexander must pronounce correctly?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - None (`none`)
  - Yes — enter the pronunciation details below (`yes`)
- **Allows Other/free text:** No. Selecting Yes displays Q78A, a required pronunciation repeater.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select whether pronunciation details are needed.
- **Preselected/default:** None

### Q78A

- **Question ID:** Q78A
- **Section:** Voice and Conversation
- **Exact question(s):**
  1. Name or spelling
  2. Preferred pronunciation
  3. Optional audio example (URL or reference)
- **Input type:** Repeatable structured rows
- **Required/Optional:** Required
- **Answer choices:** Repeater. Each row: Term (required), Pronunciation (required), and optional audio sample reference.
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q78 = `yes` (Yes)
- **Required when displayed:** Required
- **Validation/restrictions:** Add at least one complete pronunciation entry.
- **Preselected/default:** None

### Q79

- **Question ID:** Q79
- **Section:** Voice and Conversation
- **Exact question:** If a caller speaks a supported second language, what should Alexander normally do?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Continue in the caller’s language (`continue_caller_language`)
  - Ask whether the caller prefers English or the supported second language (`ask_preference`)
  - Continue in English and offer a human who speaks the other language (`english_offer_human`)
  - Follow another rule (`custom`)
- **Allows Other/free text:** Yes — custom displays Q79A, an optional open field.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select second-language behavior.
- **Preselected/default:** None

### Q79A

- **Question ID:** Q79A
- **Section:** Voice and Conversation
- **Exact question:** Language-switching rule
- **Input type:** Long/open text
- **Required/Optional:** Optional
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q79 = `custom` (Custom rule)
- **Required when displayed:** Optional
- **Validation/restrictions:** None
- **Preselected/default:** None

### Q80

- **Question ID:** Q80
- **Section:** Voice and Conversation
- **Exact question:** Do you have a preference for the perceived voice presentation?
- **Input type:** Single select
- **Required/Optional:** Optional
- **Answer choices:** Exact order:
  - No preference (`no_preference`)
  - Masculine-presenting (`masculine_presenting`)
  - Feminine-presenting (`feminine_presenting`)
  - Neutral or androgynous (`neutral_androgynous`)
- **Allows Other/free text:** No
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Optional
- **Validation/restrictions:** None
- **Preselected/default:** None

### Q81

- **Question ID:** Q81
- **Section:** Voice and Conversation
- **Exact question:** Do you have a preferred accent or regional character?
- **Input type:** Single select
- **Required/Optional:** Optional
- **Answer choices:** Exact order:
  - Neutral American (`neutral_american`)
  - Regional American, if available (`regional_american`)
  - Spanish-influenced English, if available (`spanish_influenced_english`)
  - Other approved option (`other_approved`)
  - No preference (`no_preference`)
- **Allows Other/free text:** Yes — other approved accent displays Q81A, a required short-text field.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Optional
- **Validation/restrictions:** None, unless the accent is not available for the selected voice.
- **Preselected/default:** None

### Q81A

- **Question ID:** Q81A
- **Section:** Voice and Conversation
- **Exact question:** Other approved accent
- **Input type:** Short text
- **Required/Optional:** Required
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q81 = `other_approved` (Other approved accent)
- **Required when displayed:** Required
- **Validation/restrictions:** Enter the other approved accent option.
- **Preselected/default:** None

### Q82

- **Question ID:** Q82
- **Section:** Voice and Conversation
- **Exact question:** How formal should Alexander sound?
- **Input type:** Single select
- **Required/Optional:** Optional
- **Answer choices:** Exact order:
  - Conversational and natural (`conversational`)
  - Balanced professional (`balanced_professional`)
  - More formal and traditional (`formal_traditional`)
- **Allows Other/free text:** No
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Optional
- **Validation/restrictions:** None
- **Preselected/default:** None

### Q83

- **Question ID:** Q83
- **Section:** Voice and Conversation
- **Exact question:** Are there any phrases Alexander should use or avoid because of your company’s brand?
- **Input type:** Long/open text
- **Required/Optional:** Optional
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Optional
- **Validation/restrictions:** None
- **Preselected/default:** None

### Q84

- **Question ID:** Q84
- **Section:** Voice and Conversation
- **Exact question:** Is there anything else about Alexander’s voice or identity that we should review with you?
- **Input type:** Long/open text
- **Required/Optional:** Optional
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Optional
- **Validation/restrictions:** None
- **Preselected/default:** None

## Section 8 — Integration Systems and Final Setup

### Q85

- **Question ID:** Q85
- **Section:** Integration Systems and Final Setup
- **Exact question:** What software does your company use to manage customers and jobs?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - ServiceTitan (`servicetitan`)
  - Housecall Pro (`housecall_pro`)
  - Jobber (`jobber`)
  - GoHighLevel (`gohighlevel`)
  - HubSpot (`hubspot`)
  - Salesforce (`salesforce`)
  - Another system (`custom`)
  - We don’t use one (`none`)
- **Allows Other/free text:** Yes — “Another system” displays Q85A, a required short-text field.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select a CRM or field-service system.
- **Preselected/default:** None

### Q85A

- **Question ID:** Q85A
- **Section:** Integration Systems and Final Setup
- **Exact question:** What system do you use?
- **Input type:** Short text
- **Required/Optional:** Required
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q85 = `custom` (Another system)
- **Required when displayed:** Required
- **Validation/restrictions:** Enter the system name.
- **Preselected/default:** None

### Q86

- **Question ID:** Q86
- **Section:** Integration Systems and Final Setup
- **Exact question:** Where does your company manage appointment availability?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Same system selected above (`same_as_crm`)
  - Google Calendar (`google_calendar`)
  - Microsoft Outlook / Microsoft 365 (`microsoft_outlook`)
  - Cal.com (`cal_com`)
  - Another scheduling system (`custom`)
  - We don’t use scheduling software (`none`)
- **Allows Other/free text:** Yes — “Another scheduling system” displays Q86A, a required short-text field.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select where appointments are managed.
- **Preselected/default:** None

### Q86A

- **Question ID:** Q86A
- **Section:** Integration Systems and Final Setup
- **Exact question:** What scheduling system do you use?
- **Input type:** Short text
- **Required/Optional:** Required
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q86 = `custom` (Another scheduling system)
- **Required when displayed:** Required
- **Validation/restrictions:** Enter the scheduling system name.
- **Preselected/default:** None

### Q87

- **Question ID:** Q87
- **Section:** Integration Systems and Final Setup
- **Exact question:** What phone system do you currently use?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - RingCentral (`ringcentral`)
  - Dialpad (`dialpad`)
  - Zoom Phone (`zoom_phone`)
  - GoHighLevel (`gohighlevel`)
  - Traditional landline / carrier (`traditional_landline`)
  - Mobile phones (`mobile_phones`)
  - Another phone system (`custom`)
  - Not sure (`not_sure`)
- **Allows Other/free text:** Yes — “Another phone system” displays Q87A, a required short-text field.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select your business phone system.
- **Preselected/default:** None

### Q87A

- **Question ID:** Q87A
- **Section:** Integration Systems and Final Setup
- **Exact question:** What phone system do you use?
- **Input type:** Short text
- **Required/Optional:** Required
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q87 = `custom` (Another phone system)
- **Required when displayed:** Required
- **Validation/restrictions:** Enter the phone system name.
- **Preselected/default:** None

### Q88

- **Question ID:** Q88
- **Section:** Integration Systems and Final Setup
- **Exact question:** Do you use any other software Alexander may need to work with?
- **Input type:** Multi-select / checkboxes + per-category software name
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Separate customer database (`separate_customer_database`)
  - Separate price book / estimating software (`price_book_estimating`)
  - Membership / service-plan software (`membership`)
  - Financing system (`financing`)
  - Payment system (`payment`)
  - SMS / texting platform (`sms_texting`)
  - Email / shared inbox (`email_inbox`)
  - Other (`other`)
  - None (`none`)
Multi-select of software categories. Each selected category except None shows one required short-text field labeled “What software do you use?”. None cannot be combined with another category and shows no software card. No separate Other-category label, desired-access, or other-details field is rendered.
- **Allows Other/free text:** Yes — each selected category except None shows the required open field “What software do you use?”. Other does not reveal a separate category-label field. None shows no software card.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select at least one option, or None. None cannot be combined with other categories.
- **Preselected/default:** None

### Q89

- **Question ID:** Q89
- **Section:** Integration Systems and Final Setup
- **Exact question:** Who can authorize Alexander to connect to these systems?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - I can (`self_authorized`)
  - Someone else on our team (`someone_else`)
- **Allows Other/free text:** No. Selecting someone else displays Q89A: name and email required, phone optional.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select who can authorize Alexander to connect to these systems.
- **Preselected/default:** None

### Q89A

- **Question ID:** Q89A
- **Section:** Integration Systems and Final Setup
- **Exact question:** Who should we work with?
- **Input type:** Composite structured input
- **Required/Optional:** Required
- **Answer choices:** Name (required), Email (required), Phone (optional).
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q89 = `someone_else` (Someone else)
- **Required when displayed:** Required
- **Validation/restrictions:** Name and a valid email are required. Phone is optional.
- **Preselected/default:** None

### Q90

- **Question ID:** Q90
- **Section:** Integration Systems and Final Setup
- **Exact question:** Software connection notice
- **Input type:** Required acknowledgement checkbox
- **Required/Optional:** Required
- **Answer choices:** Notice text, then one required checkbox labeled “I understand”. Notice: You’ll connect supported software securely after submitting this questionnaire. For supported integrations, you’ll sign into your own software account and authorize Alexander to access the information and actions required for your setup. Do not enter passwords or private API credentials in this questionnaire. Our team will handle the configuration and testing for you.
- **Allows Other/free text:** No
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Acknowledge the software connection notice to continue.
- **Preselected/default:** None

### Q91

- **Question ID:** Q91
- **Section:** Integration Systems and Final Setup
- **Exact question:** If Alexander can’t access a system or complete an action, what should he normally do?
- **Input type:** Single select
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - Collect the customer’s information and send the request to our team (`collect_and_send`)
  - Try to connect the customer with someone on our team (`connect_team`)
  - Follow another rule (`custom`)
- **Allows Other/free text:** Yes — “Follow another rule” displays Q91A, a required open field.
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** Select what Alexander should do when he can’t access a system.
- **Preselected/default:** Collect the customer’s information and send the request to our team (`collect_and_send`).

### Q91A

- **Question ID:** Q91A
- **Section:** Integration Systems and Final Setup
- **Exact question:** What should Alexander do?
- **Input type:** Long/open text
- **Required/Optional:** Required
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** Yes
- **Display condition:** Q91 = `custom` (Follow another rule)
- **Required when displayed:** Required
- **Validation/restrictions:** Tell us how you’d like Alexander to handle it.
- **Preselected/default:** None

### Q92

- **Question ID:** Q92
- **Section:** Integration Systems and Final Setup
- **Exact question:** Is there anything important about your company that we haven’t asked?
- **Input type:** Long/open text
- **Required/Optional:** Optional
- **Answer choices:** Open Field
- **Allows Other/free text:** No
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Optional
- **Validation/restrictions:** None
- **Preselected/default:** None

## Final Review and Submission

Not a ninth questionnaire section.

### Q93

- **Question ID:** Q93
- **Section:** Final Review and Submission
- **Exact question:** Confirm your answers
- **Input type:** Acknowledgement checkbox group
- **Required/Optional:** Required
- **Answer choices:** Exact order:
  - I confirm that these answers accurately describe how I want Alexander to represent and operate for my company. (`answersAccurate`)
  - I understand that some capabilities depend on the software and integrations my company uses. (`capabilitiesDependOnIntegrations`)
  - I understand that Alexander will only perform actions that are supported, authorized, and successfully confirmed. (`actionsRequireSupportAuthorizationConfirmation`)
Acknowledgement checkbox group on Final Review. Exact statements, in order:
  1. I confirm that these answers accurately describe how I want Alexander to represent and operate for my company.
  2. I understand that some capabilities depend on the software and integrations my company uses.
  3. I understand that Alexander will only perform actions that are supported, authorized, and successfully confirmed.
All three checkboxes are required. Final submit stays blocked until every required questionnaire section is valid and all three are checked.
- **Allows Other/free text:** No
- **Conditional:** No
- **Display condition:** Always, on its section form.
- **Required when displayed:** Required
- **Validation/restrictions:** All three confirmation statements must be checked. Submit is blocked until required questionnaire conditions are satisfied.
- **Preselected/default:** None

# Items Requiring Confirmation

**Inline conditional fields and question count** — The questionnaire currently contains 93 main questions and 44 registered conditional questions, for 137 registered Q-IDs. Some additional fields that appear conditionally are documented inside their parent question rather than receiving a separate A/B/C-style Q-ID. Please confirm whether this matches the intended definition of question/subset counting, or whether every separately displayed conditional prompt should receive its own lettered Q-ID.
