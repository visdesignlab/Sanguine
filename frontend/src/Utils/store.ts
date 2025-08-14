import {
  AdherentCountField, GUIDELINE_ADHERENCE_OPTIONS, OVERALL_GUIDELINE_ADHERENCE, OverallAdherentCountField, OverallTotalTransfusedField, PROPHYL_MED_OPTIONS, ProphylMed, TIME_CONSTANTS, TotalTransfusedField,
} from '../Types/application';
import { TransfusionEvent, Visit } from '../Types/database';

/**
   * Safely parse a date string with error handling
   */
export function safeParseDate(dateInput: string | Date | null | undefined): Date {
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
export function isValidVisit(visit: Visit): boolean {
  if (!visit) {
    console.warn('Null or undefined visit');
    return false;
  }
  if (!visit.dsch_dtm || !visit.adm_dtm) {
    console.warn('Visit missing required dates:', { id: visit.visit_no, dsch_dtm: visit.dsch_dtm, adm_dtm: visit.adm_dtm });
    return false;
  }
  const dischDate = safeParseDate(visit.dsch_dtm);
  const admDate = safeParseDate(visit.adm_dtm);
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
   * Calculate pre-surgery time periods (2 days before each surgery)
   */
export function getPreSurgeryTimePeriods(visit: Visit): [number, number][] {
  return visit.surgeries.map((surgery) => {
    try {
      const surgeryStart = safeParseDate(surgery.surgery_start_dtm);
      return [surgeryStart.getTime() - TIME_CONSTANTS.TWO_DAYS_MS, surgeryStart.getTime()];
    } catch (error) {
      console.warn('Invalid surgery_start_dtm:', surgery.surgery_start_dtm, error);
      return [0, 0];
    }
  });
}

/**
 * Calculate prophylactic (before surgery) medication flags for a visit
 * @returns Record of prophylactic medication flags: 1 if medication was given pre-surgery, 0 if not
 */
export function getProphMedFlags(visit: Visit): Record<ProphylMed, number> {
  return visit.medications.reduce((acc: Record<ProphylMed, number>, med) => {
    try {
      const preSurgeryTimePeriods = getPreSurgeryTimePeriods(visit);
      const medTime = safeParseDate(med.order_dtm).getTime();
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
 * @returns Record of adherence flags: 1 if transfusion adheres to guideline, 0 if not; and total transfused counts
 */
export function getAdherenceFlags(visit: Visit): Record<AdherentCountField | TotalTransfusedField, number> {
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
      if (transfusionUnits.some((field) => {
        const value = transfusion[field as keyof TransfusionEvent];
        return typeof value === 'number' && value > 0;
      })) {
        // Find relevant lab result within 2 hours of transfusion
        const relevantLab = visit.labs
          .filter((lab) => {
            const labDrawDtm = safeParseDate(lab.lab_draw_dtm).getTime();
            const transfusionDtm = safeParseDate(transfusion.trnsfsn_dtm).getTime();
            return (
              labDesc.includes(lab.result_desc)
              && labDrawDtm <= transfusionDtm
              && labDrawDtm >= transfusionDtm - TIME_CONSTANTS.TWO_HOURS_MS
            );
          })
          .sort((a, b) => safeParseDate(b.lab_draw_dtm).getTime() - safeParseDate(a.lab_draw_dtm).getTime())
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
 * @returns Record of overall adherence flags: total adherent transfusions and total transfusions across all blood products
 */
export function getOverallAdherenceFlags(adherenceFlags: Record<AdherentCountField | TotalTransfusedField, number>): Record<OverallAdherentCountField | OverallTotalTransfusedField, number> {
  // Sum all adherent transfusions across all blood products
  const totalAdherentTransfusions = GUIDELINE_ADHERENCE_OPTIONS.reduce((count, { adherentCount }) => count + (adherenceFlags[adherentCount] || 0), 0);

  // Sum all transfusions across all blood products
  const totalTransfusions = GUIDELINE_ADHERENCE_OPTIONS.reduce((count, { totalTransfused }) => count + (adherenceFlags[totalTransfused] || 0), 0);

  return {
    [OVERALL_GUIDELINE_ADHERENCE.adherentCount]: totalAdherentTransfusions,
    [OVERALL_GUIDELINE_ADHERENCE.totalTransfused]: totalTransfusions,
  };
}
