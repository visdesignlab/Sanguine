
export const BloodComponentOptions = [
    { value: "PRBC_UNITS", key: "PRBC_UNITS", text: "Intraoperative RBCs Transfused" },
    { value: "FFP_UNITS", key: "FFP_UNITS", text: "Intraoperative FFP Transfused" },
    { value: "PLT_UNITS", key: "PLT_UNITS", text: "Intraoperative Platelets Transfused" },
    { value: "CRYO_UNITS", key: "CRYO_UNITS", text: "Intraoperative Cryo Transfused" },
    { value: "CELL_SAVER_ML", key: "CELL_SAVER_ML", text: "Cell Salvage Volume (ml)" }];

const AggregationOptions = [
    { value: "SURGEON_PROV_ID", key: "SURGEON_PROV_ID", text: "Surgeon ID" },
    { value: "YEAR", key: "YEAR", text: "Year" },
    { value: "ANESTHESIOLOGIST_ID", key: "ANESTHESIOLOGIST_ID", text: "Anesthesiologist ID" }];

export const ScatterYOptions = [
    { value: "PREOP_HEMO", key: "PREOP_HEMO", text: "Preoperative Hemoglobin Value" },
    { value: "POSTOP_HEMO", key: "POSTOP_HEMO", text: "Postoperative Hemoglobin Value" }];

export const OutcomeOptions = [
    { value: "DEATH", key: "DEATH", text: "Death" },
    { value: "VENT", key: "VENT", text: "Ventilator Over 24hr" },
    { value: "STROKE", key: "STROKE", text: "Stroke" },
    { value: "ECMO", key: "ECMO", text: "ECMO" },
    { value: "B12", key: "B12", text: "B12" },
    { value: "TXA", key: "TXA", text: "Tranexamic Acid" },
    { value: "AMICAR", key: "AMICAR", text: "Amicar" }];

export const OutcomeOptionsStringArray = ["DEATH", "VENT", "STROKE", "ECMO", "B12", "TXA", "AMICAR"];

export const ExtraPairOptions = OutcomeOptions.concat([
    { text: "Preop Hemoglobin", key: "PREOP_HEMO", value: "Preop HGB" },
    { text: "Postop Hemoglobin", key: "POSTOP_HEMO", value: "POSTOP_HEMO" },
    { text: "Total Transfusion", key: "TOTAL_TRANS", value: "TOTAL_TRANS" },
    { text: "Per Case Transfusion", key: "PER_CASE", value: "PER_CASE" },
    { text: "Zero Transfusion Cases", key: "ZERO_TRANS", value: "ZERO_TRANS" },
    { text: "DRG Weight (Risk)", key: "RISK", value: "RISK" }
]);

export const SurgeryUrgency = [
    { value: 0, key: 0, text: "Urgent" },
    { value: 1, key: 1, text: "Elective" },
    { value: 2, key: 2, text: "Emergent" }];


export const dumbbellFacetOptions = BloodComponentOptions.slice(0, 4).concat(AggregationOptions).concat([{ value: "QUARTER", key: "QUARTER", text: "Quarter" }]);

const dumbbellValueOptions = [{ value: "HGB_VALUE", key: "HGB_VALUE", text: "Hemoglobin Value" }];

export const typeDiction = ["COST", "DUMBBELL", "SCATTER", "HEATMAP", "INTERVENTION"];

export const addOptions = [
    [OutcomeOptions.slice(4, 7), AggregationOptions],
    [dumbbellValueOptions, dumbbellFacetOptions],
    [ScatterYOptions, BloodComponentOptions],
    [BloodComponentOptions, AggregationOptions],
    [BloodComponentOptions, [AggregationOptions[0], AggregationOptions[2]]]
];

export const SurgeryUrgencyArray = ["Urgent", "Elective", "Emergent"];

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
    DEATH: "Death in hospital",
    STROKE: "Stroke",
    TXA: "Tranexamic Acid",
    PRBC_UNITS: "Intraoperative RBCs Transfused",
    FFP_UNITS: "Intraoperative FFP Transfused",
    PLT_UNITS: "Intraoperative Platelets Transfused",
    CRYO_UNITS: "Intraoperative Cryo Transfused",
    CELL_SAVER_ML: "Cell Salvage Volume",
    SURGEON_PROV_ID: "Surgeon ID",
    ANESTHESIOLOGIST_ID: "Anesthesiologist ID",
    YEAR: "Year",
    QUARTER: "Quarter",
    MONTH: "Month",
    HGB_VALUE: "Hemoglobin Value",
    PREOP_HEMO: "Preoperative Hemoglobin Value",
    POSTOP_HEMO: "Postoperative Hemoglobin Value",
    DRG_WEIGHT: "Diagnosis-related Group Weight",
    COST: "Blood Component Cost per Case"
};

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
    "VISIT_NO",
    "CASE_DATE",
    "MONTH",
    "PATIENT_ID",
    "Hospital Visit Number"
]);

