import React, { FC, useEffect, useState } from "react";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import Store from "../Interfaces/Store";

//import * as LineUpJS from "lineupjsx";
import { LineUpStringColumnDesc, LineUp, LineUpCategoricalColumnDesc, LineUpColumn, LineUpNumberColumnDesc } from "lineupjsx";
import { BloodProductCap, stateUpdateWrapperUseJSON } from "../Interfaces/ApplicationState";
import { actions } from "..";

interface OwnProps {
    hemoglobinDataSet: any;
    store?: Store;
}

export type Props = OwnProps;

const LineUpWrapper: FC<Props> = ({ hemoglobinDataSet, store }: Props) => {


    const { currentSelectPatientGroup } = store!
    const [distinctCategories, setCatgories] = useState<{ surgeons: any[], anesth: any[], patient: any[] }>({ surgeons: [], anesth: [], patient: [] })
    const [caseIDReference, setCaseIDList] = useState<any>({})
    //const [caseIDArray, setCaseIDArray] = useState<number[]>([])

    useEffect(() => {
        if (hemoglobinDataSet) {
            let distinctSurgeons = new Set();
            let distinctAnesth = new Set();
            let distinctPatient = new Set();
            let caseIDArray: number[] = []
            let caseIDDict: any = {}
            hemoglobinDataSet.map((ob: any, index: number) => {
                caseIDDict[ob.CASE_ID] = index;
                distinctAnesth.add((ob.ANESTHOLOGIST_ID).toString());
                distinctSurgeons.add((ob.SURGEON_ID).toString());
                distinctPatient.add(ob.PATIENT_ID.toString());
                caseIDArray.push(ob.CASE_ID)
            })
            stateUpdateWrapperUseJSON(distinctCategories, { surgeons: (Array.from(distinctSurgeons)), anesth: Array.from(distinctAnesth), patient: Array.from(distinctPatient) }, setCatgories)
            // setCatgories()
            stateUpdateWrapperUseJSON(caseIDReference, caseIDDict, setCaseIDList)
            //  setCaseIDList(caseIDDict)
            //   stateUpdateWrapperUseJSON(caseIDArray)
            //     setCaseIDArray(caseIDArray)


        }

    }, [hemoglobinDataSet])

    const outputSelectedGroup = () => {

        const dataIndicies = currentSelectPatientGroup.map(d => caseIDReference[d])
        return dataIndicies
    }



    const generateLineUp = () => {
        if (hemoglobinDataSet) {
            // const patientId = currentSelectPatient ? currentSelectPatient.caseId : 1
            return (<LineUp data={hemoglobinDataSet} selection={outputSelectedGroup()}
                onSelectionChanged={(e: number[]) => {
                    if (e.length === 1) {

                        actions.selectPatient({
                            visitNum: hemoglobinDataSet[e[0]].VISIT_ID,
                            caseId: hemoglobinDataSet[e[0]].CASE_ID,
                            YEAR: hemoglobinDataSet[e[0]].YEAR,
                            SURGEON_ID: hemoglobinDataSet[e[0]].SURGEON_ID,
                            ANESTHOLOGIST_ID: hemoglobinDataSet[e[0]].ANESTHOLOGIST_ID,
                            patientID: hemoglobinDataSet[e[0]].PATIENT_ID,
                            DATE: hemoglobinDataSet[e[0]].DATE
                        })
                    } else {
                        const caseIDList = e.map(v => hemoglobinDataSet[v].CASE_ID)
                        actions.updateSelectedPatientGroup(caseIDList)
                    }
                }}>
                <LineUpStringColumnDesc column="CASE_ID" label="CASE_ID" /> */}
                <LineUpCategoricalColumnDesc column="PATIENT_ID" categories={distinctCategories.patient} />
                <LineUpCategoricalColumnDesc column="SURGEON_ID" categories={distinctCategories.surgeons} />
                <LineUpCategoricalColumnDesc column="ANESTHOLOGIST_ID" categories={distinctCategories.anesth} />
                <LineUpCategoricalColumnDesc column="YEAR" categories={["2014", "2015", "2016", "2017", "2018", "2019"]} />
                <LineUpStringColumnDesc column="HEMO" />
                <LineUpNumberColumnDesc column="PRBC_UNITS" domain={[0, BloodProductCap.PRBC_UNITS]} />
                <LineUpNumberColumnDesc column="FFP_UNITS" domain={[0, BloodProductCap.FFP_UNITS]} />
                <LineUpNumberColumnDesc column="PLT_UNITS" domain={[0, BloodProductCap.PLT_UNITS]} />
                <LineUpNumberColumnDesc column="CRYO_UNITS" domain={[0, BloodProductCap.CRYO_UNITS]} />
                <LineUpNumberColumnDesc column="CELL_SAVER_ML" domain={[0, BloodProductCap.CELL_SAVER_ML]} />
            </LineUp>)
        }
        ;
    }

    // return <LineUp data={hemoglobinDataSet} defaultRanking>

    //     <LineUpCategoricalColumnDesc column="SURGEON_ID" categories={distinctCategories.surgeons} />
    // </LineUp>;
    return <>{generateLineUp()}</>
}

export default inject("store")(observer(LineUpWrapper))