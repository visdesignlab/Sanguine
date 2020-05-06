import React, { FC, useEffect } from "react";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import { InterventionDataPoint } from "../../Interfaces/ApplicationState";
import { Popup } from "semantic-ui-react";
import { actions } from "../..";
import { highlight_orange, basic_gray, highlight_blue, third_gray } from "../../ColorProfile";

interface OwnProps {
    dataPoint: InterventionDataPoint;
    isSelected: boolean;
    isFiltered: boolean;
    preIntPath: string;
    postIntPath: string;
    aggregatedBy: string;
    preIntHowToTransform: string;
    postIntHowToTransform: string;
    store?: Store;
}

export type Props = OwnProps;



const SingleViolinCompare: FC<Props> = ({ postIntHowToTransform, preIntHowToTransform, isFiltered, dataPoint, aggregatedBy, isSelected, preIntPath, postIntPath }: Props) => {

    return (
        <>
            [<Popup
                content={dataPoint.totalVal}
                key={`Pre${dataPoint.aggregateAttribute}`}
                trigger={
                    <ViolinLine
                        d={preIntPath}
                        onClick={(e) => {
                            actions.selectSet(
                                {
                                    set_name: aggregatedBy,
                                    set_value: [dataPoint.aggregateAttribute]
                                },
                                e.shiftKey
                            )
                        }}

                        isselected={isSelected}
                        isfiltered={isFiltered}
                        transform={preIntHowToTransform}
                    />} />,
            <Popup
                content={dataPoint.totalVal}
                key={`Post${dataPoint.aggregateAttribute}`}
                trigger={
                    <ViolinLine
                        d={postIntPath}
                        onClick={(e) => {
                            actions.selectSet(
                                {
                                    set_name: aggregatedBy,
                                    set_value: [dataPoint.aggregateAttribute]
                                },
                                e.shiftKey
                            )
                        }}

                        isselected={isSelected}
                        isfiltered={isFiltered}
                        transform={postIntHowToTransform}
                    />}
            />]</>)
}

export default inject("store")(observer(SingleViolinCompare));

interface ViolinLineProp {
    isselected: boolean;
    isfiltered: boolean;
}
const ViolinLine = styled(`path`) <ViolinLineProp>`
    stroke:${props => (props.isselected ? highlight_blue : (props.isfiltered ? highlight_orange : third_gray))};
    fill: ${props => (props.isselected ? highlight_blue : (props.isfiltered ? highlight_orange : third_gray))};
  `;
