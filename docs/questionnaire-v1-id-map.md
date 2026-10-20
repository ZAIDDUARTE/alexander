# Questionnaire v1.0 — Permanent Q-ID Map

Freeze commit: `f6feb475ddb8d3f8d2ff03d3b8af280eee6713f1`  
Questionnaire schemaVersion: **10**  
Generated from frozen source + evidence fixtures.

## Counts

| Metric | Value |
| --- | --- |
| Root questions (Q1…Qn) | 93 |
| Conditional child questions | 44 |
| Final root Q-ID | Q93 |
| Final Review / Submission Q-ID | Q93 |
| Questionnaire sections | 8 |
| Final Review and Submission | After Section 8; **not** Section 9 |

## Section 4 reconciliation

- Evidence bundle previously said **26** top-level QuestionCards.
- Frozen `Section4Form.tsx` contains exactly **25** `<QuestionCard>` elements.
- Child components under Section 4 contain **0** QuestionCards.
- Cause: factual miscount in the evidence bundle prose (table E-S4-01…E-S4-25 was already correct).
- Of the 25 cards, **2** render only when `mayArrangeCallback === "yes"` and are numbered as conditional children of that parent (not separate roots).

## ID assignment rules applied

- Root IDs follow frozen customer-visible question order.
- Conditional follow-up prompts receive letter suffixes.
- Matrix rows use catalog item IDs, not new Q numbers.
- Repeater instances use entity IDs, not Q numbers.
- Historical progress ids (q104…) and `Q114_CONFIRMATIONS` are **not** permanent public IDs.

## Root questions

