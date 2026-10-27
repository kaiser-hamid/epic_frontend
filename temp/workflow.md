# Blood Bank: what data goes where

Personal reference. Follows one patient case from registration to an issued unit, naming the table and columns written at each step. Based on the migrations as they stand (2026-10-25).

## The big picture

```
sh_patient_master ─┐
                   ├─> sh_billing ──> sh_billing_items (what was billed)
                   │       └────────> sh_billing_referrals (referring doctor = "Name of consultant")
                   │
                   └─> bb_cases ──┬─> bb_case_components (what the patient needs: 2 × PCV, 1 × FP)
                                  ├─> bb_samples (subject = patient) ──> bb_test_results (ABO, Rh)
                                  ├─> bb_crossmatches (patient sample × unit → Compatibility Test Report)
                                  ├─> bb_units.case_id (units reserved for / issued to this case)
                                  │
                                  └─> bb_case_donors <── bb_donors (person, reused across cases; optional: stock units need none)
                                         │   status: registered → eligible (fit to donate) / deferred → collected
                                         ├─> bb_donor_screenings (weight, height, Hb, pre/post vitals)
                                         ├─> bb_samples (subject = donor) ──> bb_test_results (serology)
                                         └─> bb_collections (one bag, bag_no)
                                                └─> bb_units (whole blood, then components via parent_unit_id)
                                                       └─> bb_unit_movements (every status / location change, with case_id)

sh_print_logs     ← every label / report print, for samples, bags, units, cases
bb_consumable_*   ← separate stock ledger for bags, reagents, etc.
```

Shared tables (`sh_`) are owned by Shared. Blood Bank only stores their IDs (`patient_master_id`, `billing_id`) and never writes to them.

## Step by step

### 0. Setup (master data, once)

| Table | What goes in |
|---|---|
| `sh_departments`, `sh_test_items` | Billable catalog: what the counter can charge for (code, name, `rate` in paisa). |
| `sh_doctors` | Referring doctors / consultants. |
| `bb_test_definitions` | The Blood Bank lab tests and their result fields: `result_type` (text / number / option), `unit`, `reference_range`, `method` (printed on the report, e.g. "Immunochromatographic Test", "ICT method"), `options` (for option lists), `applies_to` (patient / donor / both). Blood Group (ABO) (option A / B / AB / O) and Rhesus (D) (option Positive / Negative), both. Donor screening: HBsAg, Anti HCV, Anti HIV (1 and II p24AG), Syphilis (option `non_reactive` / `reactive`), Malaria Parasite (option `not_found` / `found`). |
| `bb_component_types` | WB, PCV, FP, CRYO, PLATELET, PLASMA… with `shelf_life_hours` (drives `expires_at`) and `default_location_type`. |
| `bb_storage_locations` | Fridges, freezers, agitators (`type`), with temperature range. |
| `bb_consumables` | Stock items (bags, reagents) with `minimum_stock`. |

### 1. Patient registration and billing (Shared)

1. Find or create the patient → `sh_patient_master` (`patient_no`, name, age, gender, blood group, phone…).
2. Counter bills the blood bank service → `sh_billing` (`invoice_no`, `amount` total in paisa, `status`), lines in `sh_billing_items` (`test_item_id`, `quantity`, `rate` snapshot, `amount`), referral in `sh_billing_referrals` (doctor, second doctor, or self-referral). The referring doctor here is the register's **"Name of consultant"**; Blood Bank does not store it again.

### 2. Open the case (patient register)

1. `bb_cases`: `case_no`, `patient_master_id`, `billing_id`, `care_type` (**"Care of"**: `daycare` = used in our daycare unit, `out` = takeaway), `transfusion_reason` (**"Cause of transfusion"**, nullable), `reference_note` (any other note), `status = open`, `created_by`.
2. Requested components (**"Component"** column) → `bb_case_components`, one row per component type: `case_id`, `component_type_id`, `quantity` (e.g. PCV × 2 and FP × 1 are two rows). Unique per (case, component type).

