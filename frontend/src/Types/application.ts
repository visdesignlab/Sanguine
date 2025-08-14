import { TransfusionEvent } from './database';

// Time formatting ------------------------------------------------
// Time period types
export type Quarter = `${number}-Q${1 | 2 | 3 | 4}`;
export type Month = `${number}-${string}`; // e.g. "2023-Jan"
export type Year = `${number}`; // e.g. "2023"
export type TimePeriod = Quarter | Month | Year;

// Time consts for application
export const TIME_CONSTANTS = {
  TWO_HOURS_MS: 2 * 60 * 60 * 1000,
  TWO_DAYS_MS: 2 * 24 * 60 * 60 * 1000,
  ONE_DAY_MS: 24 * 60 * 60 * 1000,
  VENTILATOR_THRESHOLD_MINS: 1440,
} as const;

// Variable aggregation options
export const AGGREGATION_OPTIONS = {
  sum: { label: 'Sum' },
  avg: { label: 'Average' },
} as const;

// Blood components -----------------------------------------------
const BLOOD_COMPONENT_DECIMALS = { sum: 0, avg: 2 };

export const BLOOD_COMPONENTS = [
  {
    value: 'rbc_units',
    label: {
      base: 'RBCs Transfused',
      sum: 'Total RBCs Transfused',
      avg: 'Average RBCs Transfused Per Visit',
    },
    units: { sum: 'RBC Units', avg: 'RBC Units' },
    decimals: BLOOD_COMPONENT_DECIMALS,
  },
  {
    value: 'ffp_units',
    label: {
      base: 'FFP Transfused',
      sum: 'Total FFP Transfused',
      avg: 'Average FFP Transfused Per Visit',
    },
    units: { sum: 'Plasma Units', avg: 'Plasma Units' },
    decimals: BLOOD_COMPONENT_DECIMALS,
  },
  {
    value: 'plt_units',
    label: {
      base: 'Platelets Transfused',
      sum: 'Total Platelets Transfused',
      avg: 'Average Platelets Transfused Per Visit',
    },
    units: { sum: 'Platelet Units', avg: 'Platelet Units' },
    decimals: BLOOD_COMPONENT_DECIMALS,
  },
  {
    value: 'cryo_units',
    label: {
      base: 'Cryo Transfused',
      sum: 'Total Cryo Transfused',
      avg: 'Average Cryo Transfused Per Visit',
    },
    units: { sum: 'Cryo Units', avg: 'Cryo Units' },
    decimals: BLOOD_COMPONENT_DECIMALS,
  },
  {
    value: 'cell_saver_ml',
    label: {
      base: 'Cell Salvage Volume (ml) Used',
      sum: 'Total Cell Salvage Volume (ml) Used',
      avg: 'Average Cell Salvage Volume (ml) Used Per Visit',
    },
    units: { sum: 'mL', avg: 'mL' },
    decimals: BLOOD_COMPONENT_DECIMALS,
  },
] as const;
// Values of blood components
export type BloodComponent = typeof BLOOD_COMPONENTS[number]['value'];
// Readonly array of blood component options
export const BLOOD_COMPONENT_OPTIONS = BLOOD_COMPONENTS as ReadonlyArray<{
  value: BloodComponent;
  label: { base: string; sum: string; avg: string };
  units: { sum: string; avg: string };
  decimals: { sum: number; avg: number };
}>;

// Outcomes -------------------------------------------------------
export const OUTCOMES = [
  {
    value: 'los',
    label: {
      base: 'Length of Stay',
      sum: 'Total Length of Stay',
      avg: 'Average Length of Stay',
    },
    units: { sum: 'Days', avg: 'Days' },
    decimals: { sum: 0, avg: 2 },
  },
  {
    value: 'death',
    label: {
      base: 'Death',
      sum: 'Total Deaths',
      avg: 'Percentage of Visits with Death',
    },
    units: { sum: 'Visits', avg: '% of Visits' },
    decimals: { sum: 0, avg: 1 },
  },
  {
    value: 'vent',
    label: {
      base: 'Ventilator >24hr',
      sum: 'Total Ventilator >24hr',
      avg: 'Percentage of Visits with Ventilator >24hr',
    },
    units: { sum: 'Visits', avg: '% of Visits' },
    decimals: 0,
  },
  {
    value: 'stroke',
    label: {
      base: 'Stroke',
      sum: 'Total Stroke',
      avg: 'Percentage of Visits with Stroke',
    },
    units: { sum: 'Visits', avg: '% of Visits' },
    decimals: 0,
  },
  {
    value: 'ecmo',
    label: {
      base: 'ECMO',
      sum: 'Total ECMO',
      avg: 'Percentage of Visits with ECMO',
    },
    units: { sum: 'Visits', avg: '% of Visits' },
    decimals: 0,
  },
] as const;
// Values of outcomes
export type Outcome = typeof OUTCOMES[number]['value'];
// Readonly array of outcome options
export const OUTCOME_OPTIONS = OUTCOMES as ReadonlyArray<{
  value: Outcome;
  label: { base: string; sum: string; avg: string };
  units: { sum: string; avg: string };
  decimals: number | { sum: number; avg: number };
}>;

