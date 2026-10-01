/** October 1 condition examples. These are input placeholders, not stored answers. */

export const PLUMBING_CONDITION_PLACEHOLDERS: Readonly<Record<string, string>> = {
  "general-plumbing-repair":
    "We handle most residential plumbing repairs. Commercial jobs and anything involving specialized equipment need approval first.",
  "toilet-repair-replacement":
    "We repair and replace standard residential toilets. Wall-hung, commercial or specialty toilets need to be reviewed first.",
  "faucet-sink-repair":
    "We handle most standard faucets and sinks. Specialty fixtures, commercial fixtures or hard-to-source imported brands may need review first.",
  "garbage-disposal":
    "We repair and replace standard residential disposals. Commercial units or unusual installations need approval first.",
  "shower-tub-repair":
    "We handle plumbing-related shower and tub repairs. We don't normally repair tile, glass, fiberglass or other non-plumbing damage.",
  "water-heater-repair":
    "We service standard residential gas and electric water heaters. Commercial units and some specialty systems need to be reviewed first.",
  "water-heater-replacement":
    "We replace standard residential water heaters. Commercial units, major relocations or installations requiring significant modifications need review first.",
  "tankless-water-heaters":
    "We work on most residential tankless systems. Some brands, commercial systems and major conversions from tank to tankless need review first.",
  "shutoff-main-valves":
    "We replace normal household shutoff and main valves. Work involving city-owned equipment or shared building shutoffs needs approval first.",
  "pressure-regulators":
    "We service residential pressure regulators. Commercial buildings or shared building systems need to be reviewed first.",
  "water-service-lines":
    "We work on the customer's portion of the water service line. Work on the utility's side of the meter or involving unusual access needs review first.",
  "frozen-pipes":
    "We handle frozen or burst pipes when they're accessible and within our service area. Major property damage or inaccessible piping may require additional review.",
  "slab-leaks":
    "We handle slab-leak detection and repair. The repair method depends on the location of the leak, access and condition of the piping, so some jobs require an inspection first.",
  repiping:
    "We do residential repipes. Large multifamily, commercial, unusual piping systems or projects requiring extensive coordination need review first.",
  "fixture-installation":
    "We install standard fixtures when they're compatible with the existing plumbing. Specialty fixtures or installations requiring major plumbing changes need review first.",
  "appliance-plumbing-connections":
    "We connect dishwashers, refrigerators/ice makers and washing machines when it's a normal plumbing installation. We don't repair the appliance itself, and unusual installations need review first.",
  "gas-line-plumbing-non-emergency":
    "We do most residential gas-line repairs and appliance connections. Large jobs, commercial properties, unusual systems or work requiring special permitting need review first.",
  excavation:
    "We provide excavation when it's part of an approved plumbing job. Jobs involving difficult access, concrete, major structures or unusual site conditions need review first.",
  "trenchless-sewer-service-line-work":
    "We offer trenchless work when the existing line, access points and site conditions make it suitable. We may need a camera inspection before confirming the repair method.",
  "water-filtration-softening-ro":
    "We install and service common residential filtration, softener and reverse-osmosis systems. Some customer-supplied, commercial or specialty systems need review first.",
  "remodel-project-work":
    "We do normal kitchen and bathroom remodel plumbing. Large remodels, additions, major plumbing relocations or projects involving plans or a general contractor need review first.",
  "other-specialty-plumbing":
    "We handle some specialty plumbing depending on the system and scope. Tell us what the customer needs and check with our team before confirming unusual work.",
};

export const DIAGNOSTIC_CONDITION_PLACEHOLDERS: Readonly<Record<string, string>> = {
  "general-diagnostic-service-visits":
    "We handle normal residential diagnostic calls. Large commercial properties, specialty systems or jobs requiring specialized equipment may need approval first.",
  "plumbing-inspections":
    "We offer general plumbing inspections. Formal real-estate, code, certification or specialty inspections may have different requirements or need approval first.",
  "leak-detection":
    "We handle most residential leak detection. Underground, slab, pool or other specialized leaks may require specific equipment or approval first.",
  "drain-cleaning":
    "We clear normal residential drain and sewer stoppages. Commercial systems, recurring main-line problems or unusual access may need additional evaluation.",
  "sewer-drain-camera-inspections":
    "We camera-inspect accessible sewer and drain lines. The line needs a usable access point and may need to be cleared first if it's completely blocked.",
  "hydro-jetting-advanced-drain-cleaning":
    "We offer hydro-jetting when the line is suitable for high-pressure cleaning. Older or damaged pipes may need a camera inspection before we approve jetting.",
};

export const CUSTOMER_PROPERTY_CONDITION_PLACEHOLDERS: Readonly<Record<string, string>> = {
  homeowners:
    "We serve homeowners normally. Rental, HOA or shared-building issues may require additional authorization depending on who is responsible for the plumbing.",
  tenants:
    "We can help tenants, but if the landlord is responsible for the plumbing or will be paying for the work, we may need the landlord or property manager's authorization before starting repairs.",
  "landlords-property-managers":
    "We work with landlords and property managers. Larger properties, work requiring owner approval or accounts with specific authorization limits may have additional requirements.",
  "single-family-homes":
    "We service single-family homes normally. Unusual properties, difficult access or plumbing shared with another property may need review first.",
  "condos-hoas":
    "We work in condos and HOA properties. Some jobs may require HOA or building approval, especially when they involve shared plumbing, common areas, building shutoffs or access through another unit.",
  "multifamily-properties":
    "We service apartments and other multifamily properties. Larger buildings or work involving shared plumbing, multiple units or building-wide shutoffs may need approval first.",
  "commercial-properties":
    "We handle light commercial properties such as offices, retail spaces and small businesses. Large commercial, industrial or specialized plumbing systems need to be reviewed first.",
  "real-estate-inspection-transaction-work":
    "We handle some inspection and transaction-related work. Formal reports, certifications, sewer inspections or requests with a closing deadline may need to be scheduled or approved differently.",
  "insurance-related-work":
    "We can perform plumbing work related to an insurance claim, but we don't guarantee coverage or negotiate claims. Special documentation, estimates or insurer requirements may need team review.",
};

export const CUSTOMER_SUPPLIED_CONDITION_PLACEHOLDER =
  "We install customer-supplied faucets, toilets and similar fixtures if they're compatible and in usable condition. We don't warranty customer-supplied products, and additional parts or modifications may cost extra.";

export const CORRECTIVE_WORK_CONDITION_PLACEHOLDER =
  "We'll usually look at work another plumber started, but we need to inspect it first. We can't guarantee we'll use or warranty the previous plumber's work, and unsafe or improper work may need to be corrected before we continue.";
