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
    { value: "AMICAR", key: "AMICAR", text: "Amicar" },
]