// Prophylactic Medications ---------------------------------------
export const PROPHYL_MEDS = [
  {
    value: 'b12',
    label: {
      base: 'B12 Pre-Surgery',
      sum: 'Total Visits Using B12 Pre-Surgery',
      avg: 'Percentage of Visits Used B12 Pre-Surgery',
    },
    aliases: ['b12', 'cobalamin'],
    units: { sum: 'Visits', avg: '% of Visits' },
    decimals: 0,
  },
  {
    value: 'iron',
    label: {
      base: 'Iron Pre-Surgery',
      sum: 'Total Visits Using Iron Pre-Surgery',
      avg: 'Percentage of Visits Used Iron Pre-Surgery',
    },
    aliases: ['iron', 'ferrous', 'ferric'],
    units: { sum: 'Visits', avg: '% of Visits' },
    decimals: 0,
  },
  {
    value: 'txa',
    label: {
      base: 'Tranexamic Acid Pre-Surgery',
      sum: 'Total Visits Using Tranexamic Acid Pre-Surgery',
      avg: 'Percentage of Visits Used Tranexamic Acid Pre-Surgery',
    },
    aliases: ['tranexamic', 'txa'],
    units: { sum: 'Visits', avg: '% of Visits' },
    decimals: 0,
  },
  {
    value: 'amicar',
    label: {
      base: 'Amicar Pre-Surgery',
      sum: 'Total Visits Using Amicar Pre-Surgery',
      avg: 'Percentage of Visits Used Amicar Pre-Surgery',
    },
    aliases: ['amicar', 'aminocaproic'],
    units: { sum: 'Visits', avg: '% of Visits' },
    decimals: 0,
  },
] as const;
// Values of prophylactic medications
export type ProphylMed = typeof PROPHYL_MEDS[number]['value'];
// Readonly array of prophylactic medication options
export const PROPHYL_MED_OPTIONS = PROPHYL_MEDS as ReadonlyArray<{
  value: ProphylMed;
  label: { base: string; sum: string; avg: string };
  aliases: readonly string[];
  units: { sum: string; avg: string };
  decimals: number;
}>;

// Guideline adherence ---------------------------------------------
export const GUIDELINE_ADHERENCE = {
  rbc: {
    value: 'rbc_adherence',
    label: {
      base: 'Guideline Adherent RBC Transfusions',
      sum: 'Total Guideline Adherent RBC Transfusions',
      avg: 'Percentage of Guideline Adherent RBC Transfusions',
    },
    // To calculate adherence, we need:
    adherentCount: 'rbc_adherent',
    totalTransfused: 'rbc_total',
    // The lab description used to determine adherence
    labDesc: ['HGB', 'Hemoglobin'],
    adherenceCheck: (labValue: number) => labValue <= 7.5,
    // Units used for transfusion counts
    transfusionUnits: ['rbc_units', 'rbc_vol'] as const,
    // Adherence units & decimal truncation for display
    units: { sum: 'Adherent RBC Transfusions', avg: '% Adherent RBC Transfusions' },
    decimals: 0,
  },
  ffp: {
    value: 'ffp_adherence',
    label: {
      base: 'Guideline Adherent FFP Transfusions',
      sum: 'Total Guideline Adherent FFP Transfusions',
      avg: 'Percentage of Guideline Adherent FFP Transfusions',
    },
    adherentCount: 'ffp_adherent',
    totalTransfused: 'ffp_total',
    labDesc: ['INR'],
    adherenceCheck: (labValue: number) => labValue >= 1.5,
    transfusionUnits: ['ffp_units', 'ffp_vol'] as const,
    units: { sum: 'Adherent Plasma Transfusions', avg: '% Adherent Plasma Transfusions' },
    decimals: 0,
  },
  plt: {
    value: 'plt_adherence',
    label: {
      base: 'Guideline Adherent Platelet Transfusions',
      sum: 'Total Guideline Adherent Platelet Transfusions',
      avg: 'Percentage of Adherent Platelet Transfusions',
    },
    adherentCount: 'plt_adherent',
    totalTransfused: 'plt_total',
    labDesc: ['PLT', 'Platelet Count'],
    adherenceCheck: (labValue: number) => labValue >= 15000,
    transfusionUnits: ['plt_units', 'plt_vol'] as const,
    units: { sum: 'Adherent Platelet Transfusions', avg: '% Adherent Platelet Transfusions' },
    decimals: 0,
  },
  cryo: {
    value: 'cryo_adherence',
    label: {
      base: 'Guideline Adherent Cryo Transfusions',
      sum: 'Total Guideline Adherent Cryo Transfusions',
      avg: 'Percentage of Guideline Adherent Cryo Transfusions',
    },
    adherentCount: 'cryo_adherent',
    totalTransfused: 'cryo_total',
    labDesc: ['Fibrinogen'],
    adherenceCheck: (labValue: number) => labValue >= 175,
    transfusionUnits: ['cryo_units', 'cryo_vol'] as const,
    units: { sum: 'Adherent Cryo Transfusions', avg: '% Adherent Cryo Transfusions' },
    decimals: 0,
  },
} as const;

