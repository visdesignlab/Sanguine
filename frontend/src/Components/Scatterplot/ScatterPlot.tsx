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
import { ScatterDataPoint, SingleCasePoint } from "../../Interfaces/ApplicationState";
import { offset, AxisLabelDict, Accronym, preop_color, third_gray } from "../../PresetsProfile"
import { select, scaleLinear, axisLeft, axisBottom, brush, event, scaleBand, range, deviation, mean } from "d3";

//import CustomizedAxis from "../Utilities/CustomizedAxis";
import { highlight_orange, basic_gray } from "../../PresetsProfile";
import { stateUpdateWrapperUseJSON } from "../../HelperFunctions";
import CustomizedAxisBand from "../Utilities/CustomizedAxisBand";

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
    //  highlightOption: string;
}

export type Props = OwnProps;

const ScatterPlot: FC<Props> = ({ xMax, xMin, svg, data, width, height, yMax, yMin, xAxisName, yAxisName, store }: Props) => {

    const scalePadding = 0.2;
    const currentOffset = offset.regular;
    const {
        //   currentSelectPatient, 
        currentBrushedPatientGroup,
        currentSelectPatientGroup,
        currentOutputFilterSet,
        currentSelectSet } = store!;
    const svgSelection = select(svg.current);
    const [brushLoc, updateBrushLoc] = useState<[[number, number], [number, number]] | null>(null)
    const [isFirstRender, updateIsFirstRender] = useState(true);
    const [brushedCaseList, updatebrushedCaseList] = useState<number[]>([])

    const updateBrush = () => {
        updateBrushLoc(event.selection)
    }


    const xAxisScale = useCallback(() => {
        let xAxisScale: any;
        if (xAxisName === "CELL_SAVER_ML") {
            xAxisScale = scaleLinear()
                .domain([0.9 * xMin, 1.1 * xMax])
                .range([currentOffset.left, width - currentOffset.right - currentOffset.margin]).nice();
        } else {
            xAxisScale = scaleBand()
                .domain(range(0, xMax + 1) as any)
                .range([currentOffset.left, width - currentOffset.right - currentOffset.margin])
                .padding(scalePadding);
        }
        return xAxisScale
    }, [xMax, xMin, width, currentOffset, xAxisName])

    const yAxisScale = useCallback(() => {

        const yAxisScale = scaleLinear()
            .domain([0.9 * yMin, 1.1 * yMax])
            .range([height - currentOffset.bottom, currentOffset.top])
            .nice();

        return yAxisScale;
    }, [yMax, yMin, height, currentOffset])

    const brushDef = brush()
        .extent([[xAxisScale().range()[0], yAxisScale().range()[1]], [xAxisScale().range()[1], yAxisScale().range()[0]]])
        .on("end", updateBrush);
    svgSelection.select(".brush-layer").call(brushDef as any);

    useEffect(() => {
        if (isFirstRender) {
            updateIsFirstRender(false)
        }

        else if (brushLoc) {
            let caseList: SingleCasePoint[] = [];
            data.forEach((dataPoint) => {
                //  const cx = (xAxisScale())(d.xVal as any) || 0
                const cx = xAxisName === "CELL_SAVER_ML" ? ((xAxisScale()(dataPoint.xVal)) || 0) : ((xAxisScale()(dataPoint.xVal) || 0) + dataPoint.randomFactor * xAxisScale().bandwidth())
                const cy = yAxisScale()(dataPoint.yVal)
                if (cx > brushLoc[0][0] && cx < brushLoc[1][0] && cy > brushLoc[0][1] && cy < brushLoc[1][1]) {
                    caseList.push(dataPoint.case)
                }
            })
            if (caseList.length > 1000 || caseList.length === 0) {
                updateBrushLoc(null)
                brushDef.move(svgSelection.select(".brush-layer"), null)
                actions.updateBrushPatientGroup([], "REPLACE")
            } else {
                actions.updateBrushPatientGroup(caseList, "REPLACE")
            }
        } else {
            actions.updateBrushPatientGroup([], "REPLACE")
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [brushLoc, xAxisScale, yAxisScale, data, xAxisName])

    useEffect(() => {
        brushDef.move(svgSelection.select(".brush-layer"), null)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentOutputFilterSet, currentSelectPatientGroup])

    useEffect(() => {

        let newbrushedCaseList = currentBrushedPatientGroup.map(d => d.CASE_ID)
        stateUpdateWrapperUseJSON(brushedCaseList, newbrushedCaseList, updatebrushedCaseList)
    }, [currentBrushedPatientGroup])


    const yAxisLabel = axisLeft(yAxisScale());
    const xAxisLabel = axisBottom(xAxisScale() as any);

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

    if (xAxisName === "CELL_SAVER_ML") {
        svgSelection.select('.axes')
            .select(".x-axis")

            .call(xAxisLabel as any);
    }



    svgSelection
        .select(".axes")
        .select(".x-label")
        .attr("y", height - currentOffset.bottom + 20)
        .attr("x", 0.5 * width + currentOffset.margin)
        .attr("alignment-baseline", "hanging")
        .attr("font-size", "11px")
        .attr("text-anchor", "middle")
        .text(AxisLabelDict[xAxisName] ? AxisLabelDict[xAxisName] : xAxisName);




    // const decideIfSelected = (d: ScatterDataPoint) => {
    //     if (currentSelectPatient && d.case.CASE_ID > 0) {
    //         return currentSelectPatient.CASE_ID === d.case.CASE_ID
    //     }
    //     return false;
    // }

    const decideIfSelectSet = (d: ScatterDataPoint) => {
        if (currentSelectSet.length > 0) {
            for (let selected of currentSelectSet) {
                if (selected.setValues.includes((d.case[selected.setName]) as any)) { return true; }
            }
            return false;
        }
        else {
            return false;
        }
    }



    // const clickDumbbellHandler = (d: ScatterDataPoint) => {
    //     actions.selectPatient(d.case)
    // }

    const generateScatterDots = () => {
        let selectedPatients: any[] = [];
        let unselectedPatients: any[] = [];
        let brushedSet = new Set(brushedCaseList)
        //  const patientGroupSet = new Set(currentSelectPatientGroup)
        //let unselectedPatients = [];
        let medianSet: any = {}
        data.forEach((dataPoint) => {

            const cx = xAxisName === "CELL_SAVER_ML" ? ((xAxisScale()(dataPoint.xVal)) || 0) : ((xAxisScale()(dataPoint.xVal) || 0) + dataPoint.randomFactor * xAxisScale().bandwidth())

            if (medianSet[dataPoint.xVal]) {
                medianSet[dataPoint.xVal].push(dataPoint.yVal)
            } else {
                medianSet[dataPoint.xVal] = [dataPoint.yVal]
            }
            const cy = yAxisScale()(dataPoint.yVal)
            //   const isSelected = decideIfSelected(dataPoint)
            const isSelectSet = decideIfSelectSet(dataPoint);
            //   const isHighlightOption = decideIfHighlightOption(dataPoint);

            const isBrushed = brushedSet.has(dataPoint.case.CASE_ID)

            // const isBrushed = brushLoc && cx > brushLoc[0][0] && cx < brushLoc[1][0] && cy > brushLoc[0][1] && cy < brushLoc[1][1]
            //  || (patientGroupSet.has(dataPoint.case.CASE_ID));
            if (isBrushed || isSelectSet) {
                selectedPatients.push(
                    <Circle cx={cx}
                        cy={cy}
                        // fill={ ? highlight_orange : basic_gray}
                        isselected={isSelectSet}
                        isbrushed={isBrushed || false}
                    //      isHighlightOutcome={isHighlightOption}
                    // onClick={() => { clickDumbbellHandler(dataPoint) }}
                    />)
            } else {
                unselectedPatients.push(
                    <Circle cx={cx}
                        cy={cy}
                        // fill={ ? highlight_orange : basic_gray}
                        isselected={isSelectSet}
                        isbrushed={isBrushed || false}
                    //           isHighlightOutcome={isHighlightOption}
                    //  onClick={() => { clickDumbbellHandler(dataPoint) }}
                    />

                );
            }
        })
        let lineSet: any[] = []
        if (xAxisName !== "CELL_SAVER_ML") {

            for (let [key, value] of Object.entries(medianSet)) {
                //   const sortedArray = (value as any).sort()
                const meanVal = mean(value as any) || 0
                // const lowerBound = quantile(sortedArray as any, 0.05) || 0
                // const upperBound = quantile(sortedArray as any, 0.95) || 0
                const std = deviation(value as any) || 0;
                const lowerBound = meanVal - 1.96 * std / Math.sqrt((value as any).length)
                const upperBound = meanVal + 1.96 * std / Math.sqrt((value as any).length)
                // console.log(value, lowerBound, upperBound)
                lineSet = lineSet.concat(
                    [<StatisticalLine
                        //  opacity={0.5}
                        x1={xAxisScale()(key as any)}
                        y1={yAxisScale()(meanVal)}
                        y2={yAxisScale()(meanVal)}
                        x2={xAxisScale()(key as any) + xAxisScale().bandwidth() || 0} />,
                    <StatisticalLine
                        // opacity={0.5}
                        x1={xAxisScale()(key as any) + 0.5 * xAxisScale().bandwidth() || 0}
                        y1={yAxisScale()(lowerBound)}
                        y2={yAxisScale()(upperBound)}
                        x2={xAxisScale()(key as any) + 0.5 * xAxisScale().bandwidth() || 0} />,
                    ]
                )
            }
        }
        return unselectedPatients.concat(selectedPatients).concat(lineSet)
    }


    return (<>
        <g className="axes">
            <g className="y-axis"></g>
            <g className="x-axis" transform={`translate(0 ,${height - currentOffset.bottom} )`}>
                {xAxisName !== "CELL_SAVER_ML" ? <CustomizedAxisBand scalePadding={scalePadding} scaleDomain={JSON.stringify(xAxisScale().domain())} scaleRange={JSON.stringify(xAxisScale().range())} /> : <></>}
            </g>
            {/* <g className="x-axis" transform={`translate(0,${height - currentOffset.bottom})`}> */}
            {/* <CustomizedAxis scaleDomain={JSON.stringify(xAxisScale.domain())} scaleRange={JSON.stringify(xAxisScale.range())} numberList={numberList} /> */}
            {/* </g> */}

            <text className="x-label" />
            <text className="y-label" />
        </g>
        <g className="chart-comp" >
            <text fontSize="13px"
                fill={third_gray} x={width} textAnchor="end" alignmentBaseline="hanging" y={0} className="highlight-label" />
            {/* <line x1={currentOffset.left} x2={dimension.width - currentOffset.right} y1={testValueScale(11)} y2={testValueScale(11)} style={{ stroke: "#990D0D", strokeWidth: "2" }} /> */}
            {generateScatterDots()}
            <g className="brush-layer" />
        </g>
    </>)
}

export default inject("store")(observer(ScatterPlot));
interface DotProps {
    isselected: boolean;
    isbrushed: boolean;
}
const Circle = styled(`circle`) <DotProps>`
  r:4px;
  opacity:${props => props.isselected ? 1 : 0.5};
  stroke-width:2px;
  fill:${props => (props.isbrushed || props.isselected ? highlight_orange : basic_gray)};
`;


const StatisticalLine = styled(`line`)`
    stroke-width: 3px;
    stroke: #3498d5;

`