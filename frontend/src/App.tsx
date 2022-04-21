import { timeFormat, timeParse } from "d3";
import { observer } from "mobx-react";
import { createContext, useContext, useState } from "react";
import { useEffect } from "react";
import { FC } from "react";
import { useIdleTimer } from "react-idle-timer";
import Dashboard from "./Dashboard";
import { defaultState } from "./Interfaces/DefaultState";
import Store from "./Interfaces/Store";
import { FilterType, SingleCasePoint } from "./Interfaces/Types/DataTypes";
import { logoutHandler, whoamiAPICall } from "./Interfaces/UserManagement";
import { SurgeryUrgencyArray } from "./Presets/DataDict";
import './App.css';
import { checkIfCriteriaMet } from "./HelperFunctions/CaseListProducer";
import useDeepCompareEffect from "use-deep-compare-effect";

export const DataContext = createContext<SingleCasePoint[]>([]);

const App: FC = () => {
    const store = useContext(Store);
    const { allFilters, surgeryUrgencySelection, outcomeFilter, currentSelectPatientGroup, currentOutputFilterSet } = store.state;
    const [hemoData, setHemoData] = useState<SingleCasePoint[]>([]);
    const [outputFilteredData, setOutputFilteredDAta] = useState<SingleCasePoint[]>([]);


    useEffect(() => {
        if (process.env.REACT_APP_REQUIRE_LOGIN !== "true" || (store.configStore.isLoggedIn && hemoData.length === 0)) {
            cacheHemoData();
        }
        else {
            whoamiAPICall(store);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [store.configStore.isLoggedIn]);

    const handleOnIdle = (event: any) => {
        // On idle log the user out
        if (process.env.REACT_APP_REQUIRE_LOGIN === "true") {
            logoutHandler();
        }

    };

    const handleOnAction = (event: any) => {
        if (process.env.REACT_APP_REQUIRE_LOGIN === "true") {
            whoamiAPICall(store);
        }
    };

    useIdleTimer({
        //the idle timer setting
        timeout: 1000 * 60 * 120,
        onIdle: handleOnIdle,
        onAction: handleOnAction,
        events: ["mousedown", "keydown"],
        throttle: 1000 * 60
    });

    //Data Updates
    useDeepCompareEffect(() => {
        let patientIDSet: Set<number> | undefined;
        if (currentSelectPatientGroup.length > 0) {
            patientIDSet = new Set<number>();
            currentSelectPatientGroup.forEach((d) => { patientIDSet!.add(d.CASE_ID); });
        }
        const newFilteredData = hemoData.filter((eachcase: SingleCasePoint) => checkIfCriteriaMet(eachcase, surgeryUrgencySelection, outcomeFilter, currentOutputFilterSet, allFilters, patientIDSet));


        setOutputFilteredDAta(newFilteredData);
    }, [surgeryUrgencySelection, outcomeFilter, hemoData, currentOutputFilterSet, allFilters, currentSelectPatientGroup]);

    async function cacheHemoData() {
        if (process.env.REACT_APP_REQUIRE_LOGIN === "true") {
            whoamiAPICall(store);
        }
        fetch(`${process.env.REACT_APP_QUERY_URL}hemoglobin`)
            .then((res) => res.json())
            .then(async (dataHemo) => {
                const resultHemo = dataHemo.result;

                // console.log('hemo');
                // console.log(resultHemo);

                const resTrans = await fetch(`${process.env.REACT_APP_QUERY_URL}request_transfused_units?transfusion_type=ALL_UNITS&date_range=${[timeFormat("%d-%b-%Y")(new Date(defaultState.rawDateRange[0])), timeFormat("%d-%b-%Y")(new Date(defaultState.rawDateRange[1]))]}`);
                const dataTrans = await resTrans.json();
                const resRisk = await fetch(`${process.env.REACT_APP_QUERY_URL}risk_score`);
                const dataRisk = await resRisk.json();

                // console.log('risk score');
                // console.log(dataRisk);

                let riskOutcomeDict: any = {};
                for (let obj of dataRisk) {
                    riskOutcomeDict[obj.visit_no] = {
                        DRG_WEIGHT: obj.apr_drg_weight,
                        TOTAL_LOS: obj.total_los
                    };
                }
                const resOutcome = await fetch(`${process.env.REACT_APP_QUERY_URL}patient_outcomes`);
                const dataOutcome = await resOutcome.json();

                // console.log('patient');
                // console.log(dataOutcome);

                for (let obj of dataOutcome) {
                    riskOutcomeDict[obj.visit_no].VENT = obj.gr_than_1440_vent || 0;
                    riskOutcomeDict[obj.visit_no].DEATH = obj.patient_death || 0;
                    riskOutcomeDict[obj.visit_no].STROKE = obj.patient_stroke || 0;
                    riskOutcomeDict[obj.visit_no].ECMO = obj.patient_ECMO || 0;
                    riskOutcomeDict[obj.visit_no].AMICAR = obj.AMICAR || 0;
                    riskOutcomeDict[obj.visit_no].B12 = obj.B12 || 0;
                    riskOutcomeDict[obj.visit_no].TXA = obj.tranexamic_acid || 0;
                    riskOutcomeDict[obj.visit_no].ORALIRON = obj.oral_iron || 0;
                    riskOutcomeDict[obj.visit_no].IVIRON = obj.iv_iron || 0;
                    riskOutcomeDict[obj.visit_no].RENAL_FAILURE = obj.renal_failure || 0;
                }

                let transfused_dict = {} as any;
                let cacheData: SingleCasePoint[] = [];

                dataTrans.forEach((element: any) => {
                    transfused_dict[element.case_id] = {
                        PRBC_UNITS: element.transfused_units[0] || 0,
                        FFP_UNITS: element.transfused_units[1] || 0,
                        PLT_UNITS: element.transfused_units[2] || 0,
                        CRYO_UNITS: element.transfused_units[3] || 0,
                        CELL_SAVER_ML: element.transfused_units[4] || 0
                    };
                });

                const tempFilterRange: FilterType = {
                    PREOP_HGB: [0, 0],
                    POSTOP_HGB: [0, 0],
                    PRBC_UNITS: [0, 0],
                    FFP_UNITS: [0, 0],
                    CRYO_UNITS: [0, 0],
                    PLT_UNITS: [0, 0],
                    CELL_SAVER_ML: [0, 0],
                    DRG_WEIGHT: [0, 0],
                    TOTAL_LOS: [0, 0]
                };

                resultHemo.forEach((ob: any, index: number) => {

                    if (transfused_dict[ob.CASE_ID]) {
                        const transfusedResult = transfused_dict[ob.CASE_ID];
                        const time = ((timeParse("%Y-%m-%dT%H:%M:%S")(ob.DATE))!.getTime());

                        // store.configStore.updateRange(transfusedResult);
                        // store.configStore.updateTestValue("PREOP_HGB", +ob.HEMO[0]);
                        // store.configStore.updateTestValue("POSTOP_HGB", +ob.HEMO[1]);
                        Object.keys(transfusedResult).forEach((d) => {
                            tempFilterRange[d] = [0, tempFilterRange[d][1] > transfusedResult[d] ? tempFilterRange[d][1] : transfusedResult[d]];
                        });

                        tempFilterRange.PREOP_HGB = [0, tempFilterRange.PREOP_HGB[1] > +ob.HEMO[0] ? tempFilterRange.PREOP_HGB[1] : +ob.HEMO[0]];

                        tempFilterRange.POSTOP_HGB = [0, tempFilterRange.POSTOP_HGB[1] > +ob.HEMO[1] ? tempFilterRange.POSTOP_HGB[1] : +ob.HEMO[1]];

                        if (riskOutcomeDict[ob.VISIT_ID].DRG_WEIGHT) {
                            tempFilterRange.DRG_WEIGHT = [0, tempFilterRange.DRG_WEIGHT[1] > riskOutcomeDict[ob.VISIT_ID].DRG_WEIGHT ? tempFilterRange.DRG_WEIGHT[1] : riskOutcomeDict[ob.VISIT_ID].DRG_WEIGHT];
                        }

                        if (riskOutcomeDict[ob.VISIT_ID].TOTAL_LOS) {
                            tempFilterRange.TOTAL_LOS = [0, tempFilterRange.TOTAL_LOS[1] > riskOutcomeDict[ob.VISIT_ID].TOTAL_LOS ? tempFilterRange.TOTAL_LOS[1] : riskOutcomeDict[ob.VISIT_ID].TOTAL_LOS];
                        }


                        const outputObj: SingleCasePoint = {
                            CASE_ID: ob.CASE_ID,
                            VISIT_ID: ob.VISIT_ID,
                            PATIENT_ID: ob.PATIENT_ID,
                            ANESTHESIOLOGIST_ID: ob.ANESTHESIOLOGIST_ID,
                            SURGEON_ID: ob.SURGEON_ID,
                            YEAR: ob.YEAR,
                            PRBC_UNITS: transfusedResult.PRBC_UNITS,
                            FFP_UNITS: transfusedResult.FFP_UNITS,
                            PLT_UNITS: transfusedResult.PLT_UNITS,
                            CRYO_UNITS: transfusedResult.CRYO_UNITS,
                            CELL_SAVER_ML: transfusedResult.CELL_SAVER_ML,
                            PREOP_HGB: +ob.HEMO[0],
                            POSTOP_HGB: +ob.HEMO[1],
                            QUARTER: ob.QUARTER,
                            MONTH: ob.MONTH,
                            DATE: time,
                            VENT: riskOutcomeDict[ob.VISIT_ID].VENT,
                            DRG_WEIGHT: riskOutcomeDict[ob.VISIT_ID].DRG_WEIGHT || NaN,
                            DEATH: riskOutcomeDict[ob.VISIT_ID].DEATH,
                            ECMO: riskOutcomeDict[ob.VISIT_ID].ECMO,
                            STROKE: riskOutcomeDict[ob.VISIT_ID].STROKE,
                            TXA: riskOutcomeDict[ob.VISIT_ID].TXA,
                            B12: riskOutcomeDict[ob.VISIT_ID].B12,
                            ORALIRON: riskOutcomeDict[ob.VISIT_ID].ORALIRON,
                            IVIRON: riskOutcomeDict[ob.VISIT_ID].IVIRON,
                            AMICAR: riskOutcomeDict[ob.VISIT_ID].AMICAR,
                            SURGERY_TYPE: SurgeryUrgencyArray.indexOf(ob.SURGERY_TYPE),
                            TOTAL_LOS: riskOutcomeDict[ob.VISIT_ID].TOTAL_LOS || 0,
                            RENAL_FAILURE: riskOutcomeDict[ob.VISIT_ID].RENAL_FAILURE,
                        };
                        cacheData.push(outputObj);
                    }
                });

                store.configStore.updateRange(tempFilterRange);

                cacheData = cacheData.filter((d: any) => d);
                setHemoData(cacheData);
                store.configStore.dataLoading = false;
            }).catch((error) => {
                store.configStore.dataLoadingFailed = true;
                store.configStore.dataLoading = false;
            });
    }

    return <DataContext.Provider value={outputFilteredData}>
        <Dashboard />
    </DataContext.Provider>;
};

export default observer(App);
