import React, { FC, useEffect, useState, useRef, useMemo } from "react";
import { inject, observer } from "mobx-react";
import Store from "./Interfaces/Store";

//import * as LineUpJS from "lineupjsx";
// import { LineUpStringColumnDesc, LineUp, LineUpCategoricalColumnDesc, LineUpNumberColumnDesc } from "lineupjsx";
import * as LineUpJS from "lineupjs"
import "lineupjs/build/LineUpJS.css";
import $ from 'jquery';

import { BloodProductCap } from "./PresetsProfile";
import { actions } from ".";
import { stateUpdateWrapperUseJSON } from "./HelperFunctions";

interface OwnProps {
    hemoglobinDataSet: any;
    store?: Store;
}

export type Props = OwnProps;

const LineUpWrapper: FC<Props> = ({ hemoglobinDataSet, store }: Props) => {


    // const lineupvariable = LineUpJS.builder
    const { currentSelectPatientGroup } = store!
    const [distinctCategories, setCatgories] = useState<{ surgeons: any[], anesth: any[], patient: any[] }>({ surgeons: [], anesth: [], patient: [] })
    const [caseIDReference, setCaseIDList] = useState<any>({})
    const [convertedData, setConvertedData] = useState<any[]>([])
    const [caseIDArray, setCaseIDArray] = useState<number[]>([])

    useEffect(() => {

        if (hemoglobinDataSet) {
            let distinctSurgeons = new Set();
            let distinctAnesth = new Set();
            let distinctPatient = new Set();
            let caseIDArray: number[] = []
            let caseIDDict: any = {}
            let tempData: any[] = []
            hemoglobinDataSet.map((ob: any, index: number) => {
                caseIDDict[ob.CASE_ID] = index;
                caseIDArray.push(ob.CASE_ID);
                distinctAnesth.add((ob.ANESTHESIOLOGIST_ID).toString());
                distinctSurgeons.add((ob.SURGEON_ID).toString());
                distinctPatient.add(ob.PATIENT_ID.toString());
                caseIDArray.push(ob.CASE_ID)
                let oldObject = ob;
                oldObject.DATE = new Date(oldObject.DATE)
                tempData.push(oldObject);
            })
            stateUpdateWrapperUseJSON(distinctCategories, { surgeons: (Array.from(distinctSurgeons)), anesth: Array.from(distinctAnesth), patient: Array.from(distinctPatient) }, setCatgories)
            stateUpdateWrapperUseJSON(caseIDReference, caseIDDict, setCaseIDList)
            stateUpdateWrapperUseJSON(convertedData, tempData, setConvertedData)
        }
    }, [hemoglobinDataSet])

    //TODO make the line up side bar on the main instead of on a seperate tab. 
    //


    const lineup = useMemo(() => {

        $(document).ready(function () {
            const node = document.getElementById("lineup-wrapper")
            if (node && convertedData.length > 0 && distinctCategories.surgeons.length > 0) {
                if (!(node.getElementsByClassName("lu-side-panel").length > 0)) {
                    let lineup = LineUpJS.builder(convertedData)
                        .column(LineUpJS.buildStringColumn("CASE_ID"))
                        .column(LineUpJS.buildStringColumn("PATIENT_ID"))

                        .column(LineUpJS.buildCategoricalColumn('VENT').categories(["0", "1"]))
                        .column(LineUpJS.buildCategoricalColumn("DEATH").categories(["0", "1"]))
                        .column(LineUpJS.buildCategoricalColumn('ECMO').categories(["0", "1"]))
                        .column(LineUpJS.buildCategoricalColumn("STROKE").categories(["0", "1"]))
                        .column(LineUpJS.buildDateColumn("DATE"))
                        .column(LineUpJS.buildNumberColumn("DRG_WEIGHT", [0, 30]))
                        .column(LineUpJS.buildNumberColumn("PREOP_HGB", [0, 18]))
                        .column(LineUpJS.buildNumberColumn("POSTOP_HGB", [0, 18]))
                        .column(LineUpJS.buildCategoricalColumn("YEAR").categories(["2014", "2015", "2016", "2017", "2018", "2019"]))
                        .column(LineUpJS.buildCategoricalColumn("ANESTHESIOLOGIST_ID").categories(distinctCategories.anesth))
                        .column(LineUpJS.buildCategoricalColumn("SURGEON_ID").categories(distinctCategories.surgeons))
                        .column(LineUpJS.buildNumberColumn("PRBC_UNITS", [0, BloodProductCap.PRBC_UNITS]))
                        .column(LineUpJS.buildNumberColumn("FFP_UNITS", [0, BloodProductCap.FFP_UNITS]))
                        .column(LineUpJS.buildNumberColumn("PLT_UNITS", [0, BloodProductCap.PLT_UNITS]))
                        .column(LineUpJS.buildNumberColumn("CRYO_UNITS", [0, BloodProductCap.CRYO_UNITS]))
                        .column(LineUpJS.buildNumberColumn("CELL_SAVER_ML", [0, BloodProductCap.CELL_SAVER_ML]))
                        .build(node);

                    lineup.data.getFirstRanking().on("filterChanged", (previous, current) => {
                        //Solution to not return the group order after the filter applied. a Time Out.
                        setTimeout(() => {
                            const filter_output = lineup.data.getFirstRanking().getGroups()[0].order

                            const caseIDList = filter_output.map(v => convertedData[v].CASE_ID)
                            actions.updateSelectedPatientGroup(caseIDList)
                            console.log(caseIDList)
                        }, 1000)
                        // console.log(previous, current); // filter settings
                        // console.log(lineup.data.getFirstRanking().getGroups())
                        // console.log(lineup.data); // DataProvider
                        // console.log(lineup.data.getFirstRanking()); // First ranking

                        // setTimeout(() => { console.log(lineup.data.getFirstRanking().getGroups()) }, 2000)
                    });
                    return lineup;
                }
            }
        })

    }, [distinctCategories, convertedData])

    //line 114 is denying the loop
    //Lineup is never defined somehow.
    useEffect(() => {
        console.log(lineup)
        if (lineup !== undefined) {
            console.log('called inside')
            let outputIndex: number[] = [];
            currentSelectPatientGroup.forEach(item => outputIndex.push(caseIDReference[item]));
            console.log(outputIndex)
            //    lineup.setSelection(outputIndex);

        }
    }, [currentSelectPatientGroup])



    return <></>
}

export default inject("store")(observer(LineUpWrapper))