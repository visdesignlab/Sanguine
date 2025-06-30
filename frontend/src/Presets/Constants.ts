import { Offset } from '../Interfaces/Types/OffsetType';

// Colors ------------------------------------
// Interaction Colors
export const smallHoverColor = '#FFCF76';
export const smallSelectColor = '#E29609';
export const backgroundHoverColor = '#FFE8BE';
export const backgroundSelectedColor = '#FFCF76';
export const highlightOrange = '#d98532';

// Preop/Postop Colors
export const preopColor = '#209b58';
export const postopColor = '#20639b';

// Grays
export const basicGray = '#404040';
export const lightGray = '#b3b3b3';
export const secondaryGray = '#666666';
export const thirdGray = '#a2a2a2';
export const greyScaleRange = [0.3, 0.85];

// -----------------------------------------
// Pre-op hgb threshold (<X g/dL) that warrants transfusion
export const HGB_LOW_STANDARD = 7.5;
// Pre-op hgb transfusion threshold range
export const hgbPostOpTargetRange = [HGB_LOW_STANDARD, HGB_LOW_STANDARD + 2];
// Post-op hgb target standard
export const HGB_HIGH_STANDARD = 13;
// Post-op hgb target standard range
export const hgbPreOpTargetRange = [HGB_HIGH_STANDARD, 21];

export const SnackBarCloseTime = 5000;
export const OffsetDict = {
  regular: {
    left: 140, bottom: 40, right: 10, top: 40, margin: 10,
  } as Offset,
  minimum: {
    left: 35, bottom: 40, right: 10, top: 40, margin: 10,
  } as Offset,
  intervention: {
    left: 120, bottom: 40, right: 10, top: 40, margin: 10,
  } as Offset,
};

export const CELL_SAVER_TICKS = ['0', '0-1h', '1h-2h', '2h-3h', '3h-4h', '4h-5h', '5h-6h', '6h-7h', '7h-8h', '8h-9h', '9h-1k', '1k+'];

export const MIN_HEATMAP_BANDWIDTH = (secondaryData: unknown) => (secondaryData ? 40 : 20);

export const AttributePlotWidth = { Violin: 100, BarChart: 50, Basic: 40 };
export const AttributePlotPadding = 10;
export const CaseRectWidth = 30;
export const DumbbellGroupMinimumWidth = 100;
export const DumbbellMinimumWidth = 8;
export const DifferentialSquareWidth = 10;

export const BloodProductCap = {
  PRBC_UNITS: 5,
  FFP_UNITS: 5,
  CRYO_UNITS: 10, // we don't know about that
  PLT_UNITS: 5,
  CELL_SAVER_ML: 1000,
};

export const AttributePlotLimit = 5;

export const ManualInfinity = 5000000000;

export const regularFontSize = 11;
export const largeFontSize = 14;
