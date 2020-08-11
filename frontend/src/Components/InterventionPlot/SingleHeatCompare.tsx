import React, { FC, useCallback } from "react";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import { ComparisonDataPoint } from "../../Interfaces/ApplicationState";
import { scaleLinear, interpolateReds, scaleBand, interpolateGreys, format } from "d3";
import { highlight_orange, basic_gray, greyScaleRange } from "../../PresetsProfile";
import { Popup } from "semantic-ui-react";
import { actions } from "../..";

interface OwnProps {
    dataPoint: ComparisonDataPoint;
    isSelected: boolean;
    aggregatedBy: string;
    isFiltered: boolean;
    howToTransform: string;
    store?: Store;
    // valueScale: ScaleBand<any>;
    valueScaleDomain: string;
    valueScaleRange: string;
    bandwidth: number;
}

export type Props = OwnProps;

const SingleHeatCompare: FC<Props> = ({ howToTransform, dataPoint, bandwidth, aggregatedBy, isSelected, valueScaleDomain, valueScaleRange, store, isFiltered }: Props) => {

    const { showZero } = store!;
    const colorScale = scaleLinear().domain([0, 1]).range([0.1, 1])
    const greyScale = scaleLinear().domain([0, 1]).range(greyScaleRange)

    const valueScale = useCallback(() => {
        const valueScale = scaleBand().domain(JSON.parse(valueScaleDomain)).range(JSON.parse(valueScaleRange)).paddingInner(0.01);
        return valueScale
    }, [valueScaleDomain, valueScaleRange])

    return (
        <>

            {valueScale().domain().map(point => {
                const preOutput = dataPoint.preCountDict[point].length;

                const postOutput = dataPoint.postCountDict[point].length;

                const preCaseCount = showZero ? dataPoint.preCaseCount : dataPoint.preCaseCount - dataPoint.preZeroCaseNum;
                const postCaseCount = showZero ? dataPoint.postCaseCount : dataPoint.postCaseCount - dataPoint.postZeroCaseNum;

                let preFill = preOutput === 0 ? "white" : interpolateReds(colorScale(preOutput / preCaseCount))
                let postFill = postOutput === 0 ? "white" : interpolateReds(colorScale(postOutput / postCaseCount))
                if (!showZero && point as any === 0) {
                    preFill = preOutput === 0 ? "white" : interpolateGreys(greyScale(preOutput / dataPoint.preCaseCount));
                    postFill = postOutput === 0 ? "white" : interpolateGreys(greyScale(postOutput / dataPoint.postCaseCount))
                }

                return (
                    [<Popup content={format(".0%")(preOutput / dataPoint.preCaseCount)}
                        key={`Pre${dataPoint.aggregateAttribute} - ${point}`}
                        trigger={
                            <HeatRect
                                fill={preFill}
                                x={valueScale()(point)}
                                y={0}
                                transform={howToTransform}
                                width={valueScale().bandwidth()}
                                height={bandwidth * 0.5}
                                isselected={isSelected}
                                isfiltered={isFiltered}
                                onClick={(e) => {

                                    actions.updateBrushPatientGroup(dataPoint.preCountDict[point], e.shiftKey ? "ADD" : "REPLACE", {
                                        setName: aggregatedBy,
                                        setValues: [dataPoint.aggregateAttribute],
                                        //   setPatientIds: [dataPoint.prePatienIDList.concat(dataPoint.postPatienIDList)]
                                    })

                                }} />}
                    />, <Popup content={format(".0%")(postOutput / dataPoint.postCaseCount)}
                        key={`Post${dataPoint.aggregateAttribute} - ${point}`}
                        trigger={
                            <HeatRect
                                fill={postFill}
                                x={valueScale()(point)}
                                y={bandwidth * 0.5}
                                transform={howToTransform}
                                width={valueScale().bandwidth()}
                                height={bandwidth * 0.5}
                                isselected={isSelected}
                                isfiltered={isFiltered}
                                onClick={(e) => {
                                    actions.updateBrushPatientGroup(dataPoint.postCountDict[point], e.shiftKey ? "ADD" : "REPLACE", {
                                        setName: aggregatedBy,
                                        setValues: [dataPoint.aggregateAttribute],
                                        //   setPatientIds: [dataPoint.prePatienIDList.concat(dataPoint.postPatienIDList)]
                                    })

                                }} />}
                    />,
                    <line
                        transform={howToTransform}
                        strokeWidth={0.5}
                        stroke={basic_gray}
                        opacity={preOutput === 0 ? 1 : 0}
                        y1={0.25 * bandwidth}
                        y2={0.25 * bandwidth}
                        x1={valueScale()(point)! + 0.35 * valueScale().bandwidth()}
                        x2={valueScale()(point)! + 0.65 * valueScale().bandwidth()} />,
                    <line
                        transform={howToTransform}
                        strokeWidth={0.5}
                        stroke={basic_gray}
                        opacity={postOutput === 0 ? 1 : 0}
                        y1={0.75 * bandwidth}
                        y2={0.75 * bandwidth}
                        x1={valueScale()(point)! + 0.35 * valueScale().bandwidth()}
                        x2={valueScale()(point)! + 0.65 * valueScale().bandwidth()} />]
                )
            })},
            <line transform={howToTransform} x1={valueScale().range()[0]} x2={valueScale().range()[1]} y1={bandwidth * 0.5} y2={bandwidth * 0.5}
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
    stroke: ${props => (props.isselected ? highlight_orange : "none")};
    stroke - width: 3;
`;
