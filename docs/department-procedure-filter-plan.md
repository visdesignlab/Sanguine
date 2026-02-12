# CPT-Driven Department/Procedure Filters (Visit-Level) Plan

## Summary
Implement a new global filter section that lets users expand departments to pick procedures, with matching driven by CPT codes at visit level (match if any CPT on the visit maps to selected filters).

Hierarchy source:
- `backend/cpt-code-mapping.csv`
- Department = `Department`
- Procedure = `Procedure`

Filter logic:
- OR within selected departments
- OR within selected procedures
- AND across department/procedure levels when both are selected

## Public APIs / Interfaces
1. Add `GET /api/get_procedure_hierarchy` in `backend/api/urls.py` and `backend/api/views/surgeries.py`.
   Response contract:
   ```json
   {
     "version": "string",
     "source": "cpt-code-mapping.csv",
     "department_level": "department",
     "procedure_level": "procedure",
     "departments": [
       {
         "id": "string",
         "name": "string",
         "visit_count": 0,
         "procedures": [
           {
             "id": "string",
             "name": "string",
             "visit_count": 0,
             "cpt_codes": ["12345", "12346"]
           }
         ]
       }
    ]
   }
   ```
   Concrete example:
   ```json
   {
     "version": "2026-02-12.1",
     "source": "cpt-code-mapping.csv",
     "department_level": "department",
     "procedure_level": "procedure",
     "departments": [
       {
         "id": "surgery",
         "name": "Surgery",
         "visit_count": 18234,
         "procedures": [
           {
             "id": "surgery__surgical-procedures-on-the-cardiovascular-system",
             "name": "Surgical Procedures on the Cardiovascular System",
             "visit_count": 6421,
             "cpt_codes": ["33025", "33140", "33405", "33533", "33946"]
           },
           {
             "id": "surgery__surgical-procedures-on-the-respiratory-system",
             "name": "Surgical Procedures on the Respiratory System",
             "visit_count": 3110,
             "cpt_codes": ["31622", "32480", "32663"]
           }
         ]
       },
       {
         "id": "anesthesia",
         "name": "Anesthesia",
         "visit_count": 9540,
         "procedures": [
           {
             "id": "anesthesia__anesthesia-for-procedures-on-the-head",
             "name": "Anesthesia for Procedures on the Head",
             "visit_count": 820,
             "cpt_codes": ["00100", "00102", "00103"]
           }
         ]
       }
     ]
   }
   ```
2. No separate procedure-index endpoint is required for the default approach.
   Procedure taxonomy comes from `GET /api/get_procedure_hierarchy`, and visit-level membership is embedded in `visit_attributes.parquet` list columns.
3. Extend frontend filter state interface in `frontend/src/Store/Store.ts`:
   - `departmentIds: string[]`
   - `procedureIds: string[]`
4. Extend filter count key union in `frontend/src/Types/application.ts`:
   - add `procedureFiltersAppliedCount`

## Database Changes
1. Add supporting index on `BillingCode(cpt_code, visit_no)` to speed hierarchy aggregation during parquet generation.
2. No new MariaDB helper table is required for default Option B.
3. Keep CPT hierarchy mapping in `backend/cpt-code-mapping.csv` as the source of truth.

## Backend Changes
1. Add CPT hierarchy parser helper (new file, e.g. `backend/api/views/utils/cpt_hierarchy.py`) that:
   - loads `backend/cpt-code-mapping.csv`
   - builds code -> `{department, procedure}` map using Department/Procedure
   - caches parse with process-level memoization.
2. Update `backend/api/management/commands/generate_parquets.py`:
   - call `materializeVisitAttributes()`
   - generate `visit_attributes.parquet` as today
   - enrich each visit row with list columns:
     - `department_ids: list<string>`
     - `procedure_ids: list<string>`
   - derive these lists from distinct CPT mappings found on the visit
   - generate cached `procedure_hierarchy.json` with counts + CPT lists for fast API responses.