| Q-ID | Evidence | Section | Exact question | Raw path | File | Kind |
| --- | --- | --- | --- | --- | --- | --- |
| Q1 | E-S1-01 | S1 Your Company | What name do your customers know your company by? | `section1.customerFacingName` | Section1Form.tsx | root |
| Q2 | E-S1-02 | S1 Your Company | What is your legal business name? | `section1.legalName` | Section1Form.tsx | root |
| Q3 | E-S1-03 | S1 Your Company | What is your main business phone number? | `section1.mainPhone` | Section1Form.tsx | root |
| Q4 | E-S1-04 | S1 Your Company | What is your website? | `section1.website` | Section1Form.tsx | root |
| Q5 | E-S1-05 | S1 Your Company | Which of these may Alexander tell customers about your company? | `section1.approvedClaims` | Section1Form.tsx | root |
| Q6 | E-S1-06 | S1 Your Company | Are there any license numbers or credential details Alexander may give customers? | `section1.licensingDetails` | Section1Form.tsx | root |
| Q7 | E-S1-07 | S1 Your Company | Is there anything Alexander should never claim about your company? | `section1.forbiddenClaims` | Section1Form.tsx | root |
| Q8 | E-S1-08 | S1 Your Company | What are your normal office hours? | `section1.officeHours` | Section1Form.tsx | root |
| Q9 | E-S1-09 | S1 Your Company | When are service appointments normally available? | `section1.serviceHours` | Section1Form.tsx | root |
| Q10 | E-S1-10 | S1 Your Company | When should Alexander answer your calls? | `section1.answeringMode` | Section1Form.tsx | root |
| Q11 | E-S1-11 | S1 Your Company | Is there any recurring availability rule Alexander should know? | `section1.recurringAvailabilityNotes` | Section1Form.tsx | root |
| Q12 | E-S2-01 | S2 Your Services | Which plumbing services does your company provide? | `section2.plumbingServices[serviceId].{policy,condition}` | Section2Form.tsx + ServicePolicy.tsx | root |
| Q13 | E-S2-02 | S2 Your Services | Which diagnostic and drain services does your company provide? | `section2.diagnosticServices[serviceId].{policy,condition}` | Section2Form.tsx + ServicePolicy.tsx | root |
| Q14 | E-S2-03 | S2 Your Services | Who does your company serve? | `section2.customerPropertyTypes[typeId].{policy,condition}` | Section2Form.tsx + ServicePolicy.tsx | root |
| Q15 | E-S2-04 | S2 Your Services | Will you install or work with items supplied by the customer? | `section2.customerSuppliedMaterialsPolicy` | Section2Form.tsx | root |
| Q16 | E-S2-05 | S2 Your Services | Will you repair or finish work another plumber started? | `section2.correctiveWorkPolicy` | Section2Form.tsx | root |
| Q17 | E-S2-06 | S2 Your Services | How would you like to define your normal service area? | `section2.serviceAreaDefinitionMode + active geo branch fields` | Section2Form.tsx | root |
| Q18 | E-S2-07 | S2 Your Services | Are there any areas inside or near your service area that you do not serve? | `section2 excluded-area fields` | Section2Form.tsx | root |
| Q19 | E-S2-08 | S2 Your Services | Are there areas you serve only under certain conditions? | `section2.hasConditionalTerritory` | Section2Form.tsx | root |
| Q20 | E-S2-09 | S2 Your Services | Is your after-hours service area different? | `section2.afterHoursAreaMode + after-hours geo` | Section2Form.tsx | root |
| Q21 | E-S3-01 | S3 Emergencies | How should Alexander treat each of these situations? | `section3.emergencyClassifications[scenarioId]` | EmergencyClassification.tsx | root |
| Q22 | E-S3-02 | S3 Emergencies | Are there any emergencies where Alexander must get human approval before arranging emergency dispatch? | `section3.dispatchApproval (+ dispatchApprovalOtherDetail)` | Section3Form.tsx | root |
| Q23 | E-S3-03 | S3 Emergencies | What should Alexander do with calls that come in after hours? | `section3.afterHoursDisposition.{emergency,urgent_contained,routine}` | AfterHoursDispositionMatrix.tsx | root |
| Q24 | E-S3-04 | S3 Emergencies | When is after-hours emergency field service available? | `section3.emergencyServiceMode` | Section3Form.tsx | root |
| Q25 | E-S3-05 | S3 Emergencies | Who should Alexander contact first when a call requires immediate human attention? | `section3.primaryContactId → contacts[]` | Section3Form.tsx | root |
| Q26 | E-S3-06 | S3 Emergencies | Is there a backup person Alexander should contact? | `section3.hasBackupContact` | Section3Form.tsx | root |
| Q27 | E-S3-07 | S3 Emergencies | What should Alexander do if nobody on your team answers? | `section3.nobodyRespondsFallback` | Section3Form.tsx | root |
| Q28 | E-S3-08 | S3 Emergencies | How should Alexander retry an unanswered contact? | `section3.retryPolicy` | Section3Form.tsx | root |
| Q29 | E-S3-09 | S3 Emergencies | What should Alexander do if an emergency comes in and your schedule is already full? | `section3.capacityMode` | Section3Form.tsx | root |
| Q30 | E-S4-01 | S4 Scheduling | What should Alexander do if a caller asks to speak with a person? | `section4.humanRequestPolicy (+ humanRequestCustomRule)` | Section4Form.tsx | root |
| Q31 | E-S4-02 | S4 Scheduling | What should Alexander do if a caller doesn’t want to speak with AI? | `section4.aiRefusalPolicy (+ aiRefusalCustomRule)` | Section4Form.tsx | root |
| Q32 | E-S4-03 | S4 Scheduling | Who can approve these types of exceptions? | `section4.exceptionAuthority[exceptionTypeId]` | ExceptionAuthorityMatrix.tsx | root |
| Q33 | E-S4-04 | S4 Scheduling | What should Alexander do if the person who must approve an exception isn’t available? | `section4.approverUnavailablePolicy` | Section4Form.tsx | root |
| Q34 | E-S4-05 | S4 Scheduling | What can different types of callers authorize? | `section4.callerPermissions[callerTypeId]` | CallerAuthorizationMatrix.tsx | root |
| Q35 | E-S4-06 | S4 Scheduling | Are there spending limits for any of these callers? | `section4.hasSpendingLimits` | Section4Form.tsx | root |
| Q36 | E-S4-07 | S4 Scheduling | Do emergency situations change any of these authorization rules? | `section4.emergencyAuthorizationMode` | Section4Form.tsx | root |
| Q37 | E-S4-08 | S4 Scheduling | What is Alexander normally allowed to do when a customer wants an appointment? | `section4.defaultBookingMode` | Section4Form.tsx | root |
| Q38 | E-S4-09 | S4 Scheduling | How far in advance may Alexander schedule appointments? | `section4 booking-horizon fields` | Section4Form.tsx | root |
| Q39 | E-S4-10 | S4 Scheduling | What appointment windows do you offer? | `section4.appointmentWindows[]` | AppointmentWindowEditor.tsx | root |
| Q40 | E-S4-11 | S4 Scheduling | When an appointment is successfully confirmed, what information may Alexander repeat to the customer? | `section4.confirmationInfo[]` | Section4Form.tsx | root |
| Q41 | E-S4-12 | S4 Scheduling | Do any types of jobs follow different booking rules? | `section4.hasServiceBookingRules` | Section4Form.tsx | root |
| Q42 | E-S4-13 | S4 Scheduling | When may Alexander offer same-day or holiday appointments? | `section4.capacityPolicies.{same_day,holiday}.{policy,condition}` | Section4Form.tsx | root |
| Q43 | E-S4-14 | S4 Scheduling | What may Alexander do when a customer wants to reschedule? | `section4.rescheduleAuthority` | Section4Form.tsx | root |
| Q44 | E-S4-15 | S4 Scheduling | What may Alexander do when a customer wants to cancel? | `section4.cancellationAuthority` | Section4Form.tsx | root |
| Q45 | E-S4-16 | S4 Scheduling | Do you charge a late-cancellation fee? | `section4.lateCancellationFeeMode (+ linked fee notice/when; NO amount in Scheduling)` | Section4Form.tsx | root |
| Q46 | E-S4-17 | S4 Scheduling | Do you charge a no-show fee? | `section4.noShowFeeMode (+ linked fee when; NO amount in Scheduling)` | Section4Form.tsx | root |
| Q47 | E-S4-18 | S4 Scheduling | Are there exceptions to your cancellation or no-show rules? | `section4.cancellationNoShowExceptions` | Section4Form.tsx | root |
| Q48 | E-S4-19 | S4 Scheduling | What should Alexander do if the customer needs service but there are no appropriate appointments available? | `section4.noAvailabilityFallbackOrder[]` | Section4Form.tsx + PriorityOrderList.tsx | root |
| Q49 | E-S4-20 | S4 Scheduling | May Alexander arrange a callback when no appointment is available? | `section4.mayArrangeCallback` | Section4Form.tsx | root |
| Q50 | E-S4-23 | S4 Scheduling | Are there any jobs that require a particular technician? | `section4 technician-requirement fields` | Section4Form.tsx | root |
| Q51 | E-S4-24 | S4 Scheduling | What should Alexander do if a customer asks for a specific technician? | `section4.specificTechnicianPolicy` | Section4Form.tsx | root |
| Q52 | E-S4-25 | S4 Scheduling | What should Alexander do when a customer has several plumbing issues? | `section4.multiIssuePolicy` | Section4Form.tsx | root |
| Q53 | E-S5-01 | S5 Pricing and Payments | How does your company normally price plumbing work? | `section5.pricingModels (+ pricingModelOther)` | PricingCoreFields.tsx | root |
| Q54 | E-S5-02 | S5 Pricing and Payments | May Alexander quote prices for your services? | `section5.mayQuoteServicePrices` | PricingCoreFields.tsx | root |
| Q55 | E-S5-04 | S5 Pricing and Payments | What should Alexander do when he doesn't have an approved price? | `section5.unknownPriceBehavior` | PricingCoreFields.tsx | root |
| Q56 | E-S5-05 | S5 Pricing and Payments | Which additional fees does your company charge? | `section5.additionalFeeSelection + additionalFeeDetails[category]` | PricingCoreFields.tsx | root |
| Q57 | E-S5-06 | S5 Pricing and Payments | Do any areas have different travel fees or minimum charges? | `section5.hasAreaTravelOrMinimum` | PricingCoreFields.tsx | root |
| Q58 | E-S5-07 | S5 Pricing and Payments | Does your company mark up parts or materials? | `section5.materialMarkupPolicy` | PricingCoreFields.tsx | root |
| Q59 | E-S5-08 | S5 Pricing and Payments | What payment methods do you accept? | `section5.paymentMethods (+ paymentMethodOther)` | Section5Form.tsx | root |
| Q60 | E-S5-09 | S5 Pricing and Payments | When is payment normally due? | `section5.paymentDuePolicies` | Section5Form.tsx | root |
| Q61 | E-S5-10 | S5 Pricing and Payments | Can Alexander help customers make a payment? | `section5.paymentAssistance` | Section5Form.tsx | root |
| Q62 | E-S5-11 | S5 Pricing and Payments | What may Alexander help collect payment for? | `section5.paymentCollectionScope (+ paymentCollectionOther)` | Section5Form.tsx | root |
| Q63 | E-S5-12 | S5 Pricing and Payments | What financial remedies may Alexander approve without human approval? | `section5.financialRemedies + remedyRules[remedyId]` | Section5Form.tsx | root |
| Q64 | E-S6-01 | S6 Customer Care | What should Alexander do when a customer says there’s a problem with work your company already performed? | `section6.previousWorkInitialAction (+ related fields)` | Section6Form.tsx | root |
| Q65 | E-S6-02 | S6 Customer Care | What should Alexander do if the customer has already called back about the same problem? | `section6.repeatCallbackAction (+ related fields)` | Section6Form.tsx | root |
| Q66 | E-S6-03 | S6 Customer Care | When should Alexander involve someone on your team because a customer is unhappy? | `section6.escalationTriggers (+ other detail)` | Section6Form.tsx | root |
| Q67 | E-S6-04 | S6 Customer Care | What should Alexander never promise an unhappy customer? | `section6.forbiddenUnhappyPromises (+ other)` | Section6Form.tsx | root |
| Q68 | E-S6-05 | S6 Customer Care | How should Alexander handle other types of calls? | `section6.nonServiceCallPolicies[]` | NonServiceCallMatrix.tsx | root |
| Q69 | E-S6-06 | S6 Customer Care | What customer information may Alexander use when helping an existing customer? | `section6.customerHistoryPolicy` | Section6Form.tsx | root |
| Q70 | E-S6-07 | S6 Customer Care | Are there customer records or documents Alexander should never disclose? | `section6.restrictedInformation (+ other)` | Section6Form.tsx | root |
| Q71 | E-S6-08 | S6 Customer Care | How proactive should Alexander be about recommending additional services? | `section6.additionalServicePolicy` | Section6Form.tsx | root |
| Q72 | E-S6-09 | S6 Customer Care | Are there any other rules Alexander should follow for unusual calls? | `section6.unusualCallNotes` | Section6Form.tsx | root |
| Q73 | E-S7-01 | S7 Voice and Conversation | Which language or languages should Alexander support with callers? | `section7.englishOnly + section7.callerLanguages` | Section7Form.tsx | root |
| Q74 | E-S7-02 | S7 Voice and Conversation | Which voice should Alexander use? | `section7.voiceSelection (+ anotherApprovedVoiceId)` | Section7Form.tsx + VoicePreviewCard.tsx | root |
| Q75 | E-S7-03 | S7 Voice and Conversation | How should Alexander’s communication style feel? | `section7.communicationStyle` | Section7Form.tsx | root |
| Q76 | E-S7-04 | S7 Voice and Conversation | What name should Alexander use when introducing himself? | `section7.spokenNameMode` | Section7Form.tsx | root |
| Q77 | E-S7-05 | S7 Voice and Conversation | How should Alexander identify himself as an AI? | `section7.aiDisclosureStyle` | Section7Form.tsx | root |
| Q78 | E-S7-06 | S7 Voice and Conversation | Are there any company, people, city, neighborhood, or brand names that Alexander must pronounce correctly? | `section7.pronunciationMode` | Section7Form.tsx | root |
| Q79 | E-S7-07 | S7 Voice and Conversation | If a caller speaks a supported second language, what should Alexander normally do? | `section7.languageSwitchingPolicy` | Section7Form.tsx | root |
| Q80 | E-S7-08 | S7 Voice and Conversation | Do you have a preference for the perceived voice presentation? | `section7.perceivedVoicePreference` | Section7Form.tsx | root |
| Q81 | E-S7-09 | S7 Voice and Conversation | Do you have a preferred accent or regional character? | `section7.accentPreference` | Section7Form.tsx | root |
| Q82 | E-S7-10 | S7 Voice and Conversation | How formal should Alexander sound? | `section7.formalityPreference` | Section7Form.tsx | root |
| Q83 | E-S7-11 | S7 Voice and Conversation | Are there any phrases Alexander should use or avoid because of your company’s brand? | `section7.brandPhrasesAndAvoidances` | Section7Form.tsx | root |
| Q84 | E-S7-12 | S7 Voice and Conversation | Is there anything else about Alexander’s voice or identity that we should review with you? | `section7.additionalReviewNotes` | Section7Form.tsx | root |
| Q85 | E-S8-01 | S8 Integration Systems and Final Setup | What software does your company use to manage customers and jobs? | `section8.crmFsmProvider` | Section8Form.tsx | root |
| Q86 | E-S8-02 | S8 Integration Systems and Final Setup | Where does your company manage appointment availability? | `section8.schedulingProvider` | Section8Form.tsx | root |
| Q87 | E-S8-03 | S8 Integration Systems and Final Setup | What phone system do you currently use? | `section8.phoneProvider` | Section8Form.tsx | root |
| Q88 | E-S8-04 | S8 Integration Systems and Final Setup | Do you use any other software Alexander may need to work with? | `section8.additionalSoftwareCategories + additionalSoftwareCards[]` | Section8Form.tsx + AdditionalSoftwareCardEditor.tsx | root |
| Q89 | E-S8-05 | S8 Integration Systems and Final Setup | Who can authorize Alexander to connect to these systems? | `section8.connectionOwnerMode` | Section8Form.tsx | root |
| Q90 | E-S8-06 | S8 Integration Systems and Final Setup | Software connection notice | `section8.connectionNoticeAcknowledged` | Section8Form.tsx | root |
| Q91 | E-S8-07 | S8 Integration Systems and Final Setup | If Alexander can’t access a system or complete an action, what should he normally do? | `section8.failureFallback` | Section8Form.tsx | root |
| Q92 | E-S8-08 | S8 Integration Systems and Final Setup | Is there anything important about your company that we haven’t asked? | `section8.finalOperatingNotes` | Section8Form.tsx | root |
| Q93 | Q114_CONFIRMATIONS (historical constant only) | SUBMISSION Final Review and Submission | Final confirmations | `draft.submission.confirmations.{answersAccurate,capabilitiesDependOnIntegrations,actionsRequireSupportAuthorizationConfirmation}` | OnboardingGlobalReview.tsx + section8Catalog.ts Q114_CONFIRMATIONS | root |

