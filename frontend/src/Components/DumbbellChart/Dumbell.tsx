import React, {
  FC,
  useEffect,
  useRef,
  useLayoutEffect,
  useState,
  useMemo
} from "react";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import { actions } from "../..";
import {
  select,
  selectAll,
  scaleLinear,
  scaleBand,
  mouse,
  axisBottom,
  axisLeft
} from "d3";
import {DumbbellDataPoint} from "../../Interfaces/ApplicationState"

interface OwnProps{
    yAxis: string;
    chartId: string;
    store?: Store;
}

export type Props = OwnProps;

const Dumbbell: FC<Props> = ({ yAxis, chartId, store }: Props) => { 
    return (<></>)
}

export default inject("store")(observer(Dumbbell));