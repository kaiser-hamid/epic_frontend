# Blood Bank API: cases

Frontend reference for registering and listing Blood Bank cases.

| Method | Path                    | Purpose                                                            | Permission       |
| ------ | ----------------------- | ------------------------------------------------------------------ | ---------------- |
| POST   | `/api/blood-bank/cases` | Register patient, bill, case, components and donors in one request | `bb.case.create` |
| GET    | `/api/blood-bank/cases` | List the cases of the branch you logged in to                      | `bb.case.view`   |

Permissions are granted per user per branch. Both calls work only inside the branch chosen at login.

## Common

- **Auth:** Sanctum SPA cookie session. Send `credentials: 'include'`, the `X-XSRF-TOKEN` header, and `Accept: application/json`.
- **Body:** JSON (`Content-Type: application/json`), not multipart.
- **Keys:** `snake_case`. Dates are ISO 8601 (`2026-10-28T10:15:00+06:00`); plain dates are `YYYY-MM-DD`.
- **Money:** integer **paisa** (`150000` = 1,500.00). Totals are computed by the server; never send a rate or amount.
- **Errors:** `{ "message": "...", "code": "..." }`. React to `code`, not `message`.

---

## POST /api/blood-bank/cases

One save creates, in a single transaction: the patient (if new), the invoice with its tests and referral, the case, the requested components and the donors (new donors are registered). If anything fails, nothing is saved.

### Request body

```json
{
  "billing": {
    "patient": {
      "title": "mr",
      "name": "Rahim Uddin",
      "age_years": 40,
      "age_months": 2,
      "age_days": 10,
      "date_of_birth": "1986-08-18",
      "gender": "male",
      "marital_status": "married",
      "blood_group": "O_POS",
      "phone": "01711000000",
      "address": "Mirpur, Dhaka",
      "national_id": "1234567890"
    },
    "items": [
      { "test_item_id": 12, "quantity": 1 },
      { "test_item_id": 15, "quantity": 2 }
    ],
    "referral": {
      "is_self_referral": false,
      "doctor_id": 3,
      "second_doctor_id": 7,
      "remark": "Urgent",
      "referred_by_staff_id": 4
    }
  },
  "care_type": "daycare",
  "transfusion_reason": "Thalassemia",
  "reference_note": "Ref. by Dr. Karim",
  "components": [{ "component_type_id": 2, "quantity": 2 }],
  "donors": [
    { "donor_id": 41 },
    {
      "donor": {
        "name": "Karim Mia",
        "age": 28,
        "date_of_birth": "1998-03-02",
        "gender": "male",
        "blood_group": "B_POS",
        "phone": "01911000000",
        "address": "Uttara, Dhaka",
        "national_id": "9876543210",
        "is_regular_volunteer": true
      }
    }
  ]
}
```

### Fields

**Top level**

| Field                | Type   | Required | Rules                                             |
| -------------------- | ------ | -------- | ------------------------------------------------- |
| `billing`            | object | yes      | See below                                         |
| `care_type`          | string | yes      | `daycare` or `out`                                |
| `transfusion_reason` | string | no       | max 1000                                          |
| `reference_note`     | string | no       | max 1000                                          |
| `components`         | array  | no       | Requested blood components; omit or `[]` for none |
| `donors`             | array  | no       | Omit or `[]` for none                             |

**`billing`**

| Field        | Type    | Required                        | Rules                                                                               |
| ------------ | ------- | ------------------------------- | ----------------------------------------------------------------------------------- |
| `patient_id` | integer | one of `patient_id` / `patient` | Existing patient (returning patient). Cannot be sent together with `patient`        |
| `patient`    | object  | one of `patient_id` / `patient` | New patient, registered in the same save. Cannot be sent together with `patient_id` |
| `items`      | array   | yes                             | At least 1 line. No `test_item_id` may repeat                                       |
| `referral`   | object  | yes                             | See below                                                                           |

Send exactly one of `patient_id` or `patient`.

**`billing.patient`** (new patient)

| Field            | Type    | Required                            | Rules                                                                    |
| ---------------- | ------- | ----------------------------------- | ------------------------------------------------------------------------ |
| `name`           | string  | yes                                 | max 255                                                                  |
| `age_years`      | integer | yes, unless `date_of_birth` is sent | 0 to 150                                                                 |
| `age_months`     | integer | no                                  | 0 to 11                                                                  |
| `age_days`       | integer | no                                  | 0 to 31                                                                  |
| `date_of_birth`  | string  | no                                  | `YYYY-MM-DD`, not in the future                                          |
| `title`          | string  | no                                  | `mr`, `mrs`, `miss`, `ms`, `master`, `baby`, `dr`                        |
| `gender`         | string  | no                                  | `male`, `female`, `other`                                                |
| `marital_status` | string  | no                                  | `single`, `married`, `divorced`, `widowed`                               |
| `blood_group`    | string  | no                                  | `A_POS`, `A_NEG`, `B_POS`, `B_NEG`, `AB_POS`, `AB_NEG`, `O_POS`, `O_NEG` |
| `phone`          | string  | no                                  | max 20                                                                   |
| `address`        | string  | no                                  | max 1000                                                                 |
| `national_id`    | string  | no                                  | max 30                                                                   |

The server always stores both the age and the date of birth. If `date_of_birth` is sent, the age is calculated from it and any typed age is ignored. If it is not sent, the date of birth is back-calculated from `age_years` / `age_months` / `age_days` (an estimate).

**`billing.items[]`**

| Field          | Type    | Required       | Rules                                                     |
| -------------- | ------- | -------------- | --------------------------------------------------------- |
| `test_item_id` | integer | yes            | Existing, active test item. Must be unique within `items` |
| `quantity`     | integer | no (default 1) | 1 to 999                                                  |

