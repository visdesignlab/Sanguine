import React, { FC, useCallback } from "react";
import Store from "../../Interfaces/Store";
import { inject, observer } from "mobx-react";
import { CostCompareChartDataPoint } from "../../Interfaces/ApplicationState";
// import { Popup } from "semantic-ui-react";
// import { actions } from "../..";
import { format, scaleLinear, sum } from "d3";
import { barChartValuesOptions, colorProfile } from "../../PresetsProfile";
import { Popup } from "semantic-ui-react";

interface OwnProps {
    dataPoint: CostCompareChartDataPoint;
    // aggregatedBy: string;
    howToTransform: string;
    store?: Store;
    valueScaleDomain: string;
    valueScaleRange: string
    bandwidth: number;
    costMode: boolean
}

export type Props = OwnProps;

const SingleCompareBars: FC<Props> = ({ howToTransform, dataPoint, bandwidth, costMode, valueScaleDomain, valueScaleRange, store }: Props) => {
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
        outputElements = dataPoint.dataArray.map((point, index) => {
            return (
                <Popup content={`${barChartValuesOptions[index].key}: ${costMode ? format("$.2f")(point) : format(".4r")(point)}`}
                    key={dataPoint.aggregateAttribute + '-without' + point}
                    trigger={
                        <rect
                            x={valueScale()(sum(dataPoint.dataArray.slice(0, index)))}
                            transform={howToTransform + `translate(0,${0.5 * bandwidth})`}
                            height={bandwidth * 0.5}
                            width={valueScale()(point) - valueScale()(0)}
                            fill={colorProfile[index]}
                        />} />)
        })
        outputElements = outputElements.concat(dataPoint.withInterDataArray.map((point, index) => {
            return (
                <Popup content={`${barChartValuesOptions[index].key}: ${costMode ? format("$.2f")(point) : format(".4r")(point)}`}
                    key={dataPoint.aggregateAttribute + '-with' + point}
                    trigger={
                        <rect
                            x={valueScale()(sum(dataPoint.withInterDataArray.slice(0, index)))}
                            transform={howToTransform}
                            height={bandwidth * 0.5}
                            width={valueScale()(point) - valueScale()(0)}
                            fill={colorProfile[index]}
                        />} />)
        }))
        if (costMode) {
            const costSaved = dataPoint.cellSalvageVolume * 0.004 * BloodProductCost.PRBC_UNITS - dataPoint.dataArray[4]
            const altCostSaved = dataPoint.withInterCellSalvageVolume * 0.004 * BloodProductCost.PRBC_UNITS - dataPoint.withInterDataArray[4]
            outputElements.push(<Popup content={`Potential Saving per case $${format("$.2f")(costSaved)}`}
                key={dataPoint.aggregateAttribute + 'withoutCELL_SAVING'}
                trigger={
                    <rect x={valueScale()(-costSaved)}
                        transform={howToTransform + `translate(0,${0.5 * bandwidth})`}
                        height={bandwidth * 0.5}
                        width={valueScale()(0) - valueScale()(-costSaved)}
                        fill="#f5f500"
                    />

                }
            />)
            outputElements.push(<Popup content={`Potential Saving per case $${format("$.2f")(altCostSaved)}`}
                key={dataPoint.aggregateAttribute + 'withCELL_SAVING'}
                trigger={
                    <rect x={valueScale()(-altCostSaved)}
                        transform={howToTransform}
                        height={bandwidth * 0.5}
                        width={valueScale()(0) - valueScale()(-altCostSaved)}
                        fill="#f5f500"
                    />
                }
            />)


        }
        return outputElements
    }
    return (
        <>
            {generateStackedBars()}
        </>)

}

export default inject("store")(observer(SingleCompareBars));
