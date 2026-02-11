// Time formatting ------------------------------------------------
// Time period types
// TODO: Update ScatterPlot data type
import { ScatterChartSeries } from '@mantine/charts';

export type Quarter = `${number}-Q${1 | 2 | 3 | 4}`;
export type Month = `${number}-${string}`; // e.g. "2023-Jan"
export type Year = `${number}`; // e.g. "2023"
export type TimePeriod = Quarter | Month | Year;

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
      short: 'RBCs',
      base: 'RBCs Transfused',
      sum: 'Total RBCs Transfused',
      avg: 'Average RBCs Transfused Per Visit',
    },
    units: {
      sum: 'RBC Units',
      avg: 'RBC Units Per Visit',
      sumShort: ' Units',
      avgShort: ' Units',
    },
    decimals: BLOOD_COMPONENT_DECIMALS,
  },
  {
    value: 'ffp_units',
    label: {
      short: 'FFP',
      base: 'FFP Transfused',
      sum: 'Total FFP Transfused',
      avg: 'Average FFP Transfused Per Visit',
    },
    units: {
      sum: 'Plasma Units',
      avg: 'Plasma Units Per Visit',
      sumShort: ' Units',
      avgShort: ' Units',
    },
    decimals: BLOOD_COMPONENT_DECIMALS,
  },
  {
    value: 'plt_units',
    label: {
      short: 'Platelets',
      base: 'Platelets Transfused',
      sum: 'Total Platelets Transfused',
      avg: 'Average Platelets Transfused Per Visit',
    },
    units: {
      sum: 'Platelet Units',
      avg: 'Platelet Units Per Visit',
      sumShort: ' Units',
      avgShort: ' Units',
    },
    decimals: BLOOD_COMPONENT_DECIMALS,
  },
  {
    value: 'cryo_units',
    label: {
      short: 'Cryo',
      base: 'Cryo Transfused',
      sum: 'Total Cryo Transfused',
      avg: 'Average Cryo Transfused Per Visit',
    },
    units: {
      sum: 'Cryo Units',
      avg: 'Cryo Units Per Visit',
      sumShort: ' Units',
      avgShort: ' Units',
    },
    decimals: BLOOD_COMPONENT_DECIMALS,
  },
  {
    value: 'cell_saver_ml',
    label: {
      short: 'Cell Salvage',
      base: 'Cell Salvage Volume (ml) Used',
      sum: 'Total Cell Salvage Volume (ml) Used',
      avg: 'Average Cell Salvage Volume (ml) Used Per Visit',
    },
    units: {
      sum: 'mL',
      avg: 'mL Per Visit',
      sumShort: ' mL',
      avgShort: ' mL',
    },
    decimals: BLOOD_COMPONENT_DECIMALS,
  },
] as const;
// Values of blood components
export type BloodComponent = typeof BLOOD_COMPONENTS[number]['value'];
// Readonly array of blood component options
export const BLOOD_COMPONENT_OPTIONS = BLOOD_COMPONENTS as ReadonlyArray<{
  value: BloodComponent;
  label: { short: string; base: string; sum: string; avg: string };
  units: {
    sum: string;
    avg: string;
    sumShort?: string;
    avgShort?: string;
    type?: 'prefix' | 'suffix';
  };
  decimals: { sum: number; avg: number };
}>;

