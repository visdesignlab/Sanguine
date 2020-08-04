import React, { FC } from "react";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import { BarChartDataPoint } from "../../Interfaces/ApplicationState";
import { Popup } from "semantic-ui-react";
import { actions } from "../..";
import { highlight_orange, highlight_blue, third_gray } from "../../PresetsProfile";

interface OwnProps {
    dataPoint: BarChartDataPoint;
    isSelected: boolean;
    isFiltered: boolean;
    path: string;
    aggregatedBy: string;
    howToTransform: string;
    store?: Store;
    // isSinglePatientSelect: boolean;
}

export type Props = OwnProps;



const SingleViolinPlot: FC<Props> = ({ howToTransform, isFiltered, dataPoint, aggregatedBy, isSelected, path, store }: Props) => {
    return (<Popup
        content={dataPoint.totalVal}
        key={dataPoint.aggregateAttribute}
        trigger={
            <ViolinLine
                d={path}
                onClick={(e) => {
                    actions.selectSet(
                        {
                            setName: aggregatedBy,
                            setValues: [dataPoint.aggregateAttribute],
                            // setPatientIds: [dataPoint.patientIDList]
                        },
                        e.shiftKey
                    )
                }}

                isselected={isSelected}
                isfiltered={isFiltered}
                //   issinglepatientselected={isSinglePatientSelect}
                transform={howToTransform}
            />
        }
    />)
}

export default inject("store")(observer(SingleViolinPlot));

interface ViolinLineProp {
    isselected: boolean;
    isfiltered: boolean;
    // issinglepatientselected: boolean;
}

// stroke:${props => (props.issinglepatientselected ? highlight_orange : third_gray)};

const ViolinLine = styled(`path`) <ViolinLineProp>`
   
    fill: ${props => (props.isselected ? highlight_orange : (props.isfiltered ? highlight_blue : third_gray))};
  `;
