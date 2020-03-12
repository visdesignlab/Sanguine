import React, { FC, useEffect, useMemo } from "react";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import { ScaleBand, scaleOrdinal, range, scaleLinear, ScaleOrdinal, max, format } from "d3";
import { extraPairWidth } from "../../Interfaces/ApplicationState"
import { Popup } from "semantic-ui-react";

interface OwnProps {
    dataSet: any[];
    aggregatedScale: ScaleBand<string>;
    //yMax:number;
    store?: Store;
}

export type Props = OwnProps;

const ExtraPairBar: FC<Props> = ({ dataSet, aggregatedScale, store }: Props) => {
    const [valueScale] = useMemo(() => {

        const valueScale = scaleLinear().domain([0, max(Object.values(dataSet))]).range([0, extraPairWidth])

        return [valueScale];
    }, [dataSet, aggregatedScale])

    return (
        <>
            {Object.entries(dataSet).map(([val, dataVal]) => {
                return (
                    <Popup
                        content={format(".4r")(dataVal)}
                        trigger={
                            <rect
                                x={0}
                                y={aggregatedScale(val)}
                                fill={"#404040"}
                                opacity={0.8}
                                width={valueScale(dataVal)}
                                height={aggregatedScale.bandwidth()} />
                        } />



                )
            })}
        </>
    )
}

export default inject("store")(observer(ExtraPairBar));
