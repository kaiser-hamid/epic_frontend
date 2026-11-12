Update the Blood Bank donor registration UI and donor displays for 5 new donor fields.

API changes (all fields optional/nullable, snake_case):

- father_name: string, max 255
- marital_status: enum "single" | "married" | "divorced" | "widowed"
- religion: enum "islam" | "hinduism" | "buddhism" | "christianity" | "other"
- relationship: string, max 100 (the donor's relationship to the patient, e.g. "Brother")
- occupation: string, max 100

Where they apply:

1. Request: the donor object accepted when registering a donor. This is `donors[].donor` in
   POST /api/blood-bank/cases and `donor` in POST /api/blood-bank/cases/{case}/donors.
   Send these fields alongside the existing name, age/date_of_birth, gender, blood_group,
   phone, address, national_id and is_regular_volunteer. Omit a field or send null if empty.
2. Response: the donor resource now always includes father_name, marital_status, religion,
   relationship and occupation (null when not set). This covers:
   - GET /api/blood-bank/donors
   - GET /api/blood-bank/donors/lookup
   - GET /api/blood-bank/donors/{id}
   - the `donor` object inside case donors (case responses and add-donor responses)

Tasks:

- Add the fields to the donor type/interface and to the Zod/form schema:
  - father_name, relationship and occupation: optional strings with max lengths 255 / 100 / 100.
  - marital_status and religion: optional enums using the values above.
- Add inputs to the donor registration form: Father's Name (text), Marital Status (select),
  Religion (select), Relationship (text) and Occupation (text).
  - Select labels: Single / Married / Divorced / Widowed and Islam / Hinduism / Buddhism / Christianity / Other.
  - Marital status values are the same ones the patient form already uses, so reuse that option
- When the user picks a returning donor from the phone lookup, pre-fill these fields from the
  response like the other donor fields.
- Show the new fields on the donor detail view and on any donor card or summary that already
  shows the other donor fields.
- Map server validation errors (code VALIDATION_FAILED) to the new field paths, for example
  donors.0.donor.religion, donors.0.donor.marital_status and donors.0.donor.father_name.
