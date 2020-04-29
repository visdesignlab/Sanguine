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
import { actions } from "../..";

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
    const colorScale = scaleLinear().domain([0, 1]).range([0.1, 1])

    return (
        <>
            {valueScale.domain().map(point => {
                const output = dataPoint.countDict[point] ? dataPoint.countDict[point] : 0

                return (
                    [<Popup content={output}
                        key={dataPoint.aggregateAttribute + '-' + point}
                        trigger={
                            <HeatRect
                                fill={output === 0 ? "white" : interpolateReds(colorScale(output / dataPoint.caseCount))}
                                x={valueScale(point)}
                                transform={howToTransform}
                                width={valueScale.bandwidth()}
                                height={bandwidth}
                                onClick={(e) => {
                                    actions.selectSet(
                                        {
                                            set_name: aggregatedBy,
                                            set_value: [dataPoint.aggregateAttribute]
                                        },
                                        e.shiftKey
                                    )
                                }} />}
                    />,
                    <line transform={howToTransform} strokeWidth={0.5} stroke={basic_gray} opacity={output === 0 ? 1 : 0} y1={0.5 * bandwidth} y2={0.5 * bandwidth} x1={valueScale(point)! + 0.35 * valueScale.bandwidth()} x2={valueScale(point)! + 0.65 * valueScale.bandwidth()} />]
                )
            })}
        </>)

}

export default inject("store")(observer(SingleHeatPlot));



const HeatRect = styled(`rect`)`
    y:0;
    opacity:0.6
  `;
