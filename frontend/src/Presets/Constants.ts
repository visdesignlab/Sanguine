import { Offset } from "../Interfaces/Types/OffsetType"


export const preop_color = "#209b58"
export const postop_color = "#20639b"
export const highlight_orange = "#d98532"
export const Basic_Gray = "#404040"
export const Third_Gray = "#a2a2a2"
export const Secondary_Gray = "#666666"
export const blood_red = "#b10000"
export const highlight_blue = "#32d9d9"
export const greyScaleRange = [0.3, 0.85]
export const HGB_LOW_STANDARD = 7.5
export const SnackBarCloseTime = 5000
export const HGB_HIGH_STANDARD = 13
export const colorProfile = ["#d7191c", "#abd9e9", "#fdae61", "#2c7bb6", "#e1e100"]
export const OffsetDict = {
    regular: { left: 90, bottom: 40, right: 10, top: 40, margin: 10 } as Offset,
    minimum: { left: 35, bottom: 40, right: 10, top: 40, margin: 10 } as Offset,
    intervention: { left: 100, bottom: 40, right: 10, top: 40, margin: 10 } as Offset
};

export const CELL_SAVER_TICKS = ["0", "0-1h", "1h-2h", "2h-3h", "3h-4h", "4h-5h", "5h-6h", "6h-7h", "7h-8h", "8h-9h", "9h-1k", "1k+"]

export const ExtraPairWidth: any = { Violin: 100, BarChart: 50, Basic: 40 }
export const ExtraPairPadding = 10;
export const CaseRectWidth = 30;
export const DumbbellMinimumWidth = 18;
export const DifferentialSquareWidth = 10;
export const CostExplain = "Stacked bar chart on the right of the dashed line shows per case cost for each unit types. The bars on the left of the dashed line shows the potential cost on RBC if not using cell salvage. "

export const BloodProductCap: any = {
    PRBC_UNITS: 5,
    FFP_UNITS: 10,
    CRYO_UNITS: 10,
    PLT_UNITS: 10,
    CELL_SAVER_ML: 1000
}

export const ExtraPairLimit = 5