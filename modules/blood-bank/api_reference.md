# Blood Bank API: cases

Frontend reference for Blood Bank cases. Cases are opened by saving a Blood Bank bill in Billing; there is no case create endpoint.

| Method | Path                                  | Purpose                                              | Permission          |
| ------ | ------------------------------------- | ---------------------------------------------------- | ------------------- |
| POST   | `/api/billing/invoices`               | Save a bill; a Blood Bank bill also opens its case   | `sh.billing.create` |
| GET    | `/api/blood-bank/cases`               | List the cases of the branch you logged in to        | `bb.case.view`      |
| GET    | `/api/blood-bank/cases/{case}`        | Case detail                                          | `bb.case.view`      |
| PATCH  | `/api/blood-bank/cases/{case}`        | Edit "Care of", cause of transfusion, reference note | `bb.case.update`    |
| POST   | `/api/blood-bank/cases/{case}/donors` | Add a donor under an existing bill                   | `bb.case.update`    |

Permissions are granted per user per branch. All calls work only inside the branch chosen at login.

## Common

- **Auth:** Sanctum SPA cookie session. Send `credentials: 'include'`, the `X-XSRF-TOKEN` header, and `Accept: application/json`.
- **Body:** JSON (`Content-Type: application/json`), not multipart.
- **Keys:** `snake_case`. Dates are ISO 8601 (`2026-10-28T10:15:00+06:00`); plain dates are `YYYY-MM-DD`.
- **Money:** integer **paisa** (`150000` = 1,500.00). Totals are computed by the server; never send a rate or amount.
- **Errors:** `{ "message": "...", "code": "..." }`. React to `code`, not `message`.

---

## Opening a case: POST /api/billing/invoices

There is no case create endpoint. A case is opened when a **Blood Bank bill** is saved on New Bill Entry (`POST /api/billing/invoices`, permission `sh.billing.create`), in the same transaction: if the case can't be opened, the bill isn't saved either.

- A bill is Blood Bank when its items have `category: "blood_bank"` (`GET /api/test-items/lookup?category=blood_bank` lists them). It may not mix Blood Bank and other items: `422 INVOICE_CATEGORY_MIXED`.
- A Blood Bank bill needs `category_details.care_type` (`daycare` / `out`); a general bill refuses `category_details`.
- Billed items that are component types (`bb_component_types.test_item_id`) become the case's `components` with the line quantity.
- `idempotency_key` (uuid, one per form session) makes a resubmit return the saved bill (`200`) without a second case; another user's key → `409 IDEMPOTENCY_KEY_REUSED`.

```json
{
  "idempotency_key": "4f1c2a7e-0b8d-4c55-9a3e-2f0d6c1b9e11",
  "patient_id": 9,
  "items": [{ "test_item_id": 30, "quantity": 2 }],
  "referral": { "is_self_referral": false, "doctor_id": 3 },
  "patient_type_id": 1,
  "discount_policy_id": 1,
  "category_details": { "care_type": "daycare" }
}
```

Also `invoice_no` (optional vendor number, letters and digits, max 30; else generated), `patient` (a new patient instead of `patient_id`). The response is the bill (`InvoiceResource`, with `category`, `patient_type`, `discount`, `subtotal_amount`, `discount_amount`, `rounding_amount`, `amount` = payable). `POST /api/billing/invoices/quote` (`items`, `patient_type_id`, `discount_policy_id`) returns the same totals without saving; `GET /api/billing/patient-types` lists the patient types and their discount policies.

---

## PATCH /api/blood-bank/cases/{case}

Corrects "Care of" and records the cause of transfusion and the reference note of an **open** case. Send only the changed fields; each is optional. Permission `bb.case.update` in the case's branch. Audited with old and new values.

```json
{
  "care_type": "out",
  "transfusion_reason": "Thalassemia",
  "reference_note": null
}
```

| Field                | Type           | Rules              |
| -------------------- | -------------- | ------------------ |
| `care_type`          | string         | `daycare` or `out` |
| `transfusion_reason` | string \| null | max 1000           |
| `reference_note`     | string \| null | max 1000           |

`200 OK` with the case detail (same shape as `GET /api/blood-bank/cases/{id}` below).

| Status | `code`              | When                                               |
| ------ | ------------------- | -------------------------------------------------- |
| 403    | `FORBIDDEN`         | Missing `bb.case.update`, or another branch's case |
| 422    | `CASE_NOT_OPEN`     | The case is closed or cancelled                    |
| 422    | `VALIDATION_FAILED` | Invalid value                                      |

## POST /api/blood-bank/cases/{case}/donors

Adds one donor (`donor_id`, or a new `donor`) under `invoice_no`, a bill **already saved** in Billing for the case's patient (the case bill, or e.g. a general bill for the additional donor charge). Nothing is billed. Permission `bb.case.update`. Bill errors (422): `INVOICE_NOT_FOUND`, `INVOICE_NOT_IN_BRANCH`, `INVOICE_NOT_ACTIVE`, `INVOICE_PATIENT_MISMATCH`, `INVOICE_LINKED_TO_OTHER_CASE`; also `CASE_NOT_OPEN`, `DONOR_ALREADY_IN_CASE`. `201 Created` with the case detail.

Numbers generated by the server:

