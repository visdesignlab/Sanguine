import React, { FC, useEffect } from "react";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import { BarChartDataPoint } from "../../Interfaces/ApplicationState";
import { Popup } from "semantic-ui-react";
import { actions } from "../..";

interface OwnProps {
  dataPoint: BarChartDataPoint;
  isSelected: boolean;
  path: string;
  aggregatedBy: string;
  howToTransform: string;
  store?: Store;
}

export type Props = OwnProps;

const SingleViolinPlot: FC<Props> = ({ howToTransform, dataPoint, aggregatedBy, isSelected, path, store }: Props) => {
  return (<Popup
    content={dataPoint.totalVal}
    key={dataPoint.aggregateAttribute}
    trigger={
      <ViolinLine
        d={path}
        onClick={() => {
          actions.selectSet({
            set_name: aggregatedBy,
            set_value: dataPoint.aggregateAttribute
          });
        }}
        isselected={isSelected}
        transform={howToTransform}
      />
    }
  />)
}

export default inject("store")(observer(SingleViolinPlot));

interface ViolinLineProp {
  isselected: boolean;
}
const ViolinLine = styled(`path`) <ViolinLineProp>`
    fill: ${props => (props.isselected ? "#d98532" : "#404040")};
    stroke: ${props => (props.isselected ? "#d98532" : "#404040")};
  `;
