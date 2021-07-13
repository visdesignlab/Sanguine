import { timeFormat, timeParse } from "d3"
import { observer } from "mobx-react"
import { useContext, useState } from "react"
import { useEffect } from "react"
import { FC } from "react"
import { useIdleTimer } from "react-idle-timer"
import Dashboard from "./Dashboard"
import { defaultState } from "./Interfaces/DefaultState"
import Store from "./Interfaces/Store"
import { SingleCasePoint } from "./Interfaces/Types/DataTypes"
import { logoutHandler, whoamiAPICall } from "./Interfaces/UserManagement"
import { SurgeryTypeArray } from "./Presets/DataDict"

const App: FC = () => {
    const store = useContext(Store);
    const [hemoData, setHemoData] = useState<SingleCasePoint[]>([])

    useEffect(() => {
        whoamiAPICall(store);
        if (store.configStore.isLoggedIn) {
            //this need to also be checked to only do once. 
            cacheHemoData();
        }
    }, [store.configStore.isLoggedIn])

    const handleOnIdle = (event: any) => {
        // On idle log the user out
        logoutHandler()
    }

    const handleOnAction = (event: any) => {
        whoamiAPICall(store)
    }

    useIdleTimer({
        //the idle timer setting
        timeout: 1000 * 60 * 30,
        onIdle: handleOnIdle,
        onAction: handleOnAction,
        events: ["mousedown", "keydown"],
        throttle: 1000 * 60
    })

    async function cacheHemoData() {
        fetch(`${process.env.REACT_APP_QUERY_URL}hemoglobin`)
            .then((res) => res.json())
            .then(async (dataHemo) => {
                const resultHemo = dataHemo.result;
                const resTrans = await fetch(`${process.env.REACT_APP_QUERY_URL}request_transfused_units?transfusion_type=ALL_UNITS&date_range=${[timeFormat("%d-%b-%Y")(new Date(defaultState.rawDateRange[0])), timeFormat("%d-%b-%Y")(new Date(defaultState.rawDateRange[1]))]}`)
                const dataTrans = await resTrans.json();
                const resRisk = await fetch(`${process.env.REACT_APP_QUERY_URL}risk_score`);
                const dataRisk = await resRisk.json();
                let riskOutcomeDict: any = {}
                for (let obj of dataRisk) {
                    riskOutcomeDict[obj.visit_no] = { DRG_WEIGHT: obj.apr_drg_weight }
                }
                const resOutcome = await fetch(`${process.env.REACT_APP_QUERY_URL}patient_outcomes`);
                const dataOutcome = await resOutcome.json();

                for (let obj of dataOutcome) {
                    riskOutcomeDict[obj.visit_no].VENT = obj.gr_than_1440_vent || 0;
                    riskOutcomeDict[obj.visit_no].DEATH = obj.patient_death || 0;
                    riskOutcomeDict[obj.visit_no].STROKE = obj.patient_stroke || 0;
                    riskOutcomeDict[obj.visit_no].ECMO = obj.patient_ECMO || 0;
                    riskOutcomeDict[obj.visit_no].AMICAR = obj.AMICAR || 0;
                    riskOutcomeDict[obj.visit_no].B12 = obj.B12 || 0;
                    riskOutcomeDict[obj.visit_no].TXA = obj.tranexamic_acid || 0;
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

                resultHemo.forEach((ob: any, index: number) => {

                    if (transfused_dict[ob.CASE_ID]) {
                        const transfusedResult = transfused_dict[ob.CASE_ID];
                        const time = ((timeParse("%Y-%m-%dT%H:%M:%S")(ob.DATE))!.getTime())
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
                            DRG_WEIGHT: riskOutcomeDict[ob.VISIT_ID].DRG_WEIGHT || 0,
                            DEATH: riskOutcomeDict[ob.VISIT_ID].DEATH,
                            ECMO: riskOutcomeDict[ob.VISIT_ID].ECMO,
                            STROKE: riskOutcomeDict[ob.VISIT_ID].STROKE,
                            TXA: riskOutcomeDict[ob.VISIT_ID].TXA,
                            B12: riskOutcomeDict[ob.VISIT_ID].B12,
                            AMICAR: riskOutcomeDict[ob.VISIT_ID].AMICAR,
                            SURGERY_TYPE: SurgeryTypeArray.indexOf(ob.SURGERY_TYPE)
                        }
                        cacheData.push(outputObj)
                    }
                })

                cacheData = cacheData.filter((d: any) => d);
                console.log("HGB data done")

                setHemoData(cacheData)
                store.configStore.dataLoading = false;
            }).catch((error) => {
                store.configStore.dataLoadingFailed = true;
                store.configStore.dataLoading = false;
            })
    }

    return <Dashboard hemoData={hemoData} />
}

export default observer(App)