| Number       | Format                                     | Example        | Counter                  |
| ------------ | ------------------------------------------ | -------------- | ------------------------ |
| `invoice_no` | `{2-letter branch code}{yyMMdd}{4 digits}` | `NB2610280001` | Per branch, resets daily |
| `patient_no` | `P{yyMMdd}{4 digits}`                      | `P2610280001`  | Global, resets daily     |
| `case_no`    | `BC{yyMM}{6 digits}`                       | `BC2610000001` | Global, resets monthly   |
| `donor_no`   | `D{yyMM}{6 digits}`                        | `D2610000001`  | Global, resets monthly   |

---

## GET /api/blood-bank/cases

Returns a page of the current branch's cases, newest first. Cases of other branches are never returned.

### Query string

| Param                     | Example        | Meaning                                                                         |
| ------------------------- | -------------- | ------------------------------------------------------------------------------- |
| `page`                    | `1`            | Page number, **starting at 1** (default 1)                                      |
| `per_page`                | `25`           | Rows per page, 1 to 100 (default 25)                                            |
| `sort`                    | `-created_at`  | `created_at` or `case_no`. Prefix `-` for descending. Default `-created_at`     |
| `filter[case_no]`         | `BC2610000001` | Exact case number                                                               |
| `filter[invoice_no]`      | `NB2610280001` | Exact invoice number. Also finds the case through a replacement donor's invoice |
| `filter[search]`          | `01711000000`  | Patient name, phone or patient number (partial match)                           |
| `filter[status]`          | `open`         | `open`, `closed` or `cancelled`                                                 |
| `filter[care_type]`       | `daycare`      | `daycare` or `out`                                                              |
| `filter[registered_from]` | `2026-10-01`   | From this date, inclusive (`YYYY-MM-DD`)                                        |
| `filter[registered_to]`   | `2026-10-31`   | Up to this date, inclusive (`YYYY-MM-DD`)                                       |

Example: `/api/blood-bank/cases?filter[status]=open&filter[search]=017&sort=-created_at&page=1&per_page=25`

Any other filter or sort returns `400 INVALID_QUERY`.

### Success response: `200 OK`

```json
{
  "data": [
    {
      "id": 1,
      "case_no": "BC2610000001",
      "branch_id": 1,
      "status": "open",
      "care_type": "daycare",
      "transfusion_reason": "Thalassemia",
      "reference_note": null,
      "supplied_at": null,
      "patient": {
        "id": 1,
        "patient_no": "P2610280001",
        "title": "mr",
        "name": "Rahim Uddin",
        "age_years": 40,
        "age_months": 2,
        "age_days": 10,
        "date_of_birth": "1986-08-18",
        "gender": "male",
        "blood_group": "O_POS",
        "phone": "01711000000",
        "address": "Mirpur, Dhaka"
      },
      "invoice": {
        "id": 1,
        "invoice_no": "NB2610280001",
        "amount": 150000,
        "status": "active",
        "billed_at": "2026-10-28T10:15:00+06:00",
        "is_self_referral": false,
        "referred_by": "Dr. Abdul Karim"
      },
      "components": [
        {
          "component_type_id": 2,
          "code": "PCV",
          "name": "Packed Red Cells",
          "quantity": 2
        }
      ],
      "donors_count": 2,
      "created_at": "2026-10-28T10:15:00+06:00"
    }
  ],
  "meta": {
    "page_index": 0,
    "page_size": 25,
    "page_count": 6,
    "row_count": 143
  }
}
```

Differences from the POST response:

- Each row has `donors_count` but **no `donors` array**. Fetch `GET /api/blood-bank/cases/{id}` for the donor details (each with `invoice_no`, the bill it was added under).
- `patient` or `invoice` can be `null` if the linked record is missing.

### Pagination (`meta`)

| Field        | Meaning                            |
| ------------ | ---------------------------------- |
| `page_index` | Current page, **zero-based**       |
| `page_size`  | Rows per page                      |
| `page_count` | Total pages                        |
| `row_count`  | Total records matching the filters |

For next/prev buttons:

- Request with `page = page_index + 1` and `per_page = page_size`.
- Previous is enabled when `page_index > 0`.
- Next is enabled when `page_index < page_count - 1`.
- Show `row_count` as the total.

There is no `links` object.

### Error responses

| Status | `code`              | When                                                                                            |
| ------ | ------------------- | ----------------------------------------------------------------------------------------------- |
| 400    | `INVALID_QUERY`     | Unknown filter, sort or include                                                                 |
| 401    | `UNAUTHENTICATED`   | Not signed in                                                                                   |
| 403    | `FORBIDDEN`         | Missing `bb.case.view` in the current branch                                                    |
| 422    | `VALIDATION_FAILED` | A date filter is not `YYYY-MM-DD` (error key `filter.registered_from` / `filter.registered_to`) |

---

## Enum values

| Field               | Values                                                                   |
| ------------------- | ------------------------------------------------------------------------ |
| `care_type`         | `daycare`, `out`                                                         |
| case `status`       | `open`, `closed`, `cancelled`                                            |
| case donor `status` | `registered`, `eligible`, `deferred`, `collected`                        |
| invoice `status`    | `active`, `cancelled`                                                    |
| `gender`            | `male`, `female`, `other`                                                |
| `blood_group`       | `A_POS`, `A_NEG`, `B_POS`, `B_NEG`, `AB_POS`, `AB_NEG`, `O_POS`, `O_NEG` |
| patient `title`     | `mr`, `mrs`, `miss`, `ms`, `master`, `baby`, `dr`                        |
| `marital_status`    | `single`, `married`, `divorced`, `widowed`                               |

## Not available yet

Editing or cancelling a bill (and with it its case), and admin screens for patient types and discount policies.
