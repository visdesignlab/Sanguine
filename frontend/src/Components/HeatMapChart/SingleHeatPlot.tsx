import React, { FC, useEffect } from "react";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import { HeatMapDataPoint } from "../../Interfaces/ApplicationState";
// import { Popup } from "semantic-ui-react";
// import { actions } from "../..";
import { ScaleLinear, ScaleOrdinal, ScaleBand, scaleLinear, interpolateReds } from "d3";
import { highlight_color, basic_gray, blood_red } from "../../ColorProfile";
import { Popup } from "semantic-ui-react";

interface OwnProps {
    dataPoint: HeatMapDataPoint;
    isSelected: boolean;
    aggregatedBy: string;
    howToTransform: string;
    store?: Store;
    valueScale: ScaleBand<any>;
    bandwidth: number;
}

export type Props = OwnProps;

const SingleHeatPlot: FC<Props> = ({ howToTransform, dataPoint, bandwidth, aggregatedBy, isSelected, valueScale, store }: Props) => {
    const colorScale = scaleLinear().domain([0, 1]).range([0, 1])
    console.log(dataPoint)
    return (
        <>
            {valueScale.domain().map(point => {
                const output = dataPoint.countDict[point] ? dataPoint.countDict[point] : 0

                return (
                    <Popup content={output} key={dataPoint.aggregateAttribute + '-' + point} trigger={<HeatRect fill={interpolateReds(colorScale(output / dataPoint.caseCount))} x={valueScale(point)} transform={howToTransform}
                        width={valueScale.bandwidth()} height={bandwidth} />} />
                )
            })}
        </>)

}

export default inject("store")(observer(SingleHeatPlot));



const HeatRect = styled(`rect`)`
    y:0;
    opacity:0.6
  `;
