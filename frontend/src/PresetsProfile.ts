import styled from "styled-components"

export const preop_color = "#209b58"
export const postop_color = "#20639b"
export const highlight_orange = "#d98532"
export const basic_gray = "#404040"
export const third_gray = "#a2a2a2"
export const secondary_gray = "#666666"
export const blood_red = "#b10000"
export const highlight_blue = "#32d9d9"
export const greyScaleRange = [0.3, 0.85]
export const HGB_LOW_STANDARD = 7.5
export const HGB_HIGH_STANDARD = 13
export const colorProfile = ["#d7191c", "#abd9e9", "#fdae61", "#2c7bb6", "#e1e100"]
export const offset = {
    regular: { left: 90, bottom: 40, right: 10, top: 40, margin: 10 },
    minimum: { left: 35, bottom: 40, right: 10, top: 40, margin: 10 },
    intervention: { left: 100, bottom: 40, right: 10, top: 40, margin: 10 }
};
export const differentialSquareWidth = 10;
export const CostExplain = "Stacked bar chart on the right of the dashed line shows per case cost for each unit types. The bars on the left of the dashed line shows the potential cost on RBC if not using cell salvage. "

export const extraPairOptions = [
    { title: "Preop Hemoglobin", value: "Preop HGB" },
    { title: "Postop Hemoglobin", value: "Postop HGB" },
    { title: "Total Transfusion", value: "Total Transfusion" },
    { title: "Per Case Transfusion", value: "Per Case" },
    { title: "Zero Transfusion Cases", value: "Zero Transfusion" },
    { title: "DRG Weight (Risk)", value: "RISK" },
    { title: "Mortality Rate", value: "DEATH" },
    { title: "Ventilation Rate", value: "VENT" },
    { title: "ECMO Rate", value: "ECMO" },
    { title: "Stroke Rate", value: "STROKE" },
    { title: "B12", value: "B12" },
    { title: "Tranexamic Acid", value: "TXA" },
    { title: "Amicar", value: "AMICAR" },
    { title: "Cost Test", value: "COST" }
]

//export const minimumOffset = 
export const extraPairWidth: any = { Violin: 100, Dumbbell: 110, BarChart: 50, Basic: 40, Outcomes: 40 }
export const extraPairPadding = 10;
export const minimumWidthScale = 18;
export const caseRectWidth = 30;

// export const AcronymDictionary: any = {
//     PRBC_UNITS: "Intraoperative RBCs Transfused",
//     FFP_UNITS: "Intraoperative FFP Transfused",
//     PLT_UNITS: "Intraoperative Platelets Transfused",
//     CRYO_UNITS: "Intraoperative Cryo Transfused",
//     CELL_SAVER_ML: "Cell Salvage Volume (ml)",
//     SURGEON_ID: "Surgeon ID",
//     ANESTHESIOLOGIST_ID: "Anesthesiologist ID",
//     YEAR: "Year",
//     QUARTER: "Quarter",
//     MONTH: "Month",
//     HGB_VALUE: "Hemoglobin Value",
//     PREOP_HGB: "Preoperative Hemoglobin Value",
//     POSTOP_HGB: "Postoperative Hemoglobin Value",
//     RISK: "DRG Weight",
//     VENT: "Ventilator Over 24hr"
// };

export const BloodProductCap: any = {
    PRBC_UNITS: 5,
    FFP_UNITS: 10,
    CRYO_UNITS: 10,
    PLT_UNITS: 10,
    CELL_SAVER_ML: 1000
}
//TODO add cost for cryo and cell saver


export const CELL_SAVER_TICKS = ["0", "0-1h", "1h-2h", "2h-3h", "3h-4h", "4h-5h", "5h-6h", "6h-7h", "7h-8h", "8h-9h", "9h-1k", "1k+"]

export const presetOptions = [{ value: 1, key: 1, text: "Preset 1" }]


export const scatterYOptions = [
    {
        value: "PREOP_HGB",
        key: "PREOP_HGB",
        text: "Preoperative Hemoglobin Value"
    },
    {
        value: "POSTOP_HGB",
        key: "POSTOP_HGB",
        text: "Postoperative Hemoglobin Value"
    }
]

export const typeDiction = ["COST", "DUMBBELL", "SCATTER", "HEATMAP", "INTERVENTION", "COMPARESAVING"]

export const dumbbellValueOptions = [
    { value: "HGB_VALUE", key: "HGB_VALUE", text: "Hemoglobin Value" }
]