3. Implement `get_procedure_hierarchy` to serve cached hierarchy JSON; if missing, trigger regeneration/re-cache, then retry read and return data.
   - if regeneration fails, return explicit HTTP 503 with a clear failure message.
   - guard with a simple lock so concurrent requests do not launch duplicate rebuild jobs.
4. Documentation requirement at implementation time:
   - document exactly how hierarchy data is generated (CSV -> cached JSON),
   - document when cache is refreshed (which command/job, and expected cadence),
   - document on-demand missing-cache behavior (regenerate + recache flow, timeout expectations, and failure mode),
   - document operational troubleshooting steps (how to force regeneration and verify endpoint output).

## Frontend Changes
1. In `frontend/src/App.tsx`, fetch and register:
   - `visit_attributes.parquet` (existing)
   - hierarchy JSON (new)
2. Ensure DuckDB reads list columns from `visit_attributes.parquet`:
   - `department_ids: VARCHAR[]`
   - `procedure_ids: VARCHAR[]`
3. Extend store in `frontend/src/Store/Store.ts`:
   - add initial/default/reset handling for `departmentIds` + `procedureIds`
   - add `resetProcedureFilters()`
   - add `procedureFiltersAppliedCount`
   - include in `totalFiltersAppliedCount`
   - ensure old provenance states without new keys default safely.
4. Refactor `updateFilteredData()` filter-clause builder in `frontend/src/Store/Store.ts`:
   - keep current numeric/bool/date behavior
   - add department/procedure SQL clause using list functions on `visits` rows:
     - department filter: overlap between `department_ids` and selected department IDs
     - procedure filter: overlap between `procedure_ids` and selected procedure IDs
     - apply AND across department/procedure levels when both are selected
   - optimize specifically for DuckDB:
     - prefer list-native predicates (`list_has_any`/equivalent) over repeated `UNNEST` subqueries,
     - avoid CTE chains that force rescans of `visits` for every filter update,
     - keep predicates sargable/simple so DuckDB can push filters before expensive projections,
     - validate with `EXPLAIN ANALYZE` on representative data and document the chosen query shape.
   - escape string values safely before interpolation.
5. Add new filter UI section in `frontend/src/Components/Toolbar/Filters/FilterPanel.tsx`:
   - accordion item `Department & Procedure`
   - expandable departments with procedure checkboxes
   - reset button via existing `FilterHeader`
   - visually indicate active selections.
6. Add dedicated component (new file, e.g. `frontend/src/Components/Toolbar/Filters/DepartmentProcedureFilter.tsx`) to keep `FilterPanel.tsx` maintainable.

## Test Cases and Scenarios
1. Keep testing intentionally light in this PR:
   - manual smoke test for hierarchy endpoint response shape and missing-cache auto-regeneration behavior,
   - manual smoke test for failed-regeneration path returning HTTP 503,
   - manual smoke test for filter interaction (department only, procedure only, both),
   - run `yarn typecheck` and `yarn lint`.
2. Defer comprehensive automated coverage (backend endpoint tests, parquet generation tests, frontend store/query tests) to a follow-up testing-focused PR.

## Rollout Sequence
1. Deploy DB migration.
2. Run `poetry run python manage.py generate_parquets`.
3. Deploy backend with new endpoints.
4. Deploy frontend with new filter UI/state.
5. Validate with production-like dataset and saved-state restore paths.

## Assumptions and Defaults
- Matching granularity is visit-level, based on any CPT mapped to the visit.
- Hierarchy source is `backend/cpt-code-mapping.csv` parsed at runtime/materialization time.
- Procedure level is `Procedure`; department level is `Department`.
- Selection semantics are OR within each level and AND across department/procedure levels.
- Unmapped CPT codes are excluded from selectable hierarchy and excluded from procedure filtering unless later explicitly exposed as an `Unmapped` bucket.
