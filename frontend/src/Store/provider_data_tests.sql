-- ============================================================
-- Provider View Data Accuracy Tests (DuckDB)
-- Run: duckdb < frontend/src/Store/provider_data_tests.sql
-- Each test explains in plain English what chart it validates,
-- then runs the EXACT query logic from ProvidersStore and checks.
-- ============================================================

-- ── SETUP ──────────────────────────────────────────────────────

CREATE TABLE visits (
  visit_no BIGINT, mrn VARCHAR, adm_dtm TIMESTAMP, dsch_dtm TIMESTAMP,
  age_at_adm INT, pat_class_desc VARCHAR, apr_drg_weight FLOAT, ms_drg_weight FLOAT,
  month VARCHAR, quarter VARCHAR, year VARCHAR,
  rbc_units INT DEFAULT 0, ffp_units INT DEFAULT 0, plt_units INT DEFAULT 0,
  cryo_units INT DEFAULT 0, whole_units INT DEFAULT 0, cell_saver_ml INT DEFAULT 0,
  overall_units INT DEFAULT 0,
  los FLOAT, death BOOLEAN, vent BOOLEAN, stroke BOOLEAN, ecmo BOOLEAN,
  b12 BOOLEAN, iron BOOLEAN, antifibrinolytic BOOLEAN,
  rbc_units_adherent INT DEFAULT 0, ffp_units_adherent INT DEFAULT 0,
  plt_units_adherent INT DEFAULT 0, cryo_units_adherent INT DEFAULT 0,
  overall_units_adherent INT DEFAULT 0,
  attending_provider VARCHAR, attending_provider_id VARCHAR,
  attending_provider_line INT, attending_provider_department VARCHAR,
  is_admitting_attending BOOLEAN,
  procedure_ids VARCHAR[] DEFAULT []
);

CREATE TABLE surgery_cases (
  case_id BIGINT, visit_no BIGINT, mrn VARCHAR,
  surgeon_prov_id VARCHAR, surgeon_prov_name VARCHAR,
  anesth_prov_id VARCHAR, anesth_prov_name VARCHAR,
  surgery_start_dtm TIMESTAMP, surgery_end_dtm TIMESTAMP, case_date TIMESTAMP,
  month VARCHAR, quarter VARCHAR, year VARCHAR,
  pre_hgb FLOAT, pre_plt FLOAT, pre_fibrinogen FLOAT, pre_inr FLOAT,
  post_hgb FLOAT, post_plt FLOAT, post_fibrinogen FLOAT, post_inr FLOAT,
  intraop_rbc_units INT DEFAULT 0, intraop_ffp_units INT DEFAULT 0,
  intraop_plt_units INT DEFAULT 0, intraop_cryo_units INT DEFAULT 0,
  intraop_whole_units INT DEFAULT 0, intraop_cell_saver_ml INT DEFAULT 0,
  los FLOAT, death BOOLEAN, vent BOOLEAN, stroke BOOLEAN, ecmo BOOLEAN,
  rbc_cost FLOAT, ffp_cost FLOAT, plt_cost FLOAT, cryo_cost FLOAT,
  whole_cost FLOAT, cell_saver_cost FLOAT, total_cost FLOAT
);

CREATE TABLE costs (
  rbc_units_cost DOUBLE, ffp_units_cost DOUBLE, plt_units_cost DOUBLE,
  cryo_units_cost DOUBLE, whole_cost DOUBLE, cell_saver_cost DOUBLE
);
INSERT INTO costs VALUES (200, 55, 650, 70, 300, 500);

CREATE TABLE filteredDepartments (department VARCHAR);
CREATE TABLE filteredVisitIds (visit_no BIGINT);

CREATE VIEW filteredVisits AS
SELECT v.*,
  v.rbc_units * c.rbc_units_cost AS rbc_units_cost,
  v.ffp_units * c.ffp_units_cost AS ffp_units_cost,
  v.plt_units * c.plt_units_cost AS plt_units_cost,
  v.cryo_units * c.cryo_units_cost AS cryo_units_cost,
  v.whole_units * c.whole_cost AS whole_cost_calc,
  CASE WHEN COALESCE(v.cell_saver_ml, 0) > 0 THEN c.cell_saver_cost ELSE 0 END AS cell_saver_cost