// Outcomes -------------------------------------------------------
export const OUTCOMES = [
  {
    value: 'los',
    label: {
      short: 'LOS',
      base: 'Length of Stay',
      sum: 'Total Length of Stay',
      avg: 'Average Length of Stay',
    },
    units: {
      sum: 'Days', avg: 'Days', sumShort: ' days', avgShort: ' days',
    },
    decimals: { sum: 0, avg: 2 },
  },
  {
    value: 'death',
    label: {
      short: 'Death',
      base: 'Death',
      sum: 'Total Deaths',
      avg: 'Percentage of Visits with Death',
    },
    units: {
      sum: 'Visits',
      avg: '% of Visits',
      avgShort: '%',
    },
    decimals: { sum: 0, avg: 1 },
  },
  {
    value: 'vent',
    label: {
      short: 'Vent',
      base: 'Ventilator >24hr',
      sum: 'Total Ventilator >24hr',
      avg: 'Percentage of Visits with Ventilator >24hr',
    },
    units: { sum: 'Visits', avg: '% of Visits', avgShort: '%' },
    decimals: 0,
  },
  {
    value: 'stroke',
    label: {
      short: 'Stroke',
      base: 'Stroke',
      sum: 'Total Stroke',
      avg: 'Percentage of Visits with Stroke',
    },
    units: { sum: 'Visits', avg: '% of Visits', avgShort: '%' },
    decimals: 0,
  },
  {
    value: 'ecmo',
    label: {
      short: 'ECMO',
      base: 'ECMO',
      sum: 'Total ECMO',
      avg: 'Percentage of Visits with ECMO',
    },
    units: { sum: 'Visits', avg: '% of Visits', avgShort: '%' },
    decimals: 0,
  },
] as const;
// Values of outcomes
export type Outcome = typeof OUTCOMES[number]['value'];
// Readonly array of outcome options
export const OUTCOME_OPTIONS = OUTCOMES as ReadonlyArray<{
  value: Outcome;
  label: { short: string; base: string; sum: string; avg: string };
  units: {
    sum: string;
    avg: string;
    sumShort?: string;
    avgShort?: string;
    type?: 'prefix' | 'suffix';
  };
  decimals: number | { sum: number; avg: number };
}>;

// Prophylactic Medications ---------------------------------------
export const PROPHYL_MEDS = [
  {
    value: 'b12',
    label: {
      short: 'B12',
      base: 'B12 Pre-Surgery',
      sum: 'Total Visits Used B12 Pre-Surgery',
      avg: 'Percentage of Visits Used B12 Pre-Surgery',
    },
    units: { sum: 'Visits', avg: '% of Visits', avgShort: '%' },
    decimals: 0,
  },
  {
    value: 'iron',
    label: {
      short: 'Iron',
      base: 'Iron Pre-Surgery',
      sum: 'Total Visits Used Iron Pre-Surgery',
      avg: 'Percentage of Visits Used Iron Pre-Surgery',
    },
    units: { sum: 'Visits', avg: '% of Visits', avgShort: '%' },
    decimals: 0,
  },
  {
    value: 'antifibrinolytic',
    label: {
      short: 'Antifibrinolytics',
      base: 'Antifibrinolytics Used Pre-Surgery',
      sum: 'Total Visits Used Antifibrinolytics Pre-Surgery',
      avg: 'Percentage of Visits Used Antifibrinolytics Pre-Surgery',
    },
    units: { sum: 'Visits', avg: '% of Visits', avgShort: '%' },
    decimals: 0,
  },
] as const;
// Values of prophylactic medications
export type ProphylMed = typeof PROPHYL_MEDS[number]['value'];
// Readonly array of prophylactic medication options
export const PROPHYL_MED_OPTIONS = PROPHYL_MEDS as ReadonlyArray<{
  value: ProphylMed;
  label: { short: string; base: string; sum: string; avg: string };
  units: {
    sum: string;
    avg: string;
    sumShort?: string;
    avgShort?: string;
    type?: 'prefix' | 'suffix';
  };
  decimals: number;
}>;

// Guideline adherence ---------------------------------------------
export const GUIDELINE_ADHERENT = {
  rbc: {
    value: 'rbc_adherent',
    label: {
      short: 'Adherent RBC',
      base: 'Guideline Adherent RBC Transfusions',
      sum: 'Total Guideline Adherent RBC Transfusions',
      avg: 'Percentage of Guideline Adherent RBC Transfusions',
    },
    // Adherence units & decimal truncation for display
    units: {
      sum: 'Adherent RBC Transfusions',
      avg: '% Adherent RBC Transfusions',
      avgShort: '%',
      sumShort: '',
    },
    decimals: 0,
  },
  ffp: {
    value: 'ffp_adherent',
    label: {
      short: 'Adherent FFP',
      base: 'Guideline Adherent FFP Transfusions',
      sum: 'Total Guideline Adherent FFP Transfusions',
      avg: 'Percentage of Guideline Adherent FFP Transfusions',
    },
    units: {
      sum: 'Adherent Plasma Transfusions',
      avg: '% Adherent Plasma Transfusions',
      avgShort: '%',
      sumShort: '',
    },
    decimals: 0,
  },
  plt: {
    value: 'plt_adherent',
    label: {
      short: 'Adherent Platelet',
      base: 'Guideline Adherent Platelet Transfusions',
      sum: 'Total Guideline Adherent Platelet Transfusions',
      avg: 'Percentage of Adherent Platelet Transfusions',
    },
    units: {
      sum: 'Adherent Platelet Transfusions',
      avg: '% Adherent Platelet Transfusions',
      avgShort: '%',
      sumShort: '',
    },
    decimals: 0,
  },
  cryo: {
    value: 'cryo_adherent',
    label: {
      short: 'Adherent Cryo',
      base: 'Guideline Adherent Cryo Transfusions',
      sum: 'Total Guideline Adherent Cryo Transfusions',
      avg: 'Percentage of Guideline Adherent Cryo Transfusions',
    },
    units: {
      sum: 'Adherent Cryo Transfusions',
      avg: '% Adherent Cryo Transfusions',
      avgShort: '%',
      sumShort: '',
    },
    decimals: 0,
  },
} as const;

