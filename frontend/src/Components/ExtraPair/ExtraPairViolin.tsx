import React, { FC, useCallback, useRef, useEffect } from "react";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import { scaleLinear, line, curveCatmullRom, format, scaleBand, select, axisBottom } from "d3";
import { extraPairWidth } from "../../PresetsProfile"
import { basic_gray } from "../../PresetsProfile";
import { Popup } from "semantic-ui-react";

interface OwnProps {
    dataSet: any[];
    //aggregatedScale: ScaleBand<string>;
    aggregationScaleDomain: string;
    aggregationScaleRange: string;
    store?: Store;
    medianSet: any;
    //    kdeMax: number;
    name: string;
}

export type Props = OwnProps;

const ExtraPairViolin: FC<Props> = ({ dataSet, aggregationScaleDomain, aggregationScaleRange, medianSet, name }: Props) => {

    const aggregationScale = useCallback(() => {
        const domain = JSON.parse(aggregationScaleDomain);
        const range = JSON.parse(aggregationScaleRange);
        const aggregationScale = scaleBand().domain(domain).range(range).paddingInner(0.2);
        return aggregationScale
    }, [aggregationScaleDomain, aggregationScaleRange])



    const valueScale = scaleLinear().domain([0, 18]).range([0, extraPairWidth.Violin])
    if (name === "RISK") {
        valueScale.domain([0, 30]);
    }

    const lineFunction = useCallback((kdeMax) => {
        const kdeScale = scaleLinear()
            .domain([-kdeMax, kdeMax])
            .range([-0.5 * aggregationScale().bandwidth(), 0.5 * aggregationScale().bandwidth()])
        const lineFunction = line()
            .curve(curveCatmullRom)
            .y((d: any) => kdeScale(d.y) + 0.5 * aggregationScale().bandwidth())
            .x((d: any) => valueScale(d.x));
        return lineFunction
    }, [aggregationScale, valueScale])

    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        const svgSelection = select(svgRef.current);
        const scaleLabel = axisBottom(valueScale).ticks(3);
        svgSelection.select(".axis").call(scaleLabel as any);
    }, [svgRef, valueScale])



    return (
        <>
            <g ref={svgRef} transform={`translate(0,${aggregationScale().range()[0]})`}>
                <g className="axis"></g>
            </g>
            {Object.entries(dataSet).map(([val, result]) => {

                // const sortedArray = dataArray.sort((a: any, b: any) =>
                //     Math.abs(a[1] - a[0]) - Math.abs(b[1] - b[0]))
                //console.log(`translate(0,${aggregatedScale(val)!}`)
                return ([
                    <Popup content={`median ${format(".2f")(medianSet[val])}`} key={`violin-${val}`} trigger={
                        <ViolinLine
                            d={lineFunction(result.kdeMax)(result.kdeArray)!}
                            transform={`translate(0,${aggregationScale()(val)!})`}
                        />} />,

                    <line style={{ stroke: "#e5ab73", strokeWidth: "2", strokeDasharray: "5,5" }}
                        x1={valueScale(name === "Preop HGB" ? 13 : 7.5)}
                        x2={valueScale(name === "Preop HGB" ? 13 : 7.5)}
                        opacity={name === "RISK" ? 0 : 1}
                        y1={aggregationScale()(val)!}
                        y2={aggregationScale()(val)! + aggregationScale().bandwidth()} />]
                )


            })}
        </>
    )
}



const ViolinLine = styled(`path`)`
    fill: ${basic_gray};
    stroke: ${basic_gray};
  `;


export default inject("store")(observer(ExtraPairViolin));
