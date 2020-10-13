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

    totalKdeMax: number;
    halfKdeMax: number;

    aggregationScaleDomain: string;
    aggregationScaleRange: string;

    store?: Store;

    totalMedianSet: any;
    preMedianSet: any;
    postMedianSet: any;
    name: string;
}

export type Props = OwnProps;

const ExtraPairViolinInt: FC<Props> = ({ totalKdeMax, halfKdeMax, totalData, preIntData, postIntData, totalMedianSet, aggregationScaleRange, aggregationScaleDomain, preMedianSet, postMedianSet, name }: Props) => {

    const aggregatedScale = useCallback(() => {
        const aggregatedScale = scaleBand()
            .domain(JSON.parse(aggregationScaleDomain))
            .range(JSON.parse(aggregationScaleRange))
            .paddingInner(0.1);
        return aggregatedScale
    }, [aggregationScaleDomain, aggregationScaleRange])


    const valueScale = scaleLinear().domain([0, 18]).range([0, extraPairWidth.Violin]).nice();
    if (name === "RISK") {
        valueScale.domain([0, 30]);
    }

    const lineFunction = useCallback(() => {

        const kdeScale = scaleLinear()
            .domain([-totalKdeMax, totalKdeMax])
            .range([-0.5 * aggregatedScale().bandwidth(), 0.5 * aggregatedScale().bandwidth()]);
        const lineFunction = line()
            .curve(curveCatmullRom)
            .y((d: any) => kdeScale(d.y) + 0.5 * aggregatedScale().bandwidth())
            .x((d: any) => valueScale(d.x));
        return lineFunction
    }, [aggregatedScale, valueScale, totalKdeMax])


    const halfLineFunction = useCallback(() => {

        const halfKDEScale = scaleLinear()
            .domain([-halfKdeMax, halfKdeMax])
            .range([-0.25 * aggregatedScale().bandwidth(), 0.25 * aggregatedScale().bandwidth()])

        const halfLineFunction = line()
            .curve(curveCatmullRom)
            .y((d: any) => halfKDEScale(d.y) + 0.25 * aggregatedScale().bandwidth())
            .x((d: any) => valueScale(d.x))

        return halfLineFunction;
    }, [aggregatedScale, valueScale, halfKdeMax])

    const generateTotalViolin = (dataPoints: any, pdArray: any, aggregationAttribute: string) => {
        if (dataPoints.length > 5) {
            return <ViolinLine
                d={lineFunction()(pdArray)!}
                transform={`translate(0,${aggregatedScale()(aggregationAttribute)!})`}
            />
        } else {
            const result = dataPoints.map((d: any) => {
                return <circle
                    r={2}
                    fill={basic_gray}
                    cx={valueScale(d)}
                    cy={(aggregatedScale()(aggregationAttribute) || 0) + Math.random() * aggregatedScale().bandwidth() * 0.5 + aggregatedScale().bandwidth() * 0.25} />
            })

            return <g>{result}</g>
        }
    }

    const generateHalfViolin = (dataPoints: any, pdArray: any, aggregationAttribute: string, post: boolean) => {
        if (dataPoints.length > 5) {
            return <ViolinLine
                d={halfLineFunction()(pdArray)!}
                transform={`translate(0,${(aggregatedScale()(aggregationAttribute) || 0) + (post ? aggregatedScale().bandwidth() * 0.5 : 0)})`}
            />
        } else {
            const result = dataPoints.map((d: any) => {
                return <circle
                    r={2}
                    fill={basic_gray}
                    cx={valueScale(d)}
                    cy={(aggregatedScale()(aggregationAttribute) || 0) +
                        Math.random() * aggregatedScale().bandwidth() * 0.25 +
                        aggregatedScale().bandwidth() * 0.125}
                    transform={`translate(0,${post ? aggregatedScale().bandwidth() * 0.5 : 0})`}
                />
            })

            return <g>{result}</g>
        }
    }


    const generateOutput = () => {
        let output = []
        if (aggregatedScale().bandwidth() > 30) {
            output = Object.entries(preIntData).map(([val, result]) => {
                return ([
                    <Popup content={`median ${format(".2f")(preMedianSet[val])}`} key={`violin-${val}-pre`} trigger={
                        generateHalfViolin(result.dataPoints, result.kdeArray, val, false)
                    } />,

                    <line style={{ stroke: "#e5ab73", strokeWidth: "2", strokeDasharray: "5,5" }}
                        x1={valueScale(name === "Preop HGB" ? 13 : 7.5)}
                        x2={valueScale(name === "Preop HGB" ? 13 : 7.5)}
                        opacity={name === "RISK" ? 0 : 1}
                        y1={aggregatedScale()(val)!}
                        y2={aggregatedScale()(val)! + aggregatedScale().bandwidth()} />]
                )


            })

            output = output.concat(Object.entries(postIntData).map(([val, result]) => {

                return ([
                    <Popup content={`median ${format(".2f")(postMedianSet[val])}`} key={`violin-${val}-post`} trigger={
                        generateHalfViolin(result.dataPoints, result.kdeArray, val, true)
                    } />]
                )


            }))
        } else {
            output = Object.entries(totalData).map(([val, result]) => {

                return ([
                    <Popup content={`median ${format(".2f")(totalMedianSet[val])}`} key={`violin-${val}`} trigger={
                        generateTotalViolin(result.dataPoints, result.kdeArray, val)
                    } />,

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


const ViolinLine = styled(`path`)`
    fill: ${basic_gray};
    stroke: ${basic_gray};
  `;


export default inject("store")(observer(ExtraPairViolinInt));
