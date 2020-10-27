import React, { FC, useCallback, useRef, useEffect } from "react";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import { scaleLinear, line, curveCatmullRom, format, scaleBand, select, axisBottom } from "d3";
import { extraPairWidth, HGB_HIGH_STANDARD, HGB_LOW_STANDARD } from "../../PresetsProfile"
import { basic_gray } from "../../PresetsProfile";
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

const ExtraPairViolin: FC<Props> = ({ kdeMax, dataSet, aggregationScaleDomain, aggregationScaleRange, medianSet, name }: Props) => {

    const aggregationScale = useCallback(() => {
        const domain = JSON.parse(aggregationScaleDomain);
        const range = JSON.parse(aggregationScaleRange);
        const aggregationScale = scaleBand().domain(domain).range(range).paddingInner(0.2);
        return aggregationScale
    }, [aggregationScaleDomain, aggregationScaleRange])


    console.log(dataSet)
    const valueScale = scaleLinear().domain([0, 18]).range([0, extraPairWidth.Violin])
    if (name === "RISK") {
        valueScale.domain([0, 30]);
    }

    const lineFunction = useCallback(() => {
        const kdeScale = scaleLinear()
            .domain([-kdeMax, kdeMax])
            .range([-0.5 * aggregationScale().bandwidth(), 0.5 * aggregationScale().bandwidth()])
        const lineFunction = line()
            .curve(curveCatmullRom)
            .y((d: any) => kdeScale(d.y) + 0.5 * aggregationScale().bandwidth())
            .x((d: any) => valueScale(d.x));
        return lineFunction
    }, [aggregationScale, valueScale, kdeMax])

    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        const svgSelection = select(svgRef.current);
        const scaleLabel = axisBottom(valueScale).ticks(3);
        svgSelection.select(".axis").call(scaleLabel as any);
    }, [svgRef, valueScale])

    const generateViolin = (dataPoints: any, pdArray: any, aggregationAttribute: string) => {
        if (dataPoints.length > 5) {
            return <ViolinLine
                d={lineFunction()(pdArray)!}
                transform={`translate(0,${aggregationScale()(aggregationAttribute)!})`}
            />
        } else {
            const result = dataPoints.map((d: any) => {
                return <circle r={2} fill={basic_gray} cx={valueScale(d)} cy={(aggregationScale()(aggregationAttribute) || 0) + Math.random() * aggregationScale().bandwidth() * 0.5 + aggregationScale().bandwidth() * 0.25} />
            })

            return <g>{result}</g>
        }
    }


    return (
        <>
            <g ref={svgRef} transform={`translate(0,${aggregationScale().range()[0]})`}>
                <g className="axis"></g>
            </g>
            {Object.entries(dataSet).map(([val, result]) => {

                return ([
                    <Popup content={`median ${format(".2f")(medianSet[val])}`} key={`violin-${val}`} trigger={
                        generateViolin(result.dataPoints, result.kdeArray, val)
                    } />,

                    <line style={{ stroke: "#e5ab73", strokeWidth: "2", strokeDasharray: "5,5" }}
                        x1={valueScale(name === "Preop HGB" ? HGB_HIGH_STANDARD : HGB_LOW_STANDARD)}
                        x2={valueScale(name === "Preop HGB" ? HGB_HIGH_STANDARD : HGB_LOW_STANDARD)}
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
