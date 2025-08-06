import { makeAutoObservable } from 'mobx';
import { mean, rollup, sum } from 'd3';
import { Layout } from 'react-grid-layout';

import type { RootStore } from './Store';
import { TransfusionEvent, Visit } from '../Types/database';

import {
  BLOOD_COMPONENT_OPTIONS,
  BloodComponent,
  GUIDELINE_ADHERENCE_OPTIONS,
  AdherentCountField,
  TotalTransfusedField,
  OUTCOME_OPTIONS,
  Outcome,
  PROPHYL_MED_OPTIONS,
  ProphylMed,
  AGGREGATION_OPTIONS,
  dashboardYAxisVars,
  DashboardChartData,
  DashboardStatData,
  CPT_CODES,
  TIME_CONSTANTS,
  type DashboardChartConfig,
  type DashboardChartConfigKey,
  type DashboardStatConfig,
  Quarter,
  dashboardYAxisOptions,
} from '../Types/application';

/**
 * DashboardStore manages the state of the PBM dashboard: stats, layouts, and chart data.
 */
export class DashboardStore {
  _rootStore: RootStore;

  // Initialize store with the root store
  constructor(rootStore: RootStore) {
    this._rootStore = rootStore;
    makeAutoObservable(this);
  }

  // Chart settings -----------------------------------------------------------
  // Chart Layouts
  _chartLayouts: { [key: string]: Layout[] } = {
    main: [
      {
        i: '0', x: 0, y: 0, w: 2, h: 1, maxH: 2,
      },
      {
        i: '1', x: 0, y: 1, w: 1, h: 1, maxH: 2,
      },
      {
        i: '2', x: 1, y: 1, w: 1, h: 1, maxH: 2,
      },
      {
        i: '3', x: 0, y: 2, w: 2, h: 1, maxH: 2,
      },
    ],
  };

  get chartLayouts() {
    return this._chartLayouts;
  }

  set chartLayouts(input: { [key: string]: Layout[] }) {
    this._chartLayouts = input;
  }

  // Chart configurations
  _chartConfigs: DashboardChartConfig[] = [
    {
      i: '0', yAxisVar: 'rbc_units', aggregation: 'sum',
    },
    {
      i: '1', yAxisVar: 'rbc_adherence', aggregation: 'avg',
    },
    {
      i: '2', yAxisVar: 'los', aggregation: 'avg',
    },
    {
      i: '3', yAxisVar: 'iron', aggregation: 'avg',
    },
  ];

  get chartConfigs() {
    return this._chartConfigs;
  }

  set chartConfigs(input: DashboardChartConfig[]) {
    this._chartConfigs = input;
  }

  // Stats settings ---------------------------------------------------
  _statConfigs: DashboardStatConfig[] = [
    {
      i: '1', var: 'rbc_adherence', aggregation: 'avg', title: 'Guideline Adherence',
    },
    {
      i: '2', var: 'los', aggregation: 'avg', title: 'Average Length of Stay',
    },
    {
      i: '3', var: 'ffp_units', aggregation: 'sum', title: 'Total Plasma Transfused',
    },
  ];

  get statConfigs() {
    return this._statConfigs;
  }

  set statConfigs(input: DashboardStatConfig[]) {
    this._statConfigs = input;
  }

  // Chart management ----------------------------------------------------------
  setChartConfig(id: string, input: DashboardChartConfig) {
    this._chartConfigs = this._chartConfigs.map((config) => {
      if (config.i === id) {
        return { ...config, ...input };
      }
      return config;
    });
  }

  removeChart(id: string) {
    this._chartConfigs = this._chartConfigs.filter((config) => config.i !== id);
    this._chartLayouts.main = this._chartLayouts.main.filter((layout) => layout.i !== id);
    this._chartLayouts.sm = this._chartLayouts.sm.filter((layout) => layout.i !== id);
  }

