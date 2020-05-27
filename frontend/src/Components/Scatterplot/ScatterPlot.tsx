import React, {
    FC,
    useEffect,
    useRef,
    useLayoutEffect,
    useState,
    useMemo,
    useCallback
} from "react";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import { actions } from "../..";
import { ScatterDataPoint, offset, AxisLabelDict, SelectSet } from "../../Interfaces/ApplicationState";
import { select, scaleLinear, axisLeft, axisBottom, brush, event, range, scaleOrdinal, ScaleOrdinal } from "d3";
//import CustomizedAxis from "../Utilities/CustomizedAxis";
import { highlight_orange, basic_gray } from "../../ColorProfile";

interface OwnProps {
    yAxisName: string;
    xAxisName: string;
    //chartId: string;
    store?: Store;
    width: number;
    height: number;
    //    dimension: { width: number, height: number }
    data: ScatterDataPoint[];
    svg: React.RefObject<SVGSVGElement>
    //yRange: { 
    yMin: number;
    yMax: number;
    //xRange: { 
    xMin: number;
    xMax: number;
}

export type Props = OwnProps;

const ScatterPlot: FC<Props> = ({ xMax, xMin, svg, data, width, height, yMax, yMin, xAxisName, yAxisName, store }: Props) => {

    const currentOffset = offset.regular;
    const { currentSelectPatient, currentSelectSet } = store!;
    const svgSelection = select(svg.current);
    const [brushLoc, updateBrushLoc] = useState<[[number, number], [number, number]] | null>(null)

    useEffect(() => {
        let caseList: number[] = [];
        data.map((d) => {
            const cx = (xAxisScale())(d.xVal)
            const cy = yAxisScale()(d.yVal)
            if (brushLoc && cx > brushLoc[0][0] && cx < brushLoc[1][0] && cy > brushLoc[0][1] && cy < brushLoc[1][1]) {
                caseList.push(d.case.caseId)
            }
        })
        actions.updateSelectedPatientGroup(caseList)
    }, [brushLoc])
    //  let numberList: { num: number, indexEnding: number }[] = [];
    // if (data.length > 0) {
    //     data = data.sort(
    //         (a, b) => {
    //             if (a.xVal === b.xVal) {
    //                 if (a.yVal < b.yVal) return -1;
    //                 if (a.yVal > b.yVal) return 1;
    //             } else {
    //                 if (a.xVal > b.xVal) return 1;
    //                 if (a.xVal < b.xVal) return -1;
    //             }
    //             return 0;
    //         }
    //     );



    // data.map((d, i) => {
    //     if (i === data.length - 1) {
    //         numberList.push({ num: d.xVal, indexEnding: i })
    //     }
    //     else if (d.xVal !== data[i + 1].xVal) {
    //         numberList.push({ num: d.xVal, indexEnding: i })
    //     }
    // })
    // }

    const xAxisScale = useCallback(() => {
        const xAxisScale = scaleLinear()
            .domain([0.9 * xMin, 1.1 * xMax])
            .range([currentOffset.left, width - currentOffset.right - currentOffset.margin]);
        return xAxisScale
    }, [xMax, xMin, width])

    const yAxisScale = useCallback(() => {
        // const indices = range(0, data.length)
        // console.log(data.length, currentOffset.left)
        // const xAxisScale = scaleOrdinal()
        //     .domain(indices as any)
        //     .range(range(currentOffset.left, width - currentOffset.right, (width - currentOffset.left - currentOffset.right) / (data.length + 1)));

        const yAxisScale = scaleLinear()
            .domain([0.9 * yMin, 1.1 * yMax])
            .range([height - currentOffset.bottom, currentOffset.top]);

        return yAxisScale;
    }, [yMax, xMax, height])

    const yAxisLabel = axisLeft(yAxisScale());
    const xAxisLabel = axisBottom(xAxisScale());

    // useEffect(() => { console.log(brushLoc) }, [brushLoc])

    const updateBrush = () => {
        updateBrushLoc(event.selection)
    }

    const brushDef = brush()
        // .on("brush", updateBrush)
        .on("end", updateBrush);
    svgSelection.select(".brush-layer").call(brushDef as any);

    svgSelection
        .select(".axes")
        .select(".y-axis")
        .attr("transform", `translate(${currentOffset.left}, 0)`)

        .attr('display', null)

        .call(yAxisLabel as any);

    svgSelection
        .select(".axes")
        .select(".y-label")
        .attr("display", null)
        .attr("x", -0.5 * height + 1.5 * currentOffset.bottom)
        .attr("y", 0)
        .attr("transform", "rotate(-90)")
        .attr("font-size", "11px")
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "hanging")
        // .attr("transform", `translate(0 ,${currentOffset.top}`)
        .text(
            AxisLabelDict[yAxisName] ? AxisLabelDict[yAxisName] : yAxisName
        );

    svgSelection.select('.axes')
        .select(".x-axis")
        .attr(
            "transform",
            `translate(0 ,${height - currentOffset.bottom} )`
        )
        .call(xAxisLabel as any);



    svgSelection
        .select(".axes")
        .select(".x-label")
        .attr("y", height - currentOffset.bottom + 20)
        .attr("x", 0.5 * (width + currentOffset.left))
        .attr("alignment-baseline", "hanging")
        .attr("font-size", "11px")
        .attr("text-anchor", "middle")
        .text(AxisLabelDict[xAxisName] ? AxisLabelDict[xAxisName] : xAxisName);

    const decideIfSelected = (d: ScatterDataPoint) => {
        if (currentSelectPatient && d.case.caseId > 0) {
            return currentSelectPatient.caseId === d.case.caseId
        }
        return false;
        // else if (currentSelectSet.length > 0) {
        //     //let selectSet: SelectSet;
        //     for (let selectSet of currentSelectSet) {
        //         if (d.case[selectSet.set_name] === selectSet.set_value)
        //             return true;
        //     }
        //     return false;
        // }
        // else {
        //     return false;
        // }
        //  return true;
    }

    const clickDumbbellHandler = (d: ScatterDataPoint) => {
        actions.selectPatient(d.case)
    }


    return (<>
        <g className="axes">
            <g className="y-axis"></g>
            <g className="x-axis"></g>
            {/* <g className="x-axis" transform={`translate(0,${height - currentOffset.bottom})`}> */}
            {/* <CustomizedAxis scaleDomain={JSON.stringify(xAxisScale.domain())} scaleRange={JSON.stringify(xAxisScale.range())} numberList={numberList} /> */}
            {/* </g> */}

            <text className="x-label" style={{ textAnchor: "end" }} />
            <text className="y-label" style={{ textAnchor: "end" }} />
        </g>
        <g className="chart-comp" >
            <g className="brush-layer" />
            {/* <line x1={currentOffset.left} x2={dimension.width - currentOffset.right} y1={testValueScale(11)} y2={testValueScale(11)} style={{ stroke: "#990D0D", strokeWidth: "2" }} /> */}
            {data.map((dataPoint) => {
                const cx = (xAxisScale())(dataPoint.xVal)
                const cy = yAxisScale()(dataPoint.yVal)

                return (

                    <Circle cx={cx}
                        cy={cy}
                        fill={brushLoc && cx > brushLoc[0][0] && cx < brushLoc[1][0] && cy > brushLoc[0][1] && cy < brushLoc[1][1] ? highlight_orange : basic_gray}
                        isselected={decideIfSelected(dataPoint)}
                        onClick={() => { clickDumbbellHandler(dataPoint) }}
                    />

                );
            })}
        </g>
    </>)
}

export default inject("store")(observer(ScatterPlot));
//fill: ${props => (props.isselected ? "#d98532" : "#404040")};
interface DotProps {
    isselected: boolean;
}
const Circle = styled(`circle`) <DotProps>`
  r:4px
  opacity:0.5
`;