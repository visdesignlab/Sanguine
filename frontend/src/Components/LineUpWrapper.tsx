import React, { FC, useEffect, useState } from "react";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import Store from "../Interfaces/Store";

//import * as LineUpJS from "lineupjsx";
import { LineUpStringColumnDesc, LineUp, LineUpCategoricalColumnDesc, LineUpColumn, LineUpNumberColumnDesc } from "lineupjsx";
import { BloodProductCap } from "../Interfaces/ApplicationState";

interface OwnProps { store?: Store; }

export type Props = OwnProps;

const LineUpWrapper: FC<Props> = ({ store }: Props) => {

    const {
        hemoglobinDataSet
    } = store!;

    const [distinctCategories, setCatgories] = useState<{ surgeons: any[], anesth: any[], patient: any[] }>({ surgeons: [], anesth: [], patient: [] })

    useEffect(() => {
        if (hemoglobinDataSet) {
            let distinctSurgeons = new Set();
            let distinctAnesth = new Set();
            let distinctPatient = new Set();
            hemoglobinDataSet.map((ob: any) => {
                distinctAnesth.add((ob.ANESTHOLOGIST_ID).toString());
                distinctSurgeons.add((ob.SURGEON_ID).toString());
                distinctPatient.add(ob.PATIENT_ID.toString());
            })
            setCatgories({ surgeons: (Array.from(distinctSurgeons)), anesth: Array.from(distinctAnesth), patient: Array.from(distinctPatient) })

        }

    }, [hemoglobinDataSet])


    const something = () => {
        console.log(hemoglobinDataSet)
        if (hemoglobinDataSet) {
            return (<LineUp data={hemoglobinDataSet}>
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
    return <>{something()}</>
}

export default inject("store")(observer(LineUpWrapper))