import React, { FC, useEffect, useState } from 'react';
import Store from './Interfaces/Store'
import { inject, observer } from 'mobx-react';
import Dashboard from './Dashboard';
import { timeFormat, timeParse } from 'd3';

import Login from './LogIn'
import Preview from './Preview';
import { SingleCasePoint, defaultState } from './Interfaces/ApplicationState';
import { surgeryTypeArray } from './PresetsProfile';
import { useIdleTimer } from 'react-idle-timer';
import { whoamiAPICall } from './HelperFunctions';

interface OwnProps {
    store?: Store;
}

type Props = OwnProps;

const App: FC<Props> = ({ store }: Props) => {


    const { isLoggedIn, previewMode } = store!
    const [hemoData, setHemoData] = useState<any>([])


    const handleOnIdle = (event: any) => {
        // On idle log the user out
        window.location.replace(`${process.env.REACT_APP_QUERY_URL}accounts/logout`);
    }

    const handleOnAction = (event: any) => {
        whoamiAPICall()
    }

    const { getRemainingTime, getLastActiveTime } = useIdleTimer({
        //the idle timer setting
        timeout: 1000 * 60 * 30,
        onIdle: handleOnIdle,
        onAction: handleOnAction,
        events: ["mousedown", "keydown"],
        throttle: 1000 * 60
    })

    async function cacheHemoData() {
        if (isLoggedIn) {

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
                                SURGERY_TYPE: surgeryTypeArray.indexOf(ob.SURGERY_TYPE)
                            }
                            cacheData.push(outputObj)
                        }
                    })

                    cacheData = cacheData.filter((d: any) => d);
                    console.log("HGB data done")

                    setHemoData(cacheData)
                    store!.loadingModalOpen = false;
                }).catch((error) => {
                    store!.dataLoadingFailed = true;
                })
        }

    }




    useEffect(() => {
        cacheHemoData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoggedIn]);

    const commputeOutputRenderComponent = () => {
        // if (process.env.REACT_APP_REQUIRE_LOGIN === "true") {
        //     if (isLoggedIn) {
        //         if (previewMode) {
        //             return <Preview hemoData={hemoData} />
        //         }
        //         else {
        //             return <Dashboard hemoData={hemoData} />
        //         }
        //     }
        //     else return <Login />
        // } else {
        //     if (previewMode) {
        //         return <Preview hemoData={hemoData} />
        //     }
        //     else {
        //         return <Dashboard hemoData={hemoData} />
        //     }
        // }
        return <div>a</div>
    }


    return (


        commputeOutputRenderComponent()


    );
}

export default inject('store')(observer(App));
