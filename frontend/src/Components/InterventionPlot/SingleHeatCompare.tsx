import React, { FC, useEffect } from "react";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import { InterventionDataPoint } from "../../Interfaces/ApplicationState";
// import { Popup } from "semantic-ui-react";
// import { actions } from "../..";
import { ScaleLinear, ScaleOrdinal, ScaleBand, scaleLinear, interpolateReds } from "d3";
import { highlight_orange, basic_gray, blood_red, highlight_blue } from "../../ColorProfile";
import { Popup } from "semantic-ui-react";
import { actions } from "../..";

interface OwnProps {
    dataPoint: InterventionDataPoint;
    isSelected: boolean;
    aggregatedBy: string;
    isFiltered: boolean;
    howToTransform: string;
    store?: Store;
    valueScale: ScaleBand<any>;
    bandwidth: number;
}

export type Props = OwnProps;

const SingleHeatCompare: FC<Props> = ({ howToTransform, dataPoint, bandwidth, aggregatedBy, isSelected, valueScale, store, isFiltered }: Props) => {
    const colorScale = scaleLinear().domain([0, 1]).range([0.1, 1])

    return (
        <>

            {valueScale.domain().map(point => {
                const preOutput = dataPoint.preCountDict[point] ? dataPoint.preCountDict[point] : 0;

                const postOutput = dataPoint.postCountDict[point] ? dataPoint.postCountDict[point] : 0;

                return (
                    [<Popup content={preOutput}
                        key={`Pre${dataPoint.aggregateAttribute} - ${point}`}
                        trigger={
                            <HeatRect
                                fill={preOutput === 0 ? "white" : interpolateReds(colorScale(preOutput / dataPoint.preCaseCount))}
                                x={valueScale(point)}
                                y={0}
                                transform={howToTransform}
                                width={valueScale.bandwidth()}
                                height={bandwidth * 0.5}
                                isselected={isSelected}
                                isfiltered={isFiltered}
                                onClick={(e) => {
                                    actions.selectSet(
                                        {
                                            set_name: aggregatedBy,
                                            set_value: [dataPoint.aggregateAttribute]
                                        },
                                        e.shiftKey
                                    )
                                }} />}
                    />, <Popup content={postOutput}
                        key={`Post${dataPoint.aggregateAttribute} - ${point}`}
                        trigger={
                            <HeatRect
                                fill={postOutput === 0 ? "white" : interpolateReds(colorScale(postOutput / dataPoint.postCaseCount))}
                                x={valueScale(point)}
                                y={bandwidth * 0.5}
                                transform={howToTransform}
                                width={valueScale.bandwidth()}
                                height={bandwidth * 0.5}
                                isselected={isSelected}
                                isfiltered={isFiltered}
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
                    <line transform={howToTransform} strokeWidth={0.5} stroke={basic_gray} opacity={preOutput === 0 ? 1 : 0} y1={0.25 * bandwidth} y2={0.25 * bandwidth} x1={valueScale(point)! + 0.35 * valueScale.bandwidth()} x2={valueScale(point)! + 0.65 * valueScale.bandwidth()} />,
                    <line transform={howToTransform} strokeWidth={0.5} stroke={basic_gray} opacity={postOutput === 0 ? 1 : 0} y1={0.75 * bandwidth} y2={0.75 * bandwidth} x1={valueScale(point)! + 0.35 * valueScale.bandwidth()} x2={valueScale(point)! + 0.65 * valueScale.bandwidth()} />]
                )
            })},
            <line transform={howToTransform} x1={valueScale(0)} x2={valueScale.range()[1]} y1={bandwidth * 0.5} y2={bandwidth * 0.5}
                stroke="white" />
        </>)

}

export default inject("store")(observer(SingleHeatCompare));

interface HeatRectProp {
    isselected: boolean;
    isfiltered: boolean;
}

const HeatRect = styled(`rect`) <HeatRectProp>`
    
    opacity:0.6;
    stroke: ${props => (props.isselected ? highlight_blue : (props.isfiltered ? highlight_orange : "none"))};
    stroke-width:3;
  `;
