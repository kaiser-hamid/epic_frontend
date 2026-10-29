Menu tree

1. Dashboard

Branch overview, one screen:

- Today: open cases, cases waiting for supply, donors waiting for screening / collection.
- Lab: samples waiting for results, results and crossmatches waiting for review.
- Stock grid: available units by blood group × component (A+, A-, … × WB, PCV, FP, CRYO, PLT, Plasma).
- Expiry: expiring in 24 h / 72 h, expired today; low-stock consumables.

2. Cases (exists)

- All cases (built): filters by status, care type, date, invoice no, case no, patient.
- New case (built).
- Case detail (built, extend with tabs):
  - Overview: patient, invoice, referral, care type, transfusion reason, requested components and how many are fulfilled.
  - Patient sample: collect sample, print label, blood group (ABO/Rh) result.
  - Donors: attached donors with status; add replacement donor (with new invoice); go to screening.
  - Crossmatch: one row per unit, enter/review, print Compatibility Test Report.
  - Units: reserved / issued units for this case; reserve, issue, return.
  - Prints and history: print log and audit trail for this case.
  - Actions: record supply time (supplied_at), close, cancel.

3. Donors

- Donor registry: search donors (built as API), donor profile with donation history across cases, regular volunteer flag. Sensitive fields behind permission.
- Screening queue: case donors in registered status → physical exam (bb_donor_screenings), donor sample, serology results.
- Eligibility: accept / defer with reason (human decision, audit-logged).
- Deferred donors: list with reasons (to spot repeat deferrals).

4. Laboratory

- Sample collection: patient and donor samples, print/reprint sample label (barcode = sample_no), scan to open.
- Result entry: worklist of samples collected / in_testing; enter results per test definition.
- Review and approval: results waiting for review; approve or reject; amend with reason (new version).
- Crossmatch: worklist of case × unit pairs; enter major/minor; review by physician.
- Reports: Compatibility Test Report print / reprint (reason required on reprint).

5. Collection and components

- Collection queue: eligible donors waiting for a draw → record collection (bb_collections, bag_no), print bag label.
- Post-donation vitals: donors collected in the last ~15 min waiting for post vitals.
- Component separation: pick a whole-blood unit → create components (PCV, FP, …), auto unit_no and expiry from shelf_life_hours, print component labels.

6. Blood stock (units)

- Stock summary: blood group × component counts, by location.
- Unit search: scan or search by unit_no, component, group, status, location, expiry range.
- Unit detail / traceability: unit → parent unit → collection → donor → case, plus full movement history.
- Reservations: reserved units by case; release.
- Issue: issue to a case (only with a current compatible crossmatch, matching a requested component line).
- Returns: return unused issued unit (reason; return window rule is an open question).
- Quarantine / discard: move to quarantine, release, discard with reason.
- Move / store: change storage location.

7. Expiry dashboard

- Available stock, approaching expiry, expired / unavailable.
- Filters: component, status, expiry range, location.
- Backed by the hourly expiry job (marks expired).

8. Consumables

- Stock overview: current balance, low-stock highlights (minimum_stock), batches near expiry.
- Receive stock (with batch / expiry when the item tracks them).
- Issue / use.
- Adjust (reason mandatory).
- Ledger: transaction history per item / batch.

9. Reports

- Daily patient register (the paper register: patient, consultant, component, care of, cause, supply time, blood group, crossmatch).
- Units collected / prepared / issued / returned / discarded / expired by period.
- Donor report: donations, deferrals and reasons, volunteers.
- Consumable usage and stock movement.
- Print / reprint log. Every export is audit-logged.

10. Settings (Blood Bank master data)

- Test definitions (name, result type, options, unit, range, method, applies to).
- Component types (code, shelf life, storage condition, default location type; maybe returnable / return window).
- Storage locations (fridge / freezer / agitator, temperature range).
- Consumable catalog (UoM, minimum stock, tracks batch / expiry).
- Temperature log only if the department confirms it is required.

Global (Shared, not under Blood Bank)

Users and per-branch permissions, role templates, audit log, patients, doctors, test catalog / billing items, numbering sequences.

---

Permissions to add (pattern: bb.{resource}.{action})

Current: bb.case.view, bb.case.create, bb.donor.view. Suggested next, one per menu action:

- Cases: bb.case.update, bb.case.close, bb.case.cancel
- Donors: bb.donor.create, bb.donor.update, bb.donor.view_sensitive, bb.donor.screen, bb.donor.assess_eligibility
- Lab: bb.sample.collect, bb.result.enter, bb.result.review, bb.result.amend, bb.crossmatch.enter, bb.crossmatch.review
- Collection: bb.collection.create, bb.component.prepare
- Units: bb.unit.view, bb.unit.reserve, bb.unit.issue, bb.unit.return, bb.unit.quarantine, bb.unit.discard, bb.unit.move
- Consumables: bb.consumable.view, bb.consumable.receive, bb.consumable.issue, bb.consumable.adjust
- Printing: bb.print.label, bb.print.report, bb.print.reprint
- Reports / settings: bb.report.view, bb.report.export, bb.settings.manage

Suggested build order (follows plan.md phases)

1. Case detail tabs + patient sample + blood group results (Phase 3 start).
2. Donor screening, donor sample, serology, eligibility (Phase 3).
3. Review / amend results, Compatibility Test Report (Phase 3).
4. Collection, component separation, labels (Phase 4).
5. Unit stock, reserve / issue / return / discard, traceability (Phase 4).
6. Expiry job + expiry dashboard + main dashboard (Phase 4).
7. Consumables (Phase 5).
8. Reports and settings screens (can be seeded data until then).

Open questions that affect menus

- Unit "Unit: 1" numbering on the report and the return window rule (workflow.md open questions).
- Whether temperature logs are needed (adds a Storage → Temperature log menu).
- Whether Settings is edited by Blood Bank staff or only IT.