// Total guideline adherence (Across all blood products)
export const OVERALL_GUIDELINE_ADHERENT = {
  value: 'overall_adherent',
  label: {
    short: 'Adherent Transfusions',
    base: 'Guideline Adherent Transfusions',
    sum: 'Total Guideline Adherent Transfusions',
    avg: 'Percentage of Guideline Adherent Transfusions',
  },
  units: {
    sum: 'Adherent Transfusions',
    avg: '% Adherent Transfusions',
    avgShort: '%',
    sumShort: '',
  },
  decimals: 0,
} as const;

// Types for guideline adherence fields
export type GuidelineAdherence = typeof GUIDELINE_ADHERENT[keyof typeof GUIDELINE_ADHERENT]['value'];

// Guideline adherence options for dashboard
export const GUIDELINE_ADHERENT_OPTIONS = Object.values(GUIDELINE_ADHERENT) as ReadonlyArray<{
  value: GuidelineAdherence;
  label: { short: string; base: string; sum: string; avg: string };
  units: {
    sum: string;
    avg: string;
    sumShort?: string;
    avgShort?: string;
    type?: 'prefix' | 'suffix';
  };
  decimals: number;
}>;

// Lab Results ---------------------------------------------------
export const LAB_RESULTS = [
  {
    value: 'post_op_hgb',
    label: {
      short: 'Post-op Hgb',
      base: 'Post-Operative Hemoglobin',
      sum: 'Total Post-Operative Hemoglobin',
      avg: 'Average Post-Operative Hemoglobin',
    },
    units: { sum: 'g/dL', avg: 'g/dL' },
    decimals: { sum: 0, avg: 2 },
  },
] as const;
export type LabResult = typeof LAB_RESULTS[number]['value'];
export const LAB_RESULT_OPTIONS = LAB_RESULTS as ReadonlyArray<{
  value: LabResult;
  label: { short: string; base: string; sum: string; avg: string };
  units: { sum: string; avg: string };
  decimals: { sum: number; avg: number };
}>;

// Costs / Savings -------------------------------------------------

// Types of costs
export const COSTS = {
  rbc_units_cost: {
    value: 'rbc_units_cost',
    label: {
      short: 'RBC Cost',
      base: 'RBC Cost',
      sum: 'Total RBC Cost',
      avg: 'Average RBC Cost Per Visit',
    },
    units: {
      sum: '$', avg: '$', sumShort: '$', avgShort: '$', type: 'prefix',
    },
    decimals: { sum: 0, avg: 0 },
  },
  ffp_units_cost: {
    value: 'ffp_units_cost',
    label: {
      short: 'FFP Cost',
      base: 'FFP Cost',
      sum: 'Total FFP Cost',
      avg: 'Average FFP Cost Per Visit',
    },
    units: {
      sum: '$', avg: '$', sumShort: '$', avgShort: '$', type: 'prefix',
    },
    decimals: { sum: 0, avg: 0 },
  },
  plt_units_cost: {
    value: 'plt_units_cost',
    label: {
      short: 'Platelet Cost',
      base: 'Platelet Cost',
      sum: 'Total Platelet Cost',
      avg: 'Average Platelet Cost Per Visit',
    },
    units: {
      sum: '$', avg: '$', sumShort: '$', avgShort: '$', type: 'prefix',
    },
    decimals: { sum: 0, avg: 0 },
  },
  cryo_units_cost: {
    value: 'cryo_units_cost',
    label: {
      short: 'Cryo Cost',
      base: 'Cryo Cost',
      sum: 'Total Cryo Cost',
      avg: 'Average Cryo Cost Per Visit',
    },
    units: {
      sum: '$', avg: '$', sumShort: '$', avgShort: '$', type: 'prefix',
    },
    decimals: { sum: 0, avg: 0 },
  },
  // TODO: Unit cost is wrong
  cell_saver_cost: {
    value: 'cell_saver_cost',
    label: {
      short: 'Cell Saver Cost',
      base: 'Cell Saver Cost',
      sum: 'Total Cell Saver Cost',
      avg: 'Average Cell Saver Cost Per Visit',
    },
    units: {
      sum: '$', avg: '$', sumShort: '$', avgShort: '$', type: 'prefix',
    },
    decimals: { sum: 0, avg: 0 },
  },
} as const;