Patient details are **not copied** here; read them from `sh_patient_master`.

### 3. Patient sample (blood group)

1. Draw the patient's sample → `bb_samples`: `sample_no` (printed on the label), `case_id`, `case_donor_id = null`, `subject_type = patient`, `collected_at/by`, `status = collected`.
2. Print the sample label → `sh_print_logs` (`document_type = bb.sample_label`, `printable_type = bb.sample`).
3. Blood group → `bb_test_results`, one row each for Blood Group (ABO) and Rhesus (D): `sample_id`, `test_definition_id`, `result_value`, `observation`, `tested_by/at`, `version = 1`, `is_current = true`, `status = entered`. Sample moves `in_testing` → `tested`.
4. Review → same row: `status = reviewed`, `reviewed_by/at`.
5. Correction → **new row** with `version + 1`, `amendment_reason`; the old row gets `is_current = false`. Nothing is overwritten.

The same patient sample is used for the crossmatch against each unit (step 8).

### 4. Donors (only when the patient brings donors)

Skip steps 4–7 when the blood is supplied directly from storage; go to step 8 with a stock unit.

1. Find or create the donor (a person, reused across cases) → `bb_donors`: `donor_no`, name, age/DOB, gender, `blood_group`, phone, `national_id`, `is_regular_volunteer` (the form's "Would you like to be a regular voluntary donor?"; yes / no / not asked = null, updated each time they're asked).
2. Attach them to this case → `bb_case_donors`: `case_id`, `donor_id`, `sequence_no` (1, 2, 3… per case), `status = registered`.
3. Replacement donor (first one deferred) → **new** `bb_case_donors` row with the next `sequence_no`. The old row keeps its `deferred` status. If the replacement is billed separately, its new bill goes in `bb_case_donors.billing_id`.

### 5. Donor screening and eligibility

This is the paper "Physical/Medical Examination" + "Serological Investigations" form.

1. Physical examination → `bb_donor_screenings` (one row per `case_donor_id`): `weight_kg`, `height_cm` (UI may accept feet/inches, stored as cm), `hemoglobin_g_dl`, pre-donation `pre_pulse_bpm`, `pre_bp_systolic` / `pre_bp_diastolic` (140/90 → 140 and 90), `pre_temperature_f`, `examined_by/at`. Post-donation columns stay empty for now.
2. Donor sample → `bb_samples` with `subject_type = donor`, `case_donor_id` set. Label printed (`sh_print_logs`).
3. Screening → `bb_test_results`, one row per test (ABO, Rh, HBsAg, Anti HCV, Anti HIV, Syphilis, Malaria), same versioning rules as step 3. Signature of Technologist = `tested_by` / `reviewed_by`. The confirmed blood group is copied to `bb_donors.blood_group`. These results are what the Compatibility Test Report later prints under "Screening Tests".
4. Accepted / Deferred (never automatic) → directly on `bb_case_donors`: `status` (`eligible` = "Accepted" / `deferred`), `deferral_reason` (= "Reason for deferral"), `assessed_by/at` (Signature of Physician). If the decision changes, the audit log keeps the old and new values.

`eligible` means **fit to donate**. Whether a bag suits the patient is the crossmatch (step 8). One case can have several case donors; each is marked on its own.

### 6. Collection (the bag)

1. Draw blood from an eligible donor → `bb_collections`: `bag_no` (unique, from Numbering), `case_donor_id`, `volume_ml`, `collected_at/by`, `approved_by`, `status = collected`, `notes`.
2. `bb_case_donors.status = collected`.
3. About 15 minutes after donation → fill the post-donation columns on the same `bb_donor_screenings` row: `post_pulse_bpm`, `post_bp_systolic` / `post_bp_diastolic`, `post_temperature_f`, `post_recorded_by/at`.
4. Print bag label → `sh_print_logs` (`bb.bag_label`, `printable_type = bb.collection`).
5. Bag used up → `bb_consumable_transactions` (`type = issued`), see step 10.

