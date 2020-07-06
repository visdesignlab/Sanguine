import styled from "styled-components"

export const preop_color = "#209b58"
export const postop_color = "#20639b"
export const highlight_orange = "#d98532"
export const basic_gray = "#404040"
export const third_gray = "#a2a2a2"
export const secondary_gray = "#666666"
export const blood_red = "#b10000"
export const highlight_blue = "#32d9d9"
export const greyScaleRange = [0.25, 0.8]

export const offset = {
    regular: { left: 85, bottom: 40, right: 10, top: 40, margin: 20 },
    minimum: { left: 35, bottom: 40, right: 10, top: 40, margin: 20 },
    intervention: { left: 95, bottom: 40, right: 10, top: 40, margin: 20 }

};

export const extraPairOptions = [
    { title: "Preop Hemoglobin", value: "Preop Hemo" },
    { title: "Postop Hemoglobin", value: "Postop Hemo" },
    { title: "Total Transfusion", value: "Total Transfusion" },
    { title: "Per Case Transfusion", value: "Per Case" },
    { title: "Zero Transfusion Cases", value: "Zero Transfusion" },
    { title: "Risk Score", value: "RISK" },
    // { title: "Severity of Illness", value: "SOI" },
    { title: "Mortality Rate", value: "Mortality" },
    { title: "Ventilation Rate", value: "Vent" }
]

//export const minimumOffset = 
export const extraPairWidth: any = { Violin: 110, Dumbbell: 110, BarChart: 50, Basic: 30, Outcomes: 35 }
export const extraPairPadding = 5;
export const minimumWidthScale = 18;

export const AxisLabelDict: any = {
    PRBC_UNITS: "Intraoperative RBCs Transfused",
    FFP_UNITS: "Intraoperative FFP Transfused",
    PLT_UNITS: "Intraoperative Platelets Transfused",
    CRYO_UNITS: "Intraoperative Cryo Transfused",
    CELL_SAVER_ML: "Cell Salvage Volume (ml)",
    SURGEON_ID: "Surgeon ID",
    ANESTHOLOGIST_ID: "Anesthologist ID",
    YEAR: "Year",
    QUARTER: "Quarter",
    MONTH: "Month",
    HEMO_VALUE: "Hemoglobin Value",
    PREOP_HEMO: "Preoperative Hemoglobin Value",
    POSTOP_HEMO: "Postoperative Hemoglobin Value",
    ROM: "Risk of Mortality",
    SOI: "Severity of Illness",
    Vent: "Ventilator Over 1440 min"
};

export const BloodProductCap: any = {
    PRBC_UNITS: 5,
    FFP_UNITS: 10,
    CRYO_UNITS: 10,
    PLT_UNITS: 10,
    CELL_SAVER_ML: 1000
}

export const CELL_SAVER_TICKS = ["0", "0-1h", "1h-2h", "2h-3h", "3h-4h", "4h-5h", "5h-6h", "6h-7h", "7h-8h", "8h-9h", "9h-1k", "1k+"]

export const presetOptions = [{ value: 1, key: 1, text: "Preset 1" }]


export const scatterYOptions = [
    {
        value: "PREOP_HEMO",
        key: "PREOP_HEMO",
        text: "Preoperative Hemoglobin Value"
    },
    {
        value: "POSTOP_HEMO",
        key: "POSTOP_HEMO",
        text: "Postoperative Hemoglobin Value"
    }
]

export const typeDiction = ["VIOLIN", "DUMBBELL", "SCATTER", "HEATMAP", "INTERVENTION"]

export const dumbbellValueOptions = [
    { value: "HEMO_VALUE", key: "HEMO_VALUE", text: "Hemoglobin Value" }
]

export const dumbbellFacetOptions = [
    { value: "SURGEON_ID", key: "SURGEON_ID", text: "Surgeon ID" },
    { value: "YEAR", key: "YEAR", text: "Year" },
    {
        value: "ANESTHOLOGIST_ID",
        key: "ANESTHOLOGIST_ID",
        text: "Anesthologist ID"
    },
    { value: "QUARTER", key: "QUARTER", text: "Quarter" },
    { value: "MONTH", key: "MONTH", text: "Month" }
]

export const barChartAggregationOptions = [
    { value: "SURGEON_ID", key: "SURGEON_ID", text: "Surgeon ID" },
    { value: "YEAR", key: "YEAR", text: "Year" },
    {
        value: "ANESTHOLOGIST_ID",
        key: "ANESTHOLOGIST_ID",
        text: "Anesthologist ID"
    }
];

export const interventionChartType = [
    { value: "HEATMAP", key: "HEATMAP", text: "Heat Map" },
    { value: "VIOLIN", key: "VIOLIN", text: "Violin Plot" }
]


export const barChartValuesOptions = [
    {
        value: "PRBC_UNITS",
        key: "PRBC_UNITS",
        text: "Intraoperative RBCs Transfused"
    },
    {
        value: "FFP_UNITS",
        key: "FFP_UNITS",
        text: "Intraoperative FFP Transfused"
    },
    {
        value: "PLT_UNITS",
        key: "PLT_UNITS",
        text: "Intraoperative Platelets Transfused"
    },
    {
        value: "CRYO_UNITS",
        key: "CRYO_UNITS",
        text: "Intraoperative Cryo Transfused"
    },
    {
        value: "CELL_SAVER_ML",
        key: "CELL_SAVER_ML",
        text: "Cell Salvage Volume (ml)"
    }
];


export const HIPAA_Sensitive = new Set([
    "Gender (M/F)",
    "Gender (Male/Female)",
    "Race Code",
    "Race Description",
    "Ethnicity Code",
    "Ethnicity Description",
    "Date of Death",
    "Date of Birth",
    "Surgery Date",
    "Surgery Start Time",
    "Surgery End Time"
])

export const Accronym = {
    CABG: "Coronary Artery Bypass Grafting",
    TAVR: "Transcatheter Aortic Valve Replacement",
    VAD: "Ventricular Assist Devices",
    AVR: "Aortic Valve Replacement",
    ECMO: "Extracorporeal Membrane Oxygenation",
    MVR: "Mitral Valve Repair",
    EGD: "Esophagogastroduodenoscopy",
    VATS: "Video-assisted Thoracoscopic Surgery",
    TVR: "Tricuspid Valve Repair",
    PVR: "Proliferative Vitreoretinopathy"
}

export const stateUpdateWrapperUseJSON = (oldState: any, newState: any, updateFunction: (value: React.SetStateAction<any>) => void) => {
    if (JSON.stringify(oldState) !== JSON.stringify(newState)) {
        updateFunction(newState)
    }
}

export const ChartSVG = styled.svg`
  height: 80%;
  width: 100%;
`;

export const Title = styled.b`
    font-size:larger
`;