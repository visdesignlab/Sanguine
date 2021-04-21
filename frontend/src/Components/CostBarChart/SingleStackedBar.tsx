import React, { FC, useCallback } from "react";
import Store from "../../Interfaces/Store";
import { inject, observer } from "mobx-react";
import { CostBarChartDataPoint } from "../../Interfaces/ApplicationState";
// import { Popup } from "semantic-ui-react";
// import { actions } from "../..";
import { format, scaleLinear, sum } from "d3";
import { barChartValuesOptions, colorProfile } from "../../PresetsProfile";
import { Popup } from "semantic-ui-react";

interface OwnProps {
    dataPoint: CostBarChartDataPoint;
    // aggregatedBy: string;
    howToTransform: string;
    store?: Store;
    valueScaleDomain: string;
    valueScaleRange: string
    bandwidth: number;
    costMode: boolean;
    showPotential: boolean;
}

export type Props = OwnProps;

const SingleStackedBar: FC<Props> = ({ howToTransform, dataPoint, showPotential, bandwidth, costMode, valueScaleDomain, valueScaleRange, store }: Props) => {
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
        }
        else {
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
            const potentialCost = dataPoint.cellSalvageVolume * 0.004 * BloodProductCost.PRBC_UNITS
            const cellSalvageCost = dataPoint.dataArray[4]
            outputElements.push(
                <Popup content={showPotential ? `Potential RBC Cost ${format("$.2f")(potentialCost)}` : `Cell Salvage Cost${format("$.2f")(cellSalvageCost)}`}
                    key={dataPoint.aggregateAttribute + '-' + cellSalvageCost}
                    trigger={
                        <rect
                            x={valueScale()(sum(dataPoint.dataArray.slice(0, 4)))}
                            transform={howToTransform}
                            height={bandwidth}
                            width={showPotential ? (valueScale()(potentialCost) - valueScale()(0)) : (valueScale()(cellSalvageCost) - valueScale()(0))}
                            fill={showPotential ? colorProfile[0] : colorProfile[4]}
                        />} />
            )
            const costSaved = dataPoint.cellSalvageVolume * 0.004 * BloodProductCost.PRBC_UNITS - dataPoint.dataArray[4]
            outputElements.push(
                <Popup content={`Potential Saving per case $${format("$.2f")(costSaved)}`}
                    key={dataPoint.aggregateAttribute + 'CELL_SAVING'}
                    trigger={<rect x={valueScale()(-costSaved)}
                        transform={howToTransform}
                        height={bandwidth}
                        visibility={showPotential ? "hidden" : "visible"}
                        width={valueScale()(0) - valueScale()(-costSaved)}
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

export default inject("store")(observer(SingleStackedBar));
