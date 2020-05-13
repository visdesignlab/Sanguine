import React, { FC, useEffect, useMemo } from "react";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import { ScaleBand, scaleOrdinal, range, scaleLinear, ScaleOrdinal, max, format } from "d3";
import { extraPairWidth } from "../../Interfaces/ApplicationState"
import { Popup } from "semantic-ui-react";

interface OwnProps {
    preDataSet: any[];
    postDataSet: any[];
    totalDataSet: any[];
    aggregatedScale: ScaleBand<string>;
    //yMax:number;
    store?: Store;
}

export type Props = OwnProps;

const ExtraPairBar: FC<Props> = ({ preDataSet, postDataSet, totalDataSet, aggregatedScale, store }: Props) => {
    const [valueScale] = useMemo(() => {

        const valueScale = scaleLinear().domain([0, max(Object.values(totalDataSet))]).range([0, extraPairWidth.BarChart])

        return [valueScale];
    }, [totalDataSet, aggregatedScale])



    return (
        <>

        </>
    )
}

export default inject("store")(observer(ExtraPairBar));
