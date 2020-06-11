import React, { FC, useEffect } from "react";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import { BarChartDataPoint } from "../../Interfaces/ApplicationState";
// import { Popup } from "semantic-ui-react";
// import { actions } from "../..";
import { ScaleLinear } from "d3";
import { highlight_orange, basic_gray } from "../../PresetsProfile";

interface OwnProps {
    dataPoint: BarChartDataPoint;
    isSelected: boolean;
    aggregatedBy: string;
    howToTransform: string;
    store?: Store;
    valueScale: ScaleLinear<number, number>
    bandwidth: number;
}

export type Props = OwnProps;

const SingleStripPlot: FC<Props> = ({ howToTransform, dataPoint, bandwidth, aggregatedBy, isSelected, valueScale, store }: Props) => {

    return (
        <>
            {dataPoint.actualDataPoints.map(point => {
                return (
                    <StripPlotCircle
                        isselected={isSelected}
                        cx={valueScale(point)}
                        cy={Math.random() * bandwidth}
                        transform={howToTransform}
                    />)
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
    //         set_name: aggregatedBy,
    //         set_value: dataPoint.aggregateAttribute
    //       });
    //     }}
    //     isselected={isSelected}
    //     transform={howToTransform}
    //   />

    //     }
    //   />

}

export default inject("store")(observer(SingleStripPlot));

interface StripPlotProp {
    isselected: boolean;
}
const StripPlotCircle = styled(`circle`) <StripPlotProp>`
    r:2px
    fill: ${props => (props.isselected ? highlight_orange : basic_gray)};
    stroke: ${props => (props.isselected ? highlight_orange : basic_gray)};
    opacity:0.6
  `;