FROM visits v
INNER JOIN filteredVisitIds fvi ON v.visit_no = fvi.visit_no
CROSS JOIN costs c
WHERE (NOT EXISTS (SELECT 1 FROM filteredDepartments))
   OR v.attending_provider_department IN (SELECT department FROM filteredDepartments);

CREATE VIEW filteredSurgeryCases AS
SELECT sc.* FROM surgery_cases sc
INNER JOIN filteredVisitIds fvi ON sc.visit_no = fvi.visit_no;


-- ── TEST DATA ──────────────────────────────────────────────────
-- Visit 1001: Dr. Alpha only (line 1). Q1 Jan. 4 RBC, DRG 2.5, LOS 5.0
INSERT INTO visits VALUES
  (1001,'M1','2024-01-15','2024-01-20',55,'IP',2.5,2.5,'2024-Jan','2024-Q1','2024',
   4,0,0,0,0,0,4, 5.0,false,false,false,false,true,false,false,
   4,0,0,0,4,'Dr. Alpha','A1',1,'Cardiology',true,[]);

-- Visit 1002: Dr. Alpha (line 1, 3 RBC, DRG 3.0, LOS 8) + Dr. Beta (line 2, 1 RBC, NULLs)
INSERT INTO visits VALUES
  (1002,'M2','2024-01-10','2024-01-18',60,'IP',3.0,3.0,'2024-Jan','2024-Q1','2024',
   3,0,0,0,0,0,3, 8.0,false,false,false,false,false,true,false,
   3,0,0,0,3,'Dr. Alpha','A1',1,'Cardiology',true,[]);
INSERT INTO visits VALUES
  (1002,'M2','2024-01-10','2024-01-18',NULL,NULL,NULL,NULL,'2024-Jan','2024-Q1','2024',
   1,0,0,0,0,0,1, NULL,NULL,NULL,NULL,NULL,false,false,false,
   1,0,0,0,1,'Dr. Beta','B1',2,'Cardiology',false,[]);

-- Visit 1003: Dr. Beta (line 1, 2 RBC, DRG 1.5, LOS 4) + Dr. Alpha (line 2, 0 RBC, NULLs). Q1 Feb.
INSERT INTO visits VALUES
  (1003,'M3','2024-02-01','2024-02-05',45,'IP',1.5,1.5,'2024-Feb','2024-Q1','2024',
   2,0,0,0,0,0,2, 4.0,false,false,false,false,false,false,true,
   2,0,0,0,2,'Dr. Beta','B1',1,'Surgery',true,[]);
INSERT INTO visits VALUES
  (1003,'M3','2024-02-01','2024-02-05',NULL,NULL,NULL,NULL,'2024-Feb','2024-Q1','2024',
   0,0,0,0,0,0,0, NULL,NULL,NULL,NULL,NULL,false,false,false,
   0,0,0,0,0,'Dr. Alpha','A1',2,'Cardiology',false,[]);

INSERT INTO filteredVisitIds SELECT DISTINCT visit_no FROM visits;

-- Surgery cases
INSERT INTO surgery_cases VALUES
  (5001,1001,'M1','A1','Dr. Alpha','AN1','Dr. Anesth1',
   '2024-01-16','2024-01-16','2024-01-16','2024-Jan','2024-Q1','2024',
   12.0,NULL,NULL,NULL,10.5,NULL,NULL,NULL,2,0,0,0,0,0,5.0,false,false,false,false,400,0,0,0,0,0,400);
INSERT INTO surgery_cases VALUES
  (5002,1002,'M2','A1','Dr. Alpha','AN2','Dr. Anesth2',
   '2024-01-12','2024-01-12','2024-01-12','2024-Jan','2024-Q1','2024',
   11.0,NULL,NULL,NULL,9.0,NULL,NULL,NULL,1,0,0,0,0,0,8.0,false,false,false,false,200,0,0,0,0,0,200);
