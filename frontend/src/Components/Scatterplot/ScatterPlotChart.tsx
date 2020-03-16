import React, {
    FC,
    useEffect,
    useRef,
    useLayoutEffect,
    useState,
    useMemo
} from "react";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import { actions } from "../..";
import { ScatterDataPoint, offset, AxisLabelDict } from "../../Interfaces/ApplicationState";
import { select, scaleLinear, axisLeft, axisBottom } from "d3";

interface OwnProps {
    yAxisName: string;
    xAxisName: string;
    //chartId: string;
    store?: Store;
    dimension: { width: number, height: number }
    data: ScatterDataPoint[];
    svg: React.RefObject<SVGSVGElement>
    yRange: { yMin: number, yMax: number };
    xRange: { xMin: number, xMax: number };
}

export type Props = OwnProps;

const ScatterPlot: FC<Props> = ({ yRange, xRange, svg, data, dimension, xAxisName, yAxisName, store }: Props) => {

    const { currentSelectPatient, currentSelectSet } = store!;
    const svgSelection = select(svg.current);

    const [xAxisScale, yAxisScale] = useMemo(() => {
        const xAxisScale = scaleLinear()
            .domain([0.9 * xRange.xMin, 1.1 * xRange.xMax])
            .range([offset.left, dimension.width - offset.right - offset.margin]);
        const yAxisScale = scaleLinear()
            .domain([0.9 * yRange.yMin, 1.1 * yRange.yMax])
            .range([dimension.height - offset.bottom, offset.top]);

        return [xAxisScale, yAxisScale];
    }, [dimension, data, yRange, xRange,])

    const yAxisLabel = axisLeft(yAxisScale);
    const xAxisLabel = axisBottom(xAxisScale);

    svgSelection
        .select(".axes")
        .select(".y-axis")
        .attr("transform", `translate(${offset.left}, 0)`)

        .attr('display', null)

        .call(yAxisLabel as any);

    svgSelection
        .select(".axes")
        .select(".y-label")
        .attr("display", null)
        .attr("x", -0.5 * dimension.height + 1.5 * offset.bottom)
        .attr("y", 0)
        .attr("transform", "rotate(-90)")
        .attr("font-size", "11px")
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "hanging")
        // .attr("transform", `translate(0 ,${offset.top}`)
        .text(
            AxisLabelDict[yAxisName] ? AxisLabelDict[yAxisName] : yAxisName
        );

    svgSelection.select('.axes')
        .select(".x-axis")
        .attr(
            "transform",
            `translate(0 ,${dimension.height - offset.bottom} )`
        )
        .call(xAxisLabel as any);



    svgSelection
        .select(".axes")
        .select(".x-label")
        .attr("y", dimension.height - offset.bottom + 20)
        .attr("x", 0.5 * (dimension.width + offset.left))
        .attr("alignment-baseline", "hanging")
        .attr("font-size", "11px")
        .attr("text-anchor", "middle")
        .text(AxisLabelDict[xAxisName] ? AxisLabelDict[xAxisName] : xAxisName);

    const decideIfSelected = (d: ScatterDataPoint) => {
        if (currentSelectPatient && d.case.caseId > 0) {
            return currentSelectPatient.caseId === d.case.caseId
        }
        else if (currentSelectSet) {
            return d.case[currentSelectSet.set_name] === currentSelectSet.set_value
        }
        else {
            return false;
        }
        //  return true;
    }

    const clickDumbbellHandler = (d: ScatterDataPoint) => {
        actions.selectPatient(d.case)
    }

    return (<>
        <g className="axes">
            <g className="x-axis"></g>
            <g className="y-axis"></g>
            <text className="x-label" style={{ textAnchor: "end" }} />
            <text className="y-label" style={{ textAnchor: "end" }} />
        </g>
        <g className="chart-comp" >
            {/* <line x1={offset.left} x2={dimension.width - offset.right} y1={testValueScale(11)} y2={testValueScale(11)} style={{ stroke: "#990D0D", strokeWidth: "2" }} /> */}
            {data.map((dataPoint, index) => {


                return (

                    <Circle cx={xAxisScale(dataPoint.xVal)}
                        cy={yAxisScale(dataPoint.yVal)}
                        isselected={decideIfSelected(dataPoint)}
                        onClick={() => { clickDumbbellHandler(dataPoint) }}
                    />

                );
            })}
        </g>
    </>)
}

export default inject("store")(observer(ScatterPlot));

interface DotProps {
    isselected: boolean;
}
const Circle = styled(`circle`) <DotProps>`
  r:4px
  fill: ${props => (props.isselected ? "#d98532" : "#404040")};
  opacity:0.8
`;