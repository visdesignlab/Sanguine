import React, { FC, useEffect, useMemo, useCallback } from "react";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import { ScaleBand, scaleOrdinal, range, scaleLinear, ScaleOrdinal, max, format, scaleBand } from "d3";
import { extraPairWidth } from "../../Interfaces/ApplicationState"
import { Popup } from "semantic-ui-react";

interface OwnProps {
    dataSet: any[];
    aggregationScaleDomain: string;
    aggregationScaleRange: string;
    //yMax:number;
    store?: Store;
}

export type Props = OwnProps;

const ExtraPairBar: FC<Props> = ({ dataSet, aggregationScaleDomain, aggregationScaleRange, store }: Props) => {

    const aggregationScale = useCallback(() => {
        const domain = JSON.parse(aggregationScaleDomain);
        const range = JSON.parse(aggregationScaleRange);
        const aggregationScale = scaleBand().domain(domain).range(range)
        return aggregationScale
    }, [aggregationScaleDomain, aggregationScaleRange])

    const valueScale = useCallback(() => {
        const valueScale = scaleLinear().domain([0, max(Object.values(dataSet))]).range([0, extraPairWidth.BarChart])
        return valueScale
    }, [dataSet])

    return (
        <>
            {Object.entries(dataSet).map(([val, dataVal]) => {
                return (
                    <Popup
                        content={format(".4r")(dataVal)}
                        trigger={
                            <rect
                                x={0}
                                y={aggregationScale()(val)}
                                fill={"#404040"}
                                opacity={0.8}
                                width={valueScale()(dataVal)}
                                height={aggregationScale().bandwidth()} />
                        } />



                )
            })}
        </>
    )
}

export default inject("store")(observer(ExtraPairBar));