// Values of prophylactic medications
export type Cost = typeof COSTS[keyof typeof COSTS]['value'];
// Readonly array of prophylactic medication options
export const COST_OPTIONS = Object.values(COSTS) as ReadonlyArray<{
  value: Cost;
  label: { short: string; base: string; sum: string; avg: string };
  units: {
    sum: string;
    avg: string;
    sumShort?: string;
    avgShort?: string;
    type?: 'prefix' | 'suffix';
  };
  decimals: { sum: number; avg: number };
}>;

export const OVERALL_BLOOD_PRODUCT_COST = {
  value: 'total_blood_product_cost',
  label: {
    short: 'Blood Product Costs',
    base: 'Blood Product Costs',
    sum: 'Total Blood Product Costs',
    avg: 'Average Blood Product Costs Per Visit',
  },
  units: {
    sum: '$', avg: '$', sumShort: '$', avgShort: '$', type: 'prefix',
  },
  decimals: { sum: 0, avg: 0 },
} as const;

export type OverallBloodProductCost = typeof OVERALL_BLOOD_PRODUCT_COST['value'];

export const VISIT_COUNT = {
  value: 'visit_count',
  label: {
    short: 'Visits',
    base: 'Number of Visits',
    sum: 'Total Number of Visits',
    avg: 'Average Number of Visits',
  },
  units: {
    sum: 'Visits',
    avg: 'Visits',
    sumShort: ' Cases',
    avgShort: '', // Ensure cases column is treated correctly in table if it's percentage
  },
  decimals: { sum: 0, avg: 0 },
} as const;

export type VisitCount = typeof VISIT_COUNT['value'];

export const CASE_MIX_INDEX = {
  value: 'case_mix_index',
  label: {
    short: 'CMI',
    base: 'Case Mix Index',
    sum: 'Case Mix Index',
    avg: 'Case Mix Index',
  },
  units: { sum: '', avg: '' },
  decimals: { sum: 2, avg: 2 },
};

