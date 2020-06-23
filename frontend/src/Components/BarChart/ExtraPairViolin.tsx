import React, { FC, useCallback } from "react";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import { scaleLinear, line, curveCatmullRom, format, scaleBand } from "d3";
import { extraPairWidth } from "../../PresetsProfile"
import { preop_color, postop_color, basic_gray } from "../../PresetsProfile";
import { Popup } from "semantic-ui-react";

interface OwnProps {
    dataSet: any[];
    //aggregatedScale: ScaleBand<string>;
    aggregationScaleDomain: string;
    aggregationScaleRange: string;
    store?: Store;
    medianSet: any;
    kdeMax: number;
    name: string;
}

export type Props = OwnProps;

const ExtraPairViolin: FC<Props> = ({ dataSet, aggregationScaleDomain, aggregationScaleRange, kdeMax, medianSet, name }: Props) => {

    const aggregationScale = useCallback(() => {
        const domain = JSON.parse(aggregationScaleDomain);
        const range = JSON.parse(aggregationScaleRange);
        const aggregationScale = scaleBand().domain(domain).range(range).paddingInner(0.1);
        return aggregationScale
    }, [aggregationScaleDomain, aggregationScaleRange])

    const valueScale = useCallback(() => {
        let maxIndices = 0;
        Object.values(dataSet).map((array) => {
            maxIndices = array.length > maxIndices ? array.length : maxIndices
        })
        // const indices = range(0, maxIndices) as number[]

        const valueScale = scaleLinear().domain([0, 18]).range([0, extraPairWidth.Violin])

        return valueScale;
    }, [dataSet, aggregationScale()])


    const lineFunction = useCallback(() => {
        const kdeScale = scaleLinear()
            .domain([-kdeMax, kdeMax])
            .range([-0.5 * aggregationScale().bandwidth(), 0.5 * aggregationScale().bandwidth()])
        const lineFunction = line()
            .curve(curveCatmullRom)
            .y((d: any) => kdeScale(d.y) + 0.5 * aggregationScale().bandwidth())
            .x((d: any) => valueScale()(d.x));
        return lineFunction
    }, [valueScale(), aggregationScale()])




    return (
        <>
            {Object.entries(dataSet).map(([val, dataArray]) => {

                // const sortedArray = dataArray.sort((a: any, b: any) =>
                //     Math.abs(a[1] - a[0]) - Math.abs(b[1] - b[0]))
                //console.log(`translate(0,${aggregatedScale(val)!}`)
                return ([
                    <Popup content={`median ${format(".2f")(medianSet[val])}`} key={`violin-${val}`} trigger={
                        <ViolinLine
                            d={lineFunction()(dataArray)!}
                            transform={`translate(0,${aggregationScale()(val)!})`}
                        />} />,

                    <line style={{ stroke: "#e5ab73", strokeWidth: "2", strokeDasharray: "5,5" }}
                        x1={valueScale()(name === "Preop Hemo" ? 13 : 7.5)}
                        x2={valueScale()(name === "Preop Hemo" ? 13 : 7.5)}
                        y1={aggregationScale()(val)!}
                        y2={aggregationScale()(val)! + aggregationScale().bandwidth()} />]
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
