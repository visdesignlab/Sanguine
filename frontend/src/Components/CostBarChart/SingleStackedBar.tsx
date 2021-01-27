import React, { FC, useCallback } from "react";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import { BarChartDataPoint, CostBarChartDataPoint } from "../../Interfaces/ApplicationState";
// import { Popup } from "semantic-ui-react";
// import { actions } from "../..";
import { format, scaleLinear, ScaleLinear, schemeAccent, sum } from "d3";
import { highlight_orange, basic_gray, barChartValuesOptions } from "../../PresetsProfile";
import { data } from "jquery";
import { Popup } from "semantic-ui-react";

interface OwnProps {
    dataPoint: CostBarChartDataPoint;
    aggregatedBy: string;
    howToTransform: string;
    store?: Store;
    valueScaleDomain: string;
    valueScaleRange: string
    bandwidth: number;
}

export type Props = OwnProps;

const SingleStackedBar: FC<Props> = ({ howToTransform, dataPoint, bandwidth, aggregatedBy, valueScaleDomain, valueScaleRange, store }: Props) => {

    const valueScale = useCallback(() => {
        const domain = JSON.parse(valueScaleDomain);
        const range = JSON.parse(valueScaleRange);
        let valueScale = scaleLinear()
            .domain(domain)
            .range(range)
        return valueScale
    }, [valueScaleDomain, valueScaleRange])
    return (
        <>
            {dataPoint.dataArray.map((point, index) => {
                return (
                    <Popup content={`${barChartValuesOptions[index].key}: ${format("$.2f")(point)}`}
                        key={dataPoint.aggregateAttribute + '-' + point}
                        trigger={
                            <rect
                                x={valueScale()(sum(dataPoint.dataArray.slice(0, index)))}
                                transform={howToTransform}
                                height={bandwidth}
                                width={valueScale()(point) - valueScale()(0)}
                                fill={schemeAccent[index]}
                            />} />)
            })}
        </>)

    // <Popup
    //     content={dataPoint.totalVal}
    //     key={dataPoint.aggregateAttribute}
    //     trigger={

    //   <ViolinLine
    //     d={path}
    //     onClick={() => {
    //       actions.selectSet({
    //         setName: aggregatedBy,
    //         setValues: dataPoint.aggregateAttribute
    //       });
    //     }}
    //     isselected={isSelected}
    //     transform={howToTransform}
    //   />

    //     }
    //   />

}

export default inject("store")(observer(SingleStackedBar));