  addChart(config: DashboardChartConfig) {
    // Add the chart configuration at the beginning of the array
    this._chartConfigs = [config, ...this._chartConfigs];

    // Create a completely new layouts object to ensure MobX detects the change
    const newMainLayouts = this._chartLayouts.main.map((layout) => ({
      ...layout,
      y: layout.y + 1,
    }));

    // Add new chart layout at the top (full width)
    newMainLayouts.unshift({
      i: config.i,
      x: 0,
      y: 0,
      w: 2, // Full width (2 columns)
      h: 1,
      maxH: 2,
    });

    // Also handle sm breakpoint if it exists
    const newSmLayouts = this._chartLayouts.sm ? this._chartLayouts.sm.map((layout) => ({
      ...layout,
      y: layout.y + 1,
    })) : [];

    if (this._chartLayouts.sm) {
      newSmLayouts.unshift({
        i: config.i,
        x: 0,
        y: 0,
        w: 1, // Full width for small screens (1 column)
        h: 1,
        maxH: 2,
      });
    }

    // Replace the entire layouts object
    this._chartLayouts = {
      ...this._chartLayouts,
      main: newMainLayouts,
      ...(this._chartLayouts.sm && { sm: newSmLayouts }),
    };
  }

  // Stat management ----------------------------------------------------------
  addStat(config: Omit<DashboardStatConfig, 'title'> & { var: DashboardStatConfig['var']; aggregation: DashboardStatConfig['aggregation'] }) {
    // Generate the title using the same logic as chart titles
    const title = this.generateStatTitle(config.var, config.aggregation || 'sum');

    const fullConfig: DashboardStatConfig = {
      ...config,
      title,
    };

    // Add the stat configuration
    this._statConfigs = [...this._statConfigs, fullConfig];
  }

  removeStat(id: string) {
    this._statConfigs = this._statConfigs.filter((config) => config.i !== id);
  }

  // Chart data ----------------------------------------------------------------
  /**
   * Returns all possible chart data needed for the dashboard
   */
  get chartData(): DashboardChartData {
    // --- For each visit, get the chart data, un-aggregated ---
    const visitData = this._rootStore.allVisits
      .filter((visit) => this.isValidVisit(visit))
      .map((visit: Visit) => {
        const prophMedFlags = this.getProphMedFlags(visit);
        const bloodProductUnits = this.getBloodProductUnits(visit);
        const adherenceFlags = this.getAdherenceFlags(visit);
        const outcomeFlags = this.getOutcomeFlags(visit);

        // Return cleaned visit data
        return {
          quarter: this.getQuarterFromDate(this.safeParseDate(visit.dsch_dtm)),
          ...bloodProductUnits,
          ...adherenceFlags,
          ...outcomeFlags,
          ...prophMedFlags,
        };
      });

    // --- Aggregate visit attribute values by quarter & aggregations ---
    // (e.g. Sum RBC units per quarter)
    const quarterlyData = rollup(
      visitData,
      (visit) => {
        const agg: Record<string, number | undefined> = {};

        // Aggregate (e.g. average iron used)
        try {
          // Blood Components
          BLOOD_COMPONENT_OPTIONS.forEach(({ value }) => {
            agg[`sum_${value}`] = sum(visit, (d) => d[value] || 0);
            agg[`avg_${value}`] = mean(visit, (d) => d[value] || 0);
          });

          // Guideline Adherence
          GUIDELINE_ADHERENCE_OPTIONS.forEach(({ value, adherentCount, totalTransfused }) => {
            const totalAdherentTransfusions = visit.reduce((acc, d) => acc + (d[adherentCount] || 0), 0);
            const totalTransfusions = visit.reduce((acc, d) => acc + (d[totalTransfused] || 0), 0);

            agg[`sum_${value}`] = totalAdherentTransfusions;
            agg[`avg_${value}`] = totalTransfusions > 0 ? totalAdherentTransfusions / totalTransfusions : 0;
          });

          // Outcomes
          OUTCOME_OPTIONS.forEach(({ value }) => {
            agg[`sum_${value}`] = sum(visit, (d) => d[value] || 0);
            agg[`avg_${value}`] = mean(visit, (d) => d[value] || 0);
          });

          // Prophylactic Medications
          PROPHYL_MED_OPTIONS.forEach(({ value }) => {
            agg[`sum_${value}`] = sum(visit, (d) => d[value] || 0);
            agg[`avg_${value}`] = mean(visit, (d) => d[value] || 0);
          });
        } catch (error) {
          console.error('Error aggregating data:', error);
        }

        return agg;
      },
      (d) => d.quarter,
    );

    // --- Return every possible chart configuration ---
    // (Combins. of aggregation and yAxisVar)
    const result = {} as DashboardChartData;
    for (const aggregation of Object.keys(AGGREGATION_OPTIONS) as (keyof typeof AGGREGATION_OPTIONS)[]) {
      for (const yAxisVar of dashboardYAxisVars) {
        const key: DashboardChartConfigKey = `${aggregation}_${yAxisVar}`;
        const data = Array.from(quarterlyData.entries())
          .map(([quarter, group]) => ({
            quarter,
            data: group[key] || 0,
          }))
          .filter((item) => item.quarter !== null)
          .map((item) => ({
            quarter: item.quarter as Quarter,
            data: item.data,
          }))
          .sort((a, b) => a.quarter.localeCompare(b.quarter));
        // Assign to current chart configuration
        result[key] = data;
      }
    }
    return result;
  }

