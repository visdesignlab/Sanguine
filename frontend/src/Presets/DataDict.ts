
const AggregationOptions = [
    { value: "SURGEON_ID", key: "SURGEON_ID", text: "Surgeon ID" },
    { value: "YEAR", key: "YEAR", text: "Year" },
    { value: "ANESTHESIOLOGIST_ID", key: "ANESTHESIOLOGIST_ID", text: "Anesthesiologist ID" }];


export const OutcomeOptions = [
    { value: "DEATH", key: "DEATH", text: "Death" },
    { value: "ORALIRON", key: "ORALIRON", text: "Oral Iron" },
    { value: "IVIRON", key: "IVIRON", text: "IV Iron" },
    { value: "VENT", key: "VENT", text: "Ventilator Over 24hr" },
    { value: "STROKE", key: "STROKE", text: "Stroke" },
    { value: "ECMO", key: "ECMO", text: "ECMO" },
    { value: "B12", key: "B12", text: "B12" },
    { value: 'RENAL_FAILURE', key: 'RENAL_FAILURE', text: 'Renal Failure' },
    { value: "TXA", key: "TXA", text: "Tranexamic Acid" },
    { value: "AMICAR", key: "AMICAR", text: "Amicar" }];

export const OutcomeOptionsStringArray = ["DEATH", "VENT", "STROKE", "ECMO", "B12", "TXA", "AMICAR", "ORALIRON", "IVIRON", "RENAL_FAILURE"];

export const BloodComponentStringArray = ['PRBC_UNITS', 'FFP_UNITS', 'PLT_UNITS', 'CRYO_UNITS', 'CELL_SAVER_ML'];

export const TestOptionStringArray = ['PREOP_HGB', 'POSTOP_HGB'];

export const CaseAttributeValueStringArray = ['TOTAL_LOS', 'DRG_WEIGHT'];

export const ExtraPairOptions = OutcomeOptions.concat([
    { text: "Preop Hemoglobin", key: "PREOP_HGB", value: "Preop HGB" },
    { text: "Postop Hemoglobin", key: "POSTOP_HGB", value: "POSTOP_HGB" },
    { text: "Total Transfusion", key: "TOTAL_TRANS", value: "TOTAL_TRANS" },
    { text: "Per Case Transfusion", key: "PER_CASE", value: "PER_CASE" },
    { text: "Zero Transfusion Cases", key: "ZERO_TRANS", value: "ZERO_TRANS" },
    { text: "DRG Weight (Risk)", key: "DRG_WEIGHT", value: "DRG_WEIGHT" },
    { text: 'Length of Stay', key: 'TOTAL_LOS', value: 'TOTAL_LOS' }
]);

export const SurgeryUrgency = [
    { value: 0, key: 0, text: "Urgent" },
    { value: 1, key: 1, text: "Elective" },
    { value: 2, key: 2, text: "Emergent" }];




const dumbbellValueOptions = [{ value: "HGB_VALUE", key: "HGB_VALUE", text: "Hemoglobin Value" }];

export const typeDiction = ["COST", "DUMBBELL", "SCATTER", "HEATMAP", "INTERVENTION"];

export const SurgeryUrgencyArray = ["Urgent", "Elective", "Emergent"];

export const AcronymDictionary: any = {
    RENAL_FAILURE: 'Renal Failure',
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
    COST: "Blood Component Cost per Case",
    TOTAL_LOS: "Total Length of Stay",
    ORALIRON: 'Oral Iron',
    IVIRON: 'IV Iron',
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
    "VISIT_ID",
    "DATE",
    "MONTH",
    "PATIENT_ID",
    "Hospital Visit Number"
]);

export const BloodComponentOptions = () => {
    return BloodComponentStringArray.map((d) => {
        return {
            value: d, key: d, text: AcronymDictionary[d]
        };
    });
};

const produceMenuOptions = (stringInput: string[]) => {
    return stringInput.map((d) => {
        return {
            value: d, key: d, text: AcronymDictionary[d]
        };
    });
};

export const dumbbellFacetOptions = produceMenuOptions(BloodComponentStringArray).slice(0, 4).concat(AggregationOptions).concat([{ value: "QUARTER", key: "QUARTER", text: "Quarter" }]);


export const addOptions = [
    [OutcomeOptions.slice(4, 7), AggregationOptions],
    [dumbbellValueOptions, dumbbellFacetOptions],
    [produceMenuOptions(TestOptionStringArray), produceMenuOptions(BloodComponentStringArray)],
    [produceMenuOptions(BloodComponentStringArray), AggregationOptions],
    [produceMenuOptions(BloodComponentStringArray), [AggregationOptions[0], AggregationOptions[2]]]
];