## Conditional child questions

| Q-ID | Parent | Section | Exact question / prompt | Display condition | Raw path |
| --- | --- | --- | --- | --- | --- |
| Q5A | Q5 | S1 | What other credential or trust claim may Alexander tell customers? | Q5 includes other | `section1.otherApprovedClaim` |
| Q10A | Q10 | S1 | What hours should Alexander answer your calls? | Q10 = specific_hours | `section1.answeringSchedule` |
| Q15A | Q15 | S2 | What are the conditions? | Q15 = with_conditions | `section2.customerSuppliedMaterialsCondition` |
| Q16A | Q16 | S2 | What are the conditions? | Q16 = with_conditions | `section2.correctiveWorkCondition` |
| Q19A | Q19 | S2 | Conditional territory details | Q19 = yes | `section2.conditionalTerritories[]` |
| Q26A | Q26 | S3 | Backup contact | Q26 = yes | `section3.backupContactId → contacts[]` |
| Q27A | Q27 | S3 | Custom nobody-responds rule | Q27 = custom | `section3.nobodyRespondsCustom` |
| Q28A | Q28 | S3 | Custom retry rule | Q28 = custom | `section3.retryCustom` |
| Q29A | Q29 | S3 | Capacity-mode branch details | Q29 selects a branch that reveals notes/approver fields | `section3.reservedCapacityNotes \| emergencyOverrideNotes \| capacityApproverContactId` |
| Q30A | Q30 | S4 | Custom human-request rule | Q30 = custom | `section4.humanRequestCustomRule` |
| Q31A | Q31 | S4 | Custom AI-refusal rule | Q31 = custom | `section4.aiRefusalCustomRule` |
| Q33A | Q33 | S4 | Other approver-unavailable rule | Q33 = other | `section4.approverUnavailableOther` |
| Q35A | Q35 | S4 | Spending limit rows | Q35 = yes | `section4.spendingLimits[]` |
| Q36A | Q36 | S4 | Emergency special authorization rules | Q36 = special_rules | `section4.emergencyAuthorizationRules` |
| Q41A | Q41 | S4 | Service booking rule rows | Q41 = yes | `section4.serviceBookingRules[]` |
| Q43A | Q43 | S4 | Reschedule conditions | Q43 = conditional | `section4.rescheduleConditions` |
| Q44A | Q44 | S4 | Cancellation conditions | Q44 = conditional | `section4.cancellationConditions` |
| Q45A | Q45 | S4 | Late-cancellation fee details (notice / when) | Q45 = yes or conditional | `linked FeeRecord fields + late-cancellation when/notice` |
| Q46A | Q46 | S4 | No-show fee details (when) | Q46 = yes or conditional | `linked FeeRecord + no-show when` |
| Q49A | Q49 | S4 | What phone number should Alexander use for the callback? | Q49 = yes | `section4.callbackNumberPolicy` |
| Q49B | Q49 | S4 | Who should receive or handle scheduling callbacks? | Q49 = yes | `section4.callbackOwnerContactId → contacts[]` |
| Q50A | Q50 | S4 | Technician requirement details | Q50 = yes (reveals detail panel) | `section4 technician requirement detail fields` |
| Q52A | Q52 | S4 | Multi-issue custom / branch details | Q52 selects a branch that reveals extra fields | `section4 multi-issue conditional fields` |
| Q53A | Q53 | S5 | Describe your other pricing method | Q53 includes other | `section5.pricingModelOther` |
| Q54A | Q54 | S5 | What service prices may Alexander quote? | Q54 = allowed | `section5.servicePrices[]` |
| Q57A | Q57 | S5 | Area / Fee or minimum rows | Q57 = yes | `section5.areaPricingRows[]` |
| Q58A | Q58 | S5 | What may Alexander tell customers about material pricing? | Q58 = yes or sometimes | `section5.materialMarkupCustomerExplanation` |
| Q59A | Q59 | S5 | Other payment method | Q59 includes other | `section5.paymentMethodOther` |
| Q62A | Q62 | S5 | Other payment | Q62 includes other | `section5.paymentCollectionOther` |
| Q66A | Q66 | S6 | Other escalation trigger detail | Q66 includes other | `section6.escalationTriggerOther` |
| Q67A | Q67 | S6 | Other forbidden promise | Q67 includes other | `section6.forbiddenUnhappyPromiseOther` |
| Q70A | Q70 | S6 | Other restricted information | Q70 includes other | `section6.restrictedInformationOther` |
| Q73A | Q73 | S7 | Other supported language | Q73 includes other and not english_only | `section7.otherSupportedLanguage` |
| Q74A | Q74 | S7 | Another approved voice selection | Q74 = another_approved AND additional voices catalog non-empty | `section7.anotherApprovedVoiceId` |
| Q76A | Q76 | S7 | Spoken receptionist name | Q76 = company_specific or another_approved | `section7.spokenDisplayName` |
| Q77A | Q77 | S7 | Approved disclosure wording | Q77 = custom | `section7.aiDisclosureCustom` |
| Q78A | Q78 | S7 | Pronunciation entries | Q78 = yes | `section7.pronunciationEntries[]` |
| Q79A | Q79 | S7 | Language-switching rule | Q79 = custom | `section7.languageSwitchingCustomRule` |
| Q81A | Q81 | S7 | Other approved accent | Q81 = other_approved | `section7.accentOtherApproved` |
| Q85A | Q85 | S8 | What system do you use? | Q85 = custom (Another system) | `section8.crmFsmCustomName` |
| Q86A | Q86 | S8 | What scheduling system do you use? | Q86 = custom | `section8.schedulingCustomName` |
| Q87A | Q87 | S8 | What phone system do you use? | Q87 = custom | `section8.phoneCustomName` |
| Q89A | Q89 | S8 | Who should we work with? | Q89 = someone_else | `section8.connectionOwnerName / connectionOwnerEmail / connectionOwnerPhone` |
| Q91A | Q91 | S8 | What should Alexander do? | Q91 = custom (Follow another rule) | `section8.failureFallbackCustom` |

## Integrity checks

- Duplicate Q-IDs: none (generator assigned sequentially)
- Root numbers: Q1…Q93 contiguous
- Every child references a parent in the root set
- Dispatch / capability checklist / deleted pricing: not present