  // Stats data ----------------------------------------------------------------
  /**
   * Returns stats data for the last 30 days with percentage change from previous month
   */
  get statData(): DashboardStatData {
    // --- For each visit, get the stats data, un-aggregated ---
    const visitData = this._rootStore.allVisits
      .filter((visit) => this.isValidVisit(visit))
      .map((visit: Visit) => {
        const prophMedFlags = this.getProphMedFlags(visit);
        const bloodProductUnits = this.getBloodProductUnits(visit);
        const adherenceFlags = this.getAdherenceFlags(visit);
        const outcomeFlags = this.getOutcomeFlags(visit);

        return {
          dischargeDate: this.safeParseDate(visit.dsch_dtm),
          ...bloodProductUnits,
          ...adherenceFlags,
          ...outcomeFlags,
          ...prophMedFlags,
        };
      })
      .filter((data) => data.dischargeDate !== null);

    // Find the latest discharge date in the dataset
    const latestDate = new Date(Math.max(...visitData.map((v) => v.dischargeDate.getTime())));

    // Calculate current period (last 30 days)
    const currentPeriodStart = new Date(latestDate.getTime() - (30 * TIME_CONSTANTS.ONE_DAY_MS));

    // Find the most recent complete month that doesn't overlap with our 30-day window
    // Start by going back to the month before the current period starts
    const currentPeriodStartMonth = currentPeriodStart.getMonth();
    const currentPeriodStartYear = currentPeriodStart.getFullYear();

    // Get the previous month
    let comparisonMonth = currentPeriodStartMonth - 1;
    let comparisonYear = currentPeriodStartYear;

    // Handle year rollover
    if (comparisonMonth < 0) {
      comparisonMonth = 11; // December
      comparisonYear -= 1;
    }

    // Create comparison period boundaries (full month)
    const previousPeriodStart = new Date(comparisonYear, comparisonMonth, 1, 0, 0, 0, 0);
    const previousPeriodEnd = new Date(comparisonYear, comparisonMonth + 1, 0, 23, 59, 59, 999);

    console.log('Latest discharge date:', latestDate);
    console.log('Current period start:', currentPeriodStart);
    console.log('Previous period start:', previousPeriodStart);
    console.log('Previous period end:', previousPeriodEnd);

    // Filter visits by time periods
    const currentPeriodVisits = visitData.filter((v) => v.dischargeDate >= currentPeriodStart && v.dischargeDate <= latestDate);

    const previousPeriodVisits = visitData.filter((v) => v.dischargeDate >= previousPeriodStart && v.dischargeDate <= previousPeriodEnd);

    // Helper function to aggregate period data
    const aggregatePeriodData = (visits: typeof visitData) => {
      const agg: Record<string, number> = {};

      try {
        // Blood Components
        BLOOD_COMPONENT_OPTIONS.forEach(({ value }) => {
          agg[`sum_${value}`] = sum(visits, (d) => d[value] || 0);
          agg[`avg_${value}`] = mean(visits, (d) => d[value] || 0) || 0;
        });

        // Guideline Adherence
        GUIDELINE_ADHERENCE_OPTIONS.forEach(({ value, adherentCount, totalTransfused }) => {
          const totalAdherentTransfusions = visits.reduce((acc, d) => acc + (d[adherentCount] || 0), 0);
          const totalTransfusions = visits.reduce((acc, d) => acc + (d[totalTransfused] || 0), 0);

          agg[`sum_${value}`] = totalAdherentTransfusions;
          agg[`avg_${value}`] = totalTransfusions > 0 ? totalAdherentTransfusions / totalTransfusions : 0;
        });

        // Outcomes
        OUTCOME_OPTIONS.forEach(({ value }) => {
          agg[`sum_${value}`] = sum(visits, (d) => d[value] || 0);
          agg[`avg_${value}`] = mean(visits, (d) => d[value] || 0) || 0;
        });

        // Prophylactic Medications
        PROPHYL_MED_OPTIONS.forEach(({ value }) => {
          agg[`sum_${value}`] = sum(visits, (d) => d[value] || 0);
          agg[`avg_${value}`] = mean(visits, (d) => d[value] || 0) || 0;
        });
      } catch (error) {
        console.error('Error aggregating period stats data:', error);
      }

      return agg;
    };

    const currentPeriodData = aggregatePeriodData(currentPeriodVisits);
    const previousPeriodData = aggregatePeriodData(previousPeriodVisits);

    // Get month name for comparison text
    const previousMonthName = previousPeriodStart.toLocaleDateString('en-US', { month: 'short' });

    // --- Calculate percentage change and format data ---
    const result = {} as DashboardStatData;
    for (const aggregation of Object.keys(AGGREGATION_OPTIONS) as (keyof typeof AGGREGATION_OPTIONS)[]) {
      for (const yAxisVar of dashboardYAxisVars) {
        const key = `${aggregation}_${yAxisVar}` as keyof DashboardStatData;

        const currentValue = currentPeriodData[key] || 0;
        const previousValue = previousPeriodData[key] || 0;

        // Calculate percentage change
        const diff = previousValue === 0
          ? (currentValue > 0 ? 100 : 0)
          : ((currentValue - previousValue) / previousValue) * 100;

        // Use the type-safe formatting method
        const formattedValue = this.formatStatValue(yAxisVar, currentValue, aggregation);

        result[key] = {
          data: formattedValue,
          diff: Math.round(diff),
          comparedTo: previousMonthName,
        };
      }
    }

    return result;
  }