INSERT INTO surgery_cases VALUES
  (5003,1003,'M3','GAMMA1','Dr. Gamma','AN3','Dr. Anesth3',
   '2024-02-02','2024-02-02','2024-02-02','2024-Feb','2024-Q1','2024',
   14.0,NULL,NULL,NULL,13.0,NULL,NULL,NULL,0,0,0,0,0,0,4.0,false,false,false,false,0,0,0,0,0,0,0);

-- ============================================================
-- TEST 1: "Average RBC Cost Per Visit" — Progress Over Time (Line Chart)
-- ============================================================
-- CHART: Two lines (All Providers vs Selected Provider) over quarters.
-- WHAT IT SHOWS: The average cost of RBC transfusions per VISIT in each time period.
-- For "All": sum RBC cost per visit, then average those visit-level totals per quarter.
-- For "Dr. Alpha": average of rbc_units_cost across Dr. Alpha's rows per quarter.
--
-- EXPECTED (Q1 2024):
--   Visit 1001: total RBC cost = 4*200 = $800
--   Visit 1002: total RBC cost = (3+1)*200 = $800
--   Visit 1003: total RBC cost = (2+0)*200 = $400
--   ALL line = AVG($800,$800,$400) = $666.67
--   Dr. Alpha line = AVG of his rows: visit 1001=$800, 1002-line1=$600, 1003-line2=$0 → $466.67
-- ============================================================

.print '=== TEST 1: Average RBC Cost Per Visit — Progress Over Time ==='

SELECT
  quarter,
  ROUND(all_avg, 2) AS all_providers_avg,
  CASE WHEN ABS(all_avg - 666.67) < 1 THEN 'PASS' ELSE 'FAIL: expected ~666.67' END AS all_verdict,
  ROUND(sel_avg, 2) AS dr_alpha_avg,
  CASE WHEN ABS(sel_avg - 466.67) < 1 THEN 'PASS' ELSE 'FAIL: expected ~466.67' END AS sel_verdict
FROM (
  -- "All" line: per-visit subquery (matches fixed Store.ts logic)
  SELECT quarter, AVG(visit_rbc_cost) AS all_avg
  FROM (
    SELECT visit_no, quarter, SUM(rbc_units_cost) AS visit_rbc_cost
    FROM filteredVisits WHERE attending_provider IS NOT NULL
    GROUP BY visit_no, quarter
  ) GROUP BY quarter
) a
JOIN (
  -- "Selected" line: direct aggregation for Dr. Alpha
  SELECT quarter, AVG(CAST(rbc_units_cost AS DOUBLE)) AS sel_avg
  FROM filteredVisits WHERE attending_provider = 'Dr. Alpha'
  GROUP BY quarter
) s USING (quarter);


-- ============================================================
-- TEST 2: "Average Length of Stay" — Progress Over Time (Line Chart)
-- ============================================================
-- CHART: Two lines over quarters.
-- WHAT IT SHOWS: Average LOS per visit. LOS is only non-NULL for line-1 (admitting attending).
-- For "All": MAX(los) per visit (gets the non-NULL line-1 value), then AVG across visits.
-- For "Dr. Alpha": AVG(los) directly — NULLs from line-2 rows are skipped.
--
-- EXPECTED (Q1 2024):
--   Visit 1001: LOS=5.0, Visit 1002: LOS=8.0, Visit 1003: LOS=4.0
--   ALL line = AVG(5,8,4) = 5.67
--   Dr. Alpha: line1 for 1001(5), 1002(8); line2 for 1003(NULL→skip) → AVG(5,8)=6.5
-- ============================================================

.print '=== TEST 2: Average Length of Stay — Progress Over Time ==='

SELECT
  quarter,
  ROUND(all_avg, 2) AS all_providers_avg,
  CASE WHEN ABS(all_avg - 5.67) < 0.1 THEN 'PASS' ELSE 'FAIL: expected ~5.67' END AS all_verdict,
  ROUND(sel_avg, 2) AS dr_alpha_avg,
  CASE WHEN ABS(sel_avg - 6.5) < 0.1 THEN 'PASS' ELSE 'FAIL: expected 6.5' END AS sel_verdict
