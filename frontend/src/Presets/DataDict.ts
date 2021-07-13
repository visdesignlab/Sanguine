export const SurgeryTypeArray = ["Urgent", "Elective", "Emergent"];
export const BloodComponentOptions = [
    { value: "PRBC_UNITS", key: "PRBC_UNITS", text: "Intraoperative RBCs Transfused" },
    { value: "FFP_UNITS", key: "FFP_UNITS", text: "Intraoperative FFP Transfused" },
    { value: "PLT_UNITS", key: "PLT_UNITS", text: "Intraoperative Platelets Transfused" },
    { value: "CRYO_UNITS", key: "CRYO_UNITS", text: "Intraoperative Cryo Transfused" },
    { value: "CELL_SAVER_ML", key: "CELL_SAVER_ML", text: "Cell Salvage Volume (ml)" }];

export const AggregationOptions = [
    { value: "SURGEON_ID", key: "SURGEON_ID", text: "Surgeon ID" },
    { value: "YEAR", key: "YEAR", text: "Year" },
    { value: "ANESTHESIOLOGIST_ID", key: "ANESTHESIOLOGIST_ID", text: "Anesthesiologist ID" }];

export const scatterYOptions = [
    { value: "PREOP_HGB", key: "PREOP_HGB", text: "Preoperative Hemoglobin Value" },
    { value: "POSTOP_HGB", key: "POSTOP_HGB", text: "Postoperative Hemoglobin Value" }];

export const OutcomeOptions = [
    { value: "DEATH", key: "DEATH", text: "Death" },
    { value: "VENT", key: "VENT", text: "Ventilator Over 24hr" },
    { value: "STROKE", key: "STROKE", text: "Stroke" },
    { value: "ECMO", key: "ECMO", text: "ECMO" },
    { value: "B12", key: "B12", text: "B12" },
    { value: "TXA", key: "TXA", text: "Tranexamic Acid" },
    { value: "AMICAR", key: "AMICAR", text: "Amicar" }]

export const SurgeryUrgency = [
    { value: 0, key: 0, text: "Urgent" },
    { value: 1, key: 1, text: "Elective" },
    { value: 2, key: 2, text: "Emergent" }]

export const SurgeryUrgencyArray = ["Urgent", "Elective", "Emergent"]

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