// Costs -----------------------------------------------------------
export const DEFAULT_UNIT_COSTS: Record<Cost, number> = {
  rbc_units_cost: 200,
  ffp_units_cost: 55,
  plt_units_cost: 650,
  cryo_units_cost: 70,
  cell_saver_cost: 500,
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

// Charting -------------------------------------------------------

// Chart configuration type
type ChartConfig<X, Y, A, T> = {
  chartId: string;
  xAxisVar: X;
  yAxisVar: Y;
  aggregation: A;
  chartType: T;
};

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
export const dashboardXAxisOptions = Object.entries(TIME_AGGREGATION_OPTIONS).map(([value, { label }]) => ({ value, label })) as { value: keyof typeof TIME_AGGREGATION_OPTIONS; label: string }[];
export const dashboardXAxisVars = dashboardXAxisOptions.map((opt) => opt.value);

// Dashboard chart y-axis variable options
export const dashboardYAxisOptions = [
  ...BLOOD_COMPONENT_OPTIONS,
  OVERALL_GUIDELINE_ADHERENT,
  ...GUIDELINE_ADHERENT_OPTIONS,
  ...OUTCOME_OPTIONS,
  ...PROPHYL_MED_OPTIONS,
  ...COST_OPTIONS,
  OVERALL_BLOOD_PRODUCT_COST,
  VISIT_COUNT,
  CASE_MIX_INDEX,
];
export const dashboardYAxisVars = dashboardYAxisOptions.map((opt) => opt.value);

// Dashboard aggregate y-axis variable type
export type DashboardAggYAxisVar = `${keyof typeof AGGREGATION_OPTIONS}_${typeof dashboardYAxisVars[number]}`;

export type DashboardChartConfig = ChartConfig<typeof dashboardXAxisVars[number], typeof dashboardYAxisVars[number], keyof typeof AGGREGATION_OPTIONS, 'line' | 'bar'>;

// Dashboard chart configuration key type
export type DashboardChartConfigKey = `${DashboardAggYAxisVar}_${typeof dashboardXAxisVars[number]}`;

// Dashboard chart data type (key, value)
export type DashboardChartData = Record<DashboardChartConfigKey, ({ timePeriod: TimePeriod, [key: string]: string | number | Record<Cost, number> })[]>;

// --- Dashboard stats ---
export type DashboardStatConfig = {
  statId: string;
  yAxisVar: typeof dashboardYAxisVars[number];
  aggregation: keyof typeof AGGREGATION_OPTIONS;
  title: string;
};

export type DashboardStatData = Record<DashboardAggYAxisVar, { value: string, diff: number, comparedTo?: string, sparklineData: number[] }>;

// Chart colors (for up to 5 lines/bars)
export const chartColors = [
  '#1770B8',
  '#EF2026',
  '#897BD3',
  '#FFD13C',
  '#73C3C5',
];

// Explore View ----------------------------------------------------
// Aggregation options for explore view
const _AGGREGATIONS = ['surgeon_prov_id', 'anesth_prov_id', 'year', 'quarter'] as const;
export type Aggregation = typeof _AGGREGATIONS[number];

// --- Cost bar charts TODO: Change to Explore Table ---
const CostAggregations: { value: Aggregation; label: string }[] = [
  { value: 'surgeon_prov_id', label: 'Surgeon ID' },
  { value: 'anesth_prov_id', label: 'Anesthesiologist ID' },
  { value: 'year', label: 'Year' },
  { value: 'quarter', label: 'Quarter' },
];

export const costXAxisOptions = [{ value: 'cost', label: 'Cost ($)' }] as const;
export const costXAxisVars = costXAxisOptions.map((opt) => opt.value);

export const costYAxisOptions = [...CostAggregations];
export const costYAxisVars = costYAxisOptions.map((opt) => opt.value);

export type CostChartConfig = ChartConfig<typeof costXAxisVars[number], typeof costYAxisVars[number], 'sum' | 'avg', 'cost'>;

// TOOD: Update or remove CostBarData type
export interface CostBarDatum extends Record<Cost, number> {
  surgeon_prov_id?: string;
  anesth_prov_id?: string;
  year?: string | number;
  quarter?: string;
}
export type CostBarData = CostBarDatum[];

// --- Scatter plots ---
// TODO: Update scatterPlotConfig type
export type ScatterPlotConfig = ChartConfig<typeof dashboardXAxisVars[number] | BloodComponent, typeof dashboardYAxisVars[number] | LabResult, keyof typeof AGGREGATION_OPTIONS, 'scatterPlot'>;
export type ScatterPlotData = ScatterChartSeries[];

// --- Explore Table ---

// Column options
const RBC_COUNTS = ['1', '2', '3', '4', 'above_5'] as const;
const RBC_PERCENT_OPTIONS = RBC_COUNTS.map((count) => ({
  value: `percent_${count}_rbc`,
  label: count === 'above_5' ? '≥5 RBC' : `${count} RBC`,
  units: { sum: 'cases', avg: '% of cases' },
  decimals: 1,
}));

// Column Groups
export const ExploreTableColumnOptionsGrouped = [
  {
    group: 'Blood Products',
    items: BLOOD_COMPONENT_OPTIONS.map((opt) => ({
      value: opt.value,
      label: opt.label.base,
      units: {
        sum: opt.units.sum,
        avg: opt.units.avg,
        sumShort: opt.units.sumShort,
        avgShort: opt.units.avgShort,
        type: opt.units.type,
      },
      decimals: opt.decimals,
    })),
  },
  {
    group: 'Outcomes',
    items: OUTCOME_OPTIONS.map((opt) => ({
      value: opt.value,
      label: opt.label.base,
      units: {
        sum: opt.units.sum,
        avg: opt.units.avg,
        sumShort: opt.units.sumShort,
        avgShort: opt.units.avgShort,
        type: opt.units.type,
      },
      decimals: opt.decimals,
    })),
  },
  {
    group: 'Prophylactic Medications',
    items: PROPHYL_MED_OPTIONS.map((opt) => ({
      value: opt.value,
      label: opt.label.base,
      units: {
        sum: opt.units.sum,
        avg: opt.units.avg,
        sumShort: opt.units.sumShort,
        avgShort: opt.units.avgShort,
        type: opt.units.type,
      },
      decimals: opt.decimals,
    })),
  },
  {
    group: 'Guideline Adherence',
    items: GUIDELINE_ADHERENT_OPTIONS.map((opt) => ({
      value: opt.value,
      label: opt.label.base,
      units: {
        sum: opt.units.sum,
        avg: opt.units.avg,
        sumShort: opt.units.sumShort,
        avgShort: opt.units.avgShort,
        type: opt.units.type,
      },
      decimals: opt.decimals,
    })),
  },
  {
    group: 'Costs',
    items: COST_OPTIONS.map((opt) => ({
      value: opt.value,
      label: opt.label.base,
      units: {
        sum: opt.units.sum,
        avg: opt.units.avg,
        sumShort: opt.units.sumShort,
        avgShort: opt.units.avgShort,
        type: opt.units.type,
      },
      decimals: opt.decimals,
    })),
  },
  {
    group: 'Other',
    items: [
      { value: 'year', label: 'Year' },
      { value: 'quarter', label: 'Quarter' },
      ...RBC_PERCENT_OPTIONS,
      {
        value: 'attending_provider',
        label: 'Provider',
      },
      {
        value: 'cases',
        label: 'Cases',
        units: {
          sum: 'cases', avg: '% of cases', sumShort: ' Cases', avgShort: ' Cases',
        },
        decimals: 0,
      },
    ],
  },
];

export const ExploreTableColumnOptions: {
  value: string;
  label: string;
  units?: {
    sum: string;
    avg: string;
    sumShort?: string;
    avgShort?: string;
    type?: 'prefix' | 'suffix';
  };
  decimals?: number | { sum: number; avg: number };
}[] = ExploreTableColumnOptionsGrouped.flatMap((g) => g.items as {
  value: string;
  label: string;
  units?: {
    sum: string;
    avg: string;
    sumShort?: string;
    avgShort?: string;
    type?: 'prefix' | 'suffix';
  };
  decimals?: number | { sum: number; avg: number };
}[]);

// Row options
export const ExploreTableRowOptions: { value: string; label: string }[] = [
  { value: 'attending_provider', label: 'Provider' },
  { value: 'year', label: 'Year' },
  { value: 'quarter', label: 'Quarter' },
];

// Variables
const ExploreTableColumnVars = ExploreTableColumnOptions.map((opt) => opt.value);
const ExploreTableRowVars = ExploreTableRowOptions.map((opt) => opt.value);

// Column type
export type ExploreTableColumn = {
  colVar: typeof ExploreTableColumnVars[number];
  aggregation: keyof typeof AGGREGATION_OPTIONS | 'none';
  type: 'numeric' | 'text' | 'violin' | 'heatmap';
  title: string;
  numericTextVisible?: boolean;
};

// Explore Table Chart Config
export type ExploreTableConfig = {
  chartId: string;
  title: string;
  chartType: 'exploreTable';
  rowVar: typeof ExploreTableRowVars[number];
  columns: ExploreTableColumn[];
  aggregation?: 'sum' | 'avg';
  twoValsPerRow?: boolean;
};

// Explore Table Data
export type ExploreTableRow = Record<typeof ExploreTableRowVars[number], string | number | number[] | number[][]>;
export type ExploreTableData = ExploreTableRow[]; // E.g. [{ attending_provider: 'Dr. Smith', cases: 100}, { attending_provider: 'Dr. Johnson', cases: 200}]

// --- Explore Chart ---
export type ExploreChartData = Record<string, ScatterPlotData | CostBarData | ExploreTableData>;
export type ExploreChartConfig = CostChartConfig | ScatterPlotConfig | ExploreTableConfig;

// Filter Counts ---------------------------------------------------
export type FilterCountKey =
  | 'dateFiltersAppliedCount'
  | 'bloodComponentFiltersAppliedCount'
  | 'medicationsFiltersAppliedCount'
  | 'outcomeFiltersAppliedCount';
