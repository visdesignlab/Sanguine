import { Offset } from '../Interfaces/Types/OffsetType';

export const preopColor = '#209b58';
export const postopColor = '#20639b';
export const highlightOrange = '#d98532';
export const basicGray = '#404040';
export const secondaryGray = '#666666';
export const thirdGray = '#a2a2a2';
export const greyScaleRange = [0.3, 0.85];
export const HGB_LOW_STANDARD = 7.5;
export const SnackBarCloseTime = 5000;
export const HGB_HIGH_STANDARD = 13;
export const OffsetDict = {
  regular: {
    left: 110, bottom: 40, right: 10, top: 40, margin: 10,
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

export const ExtraPairWidth = { Violin: 100, BarChart: 50, Basic: 40 };
export const ExtraPairPadding = 10;
export const CaseRectWidth = 30;
export const DumbbellGroupMinimumWidth = 50;
export const DumbbellMinimumWidth = 8;
export const DifferentialSquareWidth = 10;

export const BloodProductCap = {
  PRBC_UNITS: 5,
  FFP_UNITS: 5,
  CRYO_UNITS: 10, // we don't know about that
  PLT_UNITS: 5,
  CELL_SAVER_ML: 1000,
};

export const ExtraPairLimit = 5;

export const ManualInfinity = 5000000000;

export const regularFontSize = 11;
export const largeFontSize = 14;