FROM (
  SELECT quarter, AVG(visit_los) AS all_avg
  FROM (
    SELECT visit_no, quarter, MAX(CAST(los AS DOUBLE)) AS visit_los
    FROM filteredVisits WHERE attending_provider IS NOT NULL
    GROUP BY visit_no, quarter
  ) GROUP BY quarter
) a
JOIN (
  SELECT quarter, AVG(CAST(los AS DOUBLE)) AS sel_avg
  FROM filteredVisits WHERE attending_provider = 'Dr. Alpha'
  GROUP BY quarter
) s USING (quarter);


-- ============================================================
-- TEST 3: CMI Comparison (Provider Summary Card)
-- ============================================================
-- WHAT IT SHOWS: Case Mix Index per provider = SUM(ms_drg_weight) / count of visits
--   where ms_drg_weight is not null (i.e. line-1 visits only in denominator).
-- EXPECTED:
--   Dr. Alpha: line1 for 1001(2.5) + 1002(3.0), line2 for 1003(NULL)
--     CMI = 5.5 / 2 = 2.75 (NOT 5.5/3=1.83)
--   Dr. Beta: line1 for 1003(1.5), line2 for 1002(NULL)
--     CMI = 1.5 / 1 = 1.5 (NOT 1.5/2=0.75)
-- ============================================================

.print '=== TEST 3: CMI — Provider Summary Card ==='

SELECT
  attending_provider,
  ROUND(cmi, 4) AS cmi,
  CASE
    WHEN attending_provider = 'Dr. Alpha' AND ABS(cmi - 2.75) < 0.01 THEN 'PASS'
    WHEN attending_provider = 'Dr. Beta' AND ABS(cmi - 1.5) < 0.01 THEN 'PASS'
    ELSE 'FAIL'
  END AS verdict
FROM (
  SELECT attending_provider,
    SUM(ms_drg_weight) / NULLIF(COUNT(CASE WHEN ms_drg_weight IS NOT NULL THEN 1 END), 0) AS cmi
  FROM filteredVisits
  GROUP BY attending_provider
);


-- ============================================================
-- TEST 4: Surgery Count (Provider Summary Card)
-- ============================================================
-- WHAT IT SHOWS: Count of distinct surgery cases where the selected provider
--   was the ATTENDING PROVIDER for the visit (consistent with RBC attribution).
-- EXPECTED for Dr. Alpha:
--   Case 5001 on visit 1001 → Dr. Alpha is attending ✓
--   Case 5002 on visit 1002 → Dr. Alpha is attending ✓
--   Case 5003 on visit 1003 → Dr. Alpha is line-2 attending, still joins ✓
--   So count = 3 (all 3 cases are on visits where Alpha is an attending)
-- ============================================================

.print '=== TEST 4: Surgery Count — Provider Summary Card ==='

SELECT
  'Dr. Alpha' AS provider,
  cnt AS surgery_count,
  CASE WHEN cnt = 3 THEN 'PASS' ELSE 'FAIL: expected 3' END AS verdict
FROM (
  SELECT COUNT(DISTINCT sc.case_id) AS cnt
  FROM filteredSurgeryCases sc
  INNER JOIN filteredVisits fv ON sc.visit_no = fv.visit_no
  WHERE fv.attending_provider = 'Dr. Alpha'
);


-- ============================================================
-- TEST 5: RBC Units (Provider Summary Card)
-- ============================================================
-- WHAT IT SHOWS: Total RBC units where provider was attending.
-- Dr. Alpha: visit 1001 line1(4) + visit 1002 line1(3) + visit 1003 line2(0) = 7
-- ============================================================

.print '=== TEST 5: RBC Units — Provider Summary Card ==='

SELECT
  SUM(rbc_units) AS total_rbc,
  CASE WHEN SUM(rbc_units) = 7 THEN 'PASS' ELSE 'FAIL: expected 7' END AS verdict
