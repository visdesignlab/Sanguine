import React, { FC, useCallback, useRef, useEffect } from "react";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import { scaleLinear, line, curveCatmullRom, format, scaleBand, select, axisBottom } from "d3";
import { extraPairWidth } from "../../PresetsProfile"
import { basic_gray } from "../../PresetsProfile";
import { Popup } from "semantic-ui-react";

interface OwnProps {
    totalData: any[];
    preIntData: any[];
    postIntData: any[];

    // aggregatedScale: ScaleBand<string>;

    aggregationScaleDomain: string;
    aggregationScaleRange: string;

    store?: Store;

    totalMedianSet: any;
    preMedianSet: any;
    postMedianSet: any;

    kdeMax: number;
    name: string;
}

export type Props = OwnProps;

const ExtraPairViolinInt: FC<Props> = ({ totalData, preIntData, postIntData, totalMedianSet, aggregationScaleRange, aggregationScaleDomain, kdeMax, preMedianSet, postMedianSet, name }: Props) => {

    const aggregatedScale = useCallback(() => {
        const aggregatedScale = scaleBand().domain(JSON.parse(aggregationScaleDomain)).range(JSON.parse(aggregationScaleRange)).paddingInner(0.1);
        return aggregatedScale
    }, [aggregationScaleDomain, aggregationScaleRange])

    // const valueScale = useCallback(() => {
    //     // let maxIndices = 0;
    //     // Object.values(totalData).map((array) => {
    //     //     maxIndices = array.length > maxIndices ? array.length : maxIndices
    //     // })
    //     const valueScale = 
    //     return valueScale;
    // }, [])

    const valueScale = scaleLinear().domain([0, 18]).range([0, extraPairWidth.Violin]).nice();
    if (name === "RISK") {
        valueScale.domain([0, 30]);
    }

    const lineFunction = useCallback(() => {

        const kdeScale = scaleLinear()
            .domain([-kdeMax, kdeMax])
            .range([-0.5 * aggregatedScale().bandwidth(), 0.5 * aggregatedScale().bandwidth()]);
        const lineFunction = line()
            .curve(curveCatmullRom)
            .y((d: any) => kdeScale(d.y) + 0.5 * aggregatedScale().bandwidth())
            .x((d: any) => valueScale(d.x));
        return lineFunction
    }, [aggregatedScale, kdeMax, valueScale])


    const halfLineFunction = useCallback(() => {

        const halfKDEScale = scaleLinear()
            .domain([-kdeMax, kdeMax])
            .range([-0.25 * aggregatedScale().bandwidth(), 0.25 * aggregatedScale().bandwidth()])

        const halfLineFunction = line()
            .curve(curveCatmullRom)
            .y((d: any) => halfKDEScale(d.y) + 0.25 * aggregatedScale().bandwidth())
            .x((d: any) => valueScale(d.x))

        return halfLineFunction;
    }, [aggregatedScale, kdeMax, valueScale])


    const generateOutput = () => {
        let output = []
        if (aggregatedScale().bandwidth() > 40) {
            output = Object.entries(preIntData).map(([val, dataArray]) => {

                // const sortedArray = dataArray.sort((a: any, b: any) =>
                //     Math.abs(a[1] - a[0]) - Math.abs(b[1] - b[0]))
                //console.log(`translate(0,${aggregatedScale(val)!}`)
                return ([
                    <Popup content={`median ${format(".2f")(preMedianSet[val])}`} key={`violin-${val}`} trigger={
                        <ViolinLine
                            d={halfLineFunction()(dataArray)!}
                            transform={`translate(0,${aggregatedScale()(val)!})`}
                        />} />,

                    <line style={{ stroke: "#e5ab73", strokeWidth: "2", strokeDasharray: "5,5" }}
                        x1={valueScale(name === "Preop HGB" ? 13 : 7.5)}
                        x2={valueScale(name === "Preop HGB" ? 13 : 7.5)}
                        opacity={name === "RISK" ? 0 : 1}
                        y1={aggregatedScale()(val)!}
                        y2={aggregatedScale()(val)! + aggregatedScale().bandwidth()} />]
                )


            })

            output = output.concat(Object.entries(postIntData).map(([val, dataArray]) => {

                // const sortedArray = dataArray.sort((a: any, b: any) =>
                //     Math.abs(a[1] - a[0]) - Math.abs(b[1] - b[0]))
                //console.log(`translate(0,${aggregatedScale(val)!}`)
                return ([
                    <Popup content={`median ${format(".2f")(postMedianSet[val])}`} key={`violin-${val}-pre`} trigger={
                        <ViolinLine
                            d={halfLineFunction()(dataArray)!}
                            transform={`translate(0,${aggregatedScale()(val)! + 0.5 * aggregatedScale().bandwidth()})`}
                        />} />]
                )


            }))
        } else {
            output = Object.entries(totalData).map(([val, dataArray]) => {

                // const sortedArray = dataArray.sort((a: any, b: any) =>
                //     Math.abs(a[1] - a[0]) - Math.abs(b[1] - b[0]))
                //console.log(`translate(0,${aggregatedScale(val)!}`)
                return ([
                    <Popup content={`median ${format(".2f")(totalMedianSet[val])}`} key={`violin-${val}-post`} trigger={
                        <ViolinLine
                            d={lineFunction()(dataArray)!}
                            transform={`translate(0,${aggregatedScale()(val)!})`}
                        />} />,

                    <line style={{ stroke: "#e5ab73", strokeWidth: "2", strokeDasharray: "5,5" }}
                        x1={valueScale(name === "Preop HGB" ? 13 : 7.5)}
                        x2={valueScale(name === "Preop HGB" ? 13 : 7.5)}
                        opacity={name === "RISK" ? 0 : 1}
                        y1={aggregatedScale()(val)!}
                        y2={aggregatedScale()(val)! + aggregatedScale().bandwidth()} />]
                )


            })
        }

        return output;
    }


    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        const svgSelection = select(svgRef.current);
        const scaleLabel = axisBottom(valueScale).ticks(3);
        svgSelection.select(".axis").call(scaleLabel as any);
    }, [svgRef, valueScale])


    return (
        <>
            <g ref={svgRef} transform={`translate(0,${aggregatedScale().range()[0]})`}>
                <g className="axis"></g>
            </g>
            {generateOutput()}
        </>
    )
}

interface DotProps {
    ispreop: boolean;
}

const ViolinLine = styled(`path`)`
    fill: ${basic_gray};
    stroke: ${basic_gray};
  `;


export default inject("store")(observer(ExtraPairViolinInt));
