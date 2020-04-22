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
import { secondary_gray, basic_gray } from "../ColorProfile";

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
            let x1 = ind === 0 ? scale(0) : (1 + scale(numberList[ind - 1].indexEnding + 1) - 0.5 * (scale(numberList[ind - 1].indexEnding + 1) - scale(numberList[ind - 1].indexEnding)))
            let x2 = ind === numberList.length - 1 ? scale(numberOb.indexEnding) : (-1 + scale(numberOb.indexEnding) + 0.5 * (scale(numberOb.indexEnding + 1) - scale(numberOb.indexEnding)))

            return ([<Line x1={x1} x2={x2} />,
            <LineBox x={x1} width={x2 - x1} fill={ind % 2 === 1 ? secondary_gray : basic_gray} />,
            <AxisText x={x1 + 0.5 * (x2 - x1)}>{numberOb.num}</AxisText>
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
    opacity:0.75
`
const AxisText = styled(`text`)`
    fill:white
    alignment-baseline: hanging
    text-anchor: middle
    y:0
`