  // Helper functions for chart data ---------------------------------------------

  /**
   * Safely parse a date string with error handling
   */
  private safeParseDate(dateInput: string | Date | null | undefined): Date {
    if (!dateInput) {
      throw new Error('Date input is null or undefined');
    }
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) {
      throw new Error(`Invalid date format: ${dateInput}`);
    }
    return date;
  }

  /**
   * Validate that required visit data exists
   */
  private isValidVisit(visit: Visit): boolean {
    if (!visit) {
      console.warn('Null or undefined visit');
      return false;
    }
    if (!visit.dsch_dtm || !visit.adm_dtm) {
      console.warn('Visit missing required dates:', { id: visit.visit_no, dsch_dtm: visit.dsch_dtm, adm_dtm: visit.adm_dtm });
      return false;
    }
    const dischDate = this.safeParseDate(visit.dsch_dtm);
    const admDate = this.safeParseDate(visit.adm_dtm);
    if (!dischDate || !admDate) {
      console.warn('Visit has invalid date formats:', { id: visit.visit_no, dsch_dtm: visit.dsch_dtm, adm_dtm: visit.adm_dtm });
      return false;
    }
    if (dischDate.getTime() < admDate.getTime()) {
      console.warn('Visit discharge date before admission date:', { id: visit.visit_no, dischDate, admDate });
      return false;
    }
    return true;
  }

  /**
   * Calculate quarter string from a date
  */
  private getQuarterFromDate(date: Date): Quarter | null {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      console.error('Invalid date for quarter calculation:', date);
      return null;
    }
    const year = date.getFullYear();
    const quarter = Math.floor(date.getMonth() / 3) + 1 as 1 | 2 | 3 | 4;
    return `${year}-Q${quarter}`;
  }

  /**
   * Calculate pre-surgery time periods (2 days before each surgery)
   */
  getPreSurgeryTimePeriods(visit: Visit): [number, number][] {
    return visit.surgeries.map((surgery) => {
      try {
        const surgeryStart = this.safeParseDate(surgery.surgery_start_dtm);
        return [surgeryStart.getTime() - TIME_CONSTANTS.TWO_DAYS_MS, surgeryStart.getTime()];
      } catch (error) {
        console.warn('Invalid surgery_start_dtm:', surgery.surgery_start_dtm, error);
        return [0, 0];
      }
    });
  }

  /**
   * Calculate prophylactic medication flags for a visit
   */
  getProphMedFlags(visit: Visit): Record<ProphylMed, number> {
    return visit.medications.reduce((acc: Record<ProphylMed, number>, med) => {
      try {
        const preSurgeryTimePeriods = this.getPreSurgeryTimePeriods(visit);
        const medTime = this.safeParseDate(med.order_dtm).getTime();
        // Check if med given pre-surgery
        if (preSurgeryTimePeriods.some(([start, end]) => medTime >= start && medTime <= end)) {
          const lowerMedName = med.medication_name?.toLowerCase() || '';
          // Increase count if med matches prophyl med type
          PROPHYL_MED_OPTIONS.forEach((medType) => {
            if (medType.aliases.some((alias) => lowerMedName.includes(alias))) {
              acc[medType.value] = 1;
            }
          });
        }
      } catch (error) {
        console.error('Error calculating medications:', {
          visitId: visit.visit_no,
          medication: med.medication_name,
          orderDtm: med.order_dtm,
          error,
        });
      }
      return acc;
    }, PROPHYL_MED_OPTIONS.reduce((acc, medType) => {
      acc[medType.value] = 0;
      return acc;
    }, {} as Record<ProphylMed, number>));
  }

  /**
   * Calculate blood product units for a visit
   */
  getBloodProductUnits(visit: Visit): Record<BloodComponent, number> {
    return BLOOD_COMPONENT_OPTIONS.reduce((acc, component) => {
      try {
        acc[component.value] = visit.transfusions.reduce((s: number, t) => s + (t[component.value] || 0), 0);
      } catch (error) {
        console.error('Error calculating blood product units:', {
          visitId: visit.visit_no,
          component: component.value,
          error,
        });
        acc[component.value] = 0;
      }
      return acc;
    }, {} as Record<BloodComponent, number>);
  }

  /**
   * Check if a blood product was transfused
   */
  private isBloodProductTransfused(transfusion: TransfusionEvent, bloodProductUnit: readonly string[]): boolean {
    return bloodProductUnit.some((field) => {
      if (!(field in transfusion)) {
        throw new Error(`Field "${field}" is not a key of TransfusionEvent`);
      }
      const value = transfusion[field as keyof TransfusionEvent];
      return typeof value === 'number' && value > 0;
    });
  }

  /**
  * Calculate adherence flags for a visit
  */
  getAdherenceFlags(visit: Visit): Record<AdherentCountField | TotalTransfusedField, number> {
    const adherenceFlags = {
    // --- For each adherence spec, initialize counts ---
      ...GUIDELINE_ADHERENCE_OPTIONS.reduce((acc, spec) => {
        acc[spec.adherentCount] = 0;
        acc[spec.totalTransfused] = 0;
        return acc;
      }, {} as Record<AdherentCountField | TotalTransfusedField, number>),
    };

    // --- For each transfusion, count adherence # and total transfused # for each blood product ---
    visit.transfusions.forEach((transfusion: TransfusionEvent) => {
      // For each adherence spec (rbc, ffp), check if transfusion adheres to guidelines
      GUIDELINE_ADHERENCE_OPTIONS.forEach(({
        transfusionUnits, labDesc, adherenceCheck, adherentCount, totalTransfused,
      }) => {
        // Check if blood product unit given
        if (this.isBloodProductTransfused(transfusion, transfusionUnits)) {
          // Find relevant lab result within 2 hours of transfusion
          const relevantLab = visit.labs
            .filter((lab) => {
              const labDrawDtm = this.safeParseDate(lab.lab_draw_dtm).getTime();
              const transfusionDtm = this.safeParseDate(transfusion.trnsfsn_dtm).getTime();
              return (
                labDesc.includes(lab.result_desc)
                && labDrawDtm <= transfusionDtm
                && labDrawDtm >= transfusionDtm - TIME_CONSTANTS.TWO_HOURS_MS
              );
            })
            .sort((a, b) => this.safeParseDate(b.lab_draw_dtm).getTime() - this.safeParseDate(a.lab_draw_dtm).getTime())
            .at(0);

          // If relevant lab exists and adheres to guidelines, increment counts
          if (relevantLab && adherenceCheck(relevantLab.result_value)) {
            adherenceFlags[adherentCount] += 1;
          }
          // Increment total [blood product] transfused regardless
          adherenceFlags[totalTransfused] += 1;
        }
      });
    });

    return adherenceFlags;
  }

  /**
   * Check if a visit has any of the specified CPT codes
   */
  private hasMatchingCptCode(visit: Visit, cptCodes: readonly string[]): boolean {
    try {
      return visit.billing_codes.some((code) => cptCodes.includes(code.cpt_code));
    } catch (error) {
      console.error('Error matching cpt code:', { visitId: visit.visit_no, error });
      return false;
    }
  }

  /**
   * Calculate outcome flags for a visit
   */
  getOutcomeFlags(visit: Visit): Record<Outcome, number> {
    try {
      return {
        los: (this.safeParseDate(visit.dsch_dtm).getTime() - this.safeParseDate(visit.adm_dtm).getTime()) / (TIME_CONSTANTS.ONE_DAY_MS),
        death: visit.pat_expired_f ? 1 : 0,
        vent: visit.total_vent_mins > TIME_CONSTANTS.VENTILATOR_THRESHOLD_MINS ? 1 : 0,
        stroke: this.hasMatchingCptCode(visit, CPT_CODES.stroke) ? 1 : 0,
        ecmo: this.hasMatchingCptCode(visit, CPT_CODES.ecmo) ? 1 : 0,
      } as Record<Outcome, number>;
    } catch (error) {
      console.error('Error fetching outcome flags:', { visitId: visit.visit_no, error });
      return {
        los: 0, death: 0, vent: 0, stroke: 0, ecmo: 0,
      };
    }
  }

  // Helper method to generate chart titles (extracted from existing logic)
  generateChartTitle(yAxisVar: DashboardChartConfig['yAxisVar'], aggregation: keyof typeof AGGREGATION_OPTIONS): string {
    const option = dashboardYAxisOptions.find((opt) => opt.value === yAxisVar);
    const label = option?.label || yAxisVar;

    const aggregationText = aggregation.charAt(0).toUpperCase() + aggregation.slice(1);
    const ofText = aggregation === 'sum' ? ' of' : '';
    const perVisitText = aggregation === 'avg' ? ' Per Visit' : '';

    return `${aggregationText}${ofText} ${label}${perVisitText}`;
  }

  // Stats data helper functions -------------------------------------------------

  /**
   * Determines if a percentage change is "good" based on the metric type
   * @param metricVar - The dashboard variable being measured
   * @param diffPercent - The percentage change (positive or negative)
   * @returns true if the change is considered good, false if bad
   */
  isMetricChangeGood(metricVar: typeof dashboardYAxisVars[number], diffPercent: number): boolean {
    // Blood components and outcomes - lower is better (negative change is good)
    const isBloodComponent = BLOOD_COMPONENT_OPTIONS.some((opt) => opt.value === metricVar);
    const isOutcome = OUTCOME_OPTIONS.some((opt) => opt.value === metricVar);

    // Guideline adherence and prophylactic medications - higher is better (positive change is good)
    const isAdherence = GUIDELINE_ADHERENCE_OPTIONS.some((opt) => opt.value === metricVar);
    const isProphylMed = PROPHYL_MED_OPTIONS.some((opt) => opt.value === metricVar);

    if (isBloodComponent || isOutcome) {
      // For blood components and outcomes, negative change is good
      return diffPercent < 0;
    }

    if (isAdherence || isProphylMed) {
      // For adherence and prophylactic medications, positive change is good
      return diffPercent > 0;
    }

    // Default fallback - log warning for unclassified metrics
    console.warn(`Unclassified metric: ${metricVar}`);
    return diffPercent >= 0;
  }

  // Helper method to generate stat titles using the same logic as charts
  private generateStatTitle(yAxisVar: DashboardStatConfig['var'], aggregation: keyof typeof AGGREGATION_OPTIONS): string {
    const option = dashboardYAxisOptions.find((opt) => opt.value === yAxisVar);
    const label = option?.label || yAxisVar;
    // Check if this is a blood component with units using the typed options
    const bloodComponentOption = BLOOD_COMPONENT_OPTIONS.find((opt) => opt.value === yAxisVar);
    const hasUnits = bloodComponentOption && bloodComponentOption.unit === 'units';

    if (aggregation === 'avg') {
      if (yAxisVar === 'los') {
        return 'Average Length of Stay';
      }
      if (hasUnits) {
        return `Average ${label} Per Visit`;
      }
      return `Average ${label}`;
    }

    // For sums, use "Total" prefix
    return `Total ${label}`;
  }

  /**
   * Format stat values appropriately based on the variable type
   * @param yAxisVar - The dashboard variable being formatted
   * @param value - The numeric value to format
   * @param aggregation - The aggregation type ('sum' or 'avg')
   * @returns A formatted string for display
   */
  private formatStatValue(yAxisVar: typeof dashboardYAxisVars[number], value: number, aggregation?: keyof typeof AGGREGATION_OPTIONS): string {
    // Find the option that matches this variable
    const yAxisOption = dashboardYAxisOptions.find((opt) => opt.value === yAxisVar);

    if (!yAxisOption || !('unit' in yAxisOption)) {
      console.warn(`No unit found for variable: ${yAxisVar}`);
      return value.toFixed(0);
    }

    const { unit } = yAxisOption;
    // Check if this is an adherence metric
    const isAdherence = GUIDELINE_ADHERENCE_OPTIONS.some((opt) => opt.value === yAxisVar);
    // Determine if we should show decimals
    const showDecimals = aggregation === 'avg' || isAdherence;

    // Special formatting based on unit type
    switch (unit) {
      case '%':
        // Adherence percentages should show decimals
        return `${(value * 100).toFixed(1)}%`;
      default:
        // Units, cases, ml - averages show decimals, totals don't
        return `${value.toFixed(showDecimals ? 1 : 0)} ${unit}`;
    }
  }
}
