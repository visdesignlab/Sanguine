import React, {
    FC,
    useMemo,
    useEffect
} from "react";
import Store from "../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import {
    select,
    scaleLinear,
    scaleBand,
    max,
    axisLeft,
    axisTop,
    interpolateBlues,
    axisBottom,
    interpolateGreys,
    line,
    ScaleOrdinal
} from "d3";

interface OwnProps {
    scale: ScaleOrdinal<any, number>;
    store?: Store;
    numberList: { num: number, indexEnding: number }[]
    // numberList:number[]
    // indexList:number[]
    // dimensionWhole: { width: number, height: number }
}
export type Props = OwnProps;

const CustomizedAxis: FC<Props> = ({ numberList, store, scale }) => {

    return <>
        {numberList.map((numberOb, ind) => {
            const x1 = ind === 0 ? scale(0) : scale(numberList[ind - 1].indexEnding + 1)

            return ([<Line x1={x1} x2={scale(numberOb.indexEnding)} />,
            <LineBox x={x1} width={scale(numberOb.indexEnding) - x1} fill={ind % 2 === 1 ? "#20639B" : "#d98532"} />,
            <AxisText x={x1 + 0.5 * (scale(numberOb.indexEnding) - x1)}>{numberOb.num}</AxisText>
            ])
        })}
    </>
}
export default inject("store")(observer(CustomizedAxis));


const Line = styled(`line`)`
    stroke: #404040
    stroke-width:2px
    y1: 0
    y2:0
`

const LineBox = styled(`rect`)`
    height: 13px
    y:0
    opacity:0.5
`
const AxisText = styled(`text`)`
    fill:white
    alignment-baseline: hanging
    text-anchor: middle
    y:0
`