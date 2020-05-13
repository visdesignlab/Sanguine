import React, { FC, useEffect, useMemo } from "react";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import { ScaleBand, scaleOrdinal, range, scaleLinear, ScaleOrdinal, line, curveCatmullRom, median, format } from "d3";
import { extraPairWidth, offset } from "../../Interfaces/ApplicationState"
import { preop_color, postop_color, basic_gray } from "../../ColorProfile";
import { create as createpd } from "pdfast";
import { Popup } from "semantic-ui-react";

interface OwnProps {
    dataSet: any[];
    aggregatedScale: ScaleBand<string>;
    store?: Store;
    medianSet: any;
    kdeMax: number;
    name: string;
}

export type Props = OwnProps;

const ExtraPairViolin: FC<Props> = ({ dataSet, aggregatedScale, kdeMax, medianSet, name }: Props) => {
    const [lineFunction, valueScale] = useMemo(() => {
        let maxIndices = 0;
        Object.values(dataSet).map((array) => {
            maxIndices = array.length > maxIndices ? array.length : maxIndices
        })
        // const indices = range(0, maxIndices) as number[]

        const valueScale = scaleLinear().domain([0, 18]).range([0, extraPairWidth.Violin])

        const kdeScale = scaleLinear()
            .domain([-kdeMax, kdeMax])
            .range([-0.5 * aggregatedScale.bandwidth(), 0.5 * aggregatedScale.bandwidth()])
        //console.log(kdeMdataax)
        const lineFunction = line()
            .curve(curveCatmullRom)
            .y((d: any) => kdeScale(d.y) + 0.5 * aggregatedScale.bandwidth())
            .x((d: any) => valueScale(d.x));

        return [lineFunction, valueScale];
    }, [dataSet, aggregatedScale])

    return (
        <>
            {Object.entries(dataSet).map(([val, dataArray]) => {

                // const sortedArray = dataArray.sort((a: any, b: any) =>
                //     Math.abs(a[1] - a[0]) - Math.abs(b[1] - b[0]))
                //console.log(`translate(0,${aggregatedScale(val)!}`)
                return ([
                    <Popup content={`median ${format(".2f")(medianSet[val])}`} key={`violin-${val}`} trigger={
                        <ViolinLine
                            d={lineFunction(dataArray)!}
                            transform={`translate(0,${aggregatedScale(val)!})`}
                        />} />,

                    <line style={{ stroke: "#e5ab73", strokeWidth: "2", strokeDasharray: "5,5" }} x1={valueScale(name === "Preop Hemo" ? 13 : 7.5)} x2={valueScale(name === "Preop Hemo" ? 13 : 7.5)} y1={aggregatedScale(val)!} y2={aggregatedScale(val)! + aggregatedScale.bandwidth()} />]
                )


            })}
        </>
    )
}

interface DotProps {
    ispreop: boolean;
}

const Circle = styled(`circle`) <DotProps>`
  r:2
  fill: ${props => (props.ispreop ? preop_color : postop_color)};
  opacity: 0.5
`;

const ViolinLine = styled(`path`)`
    fill: ${basic_gray};
    stroke: ${basic_gray};
  `;


export default inject("store")(observer(ExtraPairViolin));
