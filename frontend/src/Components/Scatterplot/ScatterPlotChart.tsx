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
import { Popup } from "semantic-ui-react";
import {
    select,
    range,
    scaleLinear,
    scaleOrdinal,
    mouse,
    axisBottom,
    axisLeft,
    ScaleLinear,
    ScaleOrdinal,
} from "d3";
import { offset, AxisLabelDict, SelectSet } from "../../Interfaces/ApplicationState";

interface OwnProps {
    yAxisName: string;
    //chartId: string;
    store?: Store;
    dimension: { width: number, height: number }
    //data: DumbbellDataPoint[];
    svg: React.RefObject<SVGSVGElement>
    yMax: number;
    xRange: { xMin: number, xMax: number };
}


export type Props = OwnProps;
const ScatterPlotChart: FC<Props> = ({ yAxisName, dimension, svg, store, yMax, xRange }: Props) => { 
    const { currentSelectPatient, currentSelectSet } = store!;
    return (<div></div>)
}

export default inject("store")(observer(ScatterPlotChart));