The rate is taken from the test catalog at save time and kept on the invoice line.

**`billing.referral`**

| Field                  | Type    | Required                                       | Rules                                                        |
| ---------------------- | ------- | ---------------------------------------------- | ------------------------------------------------------------ |
| `is_self_referral`     | boolean | no (default `false`)                           | If `true`, do not send `doctor_id`                           |
| `doctor_id`            | integer | required when `is_self_referral` is not `true` | Active doctor. Not allowed when `is_self_referral` is `true` |
| `second_doctor_id`     | integer | no                                             | Active doctor, different from `doctor_id`                    |
| `remark`               | string  | no                                             | max 255                                                      |
| `referred_by_staff_id` | integer | no                                             | Existing user id                                             |

**`components[]`**

| Field               | Type    | Required       | Rules                                                     |
| ------------------- | ------- | -------------- | --------------------------------------------------------- |
| `component_type_id` | integer | yes            | Active component type. Must be unique within `components` |
| `quantity`          | integer | no (default 1) | 1 to 20                                                   |

**`donors[]`**: each entry has either `donor_id` or `donor`, never both.

| Field      | Type    | Required                    | Rules                                                                                                       |
| ---------- | ------- | --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `donor_id` | integer | one of `donor_id` / `donor` | Existing donor (find one with `GET /api/blood-bank/donors?filter[search]=`). Must be unique within `donors` |
| `donor`    | object  | one of `donor_id` / `donor` | New donor, registered in the same save                                                                      |

Donors are numbered `sequence_no` 1, 2, 3... in the order sent.

**`donors[].donor`** (new donor)

| Field                  | Type    | Required                            | Rules                           |
| ---------------------- | ------- | ----------------------------------- | ------------------------------- |
| `name`                 | string  | yes                                 | max 255                         |
| `age`                  | integer | yes, unless `date_of_birth` is sent | 1 to 120                        |
| `date_of_birth`        | string  | no                                  | `YYYY-MM-DD`, not in the future |
| `gender`               | string  | no                                  | `male`, `female`, `other`       |
| `blood_group`          | string  | no                                  | Same values as the patient      |
| `phone`                | string  | no                                  | max 20                          |
| `address`              | string  | no                                  | max 1000                        |
| `national_id`          | string  | no                                  | max 30                          |
| `is_regular_volunteer` | boolean | no                                  |                                 |

### Success response: `201 Created`

```json
{
  "data": {
    "id": 1,
    "case_no": "BC2610000001",
    "branch_id": 1,
    "status": "open",
    "care_type": "daycare",
    "transfusion_reason": "Thalassemia",
    "reference_note": "Ref. by Dr. Karim",
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
    "donors": [
      {
        "id": 1,
        "sequence_no": 1,
        "status": "registered",
        "billing_id": null,
        "deferral_reason": null,
        "assessed_at": null,
        "donor": {
          "id": 41,
          "donor_no": "D2610000001",
          "name": "Karim Mia",
          "age": 28,
          "date_of_birth": "1998-03-02",
          "gender": "male",
          "blood_group": "B_POS",
          "phone": "01911000000",
          "address": "Uttara, Dhaka",
          "national_id": "9876543210",
          "is_regular_volunteer": true,
          "created_at": "2026-10-28T10:15:00+06:00"
        }
      }
    ],
    "donors_count": 1,
    "created_at": "2026-10-28T10:15:00+06:00"
  }
}
```

Numbers generated by the server:

| Number       | Format                                     | Example        | Counter                  |
| ------------ | ------------------------------------------ | -------------- | ------------------------ |
| `invoice_no` | `{2-letter branch code}{yyMMdd}{4 digits}` | `NB2610280001` | Per branch, resets daily |
| `patient_no` | `P{yyMMdd}{4 digits}`                      | `P2610280001`  | Global, resets daily     |
| `case_no`    | `BC{yyMM}{6 digits}`                       | `BC2610000001` | Global, resets monthly   |
| `donor_no`   | `D{yyMM}{6 digits}`                        | `D2610000001`  | Global, resets monthly   |

### Error responses

| Status | `code`                     | When                                           |
| ------ | -------------------------- | ---------------------------------------------- |
| 401    | `UNAUTHENTICATED`          | Not signed in                                  |
| 403    | `FORBIDDEN`                | Missing `bb.case.create` in the current branch |
| 403    | `PASSWORD_CHANGE_REQUIRED` | The user must change the password first        |
| 419    | `CSRF_TOKEN_MISMATCH`      | Missing or stale CSRF token                    |
| 422    | `VALIDATION_FAILED`        | Invalid form; nothing is saved                 |

Validation errors use dotted paths, so map them to form fields by path:

```json
{
  "message": "The billing.patient_id field is required when billing.patient is not present.",
  "code": "VALIDATION_FAILED",
  "errors": {
    "billing.patient_id": [
      "The billing.patient_id field is required when billing.patient is not present."
    ],
    "donors.0.donor.age": [
      "The donors.0.donor.age field is required when donors.0.donor.date_of_birth is not present."
    ],
    "components.1.component_type_id": [
      "The components.1.component_type_id field has a duplicate value."
    ]
  }
}
```

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

- Each row has `donors_count` but **no `donors` array**. Fetch `GET /api/blood-bank/cases/{id}` for the donor details (same shape as the POST response).
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

The form needs ids for `test_item_id`, `doctor_id` and `component_type_id`, but there are no lookup endpoints for them yet. Only the donor search (`GET /api/blood-bank/donors?filter[search]=`) exists.
