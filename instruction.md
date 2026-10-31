# Task: Blood Bank → Sample Collection screen

Build the **Sample Collection** menu in the Blood Bank section. The backend APIs are ready (reference below). Follow this project's existing conventions: the API client and session auth, the shadcn/ui components, the TanStack data table, error handling on `code`, and the folder structure. Look at the existing Blood Bank **Cases** and **Donors** screens and reuse their patterns.

## Screen layout (based on the pathology "Collection" screen)

Tabs: **Collection** | **Pending** | **Collected**

### Tab 1: Collection

1. **Work list box (top left):** one **Invoice No** input, autofocused, for a barcode scanner or typing. Enter → lookup.
   - The case number will replace the invoice number later. Keep a commented-out **Case No** input next to it.
2. **Patient Information panel (top right, read-only):**
   - Patient No (= `patient.patient_no`), Invoice No, Invoice Date (`invoice.billed_at`)
   - Patient Name, Age, Gender, Blood Group, Phone Mobile
   - Ref. Doc. Name (`invoice.referred_by`; "Self" when `is_self_referral`)
   - Case No, Care Of (`case.care_type`: daycare / out), Cause of transfusion (`case.transfusion_reason`), Remarks (`case.reference_note`)
   - Components requested: e.g. "PCV × 2, FP × 1"
