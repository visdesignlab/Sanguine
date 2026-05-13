export type FlagCategory = 'data_quality' | 'clinical' | 'opportunity';
export type FlagSource = 'visits' | 'surgery_cases';
export type RecordType = 'visit' | 'surgery_case';
export type ColumnSortType = 'string' | 'number' | 'date';

export interface DisplayColumn {
  key: string;
  label: string;
  sortType?: ColumnSortType;
  format?: (v: unknown) => string;
  /** Returns true if this specific cell value is an outlier and should be highlighted */
  isOutlierValue?: (v: unknown, row: Record<string, unknown>) => boolean;
}

export interface FlagDefinition {
  key: string;
  category: FlagCategory;
  label: string;
  rationale: string;
  source: FlagSource;
  idField: string;
  recordType: RecordType;
  whereClause: string;
  displayColumns: DisplayColumn[];
}

const fmtDate = (v: unknown) => (v != null ? new Date(Number(v)).toLocaleDateString() : '—');
const fmtNum = (v: unknown) => (v != null ? Number(v).toFixed(1) : '—');
const fmtInt = (v: unknown) => (v != null ? String(Math.round(Number(v))) : '—');

export const FLAGS: FlagDefinition[] = [
  {
    key: 'missing_preop_hgb_with_rbc',
    category: 'data_quality',
    label: 'Missing Pre-op Hgb with RBC Transfused',
    rationale: 'RBC units were given intraoperatively but no pre-op hemoglobin was recorded — guideline adherence cannot be assessed for these cases.',
    source: 'surgery_cases',
    idField: 'case_id',
    recordType: 'surgery_case',
    whereClause: 'pre_hgb IS NULL AND intraop_rbc_units > 0',
    displayColumns: [
      { key: 'case_id', label: 'Case ID', sortType: 'number' },
      { key: 'case_date', label: 'Date', sortType: 'date', format: fmtDate },
      { key: 'surgeon_prov_name', label: 'Surgeon', sortType: 'string' },
      { key: 'intraop_rbc_units', label: 'Intraop RBC', sortType: 'number', format: fmtInt, isOutlierValue: () => true },
    ],
  },
  {
    key: 'unreasonable_preop_hgb',
    category: 'data_quality',
    label: 'Unreasonable Pre-op Hemoglobin',
    rationale: 'Pre-op hemoglobin is outside the range compatible with survival (< 3 or > 20 g/dL) — almost certainly a data entry or EHR linkage error that will corrupt adherence calculations.',
    source: 'surgery_cases',
    idField: 'case_id',
    recordType: 'surgery_case',
    whereClause: 'pre_hgb IS NOT NULL AND (pre_hgb < 3 OR pre_hgb > 20)',
    displayColumns: [
      { key: 'case_id', label: 'Case ID', sortType: 'number' },
      { key: 'case_date', label: 'Date', sortType: 'date', format: fmtDate },
      { key: 'surgeon_prov_name', label: 'Surgeon', sortType: 'string' },
      { key: 'pre_hgb', label: 'Pre-op Hgb', sortType: 'number', format: fmtNum, isOutlierValue: () => true },
    ],
  },
  {
    key: 'unreasonable_preop_plt',
    category: 'data_quality',
    label: 'Unreasonable Pre-op Platelet Count',
    rationale: 'Pre-op platelet count is outside any plausible clinical range (< 5,000 or > 3,000,000 cells/µL) — almost certainly a transcription error or unit mismatch that will corrupt platelet adherence scoring.',
    source: 'surgery_cases',
    idField: 'case_id',
    recordType: 'surgery_case',
    whereClause: 'pre_plt IS NOT NULL AND (pre_plt < 5000 OR pre_plt > 3000000)',
    displayColumns: [
      { key: 'case_id', label: 'Case ID', sortType: 'number' },
      { key: 'case_date', label: 'Date', sortType: 'date', format: fmtDate },
      { key: 'surgeon_prov_name', label: 'Surgeon', sortType: 'string' },
      { key: 'pre_plt', label: 'Pre-op PLT (cells/µL)', sortType: 'number', format: fmtInt, isOutlierValue: () => true },
    ],
  },
  {
    key: 'unreasonable_preop_inr',
    category: 'data_quality',
    label: 'Unreasonable Pre-op INR',
    rationale: 'Pre-op INR is outside a plausible clinical range (< 0.5 or > 20) — likely a data entry error that may incorrectly trigger or suppress FFP adherence flags.',
    source: 'surgery_cases',
    idField: 'case_id',
    recordType: 'surgery_case',
    whereClause: 'pre_inr IS NOT NULL AND (pre_inr < 0.5 OR pre_inr > 20)',
    displayColumns: [
      { key: 'case_id', label: 'Case ID', sortType: 'number' },
      { key: 'case_date', label: 'Date', sortType: 'date', format: fmtDate },
      { key: 'surgeon_prov_name', label: 'Surgeon', sortType: 'string' },
      { key: 'pre_inr', label: 'Pre-op INR', sortType: 'number', format: fmtNum, isOutlierValue: () => true },
    ],
  },
  {
    key: 'no_provider',
    category: 'data_quality',
    label: 'No Attending Provider',
    rationale: 'These visits have no attributable attending provider — transfusions cannot be assigned to a provider scorecard and skew unattributed totals.',
    source: 'visits',
    idField: 'visit_no',
    recordType: 'visit',
    whereClause: "attending_provider = 'No Provider'",
    displayColumns: [
      { key: 'visit_no', label: 'Visit No', sortType: 'number' },
      { key: 'adm_dtm', label: 'Admit', sortType: 'date', format: fmtDate },
      { key: 'dsch_dtm', label: 'Discharge', sortType: 'date', format: fmtDate },
      { key: 'rbc_units', label: 'RBC Units', sortType: 'number', format: fmtInt },
    ],
  },
  {
    key: 'discharge_before_admit',
    category: 'data_quality',
    label: 'Discharge Before Admission',
    rationale: 'Discharge date is earlier than admission date — an impossible chronology that indicates a data entry error or EHR linkage problem. Length-of-stay and any time-based metrics for these visits will be negative or nonsensical.',
    source: 'visits',
    idField: 'visit_no',
    recordType: 'visit',
    whereClause: 'dsch_dtm IS NOT NULL AND adm_dtm IS NOT NULL AND dsch_dtm < adm_dtm',
    displayColumns: [
      { key: 'visit_no', label: 'Visit No', sortType: 'number' },
      { key: 'adm_dtm', label: 'Admit', sortType: 'date', format: fmtDate, isOutlierValue: () => true },
      { key: 'dsch_dtm', label: 'Discharge', sortType: 'date', format: fmtDate, isOutlierValue: () => true },
      { key: 'attending_provider', label: 'Provider', sortType: 'string' },
    ],
  },
  {
    key: 'extreme_los',
    category: 'data_quality',
    label: 'Extreme Length of Stay (> 365 days)',
    rationale: 'Length of stay exceeds one year — either a genuine long-term care case or a discharge date that was never recorded. These visits can distort LOS averages and outcomes statistics significantly.',
    source: 'visits',
    idField: 'visit_no',
    recordType: 'visit',
    whereClause: 'los > 365',
    displayColumns: [
      { key: 'visit_no', label: 'Visit No', sortType: 'number' },
      { key: 'adm_dtm', label: 'Admit', sortType: 'date', format: fmtDate },
      { key: 'dsch_dtm', label: 'Discharge', sortType: 'date', format: fmtDate },
      { key: 'los', label: 'LOS (days)', sortType: 'number', format: fmtNum, isOutlierValue: () => true },
      { key: 'attending_provider', label: 'Provider', sortType: 'string' },
    ],
  },
  {
    key: 'whole_blood_used',
    category: 'data_quality',
    label: 'High Whole Blood Usage (≥5 units)',
    rationale: '5 or more whole blood units are recorded for this visit. Whole blood usage should be reviewed to verify correct product coding and confirm appropriateness for the clinical setting.',
    source: 'visits',
    idField: 'visit_no',
    recordType: 'visit',
    whereClause: 'whole_units >= 5',
    displayColumns: [
      { key: 'visit_no', label: 'Visit No', sortType: 'number' },
      { key: 'adm_dtm', label: 'Admit', sortType: 'date', format: fmtDate },
      { key: 'attending_provider', label: 'Provider', sortType: 'string' },
      { key: 'whole_units', label: 'Whole Units', sortType: 'number', format: fmtInt, isOutlierValue: () => true },
    ],
  },
  {
    key: 'unreasonable_preop_fibrinogen',
    category: 'data_quality',
    label: 'Unreasonable Pre-op Fibrinogen',
    rationale: 'Pre-op fibrinogen is outside a plausible clinical range (< 30 or > 2,000 mg/dL) — the normal range is 150–400 mg/dL. Values outside this range are almost certainly transcription errors that will corrupt cryoprecipitate adherence scoring.',
    source: 'surgery_cases',
    idField: 'case_id',
    recordType: 'surgery_case',
    whereClause: 'pre_fibrinogen IS NOT NULL AND (pre_fibrinogen < 30 OR pre_fibrinogen > 2000)',
    displayColumns: [
      { key: 'case_id', label: 'Case ID', sortType: 'number' },
      { key: 'case_date', label: 'Date', sortType: 'date', format: fmtDate },
      { key: 'surgeon_prov_name', label: 'Surgeon', sortType: 'string' },
      { key: 'pre_fibrinogen', label: 'Pre-op Fibrinogen (mg/dL)', sortType: 'number', format: fmtNum, isOutlierValue: () => true },
    ],
  },
  {
    key: 'missing_preop_inr_with_ffp',
    category: 'data_quality',
    label: 'Missing Pre-op INR with FFP Transfused',
    rationale: 'FFP units were given intraoperatively but no pre-op INR was recorded — guideline adherence for FFP cannot be assessed for these cases, and the indication for FFP is unverifiable.',
    source: 'surgery_cases',
    idField: 'case_id',
    recordType: 'surgery_case',
    whereClause: 'intraop_ffp_units > 0 AND pre_inr IS NULL',
    displayColumns: [
      { key: 'case_id', label: 'Case ID', sortType: 'number' },
      { key: 'case_date', label: 'Date', sortType: 'date', format: fmtDate },
      { key: 'surgeon_prov_name', label: 'Surgeon', sortType: 'string' },
      { key: 'intraop_ffp_units', label: 'Intraop FFP', sortType: 'number', format: fmtInt, isOutlierValue: () => true },
    ],
  },
  {
    key: 'massive_transfusion',
    category: 'clinical',
    label: 'Massive Transfusion (≥10 RBC Units)',
    rationale: '10 or more RBC units were given during this visit — a high-utilization event that warrants individual clinical review regardless of guideline adherence.',
    source: 'visits',
    idField: 'visit_no',
    recordType: 'visit',
    whereClause: 'rbc_units >= 10',
    displayColumns: [
      { key: 'visit_no', label: 'Visit No', sortType: 'number' },
      { key: 'adm_dtm', label: 'Admit', sortType: 'date', format: fmtDate },
      { key: 'attending_provider', label: 'Provider', sortType: 'string' },
      { key: 'rbc_units', label: 'RBC Units', sortType: 'number', format: fmtInt, isOutlierValue: () => true },
    ],
  },
  {
    key: 'large_hgb_drop_no_transfusion',
    category: 'opportunity',
    label: 'Large Hgb Drop Without Transfusion (≥3 g/dL)',
    rationale: 'Hemoglobin fell ≥3 g/dL intraoperatively but no RBC units were given. This may represent excellent blood conservation — or a documentation gap / undertransfusion that warrants clinical review.',
    source: 'surgery_cases',
    idField: 'case_id',
    recordType: 'surgery_case',
    whereClause: 'pre_hgb IS NOT NULL AND post_hgb IS NOT NULL AND (pre_hgb - post_hgb) >= 3.0 AND intraop_rbc_units = 0',
    displayColumns: [
      { key: 'case_id', label: 'Case ID', sortType: 'number' },
      { key: 'case_date', label: 'Date', sortType: 'date', format: fmtDate },
      { key: 'surgeon_prov_name', label: 'Surgeon', sortType: 'string' },
      { key: 'pre_hgb', label: 'Pre-op Hgb', sortType: 'number', format: fmtNum, isOutlierValue: () => true },
      { key: 'post_hgb', label: 'Post-op Hgb', sortType: 'number', format: fmtNum, isOutlierValue: () => true },
    ],
  },
  {
    key: 'preop_anemia',
    category: 'opportunity',
    label: 'Pre-operative Anemia (Hgb < 13 g/dL)',
    rationale: 'Hemoglobin was below 13 g/dL before surgery — the WHO/NATA universal threshold for pre-operative optimization. Iron therapy, B12, or EPO started 2–4 weeks before elective surgery can meaningfully raise Hgb and reduce intraoperative transfusion need.',
    source: 'surgery_cases',
    idField: 'case_id',
    recordType: 'surgery_case',
    whereClause: 'pre_hgb > 0 AND pre_hgb < 13',
    displayColumns: [
      { key: 'case_id', label: 'Case ID', sortType: 'number' },
      { key: 'case_date', label: 'Date', sortType: 'date', format: fmtDate },
      { key: 'surgeon_prov_name', label: 'Surgeon', sortType: 'string' },
      { key: 'pre_hgb', label: 'Pre-op Hgb', sortType: 'number', format: fmtNum, isOutlierValue: () => true },
      { key: 'intraop_rbc_units', label: 'Intraop RBC', sortType: 'number', format: fmtInt },
    ],
  },
  {
    key: 'no_cell_saver_high_rbc',
    category: 'opportunity',
    label: 'No Cell Saver with High Intraop RBC (≥3 units)',
    rationale: '3 or more RBC units were transfused intraoperatively but cell salvage was not used. For elective high-blood-loss procedures, cell saver can often substitute 1–2 units of allogeneic RBC. These cases are candidates for a blood conservation protocol review.',
    source: 'surgery_cases',
    idField: 'case_id',
    recordType: 'surgery_case',
    whereClause: 'intraop_rbc_units >= 3 AND intraop_cell_saver_ml = 0',
    displayColumns: [
      { key: 'case_id', label: 'Case ID', sortType: 'number' },
      { key: 'case_date', label: 'Date', sortType: 'date', format: fmtDate },
      { key: 'surgeon_prov_name', label: 'Surgeon', sortType: 'string' },
      { key: 'intraop_rbc_units', label: 'Intraop RBC', sortType: 'number', format: fmtInt, isOutlierValue: () => true },
      { key: 'intraop_cell_saver_ml', label: 'Cell Saver (mL)', sortType: 'number', format: fmtInt },
    ],
  },
];

export const FLAG_CATEGORY_META: Record<FlagCategory, { label: string; color: string }> = {
  data_quality: { label: 'Data Quality', color: 'orange' },
  clinical: { label: 'Clinical Protocol', color: 'red' },
  opportunity: { label: 'Opportunity', color: 'blue' },
};