// Total guideline adherence (Across all blood products)
export const OVERALL_GUIDELINE_ADHERENCE = {
  value: 'overall_adherence',
  adherentCount: 'overall_adherent',
  totalTransfused: 'overall_transfused',
  label: {
    base: 'Guideline Adherent Transfusions',
    sum: 'Total Guideline Adherent Transfusions',
    avg: 'Percentage of Guideline Adherent Transfusions',
  },
  units: { sum: 'Adherent Transfusions', avg: '% Adherent Transfusions' },
  decimals: 0,
} as const;

// Types for guideline adherence fields
export type GuidelineAdherence = typeof GUIDELINE_ADHERENCE[keyof typeof GUIDELINE_ADHERENCE]['value'];
export type AdherentCountField = typeof GUIDELINE_ADHERENCE[keyof typeof GUIDELINE_ADHERENCE]['adherentCount'];
export type TotalTransfusedField = typeof GUIDELINE_ADHERENCE[keyof typeof GUIDELINE_ADHERENCE]['totalTransfused'];

// Types for overall guideline adherence fields
export type OverallAdherentCountField = typeof OVERALL_GUIDELINE_ADHERENCE['adherentCount'];
export type OverallTotalTransfusedField = typeof OVERALL_GUIDELINE_ADHERENCE['totalTransfused'];
export type OverallGuidelineAdherence = typeof OVERALL_GUIDELINE_ADHERENCE['value'];

// Guideline adherence options for dashboard
export const GUIDELINE_ADHERENCE_OPTIONS = Object.values(GUIDELINE_ADHERENCE) as ReadonlyArray<{
  value: GuidelineAdherence;
  label: { base: string; sum: string; avg: string };
  adherentCount: AdherentCountField;
  totalTransfused: TotalTransfusedField;
  labDesc: readonly string[];
  adherenceCheck: (labValue: number) => boolean;
  transfusionUnits: readonly (keyof TransfusionEvent)[];
  units: { sum: string; avg: string };
  decimals: number;
}>;

// Costs / Savings -------------------------------------------------
// Types of costs
export const COSTS = {
  rbc_units_cost: {
    value: 'rbc_units_cost',
    label: {
      base: 'RBC Cost',
      sum: 'Total RBC Cost',
      avg: 'Average RBC Cost Per Visit',
    },
    units: { sum: '$', avg: '$' },
    decimals: { sum: 0, avg: 2 },
    unitCost: 200,
  },
  ffp_units_cost: {
    value: 'ffp_units_cost',
    label: {
      base: 'FFP Cost',
      sum: 'Total FFP Cost',
      avg: 'Average FFP Cost Per Visit',
    },
    units: { sum: '$', avg: '$' },
    decimals: { sum: 0, avg: 2 },
    unitCost: 55,
  },
  plt_units_cost: {
    value: 'plt_units_cost',
    label: {
      base: 'Platelet Cost',
      sum: 'Total Platelet Cost',
      avg: 'Average Platelet Cost Per Visit',
    },
    units: { sum: '$', avg: '$' },
    decimals: { sum: 0, avg: 2 },
    unitCost: 650,
  },
  cryo_units_cost: {
    value: 'cryo_units_cost',
    label: {
      base: 'Cryo Cost',
      sum: 'Total Cryo Cost',
      avg: 'Average Cryo Cost Per Visit',
    },
    units: { sum: '$', avg: '$' },
    decimals: { sum: 0, avg: 2 },
    unitCost: 70,
  },
  cell_saver_ml_cost: {
    value: 'cell_saver_ml_cost',
    label: {
      base: 'Cell Salvage Cost',
      sum: 'Total Cell Salvage Cost',
      avg: 'Average Cell Salvage Cost Per Visit',
    },
    units: { sum: '$', avg: '$' },
    decimals: { sum: 0, avg: 2 },
    unitCost: 2.50,
  },
} as const;

