import React, {
    FC,
    useCallback
} from "react";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import {
    scaleBand
} from "d3";
import { Secondary_Gray, basic_gray } from "../../PresetsProfile";

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
    }, [scaleDomain, scaleRange, scalePadding])

    return <>
        {scale().domain().map((number, ind) => {
            let x1 = scale()(number) || 0;
            let x2 = x1 + scale().bandwidth();
            return [<Line x1={x1} x2={x2} />,
            <LineBox x={x1} width={x2 - x1} fill={ind % 2 === 1 ? Secondary_Gray : basic_gray} />,
            <AxisText x={x1 + 0.5 * (x2 - x1)}>{number}</AxisText>
            ]
        })}
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