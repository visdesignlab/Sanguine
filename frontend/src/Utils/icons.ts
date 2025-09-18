import { IconDropletHalf2Filled, IconTestPipe2, IconShieldHeart, IconMedicineSyrup, IconCoin } from "@tabler/icons-react";
import { dashboardYAxisVars, BLOOD_COMPONENT_OPTIONS, GUIDELINE_ADHERENT_OPTIONS, OVERALL_GUIDELINE_ADHERENT, OUTCOME_OPTIONS, PROPHYL_MED_OPTIONS } from "../Types/application";

// Icon mapping to variable type
export const icons = {
  bloodComponent: IconDropletHalf2Filled,
  adherence: IconTestPipe2,
  outcome: IconShieldHeart,
  prophylMed: IconMedicineSyrup,
  costSavings: IconCoin,
};

/**
 * @param varName Variable name to get the icon for
 * @returns Icon based on the variable type
 */
export function getIconForVar(varName: typeof dashboardYAxisVars[number]) {
  // E.g. If blood component, return blood component icon
  const bloodComponent = BLOOD_COMPONENT_OPTIONS.find((opt) => opt.value === varName);
  if (bloodComponent) return icons.bloodComponent;

  const adherence = GUIDELINE_ADHERENT_OPTIONS.find((opt) => opt.value === varName);
  if (adherence) return icons.adherence;
  if (adherence || varName === OVERALL_GUIDELINE_ADHERENT.value) return icons.adherence;

  const outcome = OUTCOME_OPTIONS.find((opt) => opt.value === varName);
  if (outcome) return icons.outcome;

  const prophylMed = PROPHYL_MED_OPTIONS.find((opt) => opt.value === varName);
  if (prophylMed) return icons.prophylMed;

  // Default icon
  return icons.bloodComponent;
}