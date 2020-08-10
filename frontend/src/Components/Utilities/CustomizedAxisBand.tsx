import React, {
    FC,
    useCallback
} from "react";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import {
    ScaleOrdinal,
    scaleOrdinal,
    scaleBand
} from "d3";
import { secondary_gray, basic_gray } from "../../PresetsProfile";

interface OwnProps {
    //  scale: ScaleOrdinal<any, number>;
    scaleDomain: string;
    scaleRange: string;
    scalePadding: number;
    //  store?: Store;

}
export type Props = OwnProps;

const CustomizedAxisBand: FC<Props> = ({ scaleDomain, scaleRange, scalePadding }) => {



    const scale = useCallback(() => {
        const domain = JSON.parse(scaleDomain);
        const range = JSON.parse(scaleRange)

        let scale = scaleBand()
            .domain(domain as any)
            .range(range)
            .padding(scalePadding);

        return scale;
    }, [scaleDomain, scaleRange])

    return <>
        {scale().domain().map((number, ind) => {
            let x1 = scale()(number) || 0;
            let x2 = x1 + scale().bandwidth();
            return [<Line x1={x1} x2={x2} />,
            <LineBox x={x1} width={x2 - x1} fill={ind % 2 === 1 ? secondary_gray : basic_gray} />,
            <AxisText x={x1 + 0.5 * (x2 - x1)}>{number}</AxisText>
            ]
        })}
        {/* {numberList.map((numberOb, ind) => {
            let x1 = ind === 0 ? (scale() as ScaleOrdinal<any, number>)(0) : (1 + (scale() as ScaleOrdinal<any, number>)((numberList[ind - 1].indexEnding + 1)) - 0.5 * ((scale() as ScaleOrdinal<any, number>)(numberList[ind - 1].indexEnding + 1) - (scale() as ScaleOrdinal<any, number>)(numberList[ind - 1].indexEnding)))
            let x2 = ind === numberList.length - 1 ? (scale() as ScaleOrdinal<any, number>)(numberOb.indexEnding) : (-1 + (scale() as ScaleOrdinal<any, number>)(numberOb.indexEnding) + 0.5 * ((scale() as ScaleOrdinal<any, number>)(numberOb.indexEnding + 1) - (scale() as ScaleOrdinal<any, number>)(numberOb.indexEnding)))
            if (x1 && x2) {
                return ([<Line x1={x1} x2={x2} />,
                <LineBox x={x1} width={x2 - x1} fill={ind % 2 === 1 ? secondary_gray : basic_gray} />,
                <AxisText x={x1 + 0.5 * (x2 - x1)}>{numberOb.num}</AxisText>
                ])
            }
        })} */}
    </>
}
export default inject("store")(observer(CustomizedAxisBand));


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