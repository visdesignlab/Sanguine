import React, { FC, useEffect, useState } from 'react';
import Store from './Interfaces/Store'
import { inject, observer } from 'mobx-react';
import Dashboard from './Dashboard';
import { BrowserRouter, Switch, Route, Redirect } from 'react-router-dom'
import { timeFormat, timeParse } from 'd3';

import Login from './LogIn'
import Preview from './Preview';
import { SingleCasePoint } from './Interfaces/ApplicationState';

interface OwnProps {
    store?: Store;
}

type Props = OwnProps;

const App: FC<Props> = ({ store }: Props) => {


    const { isLoggedIn, previewMode } = store!
    const [hemoData, setHemoData] = useState<any>([])




    async function cacheHemoData() {
        const resHemo = await fetch(`${process.env.REACT_APP_QUERY_URL}hemoglobin`);
        const dataHemo = await resHemo.json();
        const resultHemo = dataHemo.result;
        const resTrans = await fetch(`${process.env.REACT_APP_QUERY_URL}request_transfused_units?transfusion_type=ALL_UNITS&date_range=${[timeFormat("%d-%b-%Y")(new Date(2014, 0, 1)), timeFormat("%d-%b-%Y")(new Date(2019, 11, 31))]}`)
        const dataTrans = await resTrans.json();
        const resRisk = await fetch(`${process.env.REACT_APP_QUERY_URL}risk_score`);
        const dataRisk = await resRisk.json();
        let riskOutcomeDict: any = {}
        for (let obj of dataRisk) {
            riskOutcomeDict[obj.visit_no] = { DRG_WEIGHT: obj.apr_drg_weight }
        }
        const resOutcome = await fetch(`${process.env.REACT_APP_QUERY_URL}patient_outcomes`);
        const dataOutcome = await resOutcome.json();
        // console.log(dataOutcome)
        for (let obj of dataOutcome) {
            riskOutcomeDict[obj.visit_no].VENT = obj.gr_than_1440_vent || 0;
            riskOutcomeDict[obj.visit_no].DEATH = obj.patient_death || 0;
            riskOutcomeDict[obj.visit_no].STROKE = obj.patient_stroke || 0;
            riskOutcomeDict[obj.visit_no].ECMO = obj.patient_ECMO || 0;
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
                    VENT: riskOutcomeDict[ob.VISIT_ID].VENT.toString(),
                    DRG_WEIGHT: riskOutcomeDict[ob.VISIT_ID].DRG_WEIGHT || 0,
                    DEATH: riskOutcomeDict[ob.VISIT_ID].DEATH.toString(),
                    ECMO: riskOutcomeDict[ob.VISIT_ID].ECMO.toString(),
                    STROKE: riskOutcomeDict[ob.VISIT_ID].STROKE.toString()
                }
                cacheData.push(outputObj)
            }
        })

        cacheData = cacheData.filter((d: any) => d);
        console.log("HGB data done")
        console.log(cacheData)
        setHemoData(cacheData)
        store!.loadingModalOpen = false;

    }

    useEffect(() => {
        cacheHemoData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return (
        <BrowserRouter>
            <Switch>
                {/* <Route exact path='/' component={Home} /> */}

                <Route exact path='/dashboard' render={() => {
                    // if (isLoggedIn) return <Dashboard />
                    // else return <Redirect to="/" />



                    if (process.env.REACT_APP_REQUIRE_LOGIN === "true") {
                        if (isLoggedIn) {
                            if (previewMode) {
                                return <Preview hemoData={hemoData} />
                            }
                            else {
                                return <Dashboard hemoData={hemoData} />
                            }
                        }
                        else return <Redirect to="/" />
                    } else {
                        if (previewMode) {
                            return <Preview hemoData={hemoData} />
                        }
                        else {
                            return <Dashboard hemoData={hemoData} />
                        }
                    }

                }
                } />
                <Route path='/' component={Login} />

            </Switch></BrowserRouter>
        // <Login />
        // <Dashboard hemoData={hemoData} />
    );
}

export default inject('store')(observer(App));
