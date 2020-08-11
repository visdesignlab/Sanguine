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
import { Popup } from "semantic-ui-react";
import {
    select,
    range,
    scaleLinear,
    scaleOrdinal,
    axisLeft,
    ScaleOrdinal,
    median,
} from "d3";
import { DumbbellDataPoint } from "../../Interfaces/ApplicationState";
import { offset, AxisLabelDict, minimumWidthScale } from "../../PresetsProfile"
import CustomizedAxis from "../Utilities/CustomizedAxisOrdinal";
import { preop_color, basic_gray, highlight_orange, postop_color } from "../../PresetsProfile"
import { stateUpdateWrapperUseJSON } from "../../HelperFunctions";

interface OwnProps {
    yAxisName: string;
    //chartId: string;
    store?: Store;
    dimensionWidth: number,
    dimensionHeight: number,
    // dimension: { width: number, height: number }
    data: DumbbellDataPoint[];
    svg: React.RefObject<SVGSVGElement>
    // yMax: number;
    xMin: number,
    xMax: number
    // xRange: { xMin: number, xMax: number };
    // interventionDate?: string;
    sortMode: string;
    showingAttr: { preop: boolean, postop: boolean, gap: boolean }
}

export type Props = OwnProps;

const DumbbellChart: FC<Props> = ({ showingAttr, sortMode, yAxisName, dimensionHeight, dimensionWidth, data, svg, store, xMin, xMax }: Props) => {

    const [averageForEachTransfused, setAverage] = useState<any>({})
    const [sortedData, setSortedData] = useState<DumbbellDataPoint[]>([])
    const [numberList, setNumberList] = useState<{ num: number, indexEnding: number }[]>([])
    // const [scaleList, setScaleList] = useState < { title: any, scale:ScaleOrdinal<any, number>}[]>();
    const [datapointsDict, setDataPointDict] = useState<{ title: any, length: number }[]>([])
    const [resultRange, setResultRange] = useState<number[]>([])
    const [indicies, setIndicies] = useState([])

    const currentOffset = offset.minimum;
    // const currentOffsetLeft = currentOffset.left;
    // const currentOffsetRight = currentOffset.right

    const {
        //dumbbellSorted,
        //  currentSelectPatient,
        currentSelectSet } = store!;
    const svgSelection = select(svg.current);

    useEffect(() => {
        let tempNumberList: { num: number, indexEnding: number }[] = [];
        let tempDatapointsDict: { title: any, length: number }[] = [];
        if (data.length > 0) {
            let tempSortedData: DumbbellDataPoint[] = [];
            switch (sortMode) {
                case "Postop":
                    tempSortedData = data.sort(
                        (a, b) => {
                            // if (interventionDate) {
                            //   const intervDate = typeof interventionDate === "string" ? timeParse("%Y-%m-%dT%H:%M:%S.%LZ")(interventionDate)! : interventionDate;
                            //   if (a.case.DATE.getTime() < intervDate.getTime() &&
                            //     b.case.DATE.getTime() > intervDate.getTime()) {
                            //     return -1
                            //   }
                            //   else if (a.case.DATE.getTime() > intervDate.getTime() &&
                            //     b.case.DATE.getTime() < intervDate.getTime()) {
                            //     return 1
                            //   }
                            // }
                            if (a.yVal === b.yVal) {
                                if (a.endXVal > b.endXVal) return 1;
                                if (a.endXVal < b.endXVal) return -1;
                            } else {
                                if (a.yVal > b.yVal) return 1;
                                if (a.yVal < b.yVal) return -1;
                            }
                            return 0;
                        }
                    );
                    break;
                case "Preop":
                    tempSortedData = data.sort(
                        (a, b) => {
                            if (a.yVal === b.yVal) {
                                if (a.startXVal > b.startXVal) return 1;
                                if (a.startXVal < b.startXVal) return -1;
                            } else {
                                if (a.yVal > b.yVal) return 1;
                                if (a.yVal < b.yVal) return -1;
                            }
                            return 0;
                        }
                    );
                    break;
                case "Gap":
                    tempSortedData = data.sort(
                        (a, b) => {
                            if (a.yVal === b.yVal) {
                                if (Math.abs(a.endXVal - a.startXVal) > Math.abs(b.endXVal - b.startXVal)) return 1;
                                if (Math.abs(a.endXVal - a.startXVal) < Math.abs(b.endXVal - b.startXVal)) return -1;
                            } else {
                                if (a.yVal > b.yVal) return 1;
                                if (a.yVal < b.yVal) return -1;
                            }
                            return 0;
                        }
                    );
                    break;
                default:
                    break;
            }

            let currentPreopSum: number[] = [];
            let currentPostopSum: number[] = [];
            let averageDict: any = {}
            tempSortedData.forEach((d, i) => {
                currentPreopSum.push(d.startXVal)
                currentPostopSum.push(d.endXVal)
                if (i === tempSortedData.length - 1) {
                    tempNumberList.push({ num: d.yVal, indexEnding: i })
                    averageDict[d.yVal] = { averageStart: median(currentPreopSum), averageEnd: median(currentPostopSum) }
                    tempDatapointsDict.push({ title: d.yVal, length: currentPreopSum.length })
                }
                else if (d.yVal !== tempSortedData[i + 1].yVal) {
                    tempNumberList.push({ num: d.yVal, indexEnding: i })
                    averageDict[(d.yVal).toString()] = { averageStart: median(currentPreopSum), averageEnd: median(currentPostopSum) }
                    tempDatapointsDict.push({ title: d.yVal, length: currentPreopSum.length })
                    currentPostopSum = [];
                    currentPreopSum = [];
                }
            })

            const newindices = range(0, data.length)
            stateUpdateWrapperUseJSON(indicies, newindices, setIndicies)
            stateUpdateWrapperUseJSON(averageForEachTransfused, averageDict, setAverage)
            stateUpdateWrapperUseJSON(sortedData, tempSortedData, setSortedData)
            stateUpdateWrapperUseJSON(datapointsDict, tempDatapointsDict, setDataPointDict)
            stateUpdateWrapperUseJSON(numberList, tempNumberList, setNumberList)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, sortMode])

    useEffect(() => {
        const widthAllowed = dimensionWidth - currentOffset.left - currentOffset.right;

        let spacing: any = {};

        if (minimumWidthScale * datapointsDict.length >= (widthAllowed)) {
            datapointsDict.forEach((d, i) => {
                spacing[i] = minimumWidthScale;
            })
        }
        else {
            let numberOfTitlesUsingMinimumScale = 0;
            let totalDataPointsNotUsingMinimumScale = 0;
            datapointsDict.forEach((d, i) => {
                if ((d.length / sortedData.length) * widthAllowed < minimumWidthScale) {
                    spacing[i] = minimumWidthScale;
                    numberOfTitlesUsingMinimumScale += 1;
                }
                else {
                    totalDataPointsNotUsingMinimumScale += d.length
                }
            })
            const spaceLeft = widthAllowed - numberOfTitlesUsingMinimumScale * minimumWidthScale;

            datapointsDict.forEach((d, i) => {
                if (!spacing[i]) {
                    spacing[i] = spaceLeft * d.length / totalDataPointsNotUsingMinimumScale
                }
            })
        }
        let newResultRange: number[] = [];
        let currentLoc = currentOffset.left;
        datapointsDict.forEach((d, i) => {
            let calculatedRange = range(currentLoc, currentLoc + spacing[i], spacing[i] / (d.length + 1))
            calculatedRange.splice(0, 1)
            if (calculatedRange.length !== d.length) {
                calculatedRange.splice(calculatedRange.length - 1, 1)
            }
            newResultRange = newResultRange.concat(calculatedRange)
            currentLoc += spacing[i]
            stateUpdateWrapperUseJSON(resultRange, newResultRange, setResultRange)
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [datapointsDict, dimensionWidth, currentOffset, sortedData])



    const testValueScale = useCallback(() => {
        const testValueScale = scaleLinear()
            .domain([0.9 * xMin, 1.1 * xMax])
            .range([dimensionHeight - currentOffset.bottom, currentOffset.top]);
        return testValueScale
    }, [xMin, xMax, dimensionHeight, currentOffset])
    //console.log(data)


    const valueScale = useCallback(() => {
        const valueScale = scaleOrdinal()
            .domain(indicies as any)
            .range(resultRange);
        return valueScale;

    }, [indicies, resultRange]);

    const testLabel = axisLeft(testValueScale());

    svgSelection
        .select(".axes")
        .select(".y-label")
        .attr("display", null)
        .attr("y", dimensionHeight - currentOffset.bottom + 20)
        .attr("x", 0.5 * (dimensionWidth))
        .attr("font-size", "11px")
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "hanging")
        // .attr("transform", `translate(0 ,${currentOffset.top}`)
        .text(
            AxisLabelDict[yAxisName] ? AxisLabelDict[yAxisName] : yAxisName
        );
    svgSelection.select('.axes')
        .select(".x-axis")
        .attr("transform", `translate(${currentOffset.left}, 0)`)
        .call(testLabel as any);



    svgSelection
        .select(".axes")
        .select(".x-label")
        .attr("x", -0.5 * dimensionHeight)
        .attr("y", 0)
        .attr("transform", "rotate(-90)")
        .attr("alignment-baseline", "hanging")
        .attr("font-size", "11px")
        .attr("text-anchor", "middle")
        .text("Hemoglobin Value");


    //   const decideIfSelected = (d: DumbbellDataPoint) => {

    //     if (currentSelectPatient && d.case.caseId > 0) {
    //       return currentSelectPatient.caseId === d.case.caseId
    //     } return false;
    //   }

    // const decideIfSelectSet = (d: DumbbellDataPoint) => {
    //   return currentSelectPatientGroup.includes(d.case.caseId);
    // }

    const decideIfSelectSet = (d: DumbbellDataPoint) => {

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

    const generateDumbbells = () => {
        let selectedPatients: any[] = [];
        let unselectedPatients: any[] = [];

        sortedData.forEach((dataPoint, index) => {
            const start = testValueScale()(dataPoint.startXVal);
            const end = testValueScale()(dataPoint.endXVal);
            const returning = start > end ? end : start;
            const rectDifference = Math.abs(end - start)
            const xVal = (valueScale() as ScaleOrdinal<any, number>)(index)
            //   const isSelected = decideIfSelected(dataPoint);
            const isSelectSet = decideIfSelectSet(dataPoint);

            if (xVal) {
                if (isSelectSet) {
                    selectedPatients.push(<Popup
                        content={`${dataPoint.startXVal} -> ${dataPoint.endXVal}, ${dataPoint.yVal}`}
                        key={`${dataPoint.case.VISIT_ID}-${dataPoint.case.CASE_ID}`}
                        trigger={
                            <g >
                                <Rect
                                    x={xVal - 1
                                    }
                                    y={returning}
                                    height={rectDifference}
                                    isselected={isSelectSet}
                                    // isselected={decideIfSelected(dataPoint) || decideIfSelectSet(dataPoint)}
                                    display={showingAttr.gap ? undefined : "none"}
                                />
                                <Circle
                                    cx={
                                        xVal
                                    }
                                    cy={testValueScale()(dataPoint.startXVal)}
                                    onClick={() => {
                                        clickDumbbellHandler(dataPoint);
                                    }}
                                    // isselected={decideIfSelected(dataPoint)}
                                    isSelectSet={isSelectSet}
                                    ispreop={true}
                                    display={showingAttr.preop ? undefined : "none"}
                                />
                                <Circle
                                    cx={
                                        xVal
                                    }
                                    cy={testValueScale()(dataPoint.endXVal)}
                                    onClick={() => {
                                        clickDumbbellHandler(dataPoint);
                                    }}
                                    //  isselected={decideIfSelected(dataPoint)}
                                    isSelectSet={isSelectSet}
                                    ispreop={false}
                                    display={showingAttr.postop ? undefined : "none"}
                                />
                            </g>
                        }
                    />)
                } else {
                    unselectedPatients.push(
                        <Popup
                            content={`${dataPoint.startXVal} -> ${dataPoint.endXVal}, ${dataPoint.yVal}`}
                            key={`${dataPoint.case.VISIT_ID}-${dataPoint.case.CASE_ID}`}
                            trigger={
                                <g >
                                    <Rect
                                        x={xVal - 1
                                        }
                                        y={returning}
                                        height={rectDifference}
                                        isselected={isSelectSet}
                                        //  isselected={decideIfSelected(dataPoint) || decideIfSelectSet(dataPoint)}
                                        display={showingAttr.gap ? undefined : "none"}
                                    />
                                    <Circle
                                        cx={
                                            xVal
                                        }
                                        cy={testValueScale()(dataPoint.startXVal)}
                                        onClick={() => {
                                            clickDumbbellHandler(dataPoint);
                                        }}
                                        // isselected={decideIfSelected(dataPoint)}
                                        isSelectSet={isSelectSet}
                                        ispreop={true}
                                        display={showingAttr.preop ? undefined : "none"}
                                    />
                                    <Circle
                                        cx={
                                            xVal
                                        }
                                        cy={testValueScale()(dataPoint.endXVal)}
                                        onClick={() => {
                                            clickDumbbellHandler(dataPoint);
                                        }}
                                        //   isselected={decideIfSelected(dataPoint)}
                                        isSelectSet={isSelectSet}
                                        ispreop={false}
                                        display={showingAttr.postop ? undefined : "none"}
                                    />
                                </g>
                            }
                        />)
                }

            }
        })

        return unselectedPatients.concat(selectedPatients);
    }



    const clickDumbbellHandler = (d: DumbbellDataPoint) => {
        actions.updateBrushPatientGroup([d.case], "ADD")
    }

    return (
        <>
            <g className="axes">
                <g className="x-axis"></g>
                <g className="y-axis" transform={`translate(0,${dimensionHeight - currentOffset.bottom})`}>
                    <CustomizedAxis scaleDomain={JSON.stringify(valueScale().domain())} scaleRange={JSON.stringify(valueScale().range())} numberList={numberList} />
                </g>
                <text className="x-label" />
                <text className="y-label" />
            </g>
            <g className="chart-comp" >
                <line x1={currentOffset.left} x2={dimensionWidth - currentOffset.right} y1={testValueScale()(13)} y2={testValueScale()(13)} style={{ stroke: "#e5ab73", strokeWidth: "2", strokeDasharray: "5,5" }} />
                <line x1={currentOffset.left} x2={dimensionWidth - currentOffset.right} y1={testValueScale()(7.5)} y2={testValueScale()(7.5)} style={{ stroke: "#e5ab73", strokeWidth: "2", strokeDasharray: "5,5" }} />

                {generateDumbbells()}
                {numberList.map((numberOb, ind) => {
                    if (Object.keys(averageForEachTransfused).length > 0) {

                        const x1 = ind === 0 ? (valueScale() as ScaleOrdinal<any, number>)(0) : (valueScale() as ScaleOrdinal<any, number>)(numberList[ind - 1].indexEnding + 1)
                        const x2 = (valueScale() as ScaleOrdinal<any, number>)(numberOb.indexEnding)
                        const beginY = testValueScale()(averageForEachTransfused[(numberOb.num).toString()].averageStart)
                        const endY = testValueScale()(averageForEachTransfused[numberOb.num].averageEnd)
                        const interval = ind === 0 ? 0 : (valueScale() as ScaleOrdinal<any, number>)(numberList[ind - 1].indexEnding)
                        let interventionLine;
                        if (ind >= 1 && numberOb.num <= numberList[ind - 1].num) {
                            interventionLine = <line x1={x1 - 0.5 * (x1 - interval)} x2={x1 - 0.5 * (x1 - interval)} y1={currentOffset.top} y2={dimensionHeight - currentOffset.bottom} style={{ stroke: "#e5ab73", strokeWidth: "2", strokeDasharray: "5,5" }} />
                        }
                        if (x1 && x2) {
                            return ([
                                <Line x1={x1} x2={x2} y1={beginY} y2={beginY} ispreop={true} />,
                                <Line x1={x1} x2={x2} y1={endY} y2={endY} ispreop={false} />, interventionLine
                            ])
                        } else { return <></> }
                    } else { return <></> }
                })}
            </g>
        </>
    );
}

export default inject("store")(observer(DumbbellChart));

// interface DumbbellProps {
//   dataPoint: DumbbellDataPoint;
//   //surgeonselected: boolean;
// }

interface DotProps {

    isSelectSet: boolean;
    ispreop: boolean;
}
interface RectProps {
    isselected: boolean;
}

interface AverageLineProps {
    ispreop: boolean;
}
// display: ${props =>
//   props.dataPoint.endXVal === 0 || props.dataPoint.startXVal === 0
//     ? "none"
//     : null} 

// const DumbbellG = styled(`g`) <DumbbellProps>`
//     visibility:${props => (props.surgeonselected ? "visible" : "hidden")}
// `;


const Circle = styled(`circle`) <DotProps>`
  r:4px
  fill: ${props => (props.isSelectSet ? highlight_orange : props.ispreop ? preop_color : postop_color)};
  opacity:${props => props.isSelectSet ? 1 : 0.8}
`;

const Rect = styled(`rect`) <RectProps>`
 width:1.5px
 opacity:${props => props.isselected ? 1 : 0.5}
 fill: ${props => (props.isselected ? highlight_orange : basic_gray)};
`;

const Line = styled(`line`) < AverageLineProps>`
    stroke: ${props => (props.ispreop ? preop_color : postop_color)};
    stroke-width:3px  
    `