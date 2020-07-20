import React, { FC, useEffect, useState } from 'react';
import Store from './Interfaces/Store'
import { inject, observer } from 'mobx-react';
import Dashboard from './Dashboard';
import { BrowserRouter, Switch, Route } from 'react-router-dom'
import { timeFormat, timeParse } from 'd3';

import Login from './LogIn'
import Preview from './Preview';

interface OwnProps {
  store?: Store;
}

type Props = OwnProps;

const App: FC<Props> = ({ store }: Props) => {


  const { isLoggedIn, previewMode } = store!
  const [hemoData, setHemoData] = useState<any>([])


  async function cacheHemoData() {
    const resHemo = await fetch("http://localhost:8000/api/hemoglobin");
    const dataHemo = await resHemo.json();
    const resultHemo = dataHemo.result;
    const resTrans = await fetch(`http://localhost:8000/api/request_transfused_units?transfusion_type=ALL_UNITS&date_range=${[timeFormat("%d-%b-%Y")(new Date(2014, 0, 1)), timeFormat("%d-%b-%Y")(new Date(2019, 11, 31))]}`)
    const dataTrans = await resTrans.json();
    const resRisk = await fetch(`http://localhost:8000/api/risk_score`);
    const dataRisk = await resRisk.json();
    let riskOutcomeDict: any = {}
    for (let obj of dataRisk) {
      riskOutcomeDict[obj.visit_no] = { DRG_WEIGHT: obj.apr_drg_weight }
    }
    const resOutcome = await fetch(`http://localhost:8000/api/patient_outcomes`);
    const dataOutcome = await resOutcome.json();
    // console.log(dataOutcome)
    for (let obj of dataOutcome) {
      riskOutcomeDict[obj.visit_no].VENT = obj.gr_than_1440_vent || 0;
      riskOutcomeDict[obj.visit_no].DEATH = obj.patient_death || 0;
      riskOutcomeDict[obj.visit_no].STROKE = obj.patient_stroke || 0;
      riskOutcomeDict[obj.visit_no].ECMO = obj.patient_ECMO || 0;
    }

    let transfused_dict = {} as any;

    let result: {
      CASE_ID: number,
      VISIT_ID: number,
      PATIENT_ID: number,
      ANESTHESIOLOGIST_ID: number,
      SURGEON_ID: number,
      YEAR: number,
      QUARTER: string,
      MONTH: string,
      DATE: number,
      PRBC_UNITS: number,
      FFP_UNITS: number,
      PLT_UNITS: number,
      CRYO_UNITS: number,
      CELL_SAVER_ML: number,
      HEMO: number[],
      DRG_WEIGHT: number,
      VENT: number,
      DEATH: number,
      STROKE: number,
      ECMO: number
    }[] = [];


    dataTrans.forEach((element: any) => {
      transfused_dict[element.case_id] = {
        PRBC_UNITS: element.transfused_units[0] || 0,
        FFP_UNITS: element.transfused_units[1] || 0,
        PLT_UNITS: element.transfused_units[2] || 0,
        CRYO_UNITS: element.transfused_units[3] || 0,
        CELL_SAVER_ML: element.transfused_units[4] || 0
      };
    });


    resultHemo.map((ob: any, index: number) => {
      if (transfused_dict[ob.CASE_ID]) {
        const transfusedResult = transfused_dict[ob.CASE_ID];
        result.push({
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
          HEMO: ob.HEMO,
          QUARTER: ob.QUARTER,
          MONTH: ob.MONTH,
          DATE: timeParse("%Y-%m-%dT%H:%M:%S")(ob.DATE)!.getTime(),
          VENT: riskOutcomeDict[ob.VISIT_ID].VENT.toString(),
          DRG_WEIGHT: riskOutcomeDict[ob.VISIT_ID].DRG_WEIGHT,
          DEATH: riskOutcomeDict[ob.VISIT_ID].DEATH.toString(),
          ECMO: riskOutcomeDict[ob.VISIT_ID].ECMO.toString(),
          STROKE: riskOutcomeDict[ob.VISIT_ID].STROKE.toString()
        })
      }
    })

    result = result.filter((d: any) => d);
    console.log("hemo data done")
    console.log(result)
    setHemoData(result)
    store!.loadingModalOpen = false;

  }

  useEffect(() => {
    cacheHemoData();
  }, []);
  return (
    <BrowserRouter>
      <Switch>
        {/* <Route exact path='/' component={Home} /> */}

        <Route exact path='/dashboard' render={() => {
          // if (isLoggedIn) return <Dashboard />
          // else return <Redirect to="/" />
          if (previewMode) {
            return <Preview hemoData={hemoData} />
          }
          else {
            return <Dashboard hemoData={hemoData} />
          }
        }} />
        <Route path='/' component={Login} />

      </Switch></BrowserRouter>
    // <Login />
    // <Dashboard hemoData={hemoData} />
  );
}

export default inject('store')(observer(App));