export const dumbbellFacetOptions = [
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
    { value: "SURGEON_ID", key: "SURGEON_ID", text: "Surgeon ID" },
    { value: "YEAR", key: "YEAR", text: "Year" },
    {
        value: "ANESTHESIOLOGIST_ID",
        key: "ANESTHESIOLOGIST_ID",
        text: "Anesthesiologist ID"
    },
    { value: "QUARTER", key: "QUARTER", text: "Quarter" },
    { value: "MONTH", key: "MONTH", text: "Month" }
]

export const barChartAggregationOptions = [
    { value: "SURGEON_ID", key: "SURGEON_ID", text: "Surgeon ID" },
    { value: "YEAR", key: "YEAR", text: "Year" },
    {
        value: "ANESTHESIOLOGIST_ID",
        key: "ANESTHESIOLOGIST_ID",
        text: "Anesthesiologist ID"
    }
];

export const interventionChartType = [
    { value: "HEATMAP", key: "HEATMAP", text: "Heat Map" },
    // { value: "VIOLIN", key: "VIOLIN", text: "Violin Plot" }
]
// VENT: number,
//     DEATH: number,
//         STROKE: number,
//             ECMO: number
export const OutcomeType = [

    { value: "DEATH", key: "DEATH", text: "Death" },
    { value: "VENT", key: "VENT", text: "Ventilator Over 24hr" },
    { value: "STROKE", key: "STROKE", text: "Stroke" },
    { value: "ECMO", key: "ECMO", text: "ECMO" },
    { value: "B12", key: "B12", text: "B12" },
    { value: "TXA", key: "TXA", text: "Tranexamic Acid" },
    { value: "AMICAR", key: "AMICAR", text: "Amicar" },
]

export const SurgeryType = [
    { value: 0, key: 0, text: "Urgent" },
    { value: 1, key: 1, text: "Elective" },
    { value: 2, key: 2, text: "Emergent" },
]
export const surgeryTypeArray = ["Urgent", "Elective", "Emergent"]
export const OutcomeDropdownOptions = OutcomeType.concat({ value: "NONE", key: "NONE", text: "None" })

export const CompareSavingValuesOptions = [
    { value: "AMICAR", key: "AMICAR", text: "AMICAR" },
    { value: "TXA", key: "TXA", text: "Tranexamic Acid" },
    { value: "B12", key: "B12", text: "B12" },
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
    "Surgery End Time",
    "CASE_ID",
    "VISIT_ID",
    "DATE",
    "MONTH",
    "PATIENT_ID"
])


export const AcronymDictionary: any = {
    CABG: "Coronary Artery Bypass Grafting",
    TAVR: "Transcatheter Aortic Valve Replacement",
    VAD: "Ventricular Assist Devices",
    AVR: "Aortic Valve Replacement",
    ECMO: "Extracorporeal Membrane Oxygenation",
    MVR: "Mitral Valve Repair",
    EGD: "Esophagogastroduodenoscopy",
    VATS: "Video-assisted Thoracoscopic Surgery",
    TVR: "Tricuspid Valve Repair",
    PVR: "Proliferative Vitreoretinopathy",
    VENT: "Over 24 Hours Ventilator Usage",
    RISK: "Diagnosis-related Group Weight (Risk Score)",
    "Zero %": "Zero Transfusion",
    DEATH: "Death",
    STROKE: "Stroke",
    TXA: "Tranexamic Acid",
    PRBC_UNITS: "Intraoperative RBCs Transfused",
    FFP_UNITS: "Intraoperative FFP Transfused",
    PLT_UNITS: "Intraoperative Platelets Transfused",
    CRYO_UNITS: "Intraoperative Cryo Transfused",
    CELL_SAVER_ML: "Cell Salvage Volume (ml)",
    SURGEON_ID: "Surgeon ID",
    ANESTHESIOLOGIST_ID: "Anesthesiologist ID",
    YEAR: "Year",
    QUARTER: "Quarter",
    MONTH: "Month",
    HGB_VALUE: "Hemoglobin Value",
    PREOP_HGB: "Preoperative Hemoglobin Value",
    POSTOP_HGB: "Postoperative Hemoglobin Value",
    DRG_WEIGHT: "Diagnosis-related Group Weight",
    COST: "Blood Component Cost per Case"
}



export const ChartSVG = styled.svg`
  height: 80%;
  width: 100%;
`;

export const Title = styled.b`
    font-size:larger
`;
