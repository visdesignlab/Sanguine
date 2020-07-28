import React, { FC } from "react";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import { InterventionDataPoint } from "../../Interfaces/ApplicationState";
import { Popup } from "semantic-ui-react";
import { actions } from "../..";
import { highlight_orange, highlight_blue, third_gray } from "../../PresetsProfile";

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
                content={dataPoint.preTotalVal}
                key={`Pre${dataPoint.aggregateAttribute}`}
                trigger={
                    <ViolinLine
                        d={preIntPath}
                        onClick={(e) => {
                            actions.selectSet(
                                {
                                    setName: aggregatedBy,
                                    setValues: [dataPoint.aggregateAttribute],
                                    // setPatientIds: [dataPoint.prePatienIDList.concat(dataPoint.postPatienIDList)]
                                },
                                e.shiftKey
                            )
                        }}

                        isselected={isSelected}
                        isfiltered={isFiltered}
                        transform={preIntHowToTransform}
                    />} />,
            <Popup
                content={dataPoint.postTotalVal}
                key={`Post${dataPoint.aggregateAttribute}`}
                trigger={
                    <ViolinLine
                        d={postIntPath}
                        onClick={(e) => {
                            actions.selectSet(
                                {
                                    setName: aggregatedBy,
                                    setValues: [dataPoint.aggregateAttribute],
                                    //setPatientIds: [dataPoint.prePatienIDList.concat(dataPoint.postPatienIDList)]
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