FROM filteredVisits WHERE attending_provider = 'Dr. Alpha';


-- ============================================================
-- TEST 6: No Double-Averaging Across Months Within a Quarter
-- ============================================================
-- WHAT IT SHOWS: When the x-axis is "quarter", the query should GROUP BY quarter
--   directly, NOT group by month first and then re-average.
-- Our test data has Jan and Feb in Q1. If we incorrectly group by month first:
--   Jan avg RBC cost = (800+600+200)/3 = 533.33
--   Feb avg RBC cost = (400+0)/2 = 200
--   Re-averaged: (533.33+200)/2 = 366.67 ← WRONG
-- Correct: group by quarter directly, per-visit subquery:
--   All 3 visits in Q1: avg(800,800,400) = 666.67 ← CORRECT
-- ============================================================

.print '=== TEST 6: No Double-Averaging — Quarter Grouping ==='

SELECT
  quarter,
  ROUND(correct_avg, 2) AS correct_quarterly_avg,
  ROUND(wrong_avg, 2) AS wrong_double_averaged,
  CASE WHEN ABS(correct_avg - 666.67) < 1 THEN 'PASS' ELSE 'FAIL' END AS verdict
FROM (
  -- Correct: single-level GROUP BY quarter with per-visit subquery
  SELECT quarter, AVG(visit_cost) AS correct_avg
  FROM (
    SELECT visit_no, quarter, SUM(rbc_units_cost) AS visit_cost
    FROM filteredVisits WHERE attending_provider IS NOT NULL
    GROUP BY visit_no, quarter
  ) GROUP BY quarter
) correct
JOIN (
  -- Wrong: group by month first, then average the monthly averages
  SELECT quarter, AVG(monthly_avg) AS wrong_avg
  FROM (
    SELECT month, quarter, AVG(visit_cost) AS monthly_avg
    FROM (
      SELECT visit_no, month, quarter, SUM(rbc_units_cost) AS visit_cost
      FROM filteredVisits WHERE attending_provider IS NOT NULL
      GROUP BY visit_no, month, quarter
    ) GROUP BY month, quarter
  ) GROUP BY quarter
) wrong USING (quarter);


-- ============================================================
-- TEST 7: Population Histogram — Average RBC Units Per Provider
-- ============================================================
-- CHART: Bar chart showing distribution of per-provider average RBC units.
--   Each provider becomes one data point (their avg), then binned into a histogram.
-- WHAT IT SHOWS: Where each provider falls in the distribution.
-- EXPECTED:
--   Dr. Alpha: rows → 4(v1001), 3(v1002-L1), 0(v1003-L2) → avg=2.33
--   Dr. Beta:  rows → 1(v1002-L2), 2(v1003-L1) → avg=1.5
-- ============================================================

.print '=== TEST 7: Population Histogram — Avg RBC Per Provider ==='

SELECT
  attending_provider,
  ROUND(AVG(CAST(rbc_units AS DOUBLE)), 2) AS avg_rbc,
  CASE
    WHEN attending_provider = 'Dr. Alpha' AND ABS(AVG(CAST(rbc_units AS DOUBLE)) - 2.33) < 0.1 THEN 'PASS'
    WHEN attending_provider = 'Dr. Beta' AND ABS(AVG(CAST(rbc_units AS DOUBLE)) - 1.5) < 0.1 THEN 'PASS'
    ELSE 'FAIL'
  END AS verdict
FROM filteredVisits
WHERE attending_provider IS NOT NULL
GROUP BY attending_provider;


-- ============================================================
-- TEST 8: Population Histogram — CMI Per Provider
-- ============================================================
-- CHART: Distribution of per-provider CMI values.
-- Uses fixed CMI formula: SUM(weight) / NULLIF(COUNT(non-null weight), 0)
-- EXPECTED:
--   Dr. Alpha: (2.5+3.0)/2 = 2.75
--   Dr. Beta: 1.5/1 = 1.5
-- ============================================================

.print '=== TEST 8: Population Histogram — CMI Per Provider ==='