3. **Grid of subjects:** one row per item in `subjects`. The patient row comes first, then the don
   - Columns: Type (Patient / Donor #sequence_no), ID (`number`: patient no or donor no), Name, Age, Gender, Blood Group, Donor Status (`case_donor_status`), Sample No, Sample Status, Collected At, **Coll.** checkbox,
     **Label** button.
   - **Coll.** checkbox is enabled only when `is_collectable` is true. The header has an **All Select** checkbox that ticks every collectable row.
   - **Label** button is enabled only when `sample` exists and `sample.status !== "rejected"`.
   - Show deferred donors greyed out with a "Deferred" badge.
4. **Action panel (right):**
   - **Collect:** posts the ticked rows. Disabled when nothing is ticked.
   - **Label (All):** prints labels for every row that has a non-rejected sample.
   - **Show Label** checkbox: when ticked, print the labels for `collected_sample_ids` right after a successful Collect.
   - Leave out the pathology screen's Split button and second grid, and the Urgent/Stat legend. Th
5. **Reprints:** if any label to be printed has `label_print_count > 0`, open a dialog asking for a **Reprint reason** (required) before calling the API. This applies to the row Label button, Label (All) and auto-print.
6. **Printing:** the API only logs the print and returns the label content. The frontend renders tint()`.
   - Label content: Code128 barcode of `sample_no`, the `sample_no` text, name, age/gender, case no, "Patient" or "Donor #n", and the collected date/time.
   - Use a print-only CSS layout for a small label. The size isn't confirmed yet, so keep it in onange.
7. After Collect or a print, update the screen from the response. No extra fetch is needed after Collect, because it returns the full screen.

### Tab 2: Pending

- A paginated table of open cases that still need a sample.
- Columns: Case No, Invoice No, Patient, Phone, Care Of, Components, Donors (`donors_count`), Registered At.
- Filter: Care Of.
- Clicking a row switches to the Collection tab and loads it with `GET cases/{id}/sample-collection`.

### Tab 3: Collected

- A paginated sample table.
- Columns: Sample No, Case No, Type, Name, ID, Status, Collected At, Collected By, Label (reprint) button.
- Filters: Sample No (scan), Case No, Status, Type, Collected from/to (default today).
- The Label button uses the same reprint dialog and calls `POST cases/{case.id}/sample-labels`.

### Permissions (granted per branch)

- `bb.sample.view`: the menu and all GET calls
- `bb.sample.collect`: the Collect button
- `bb.sample.print_label`: the Label buttons

Hide or disable controls the user lacks permission for. Still handle a `403 FORBIDDEN` from the AP

---

# API reference

Base: `/api/blood-bank`. Use the existing session/cookie client.

- JSON keys are snake_case. Dates are ISO 8601. Money is integer **paisa** (divide by 100 for display).
- Success: `{ "data": ... }`.
- Paginated lists add `meta: { page_index (0-based), page_size, page_count, row_count }` and no `links`. Requests use `page` (1-based) and `per_page` (max 100). Show next/prev only, with `row_count` as the total.
- Filters use `filter[name]=value`. Sorting uses `sort=field` or `sort=-field`.
- Errors: `{ "message", "code" }`. Validation errors: `422 { "message", "code": "VALIDATION_FAILED", "errors": { "field": ["..."] } }`. Base UI reactions on `code`, never on `message`.

## Shared shapes

**Patient** (`patient`):

```json
{
  "id": 1,
  "patient_no": "P2610310001",
  "title": "mr",
  "name": "Rahim Uddin",
  "age_years": 40,
  "age_months": null,
  "age_days": null,
  "date_of_birth": "1986-01-01",
  "gender": "male",
  "blood_group": "O_POS",
  "phone": "01711000000",
  "address": "..."
}
```

**Invoice** (`invoice`):

```json
{
  "id": 5,
  "invoice_no": "NB2610310001",
  "amount": 150000,
  "status": "...",
  "billed_at": "2026-10-31T10:15:00+06:00",
  "is_self_referral": false,
  "referred_by": "Dr. X"
}
```

**Subject** (a grid row; the fields are the same for patient and donor):

```json
{
  "subject_type": "patient|donor",
  "case_donor_id": null,
  "case_donor_status": null,
  "sequence_no": null,
  "number": "P2610310001",
  "name": "Rahim Uddin",
  "age": 40,
  "gender": "male",
  "blood_group": "O_POS",
  "phone": "017..."
}
```

- For a donor: `case_donor_id` and `sequence_no` are set, `case_donor_status` is `registered|eligi`number`is the donor no (e.g.`D2610000001`).

**Enums**

- Sample `status`: `collected | in_testing | tested | rejected`
- Case `status`: `open | closed | cancelled`
- `care_type`: `daycare | out`
- `blood_group`: `A_POS, A_NEG, B_POS, B_NEG, AB_POS, AB_NEG, O_POS, O_NEG`; display as A+, A−, …

## 1. Scan invoice → collection screen

`GET /sample-collection?invoice_no=NB2610310001`

The invoice can be the case bill or a replacement donor's bill. Response `200`:

```json
{ "data": {
  "case": { "id": 12, "case_no": "BC2610000012", "status": "open", "care_type": "daycare",
            "transfusion_reason": "Thalassemia", "reference_note": null,
            "created_at": "2026-10-31T09:00:00+06:00",
            "components": [ { "component_type_id": 2, "code": "PCV", "name": "Packed Cell Volume", "quantity": 2 } ] },
  "patient": { ...Patient },
  "invoice": { ...Invoice },
  "subjects": [
    { ...Subject (patient), "is_collectable": true, "sample": null },
    { ...Subject (donor), "is_collectable": false,
      "sample": { "id": 40, "sample_no": "S2610310002", "status": "collected",
                  "collected_at": "2026-10-31T10:20:00+06:00", "label_print_count": 1 } }
  ],
  "collected_sample_ids": []
} }
```

Errors:

- `404 CASE_NOT_FOUND`: no case of the current branch for this invoice. Show "No Blood Bank case fear the panel.
- `422 VALIDATION_FAILED`: `invoice_no` is missing.

## 2. Open the screen by case (from the Pending tab)

`GET /cases/{caseId}/sample-collection`. The response is the same as #1.

- `403 FORBIDDEN`: case of another branch or no permission.
- `404 NOT_FOUND`: unknown case.

## 3. Collect samples

`POST /cases/{caseId}/samples`

```json
{
  "subjects": [
    { "subject_type": "patient" },
    { "subject_type": "donor", "case_donor_id": 31 }
  ],
  "collected_at": "2026-10-31T10:20:00+06:00"
}
```

- `collected_at` is optional (defaults to now) and can't be in the future.
- 1–20 subjects. The patient may appear only once.
- Either every row is collected or none are.

Response `201`: the same shape as #1. `collected_sample_ids` holds the new sample ids; use it for auto-print when "Show Label" is ticked.

Errors (show a toast, keep the ticks, re-fetch the screen):

| Status | Code                       | Meaning                                                                                   |
| ------ | -------------------------- | ----------------------------------------------------------------------------------------- |
| 409    | `SAMPLE_ALREADY_COLLECTED` | A row already has a sample (someone else collected it)                                    |
| 422    | `DONOR_DEFERRED`           | Donor was deferred                                                                        |
| 422    | `CASE_DONOR_NOT_IN_CASE`   | Donor doesn't belong to this case                                                         |
| 422    | `CASE_NOT_OPEN`            | Case closed or cancelled                                                                  |
| 422    | `VALIDATION_FAILED`        | Bad body (`errors.subjects`, `errors["subjects.0.case_donor_id"]`, `errors.collected_at`) |
| 403    | `FORBIDDEN`                | No `bb.sample.collect` in this branch, or the case belongs to another branch              |

## 4. Print labels (single or all)

`POST /cases/{caseId}/sample-labels`

```json
{ "sample_ids": [40, 41], "reprint_reason": "Label smudged" }
```

- 1–20 ids, all from this case.
- `reprint_reason` (max 500) is required when any label was printed before.
- Logged all or nothing.

Response `200`, one item per id in the order sent:

```json
{ "data": [ {
  "id": 40, "sample_no": "S2610310002", "status": "collected",
  "collected_at": "2026-10-31T10:20:00+06:00",
  "case": { "id": 12, "case_no": "BC2610000012", "care_type": "daycare" },
  "subject": { ...Subject },
  "label_print": { "is_reprint": true, "reprint_reason": "Label smudged", "printed_at": "2026-10-3
} ] }
```

Render and print the labels only after a successful response.

Errors:

| Status | Code                      | What the frontend does           |
| ------ | ------------------------- | -------------------------------- |
| 422    | `REPRINT_REASON_REQUIRED` | Open the reason dialog and retry |
| 422    | `SAMPLE_NOT_IN_CASE`      | —                                |
| 403    | `FORBIDDEN`               | —                                |

## 5. Pending tab

`GET /sample-collection/pending?page=1&per_page=25&filter[care_type]=daycare&sort=created_at`

Sorts: `created_at` (default, oldest first) and `case_no`. Response is paginated:

```json
{ "data": [ { "id": 12, "case_no": "BC2610000012", "branch_id": 1, "status": "open",
    "care_type": "daycare", "transfusion_reason": "...", "reference_note": null, "supplied_at": null,
    "patient": { ...Patient }, "invoice": { ...Invoice },
    "components": [ { "component_type_id": 2, "code": "PCV", "name": "...", "quantity": 2 } ],
    "donors_count": 2, "created_at": "..." } ],
  "meta": { "page_index": 0, "page_size": 25, "page_count": 1, "row_count": 3 } }
```

## 6. Collected tab / sample scan

`GET /samples?page=1&per_page=25&filter[collected_from]=2026-10-31&filter[collected_to]=2026-10-31&sort=-collected_at`

- Filters: `filter[sample_no]` (exact, for a barcode scan), `filter[case_no]` (exact), `filter[status]`, `filter[subject_type]` (`patient|donor`), `filter[collected_from]` / `filter[collected_to]` (`Y-m-d`, inclusive).
- Sorts: `collected_at` (default newest first) and `sample_no`.
- Each item has the same shape as in #4, plus `"collected_by": { "id": 3, "name": "..." }` and without `label_print`.
- Errors: `422 VALIDATION_FAILED` for a bad date, `400 INVALID_QUERY` for an unknown filter or sor

## Common errors on any call

| Status | Code                  | What the frontend does                |
| ------ | --------------------- | ------------------------------------- |
| 401    | `UNAUTHENTICATED`     | Go to login                           |
| 403    | `FORBIDDEN`           | Show a no-access message              |
| 419    | `CSRF_TOKEN_MISMATCH` | Refresh the CSRF token and retry once |

---

## Done when

- Scanning an invoice fills the panel and grid. Collecting with "Show Label" ticked prints the lab
- A second label print asks for a reason.
- Error codes show friendly messages.
- Pending → row click opens the Collection tab, and the Collected tab filters work.
- The UI works at desktop width (it's a lab workstation screen), with keyboard flow: scan → Enter