// Values of prophylactic medications
export type Cost = typeof COSTS[keyof typeof COSTS]['value'];
// Readonly array of prophylactic medication options
export const COST_OPTIONS = Object.values(COSTS) as ReadonlyArray<{
  value: Cost;
  label: { base: string; sum: string; avg: string };
  units: { sum: string; avg: string };
  decimals: { sum: number; avg: number };
}>;

export const OVERALL_BLOOD_PRODUCT_COST = {
  value: 'total_blood_product_costs',
  label: {
    base: 'Blood Product Costs',
    sum: 'Total Blood Product Costs',
    avg: 'Average Blood Product Costs Per Visit',
  },
  units: { sum: '$', avg: '$' },
  decimals: { sum: 0, avg: 2 },
  unitCost: 0, // Not used for total
};

// CPT Codes -------------------------------------------------------
export const CPT_CODES = {
  stroke: ['99291', '1065F', '1066F'],
  ecmo: [
    '33946', '33947', '33948', '33949', '33950', '33951', '33952', '33953', '33954', '33955',
    '33956', '33957', '33958', '33959', '33960', '33961', '33962', '33963', '33964', '33965',
    '33966', '33969', '33984', '33985', '33986', '33987', '33988', '33989',
  ],
} as const;

// PBM Dashboard ---------------------------------------------------

// --- Dashboard charts ---
// X-axis time aggregation options for dashboard
export const TIME_AGGREGATION_OPTIONS = {
  quarter: { label: 'Quarter' },
  month: { label: 'Month' },
  year: { label: 'Year' },
} as const;

export type TimeAggregation = keyof typeof TIME_AGGREGATION_OPTIONS;

// Dashboard chart x-axis variable options (time aggregation)
export const dashboardXAxisOptions = Object.entries(TIME_AGGREGATION_OPTIONS).map(([value, { label }]) => ({ value, label }));
export const dashboardXAxisVars = dashboardXAxisOptions.map((opt) => opt.value);

// Dashboard chart y-axis variable options
export const dashboardYAxisOptions = [
  ...BLOOD_COMPONENT_OPTIONS,
  OVERALL_GUIDELINE_ADHERENCE,
  ...GUIDELINE_ADHERENCE_OPTIONS,
  ...OUTCOME_OPTIONS,
  ...PROPHYL_MED_OPTIONS,
  ...COST_OPTIONS,
  OVERALL_BLOOD_PRODUCT_COST,
];
export const dashboardYAxisVars = dashboardYAxisOptions.map((opt) => opt.value);

// Dashboard aggregate y-axis variable type
export type DashboardAggYAxisVar = `${keyof typeof AGGREGATION_OPTIONS}_${typeof dashboardYAxisVars[number]}`;

// Chart configuration type
export type DashboardChartConfig = {
  chartId: string;
  xAxisVar: typeof dashboardXAxisVars[number];
  yAxisVar: typeof dashboardYAxisVars[number];
  aggregation: keyof typeof AGGREGATION_OPTIONS;
  chartType?: 'line' | 'bar' | 'stackedBar';
};

// Dashboard chart configuration key type
export type DashboardChartConfigKey = `${DashboardAggYAxisVar}_${typeof dashboardXAxisVars[number]}`;

// Dashboard chart data value type
export type DashboardChartDataValue =
  // E.g. ({ timePeriod: '2023-Q1', data: 100 })
  | Array<{ timePeriod: TimePeriod; data: number }>
  // E.g. ({ timePeriod: '2023-Q1', rbc_units: 50, ffp_units: 30 })
  | Array<{ timePeriod: TimePeriod } & Record<string, number>>;

// Dashboard chart data type (key, value)
export type DashboardChartData = Record<DashboardChartConfigKey, DashboardChartDataValue>;

// --- Dashboard stats ---
export type DashboardStatConfig = {
  statId: string;
  var: typeof dashboardYAxisVars[number];
  aggregation?: keyof typeof AGGREGATION_OPTIONS;
  title: string;
};

export type DashboardStatData = Record<DashboardAggYAxisVar, {value: string, diff: number, comparedTo?: string, sparklineData: number[]} >;
