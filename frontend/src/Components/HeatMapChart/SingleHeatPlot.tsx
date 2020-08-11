import React, { FC, useCallback } from "react";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import { HeatMapDataPoint } from "../../Interfaces/ApplicationState";
import { scaleLinear, interpolateReds, scaleBand, interpolateGreys, format } from "d3";
import { highlight_orange, basic_gray, greyScaleRange } from "../../PresetsProfile";
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
    //  isSinglePatientSelect: boolean;
    //  zeroMax: number;
}

export type Props = OwnProps;

const SingleHeatPlot: FC<Props> = ({ howToTransform, dataPoint, bandwidth, aggregatedBy, isSelected, valueScaleDomain, valueScaleRange, store, isFiltered }: Props) => {
    const { showZero } = store!;
    const colorScale = scaleLinear().domain([0, 1]).range([0.1, 1]);
    const greyScale = scaleLinear().domain([0, 1]).range(greyScaleRange)

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
                const output = dataPoint.countDict[point].length
                const caseCount = showZero ? dataPoint.caseCount : dataPoint.caseCount - dataPoint.zeroCaseNum
                // let content = output/caseCount
                let colorFill = output === 0 ? "white" : interpolateReds(colorScale(output / caseCount))
                if (!showZero && point as any === 0) {
                    colorFill = output === 0 ? "white" : interpolateGreys(greyScale(output / (dataPoint.caseCount)))
                    /// content = output/dataPoint.caseCount
                }

                return (
                    [<Popup content={format(".0%")(output / dataPoint.caseCount)}
                        key={dataPoint.aggregateAttribute + '-' + point}
                        trigger={
                            <HeatRect
                                fill={colorFill}
                                x={valueScale()(point)}
                                transform={howToTransform}
                                width={valueScale().bandwidth()}
                                height={bandwidth}
                                isselected={isSelected}
                                //   isfiltered={isFiltered}
                                onClick={(e) => {
                                    actions.updateBrushPatientGroup(dataPoint.countDict[point], e.shiftKey ? "ADD" : "REPLACE", {
                                        setName: aggregatedBy,
                                        setValues: [dataPoint.aggregateAttribute],
                                        //setPatientIds: [dataPoint.patientIDList]
                                    })

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
    //   isfiltered: boolean;
}
//(props.isfiltered ? highlight_blue : "none"))}
const HeatRect = styled(`rect`) <HeatRectProp>`
    y:0;
    opacity:0.6;
    stroke: ${props => (props.isselected ? highlight_orange : `none`)};
    stroke-width:2;
  `;
