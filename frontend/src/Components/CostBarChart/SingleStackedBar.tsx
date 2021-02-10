import React, { FC, useCallback } from "react";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import { BarChartDataPoint, CostBarChartDataPoint } from "../../Interfaces/ApplicationState";
// import { Popup } from "semantic-ui-react";
// import { actions } from "../..";
import { format, scaleLinear, ScaleLinear, schemeAccent, sum } from "d3";
import { highlight_orange, basic_gray, barChartValuesOptions, colorProfile, BloodProductCap } from "../../PresetsProfile";
import { data } from "jquery";
import { Popup } from "semantic-ui-react";

interface OwnProps {
    dataPoint: CostBarChartDataPoint;
    // aggregatedBy: string;
    howToTransform: string;
    store?: Store;
    valueScaleDomain: string;
    valueScaleRange: string
    bandwidth: number;
    costMode: boolean
}

export type Props = OwnProps;

const SingleStackedBar: FC<Props> = ({ howToTransform, dataPoint, bandwidth, costMode, valueScaleDomain, valueScaleRange, store }: Props) => {
    const { BloodProductCost } = store!;
    const valueScale = useCallback(() => {
        const domain = JSON.parse(valueScaleDomain);
        const range = JSON.parse(valueScaleRange);
        let valueScale = scaleLinear()
            .domain(domain)
            .range(range)
        return valueScale
    }, [valueScaleDomain, valueScaleRange])

    const generateStackedBars = () => {
        let outputElements = []
        if (!costMode) {
            outputElements = dataPoint.dataArray.map((point, index) => {
                return (
                    <Popup content={`${barChartValuesOptions[index].key}: ${costMode ? format("$.2f")(point) : format(".4r")(point)}`}
                        key={dataPoint.aggregateAttribute + '-' + point}
                        trigger={
                            <rect
                                x={valueScale()(sum(dataPoint.dataArray.slice(0, index)))}
                                transform={howToTransform}
                                height={bandwidth}
                                width={valueScale()(point) - valueScale()(0)}
                                fill={colorProfile[index]}
                            />} />)
            })
        } else {
            outputElements = dataPoint.dataArray.slice(0, 4).map((point, index) => {
                return (
                    <Popup content={`${barChartValuesOptions[index].key}: ${costMode ? format("$.2f")(point) : format(".4r")(point)}`}
                        key={dataPoint.aggregateAttribute + '-' + point}
                        trigger={
                            <rect
                                x={valueScale()(sum(dataPoint.dataArray.slice(0, index)))}
                                transform={howToTransform}
                                height={bandwidth}
                                width={valueScale()(point) - valueScale()(0)}
                                fill={colorProfile[index]}
                            />} />)
            })
            //Need adjustment on saving formula
            outputElements.push(
                <Popup content={`Potential Saving per case $${dataPoint.cellSalvageVolume / 200 * BloodProductCost.PRBC_UNITS - dataPoint.dataArray[4]}`}
                    key={dataPoint.aggregateAttribute + 'CELL_SAVING'}
                    trigger={
                        <g>
                            <rect x={valueScale()(sum(dataPoint.dataArray.slice(0, 4)))}
                                transform={howToTransform}
                                height={bandwidth}
                                width={valueScale()(dataPoint.dataArray[4]) - valueScale()(0)}
                                fill={colorProfile[4]} />
                            <rect x={valueScale()(sum(dataPoint.dataArray.slice(0, 4)))}
                                transform={howToTransform}
                                height={bandwidth}

                                width={valueScale()(dataPoint.cellSalvageVolume / 200 * BloodProductCost.PRBC_UNITS) - valueScale()(0)}
                                fill="#f5f500"
                                opacity={0.5}
                            />
                        </g>
                    }
                />

            )
        }
        return outputElements
    }
    return (
        <>
            {generateStackedBars()}
        </>)

}

export default inject("store")(observer(SingleStackedBar));
