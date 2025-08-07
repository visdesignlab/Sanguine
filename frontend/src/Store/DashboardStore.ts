import { makeAutoObservable } from 'mobx';
import { mean, rollup, sum } from 'd3';
import { Layout } from 'react-grid-layout';

import type { RootStore } from './Store';
import { TransfusionEvent, Visit } from '../Types/database';

import {
  TIME_CONSTANTS, // Time constants
  BLOOD_COMPONENT_OPTIONS, BloodComponent, // Blood components
  OUTCOME_OPTIONS, Outcome, // Outcomes
  PROPHYL_MED_OPTIONS, ProphylMed, // Prophylactic medications
  GUIDELINE_ADHERENCE_OPTIONS, // Guideline adherence
  AdherentCountField,
  TotalTransfusedField,
  OVERALL_GUIDELINE_ADHERENCE,
  CPT_CODES, // CPT codes
  AGGREGATION_OPTIONS, // Dashboard configuration
  dashboardYAxisVars,
  dashboardYAxisOptions,
  type DashboardChartConfig,
  type DashboardChartConfigKey,
  type DashboardStatConfig,
  DashboardChartData, DashboardStatData,
  OverallAdherentCountField,
  OverallTotalTransfusedField,
  TimeAggregation,
  TimePeriod,
  TIME_AGGREGATION_OPTIONS,
  dashboardXAxisVars, // Dashboard data types
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

  // Chart settings ------------------------------------------------------------

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
      i: '0', xAxisVar: 'quarter', yAxisVar: 'rbc_units', aggregation: 'sum',
    },
    {
      i: '1', xAxisVar: 'quarter', yAxisVar: 'rbc_adherence', aggregation: 'avg',
    },
    {
      i: '2', xAxisVar: 'quarter', yAxisVar: 'los', aggregation: 'avg',
    },
    {
      i: '3', xAxisVar: 'quarter', yAxisVar: 'iron', aggregation: 'avg',
    },
  ];

  get chartConfigs() {
    return this._chartConfigs;
  }

  set chartConfigs(input: DashboardChartConfig[]) {
    this._chartConfigs = input;
  }

  // Stats settings ------------------------------------------------------------
  // Stat configurations
  _statConfigs: DashboardStatConfig[] = [
    {
      i: '1', var: 'overall_adherence', aggregation: 'avg', title: 'Overall Guideline Adherence',
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
  /**
   * Initializes the dashboard with default chart configurations.
   */
  setChartConfig(id: string, input: DashboardChartConfig) {
    this._chartConfigs = this._chartConfigs.map((config) => {
      if (config.i === id) {
        return { ...config, ...input };
      }
      return config;
    });
  }

  /**
   * Removes chart from the dashboard by ID.
   */
  removeChart(id: string) {
    this._chartConfigs = this._chartConfigs.filter((config) => config.i !== id);
    this._chartLayouts.main = this._chartLayouts.main.filter((layout) => layout.i !== id);
    this._chartLayouts.sm = this._chartLayouts.sm.filter((layout) => layout.i !== id);
  }

  /**
   * Adds new chart to the top of the dashboard
   * @param config Chart data specification for chart to add
   */
  addChart(config: DashboardChartConfig) {
    // Chart data - Add chart config to beginning of array ----
    this._chartConfigs = [config, ...this._chartConfigs];

    // Layouts - create a new layout object ----
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
        w: 1, // Full width for small (1 column)
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

  // Stat management -----------------------------------------------------------
  /**
   * @param statVar Variable to use for the stat (e.g. 'total_adherence')
   * @param aggregation Aggregation method to use (e.g. 'avg', 'sum')
   * @description Adds new stat to dashboard with a generated title.
   */
  addStat(statVar: DashboardStatConfig['var'], aggregation: DashboardStatConfig['aggregation']) {
    // Generate unique ID and title internally
    const i = `stat-${Date.now()}`;
    const title = this.generateStatTitle(statVar, aggregation || 'sum');

    const fullStatConfig: DashboardStatConfig = {
      i,
      var: statVar,
      aggregation,
      title,
    };

    // Add the stat
    this._statConfigs = [...this._statConfigs, fullStatConfig];
  }

  /**
   * Remove stat from dashboard by ID
   */
  removeStat(id: string) {
    this._statConfigs = this._statConfigs.filter((config) => config.i !== id);
  }

  // Chart data ----------------------------------------------------------------
  /**
 * Returns all possible chart data needed for the dashboard
 */
  get chartData(): DashboardChartData {
    // Step 1: For each visit, get variables needed for charting (E.g. adherence flags)
    const visitVariablesData = this.getVisitVariablesData();

    // Step 2: Aggregate by the every possible time period
    const timeAggregations = this.aggregateByTimePeriod(visitVariablesData);

    // Step 3: Return data for every possible chart configuration
    return this.getAllPossibleChartData(timeAggregations);
  }

  // Stats data ----------------------------------------------------------------
  /**
   * Returns stats data for the last 30 days,
   * with percentage change from nearest non-overlapping month
   */
  get statData(): DashboardStatData {
    // Step 1: For each visit, get variables needed for stats (E.g. adherence flags)
    const visitVariablesData = this.getVisitVariablesData();
    // Find the latest discharge date
    const latestDate = new Date(Math.max(...visitVariablesData.map((v) => v.dischargeDate.getTime())));

    // Calculate current period (last 30 days)
    const currentPeriodStart = new Date(latestDate.getTime() - (30 * TIME_CONSTANTS.ONE_DAY_MS));

    // Find most recent full month that doesn't overlap with 30-day window
    // Find month before period starts
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

    // Filter visits by time periods
    const currentPeriodVisits = visitVariablesData.filter((v) => v.dischargeDate >= currentPeriodStart && v.dischargeDate <= latestDate);

    const previousPeriodVisits = visitVariablesData.filter((v) => v.dischargeDate >= previousPeriodStart && v.dischargeDate <= previousPeriodEnd);

    // Helper function to aggregate period data
    const aggregatePeriodData = (visits: typeof visitVariablesData) => {
      const agg: Record<string, number> = {};

      try {
        // Blood Components
        BLOOD_COMPONENT_OPTIONS.forEach(({ value }) => {
          agg[`sum_${value}`] = sum(visits, (d) => d[value] || 0);
          agg[`avg_${value}`] = mean(visits, (d) => d[value] || 0) || 0;
        });

        // Guideline Adherence
        GUIDELINE_ADHERENCE_OPTIONS.forEach(({ value, adherentCount, totalTransfused }) => {
          // Total adherent transfusions and total transfusions for this blood product (BP)
          const totalBPAdherentTransfusions = visits.reduce((acc, d) => acc + (d[adherentCount] || 0), 0);
          const totalBPTransfusions = visits.reduce((acc, d) => acc + (d[totalTransfused] || 0), 0);

          agg[`sum_${value}`] = totalBPAdherentTransfusions;
          agg[`avg_${value}`] = totalBPTransfusions > 0 ? totalBPAdherentTransfusions / totalBPTransfusions : 0;
        });

        // Total Guideline Adherence
        const totalAdherentTransfusions = visits.reduce((acc, d) => acc + (d[OVERALL_GUIDELINE_ADHERENCE.adherentCount] || 0), 0);
        const totalTransfusions = visits.reduce((acc, d) => acc + (d[OVERALL_GUIDELINE_ADHERENCE.totalTransfused] || 0), 0);

        agg[`sum_${OVERALL_GUIDELINE_ADHERENCE.value}`] = totalAdherentTransfusions;
        agg[`avg_${OVERALL_GUIDELINE_ADHERENCE.value}`] = totalTransfusions > 0 ? totalAdherentTransfusions / totalTransfusions : 0;

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

  // Helper functions for chart data -------------------------------------------

  // Variable data formatting ---------
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
   * @input adherenceFlags - Individual blood product adherence flags
   * @returns Total adherent transfusions and total transfusions across all blood products
   */
  private getOverallAdherenceFlags(adherenceFlags: Record<AdherentCountField | TotalTransfusedField, number>): Record<OverallAdherentCountField | OverallTotalTransfusedField, number> {
    // Sum all adherent transfusions across all blood products
    const totalAdherentTransfusions = GUIDELINE_ADHERENCE_OPTIONS.reduce((count, { adherentCount }) => count + (adherenceFlags[adherentCount] || 0), 0);

    // Sum all transfusions across all blood products
    const totalTransfusions = GUIDELINE_ADHERENCE_OPTIONS.reduce((count, { totalTransfused }) => count + (adherenceFlags[totalTransfused] || 0), 0);

    return {
      [OVERALL_GUIDELINE_ADHERENCE.adherentCount]: totalAdherentTransfusions,
      [OVERALL_GUIDELINE_ADHERENCE.totalTransfused]: totalTransfusions,
    };
  }

  /**
 * Get all visit variables needed for charting
 * @returns Array of variables describing each visit (e.g. adherence flags, discharge date)
 */
  private getVisitVariablesData() {
    return this._rootStore.allVisits
      .filter((visit) => this.isValidVisit(visit))
      .map((visit: Visit) => {
        const prophMedFlags = this.getProphMedFlags(visit);
        const bloodProductUnits = this.getBloodProductUnits(visit);
        const adherenceFlags = this.getAdherenceFlags(visit);
        const outcomeFlags = this.getOutcomeFlags(visit);
        const overallAdherenceFlags = this.getOverallAdherenceFlags(adherenceFlags);

        return {
          dischargeDate: this.safeParseDate(visit.dsch_dtm),
          ...bloodProductUnits,
          ...adherenceFlags,
          ...outcomeFlags,
          ...prophMedFlags,
          ...overallAdherenceFlags,
        };
      });
  }

  /**
 * Aggregate visit data by the selected time period using d3 rollup
 */
  private aggregateByTimePeriod(visitVariablesData: ReturnType<typeof this.getVisitVariablesData>) {
    // Create a map to store aggregations for all time periods
    const allTimeAggregations = new Map<TimePeriod, Record<DashboardChartConfigKey, number>>();

    // Aggregate by every time aggregation type
    for (const timeAggregation of Object.keys(TIME_AGGREGATION_OPTIONS) as TimeAggregation[]) {
      // For each visit, find the time period specified (e.g. 'quarter', 'month')
      const visitDataWithTimePeriod = visitVariablesData.map((visit) => ({
        ...visit,
        timePeriod: this.getTimePeriodFromDate(this.safeParseDate(visit.dischargeDate), timeAggregation),
      })).filter((visit) => visit.timePeriod !== null);

      // Aggregate by this time period (e.g. 'quarter', 'month')
      const timeData = rollup(
        visitDataWithTimePeriod,
        (visits) => this.aggregateVisitVariables(visits),
        (d) => d.timePeriod,
      );

      // Add the aggregated data to the map
      for (const [timePeriod, aggregations] of timeData.entries()) {
        if (timePeriod !== null) {
          allTimeAggregations.set(timePeriod, aggregations);
        }
      }
    }

    return allTimeAggregations;
  }

  /**
   * Aggregate visit variables data for the dashboard
   * E.g. rbc_units -> sum_rbc_units, avg_rbc_units, etc.
  */
  private aggregateVisitVariables(visits: ReturnType<typeof this.getVisitVariablesData>) {
    const aggregations: Record<DashboardChartConfigKey, number> = {} as Record<DashboardChartConfigKey, number>;

    try {
      // Simple aggregations (Blood Components, Outcomes, Prophylactic Medications)
      this.aggregateSimpleMetrics(visits, aggregations, BLOOD_COMPONENT_OPTIONS);
      this.aggregateSimpleMetrics(visits, aggregations, OUTCOME_OPTIONS);
      this.aggregateSimpleMetrics(visits, aggregations, PROPHYL_MED_OPTIONS);

      // Complex aggregations (Guideline Adherence)
      this.aggregateGuidelineAdherence(visits, aggregations);
      this.aggregateOverallAdherence(visits, aggregations);
    } catch (error) {
      console.error('Error aggregating time period data:', error);
    }

    return aggregations;
  }

  /**
   * Generic aggregation for simple metrics that just sum/average visit values
  */
  private aggregateSimpleMetrics<T extends { value: string }>(
    visits: ReturnType<typeof this.getVisitVariablesData>,
    aggregations: Record<DashboardChartConfigKey, number>,
    options: readonly T[],
  ) {
    options.forEach(({ value }) => {
      const sumKey = `sum_${value}` as DashboardChartConfigKey;
      const avgKey = `avg_${value}` as DashboardChartConfigKey;

      aggregations[sumKey] = sum(visits, (d) => d[value as keyof typeof d] as number || 0);
      aggregations[avgKey] = mean(visits, (d) => d[value as keyof typeof d] as number || 0) || 0;
    });
  }

  /**
 * Aggregate guideline adherence data for individual blood products
 */
  private aggregateGuidelineAdherence(
    visits: ReturnType<typeof this.getVisitVariablesData>,
    aggregations: Record<DashboardChartConfigKey, number>,
  ) {
    GUIDELINE_ADHERENCE_OPTIONS.forEach(({ value, adherentCount, totalTransfused }) => {
      const totalAdherent = visits.reduce((acc, d) => acc + (d[adherentCount] || 0), 0);
      const totalTransfusions = visits.reduce((acc, d) => acc + (d[totalTransfused] || 0), 0);

      const sumKey: DashboardChartConfigKey = `sum_${value}`;
      const avgKey: DashboardChartConfigKey = `avg_${value}`;

      aggregations[sumKey] = totalAdherent;
      aggregations[avgKey] = totalTransfusions > 0 ? totalAdherent / totalTransfusions : 0;
    });
  }

  /**
 * Aggregate overall guideline adherence data
 */
  private aggregateOverallAdherence(
    visits: ReturnType<typeof this.getVisitVariablesData>,
    aggregations: Record<DashboardChartConfigKey, number>,
  ) {
    const { value, adherentCount, totalTransfused } = OVERALL_GUIDELINE_ADHERENCE;

    const totalAdherent = visits.reduce((acc, d) => acc + (d[adherentCount] || 0), 0);
    const totalTransfusions = visits.reduce((acc, d) => acc + (d[totalTransfused] || 0), 0);

    const sumKey: DashboardChartConfigKey = `sum_${value}`;
    const avgKey: DashboardChartConfigKey = `avg_${value}`;

    aggregations[sumKey] = totalAdherent;
    aggregations[avgKey] = totalTransfusions > 0 ? totalAdherent / totalTransfusions : 0;
  }

  /**
   *
   * @param timeData - Map where each key is a time period (x-axis value), and each value is a record of aggregated y-axis metrics.
   * @returns DashboardChartData - All possible chart configurations for every aggregation, y-axis, and x-axis variable.
   */
  private getAllPossibleChartData(timeData: Map<TimePeriod, Record<DashboardChartConfigKey, number>>): DashboardChartData {
    const result = {} as DashboardChartData;

    for (const aggregation of Object.keys(AGGREGATION_OPTIONS) as (keyof typeof AGGREGATION_OPTIONS)[]) {
      for (const yAxisVar of dashboardYAxisVars) {
        for (const xAxisVar of dashboardXAxisVars) {
          const key: DashboardChartConfigKey = `${aggregation}_${yAxisVar}`;

          // Filter time periods based on xAxisVar format
          const filteredTimeData = Array.from(timeData.entries())
            .filter(([timePeriod]) => {
              switch (xAxisVar) {
                case 'quarter':
                  return timePeriod.includes('Q');
                case 'month':
                  return timePeriod.includes('-') && !timePeriod.includes('Q');
                case 'year':
                  return !timePeriod.includes('-');
                default:
                  return false;
              }
            })
            .map(([timePeriod, aggregations]) => ({
              timePeriod,
              data: aggregations[key] || 0,
            }))
            .sort((a, b) => this.compareTimePeriods(a.timePeriod, b.timePeriod));

          // Log filtered data for debugging
          if (filteredTimeData.length === 0) {
            console.warn(`No data after filtering for xAxisVar "${xAxisVar}" and key "${key}"`);
          }

          // Store the data with a composite key that includes xAxisVar
          const compositeKey = `${key}_${xAxisVar}` as keyof DashboardChartData;
          result[compositeKey] = filteredTimeData;
        }
      }
    }
    return result;
  }

  // Chart data fetching helpers ---------
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

  // Variable data formatting helpers ---------
  /**
   * Calculate time period string from a date based on aggregation type
   */
  private getTimePeriodFromDate(date: Date, aggregation: TimeAggregation): TimePeriod | null {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      console.error('Invalid date for time period calculation:', date);
      return null;
    }

    const year = date.getFullYear();

    switch (aggregation) {
      case 'quarter': {
        const quarter = Math.floor(date.getMonth() / 3) + 1 as 1 | 2 | 3 | 4;
        return `${year}-Q${quarter}`;
      }
      case 'month': {
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        return `${year}-${monthName}`;
      }
      case 'year': {
        return `${year}`;
      }
      default:
        console.error('Unknown time aggregation type:', aggregation);
        return null;
    }
  }

  /**
   * Compare two time periods for sorting
   */
  private compareTimePeriods(a: TimePeriod, b: TimePeriod): number {
    // Extract year from both periods
    const yearA = parseInt(a.split('-')[0], 10);
    const yearB = parseInt(b.split('-')[0], 10);

    if (yearA !== yearB) {
      return yearA - yearB;
    }

    // If same year, compare based on type
    if (a.includes('Q') && b.includes('Q')) {
      // Quarter comparison
      const quarterA = parseInt(a.split('Q')[1], 10);
      const quarterB = parseInt(b.split('Q')[1], 10);
      return quarterA - quarterB;
    }

    if (a.includes('-') && b.includes('-') && !a.includes('Q') && !b.includes('Q')) {
      // Month comparison
      const monthA = a.split('-')[1];
      const monthB = b.split('-')[1];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months.indexOf(monthA) - months.indexOf(monthB);
    }

    // Year only - already compared above
    return 0;
  }

  /**
   * @param yAxisVar Variable to use for the chart (e.g. 'rbc_units')
   * @param aggregation Aggregation type ('sum' or 'avg')
   * @returns Chart title based on yAxis variable and aggregation type
   */
  generateChartTitle(yAxisVar: DashboardChartConfig['yAxisVar'], aggregation: keyof typeof AGGREGATION_OPTIONS): string {
    const option = dashboardYAxisOptions.find((opt) => opt.value === yAxisVar);
    const label = option?.label || yAxisVar;

    const aggregationText = aggregation.charAt(0).toUpperCase() + aggregation.slice(1);
    const ofText = aggregation === 'sum' ? ' of' : '';
    const perVisitText = aggregation === 'avg' ? ' Per Visit' : '';

    return `${aggregationText}${ofText} ${label}${perVisitText}`;
  }

  // Data validation helpers ---------
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

  // Stats data helper functions ------------------------------------------------
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
    const isOverallAdherence = metricVar === OVERALL_GUIDELINE_ADHERENCE.value;
    const isProphylMed = PROPHYL_MED_OPTIONS.some((opt) => opt.value === metricVar);

    if (isBloodComponent || isOutcome) {
    // For blood components and outcomes, negative change is good
      return diffPercent < 0;
    }

    if (isAdherence || isOverallAdherence || isProphylMed) {
    // For adherence (including overall) and prophylactic medications, positive change is good
      return diffPercent > 0;
    }

    // Default fallback - log warning for unclassified metrics
    console.warn(`Unclassified metric: ${metricVar}`);
    return diffPercent >= 0;
  }

  /**
   * Generate a stat title based on the variable and aggregation type
   */
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
