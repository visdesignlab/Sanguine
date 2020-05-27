import React, { FC, useEffect, useCallback } from "react";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import { HeatMapDataPoint } from "../../Interfaces/ApplicationState";
// import { Popup } from "semantic-ui-react";
// import { actions } from "../..";
import { ScaleLinear, ScaleOrdinal, ScaleBand, scaleLinear, interpolateReds, scaleBand, interpolateGreys } from "d3";
import { highlight_orange, basic_gray, blood_red, highlight_blue } from "../../ColorProfile";
import { Popup } from "semantic-ui-react";
import { actions } from "../..";

interface OwnProps {
    dataPoint: HeatMapDataPoint;
    isSelected: boolean;
    aggregatedBy: string;
    isFiltered: boolean;
    howToTransform: string;
    store?: Store;
    // valueScale: ScaleBand<any>;
    valueScaleDomain: string;
    valueScaleRange: string
    bandwidth: number;
    //  zeroMax: number;
}

export type Props = OwnProps;

const SingleHeatPlot: FC<Props> = ({ howToTransform, dataPoint, bandwidth, aggregatedBy, isSelected, valueScaleDomain, valueScaleRange, store, isFiltered }: Props) => {
    const { showZero } = store!;
    const colorScale = scaleLinear().domain([0, 1]).range([0.1, 1]);

    const valueScale = useCallback(() => {
        const domain = JSON.parse(valueScaleDomain);
        const range = JSON.parse(valueScaleRange);
        let valueScale = scaleBand()
            .domain(domain)
            .range(range)
            .paddingInner(0.01);
        return valueScale
    }, [valueScaleDomain, valueScaleRange])

    return (
        <>
            {valueScale().domain().map(point => {
                const output = dataPoint.countDict[point] ? dataPoint.countDict[point] : 0
                const caseCount = showZero ? dataPoint.caseCount : dataPoint.caseCount - dataPoint.zeroCaseNum
                let colorFill = output === 0 ? "white" : interpolateReds(colorScale(output / caseCount))
                if (!showZero && point as any === 0) {
                    colorFill = output === 0 ? "white" : interpolateGreys(colorScale(output / (dataPoint.caseCount)))
                }

                return (
                    [<Popup content={output}
                        key={dataPoint.aggregateAttribute + '-' + point}
                        trigger={
                            <HeatRect
                                fill={colorFill}
                                x={valueScale()(point)}
                                transform={howToTransform}
                                width={valueScale().bandwidth()}
                                height={bandwidth}
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
                    <line transform={howToTransform}
                        strokeWidth={0.5}
                        stroke={basic_gray}
                        opacity={output === 0 ? 1 : 0}
                        y1={0.5 * bandwidth}
                        y2={0.5 * bandwidth}
                        x1={valueScale()(point)! + 0.35 * valueScale().bandwidth()}
                        x2={valueScale()(point)! + 0.65 * valueScale().bandwidth()} />]
                )
            })}
        </>)

}

export default inject("store")(observer(SingleHeatPlot));

interface HeatRectProp {
    isselected: boolean;
    isfiltered: boolean;
}

const HeatRect = styled(`rect`) <HeatRectProp>`
    y:0;
    opacity:0.6;
    stroke: ${props => (props.isselected ? highlight_blue : (props.isfiltered ? highlight_orange : "none"))};
    stroke-width:3;
  `;
