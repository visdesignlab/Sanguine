import React, {
    FC,
    useEffect,
    useState,
    useCallback
} from "react";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import { actions } from "../..";
import { ScatterDataPoint } from "../../Interfaces/ApplicationState";
import { offset, AxisLabelDict } from "../../PresetsProfile"
import { select, scaleLinear, axisLeft, axisBottom, brush, event, scaleBand, range } from "d3";
//import CustomizedAxis from "../Utilities/CustomizedAxis";
import { highlight_orange, basic_gray } from "../../PresetsProfile";

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
    const { currentSelectPatient, currentSelectPatientGroup } = store!;
    const svgSelection = select(svg.current);
    const [brushLoc, updateBrushLoc] = useState<[[number, number], [number, number]] | null>(null)

    useEffect(() => {
        let caseList: number[] = [];
        data.map((dataPoint) => {
            //  const cx = (xAxisScale())(d.xVal as any) || 0
            const cx = xAxisName === "CELL_SAVER_ML" ? ((xAxisScale()(dataPoint.xVal)) || 0) : ((xAxisScale()(dataPoint.xVal) || 0) + dataPoint.randomFactor * xAxisScale().bandwidth())
            const cy = yAxisScale()(dataPoint.yVal)
            if (brushLoc && cx > brushLoc[0][0] && cx < brushLoc[1][0] && cy > brushLoc[0][1] && cy < brushLoc[1][1]) {
                caseList.push(dataPoint.case.caseId)
                console.log(dataPoint)
            }
        })
        if (caseList.length > 1000) {
            updateBrushLoc(null)
        } else {
            actions.updateSelectedPatientGroup(caseList)
        }
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
        let xAxisScale: any;
        if (xAxisName === "CELL_SAVER_ML") {
            xAxisScale = scaleLinear()
                .domain([0.9 * xMin, 1.1 * xMax])
                .range([currentOffset.left, width - currentOffset.right - currentOffset.margin]);
        } else {
            xAxisScale = scaleBand()
                .domain(range(0, xMax + 1) as any)
                .range([currentOffset.left, width - currentOffset.right - currentOffset.margin])
                .padding(0.2)

        }
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
    }, [yMax, yMin, height])

    const yAxisLabel = axisLeft(yAxisScale());
    const xAxisLabel = axisBottom(xAxisScale() as any);


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
        .attr("x", -0.5 * height)
        .attr("y", currentOffset.margin)
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
        .attr("x", 0.5 * width + currentOffset.margin)
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

    const generateScatterDots = () => {
        let selectedPatients: any[] = [];
        const patientGroupSet = new Set(currentSelectPatientGroup)
        //let unselectedPatients = [];
        let unselectedPatients = data.map((dataPoint) => {
            const cx = xAxisName === "CELL_SAVER_ML" ? ((xAxisScale()(dataPoint.xVal)) || 0) : ((xAxisScale()(dataPoint.xVal) || 0) + dataPoint.randomFactor * xAxisScale().bandwidth())
            // const cx = dataPoint.xLoc;
            const cy = yAxisScale()(dataPoint.yVal)
            const isSelected = decideIfSelected(dataPoint)
            const isBrushed = (brushLoc && cx > brushLoc[0][0] && cx < brushLoc[1][0] && cy > brushLoc[0][1] && cy < brushLoc[1][1])
                || (patientGroupSet.has(dataPoint.case.caseId));
            if (isSelected || isBrushed) {
                selectedPatients.push(
                    <Circle cx={cx}
                        cy={cy}
                        // fill={ ? highlight_orange : basic_gray}
                        isselected={isSelected}
                        isbrushed={isBrushed}
                        onClick={() => { clickDumbbellHandler(dataPoint) }}
                    />)
            } else {
                return (
                    <Circle cx={cx}
                        cy={cy}
                        // fill={ ? highlight_orange : basic_gray}
                        isselected={isSelected}
                        isbrushed={isBrushed}
                        onClick={() => { clickDumbbellHandler(dataPoint) }}
                    />

                );
            }
        })
        return unselectedPatients.concat(selectedPatients)
    }


    return (<>
        <g className="axes">
            <g className="y-axis"></g>
            <g className="x-axis"></g>
            {/* <g className="x-axis" transform={`translate(0,${height - currentOffset.bottom})`}> */}
            {/* <CustomizedAxis scaleDomain={JSON.stringify(xAxisScale.domain())} scaleRange={JSON.stringify(xAxisScale.range())} numberList={numberList} /> */}
            {/* </g> */}

            <text className="x-label" />
            <text className="y-label" />
        </g>
        <g className="chart-comp" >

            {/* <line x1={currentOffset.left} x2={dimension.width - currentOffset.right} y1={testValueScale(11)} y2={testValueScale(11)} style={{ stroke: "#990D0D", strokeWidth: "2" }} /> */}
            {generateScatterDots()}
            <g className="brush-layer" />
        </g>
    </>)
}

export default inject("store")(observer(ScatterPlot));
interface DotProps {
    isselected: boolean;
    isbrushed: boolean
}
const Circle = styled(`circle`) <DotProps>`
  r:4px
  opacity:${props => props.isselected ? 1 : 0.5}
  fill:${props => (props.isbrushed || props.isselected ? highlight_orange : basic_gray)}
`;