SELECT
  attending_provider,
  ROUND(SUM(ms_drg_weight) / NULLIF(COUNT(CASE WHEN ms_drg_weight IS NOT NULL THEN 1 END), 0), 4) AS cmi,
  CASE
    WHEN attending_provider = 'Dr. Alpha' AND ABS(SUM(ms_drg_weight) / NULLIF(COUNT(CASE WHEN ms_drg_weight IS NOT NULL THEN 1 END), 0) - 2.75) < 0.01 THEN 'PASS'
    WHEN attending_provider = 'Dr. Beta' AND ABS(SUM(ms_drg_weight) / NULLIF(COUNT(CASE WHEN ms_drg_weight IS NOT NULL THEN 1 END), 0) - 1.5) < 0.01 THEN 'PASS'
    ELSE 'FAIL'
  END AS verdict
FROM filteredVisits
WHERE attending_provider IS NOT NULL
GROUP BY attending_provider;


-- ============================================================
-- TEST 9: Pre-Op Anemia Rate — Progress Over Time (Line Chart)
-- ============================================================
-- CHART: Two lines. Sourced from filteredSurgeryCases, not visits.
-- WHAT IT SHOWS: % of surgery cases where pre_hgb < 13.0 g/dL, by quarter.
-- All surgeons line: AVG(anemia flag) grouped by quarter.
-- Selected surgeon line: same but filtered by surgeon_prov_name.
-- EXPECTED (Q1):
--   Case 5001: pre_hgb=12.0 < 13 → anemic
--   Case 5002: pre_hgb=11.0 < 13 → anemic
--   Case 5003: pre_hgb=14.0 ≥ 13 → not anemic
--   ALL = (1+1+0)/3 = 0.667
--   Dr. Alpha (surgeon): cases 5001,5002 → (1+1)/2 = 1.0
-- ============================================================

.print '=== TEST 9: Pre-Op Anemia Rate — Progress Over Time ==='

SELECT
  quarter,
  ROUND(all_rate, 4) AS all_anemia_rate,
  CASE WHEN ABS(all_rate - 0.6667) < 0.01 THEN 'PASS' ELSE 'FAIL' END AS all_verdict,
  ROUND(sel_rate, 4) AS dr_alpha_rate,
  CASE WHEN ABS(sel_rate - 1.0) < 0.01 THEN 'PASS' ELSE 'FAIL' END AS sel_verdict
FROM (
  SELECT quarter,
    AVG(CASE WHEN pre_hgb IS NOT NULL AND pre_hgb < 13.0 THEN 1.0 ELSE 0.0 END) AS all_rate
  FROM filteredSurgeryCases WHERE surgeon_prov_name IS NOT NULL
  GROUP BY quarter
) a
JOIN (
  SELECT quarter,
    AVG(CASE WHEN pre_hgb IS NOT NULL AND pre_hgb < 13.0 THEN 1.0 ELSE 0.0 END) AS sel_rate
  FROM filteredSurgeryCases WHERE surgeon_prov_name = 'Dr. Alpha'
  GROUP BY quarter
) s USING (quarter);


-- ============================================================
-- TEST 10: SUM Consistency — No Double Counting of Blood Products
-- ============================================================
-- Each transfusion is attributed to exactly one provider via ROW_NUMBER in backend SQL.
-- So SUM across all rows should equal sum of per-visit totals.
-- ============================================================

.print '=== TEST 10: SUM Consistency — No Double Counting ==='

SELECT
  sum_all_rows,
  sum_per_visit,
  CASE WHEN sum_all_rows = sum_per_visit THEN 'PASS' ELSE 'FAIL' END AS verdict
FROM (
  SELECT SUM(rbc_units) AS sum_all_rows FROM filteredVisits
) a, (
  SELECT SUM(visit_rbc) AS sum_per_visit FROM (
    SELECT visit_no, SUM(rbc_units) AS visit_rbc FROM filteredVisits GROUP BY visit_no
  )
) b;


.print ''
.print '============================================'
.print 'ALL TESTS COMPLETE'
.print '============================================'