### 7. Units and components

1. Whole-blood unit → `bb_units`: `unit_no = bag_no`, `collection_id`, `parent_unit_id = null`, `component_type_id` (WB), `blood_group`, `volume_ml`, `prepared_at`, `expires_at = prepared_at + shelf_life_hours`, `storage_location_id`, `status = available`, `case_id = null`.
2. Separate into components → one **new** `bb_units` row per component: `unit_no = bag_no-CODE` (e.g. `BB-B-000123-PCV`, `-n` for splits), same `collection_id`, `parent_unit_id` = the whole-blood unit, its own component type, expiry and location.
3. Component label → `sh_print_logs` (`bb.component_label`, `printable_type = bb.unit`).
4. Every barcode scan looks up `sample_no` or `unit_no`; there are no barcode columns.

### 8. Crossmatch and Compatibility Test Report

The unit is either from this case's own donor (steps 4–7) or straight from storage (another case's donor, or stock).

1. Crossmatch the patient sample against the unit → `bb_crossmatches`: `case_id`, `patient_sample_id`, `unit_id`, `major_result` and `minor_result` (`compatible` / `incompatible`; the report's "Compatible (Major/Minor)" means both are compatible), `remarks`, `tested_by/at` (Medical Technologist), `status` (entered → reviewed), `reviewed_by/at` (Physician), `version = 1`, `is_current = true`.
2. Correction → new row with `version + 1` and `amendment_reason`; the old row gets `is_current = false`.
3. Print the **Compatibility Test Report** (one per unit) → `sh_print_logs` (`bb.compatibility_report`, `printable_type = bb.crossmatch`). Any reprint needs `reprint_reason`.

Where each part of the report comes from (nothing is copied):

| Report section | Source |
|---|---|
| Patient name, gender, age, contact | `sh_patient_master` |
| Invoice, invoice date, Ref. by | `sh_billing`, `sh_billing_referrals` |
| Result date | `bb_crossmatches.reviewed_at` (or `tested_at`) |
| Blood Bag No., component, date of collection, expiry, collected by | `bb_units` → `bb_collections` (`bag_no`, `collected_at`, `collected_by`), `bb_component_types`, `bb_units.expires_at` |
| Unit | **Unconfirmed** (see Open questions). Assumed: which bag this is for the patient (1, 2, …), counted from the case's units; nothing stored |
| Patient ABO, Rh | patient sample's `bb_test_results` |
| Cause of transfusion | `bb_cases.transfusion_reason` |
| Donor name, age, sex, ABO, Rh | `bb_units` → `bb_collections` → `bb_case_donors` → `bb_donors`, and the donor sample's `bb_test_results` |
| Screening tests, method, result | donor sample's `bb_test_results` + `bb_test_definitions.method` |
| Compatibility with donor | `bb_crossmatches.major_result` / `minor_result` |
| Medical Technologist, Physician | `tested_by`, `reviewed_by` |

### 9. Assign, issue, storage, expiry

**Which unit goes to the patient:** a unit is assigned by setting `bb_units.case_id`. It must match one of the case's `bb_case_components` lines (same `component_type_id`) and have a current crossmatch with this case's patient where both major and minor are `compatible`. A component line is fulfilled when the number of units assigned to the case for that component type reaches its `quantity`.

Every change to a unit updates `bb_units.status` / `storage_location_id` / `case_id` **and** appends a `bb_unit_movements` row: `from_status → to_status`, `from_location_id → to_location_id`, `case_id`, `reason`, `performed_by`, `occurred_at`.

| Event | `bb_units` |
|---|---|
| Stored / moved between fridges | stays `available`, location changes |
| Held for a patient | `reserved`, `case_id` set |
| Reservation released | back to `available`, `case_id` cleared (the movement row still records which case) |
| Handed over | `issued`, `case_id` stays |
| Returned unused (report: WB/PRBC within 30 min, with reason and doctor's signature) | back to `available`, `case_id` cleared, reason on the movement row |
| Platelet / FFP brought back after issue (cannot be received back) | `discarded` |
| Suspect, awaiting decision | `quarantined` |
| Destroyed | `discarded` (reason required) |
| Passed `expires_at` (hourly job) | `expired` |

When the blood is supplied (**"Supply time"**) → `bb_cases.supplied_at`.

The expiry dashboard reads `bb_units` by (`status`, `expires_at`).

When done, `bb_cases.status = closed` (or `cancelled`).

### 10. Consumable stock (runs alongside everything)

- Item → `bb_consumables` (`current_balance` cached here).
- Batch / expiry (only if `tracks_batch` / `tracks_expiry`) → `bb_consumable_batches` (`batch_no`, `expires_at`, `quantity_on_hand`).
- Every movement → `bb_consumable_transactions`: `type` (received / issued / adjusted), `quantity`, `balance_after`, `reason`, `performed_by`, `occurred_at`. Append-only; the balance is derived from this ledger.

## Patient register → database

| Register column | Where |
|---|---|
| Patient details | `sh_patient_master` |
| Name of consultant | `sh_billing_referrals.doctor_id` |
| Component | `bb_case_components` (type + quantity) |
| Care of | `bb_cases.care_type` (`daycare` / `out`) |
| Cause of transfusion | `bb_cases.transfusion_reason` |
| Supply time | `bb_cases.supplied_at` |
| Blood group | `bb_test_results` on the patient sample |
| Crossmatch | `bb_crossmatches` (patient sample × unit), printed as the Compatibility Test Report |

## Status cheat sheet

| Table | Statuses |
|---|---|
| `bb_cases` | open → closed / cancelled |
| `bb_case_donors` | registered → eligible / deferred → collected |
| `bb_samples` | collected → in_testing → tested (or rejected) |
| `bb_test_results`, `bb_crossmatches` | entered → reviewed (or rejected) |
| `bb_collections` | collected / cancelled |
| `bb_units` | available ⇄ reserved → issued; quarantined, discarded, expired |

## History rules (nothing is overwritten)

- Test results and crossmatches: new `version` row, `is_current` flips, `amendment_reason` kept.
- Eligibility and physical examination: one row per donation; changes go through the audit log with old/new values.
- Units: every status, location and case assignment change is a `bb_unit_movements` row.
- Stock: every change is a `bb_consumable_transactions` row.
- Prints: every print and reprint is a `sh_print_logs` row.
- Cases, donors, consumables: soft deleted, never removed.

## Decisions so far

- `case_no` stays the case identifier; `invoice_no` is a search key only (a case can exist before billing, have several bills, or be rebilled).
- Eligibility lives on `bb_case_donors` (no separate assessments table); `eligible` = fit to donate.
- The crossmatch is patient sample × **unit**, not × donor, so units from storage (no donor brought) are covered.
- "Name of consultant" is the billing referral doctor; Blood Bank stores no doctor.
- Print logs are Shared (`sh_print_logs`), not Blood Bank.

## Open questions

1. **"Unit: 1" on the Compatibility Test Report.** Check old reports for a patient who got 2+ bags:
   - Unit 1, Unit 2… → which bag for the patient (current assumption, counted from the case's units).
   - Always Unit 1 → bags per report; always 1.
   - Changes only for split bags → the split number from `unit_no` (`-1`, `-2`).
2. **Returns.** The report says WB/PRBC may be returned within 30 min of issue, and Platelet/FFP can't be returned. Today a return is just a status change with a reason; nothing enforces the window or the per-component rule. Option: `is_returnable` and `return_window_minutes` on `bb_component_types`.
