
import { select, median, range, scaleLinear, scaleOrdinal, axisLeft, ScaleOrdinal } from "d3"
import { observer } from "mobx-react"
import { FC, useCallback, useEffect, useState, useContext } from "react"
import useDeepCompareEffect from "use-deep-compare-effect"
import { stateUpdateWrapperUseJSON } from "../../../Interfaces/StateChecker"
import Store from "../../../Interfaces/Store"
import { DumbbellDataPoint } from "../../../Interfaces/Types/DataTypes"
import { OffsetDict, HGB_HIGH_STANDARD, HGB_LOW_STANDARD, DumbbellMinimumWidth, largeFontSize, regularFontSize } from "../../../Presets/Constants"
import { AcronymDictionary } from "../../../Presets/DataDict"
import { DumbbellLine } from "../../../Presets/StyledSVGComponents"
import CustomizedAxisOrdinal from "../ChartAccessories/CustomizedAxisOrdinal"
import SingleDumbbell from "./SingleDumbbell"

type Props = {
    data: DumbbellDataPoint[];
    valueToVisualize: string;
    dimensionWidth: number,
    dimensionHeight: number;
    svg: React.RefObject<SVGSVGElement>;
    xMin: number;
    xMax: number;
    sortMode: string;
    showPreop: boolean;
    showPostop: boolean;
    showGap: boolean;
}
const DumbbellChart: FC<Props> = ({ data, valueToVisualize, dimensionHeight, dimensionWidth, svg, xMax, xMin, showGap, showPostop, showPreop, sortMode }: Props) => {
    const [averageForEachTransfused, setAverage] = useState<any>({})
    const [sortedData, setSortedData] = useState<DumbbellDataPoint[]>([])
    const [numberList, setNumberList] = useState<{ num: number, indexEnding: number }[]>([])
    const [datapointsDict, setDataPointDict] = useState<{ title: any, length: number }[]>([])
    const [resultRange, setResultRange] = useState<number[]>([])
    const [indicies, setIndicies] = useState([])

    const store = useContext(Store);
    const { currentSelectSet } = store.state

    const currentOffset = OffsetDict.minimum;
    const svgSelection = select(svg.current);

    useEffect(() => {
        let tempNumberList: { num: number, indexEnding: number }[] = [];
        let tempDatapointsDict: { title: any, length: number }[] = [];
        if (data.length > 0) {
            let tempSortedData = sortDataHelper(data, sortMode)
            let currentPreopSum: number[] = [];
            let currentPostopSum: number[] = [];
            let averageDict: any = {}
            if (valueToVisualize === "CELL_SAVER_ML") {
                tempSortedData.forEach((d, i) => {
                    currentPreopSum.push(d.startXVal)
                    currentPostopSum.push(d.endXVal)
                    const roundedAnswer = Math.floor(d.yVal / 100) * 100
                    if (i === tempSortedData.length - 1) {
                        tempNumberList.push({ num: roundedAnswer, indexEnding: i })
                        averageDict[roundedAnswer] = { averageStart: median(currentPreopSum), averageEnd: median(currentPostopSum) }
                        tempDatapointsDict.push({ title: roundedAnswer, length: currentPreopSum.length })
                    }
                    else if (roundedAnswer !== (Math.floor(tempSortedData[i + 1].yVal / 100) * 100)) {
                        tempNumberList.push({ num: roundedAnswer, indexEnding: i })
                        averageDict[(roundedAnswer).toString()] = { averageStart: median(currentPreopSum), averageEnd: median(currentPostopSum) }
                        tempDatapointsDict.push({ title: roundedAnswer, length: currentPreopSum.length })
                        currentPostopSum = [];
                        currentPreopSum = [];
                    }
                })
            } else {
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
            }

            const newindices = range(0, data.length)
            stateUpdateWrapperUseJSON(indicies, newindices, setIndicies)
            stateUpdateWrapperUseJSON(averageForEachTransfused, averageDict, setAverage)
            stateUpdateWrapperUseJSON(sortedData, tempSortedData, setSortedData)
            stateUpdateWrapperUseJSON(datapointsDict, tempDatapointsDict, setDataPointDict)
            stateUpdateWrapperUseJSON(numberList, tempNumberList, setNumberList)

        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data])

    useEffect(() => {
        const tempSortedData = sortDataHelper(data, sortMode);
        stateUpdateWrapperUseJSON(sortedData, tempSortedData, setSortedData)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortMode])

    const sortDataHelper = (originalData: DumbbellDataPoint[], sortModeInput: string) => {
        const copyOfData: DumbbellDataPoint[] = JSON.parse(JSON.stringify(originalData))
        if (originalData.length > 0) {
            let tempSortedData: DumbbellDataPoint[] = [];
            switch (sortModeInput) {
                case "Postop":
                    tempSortedData = copyOfData.sort(
                        (a, b) => {
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
                    tempSortedData = copyOfData.sort(
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
                    tempSortedData = copyOfData.sort(
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
            return tempSortedData;
        }
        return [];
    }

    useDeepCompareEffect(() => {
        const widthAllowed = dimensionWidth - currentOffset.left - currentOffset.right;

        let spacing: any = {};

        if (DumbbellMinimumWidth * datapointsDict.length >= (widthAllowed)) {
            datapointsDict.forEach((d, i) => {
                spacing[i] = widthAllowed / datapointsDict.length;
            })
        }
        else {
            let numberOfTitlesUsingMinimumScale = 0;
            let totalDataPointsNotUsingMinimumScale = 0;
            datapointsDict.forEach((d, i) => {
                if ((d.length / sortedData.length) * widthAllowed < DumbbellMinimumWidth) {
                    spacing[i] = DumbbellMinimumWidth;
                    numberOfTitlesUsingMinimumScale += 1;
                }
                else {
                    totalDataPointsNotUsingMinimumScale += d.length
                }
            })
            const spaceLeft = widthAllowed - numberOfTitlesUsingMinimumScale * DumbbellMinimumWidth;

            datapointsDict.forEach((d, i) => {
                if (!spacing[i]) {
                    spacing[i] = spaceLeft * (d.length / totalDataPointsNotUsingMinimumScale)
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


        })
        stateUpdateWrapperUseJSON(resultRange, newResultRange, setResultRange)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [datapointsDict, dimensionWidth, currentOffset, sortedData])



    const testValueScale = useCallback(() => {
        const testValueScale = scaleLinear()
            .domain([0.9 * xMin, 1.1 * xMax])
            .range([dimensionHeight - currentOffset.bottom, currentOffset.top]);
        return testValueScale
    }, [xMin, xMax, dimensionHeight, currentOffset])



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
        .attr("font-size", store.configStore.largeFont ? largeFontSize : regularFontSize)
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "hanging")
        .text(
            AcronymDictionary[valueToVisualize] ? AcronymDictionary[valueToVisualize] : valueToVisualize
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
        .attr("font-size", store.configStore.largeFont ? largeFontSize : regularFontSize)
        .attr("text-anchor", "middle")
        .text("Hemoglobin Value");



    const decideIfSelectSet = (d: DumbbellDataPoint) => {
        if (currentSelectSet.length > 0) {
            for (let selected of currentSelectSet) {
                if (selected.setValues.includes((d.case[selected.setName]).toString())) {
                    return true;
                }
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


            const xVal = (valueScale() as ScaleOrdinal<any, number>)(index)
            const isSelectSet = decideIfSelectSet(dataPoint);


            if (xVal) {
                if (isSelectSet) {
                    selectedPatients.push(
                        <SingleDumbbell
                            xVal={xVal}
                            isSelectSet={isSelectSet} dataPoint={dataPoint} showGap={showGap} showPostop={showPostop} showPreop={showPreop} circleYValStart={testValueScale()(dataPoint.startXVal)} circleYValEnd={testValueScale()(dataPoint.endXVal)} />
                    )
                } else {
                    unselectedPatients.push(
                        <SingleDumbbell
                            xVal={xVal}
                            isSelectSet={isSelectSet} dataPoint={dataPoint} showGap={showGap} showPostop={showPostop} showPreop={showPreop} circleYValStart={testValueScale()(dataPoint.startXVal)} circleYValEnd={testValueScale()(dataPoint.endXVal)} />)
                }

            }
        })

        return unselectedPatients.concat(selectedPatients);
    }


    return (
        <>
            <g className="axes">
                <g className="x-axis"></g>
                <g className="y-axis" transform={`translate(0,${dimensionHeight - currentOffset.bottom})`}>
                    <CustomizedAxisOrdinal scaleDomain={JSON.stringify(valueScale().domain())} scaleRange={JSON.stringify(valueScale().range())} numberList={numberList} />
                </g>
                <text className="x-label" />
                <text className="y-label" />
            </g>
            <g className="chart-comp" >

                <line x1={currentOffset.left} x2={dimensionWidth - currentOffset.right} y1={testValueScale()(HGB_HIGH_STANDARD)} y2={testValueScale()(HGB_HIGH_STANDARD)} style={{ stroke: "#e5ab73", strokeWidth: "2", strokeDasharray: "5,5" }} />
                <line x1={currentOffset.left} x2={dimensionWidth - currentOffset.right} y1={testValueScale()(HGB_LOW_STANDARD)} y2={testValueScale()(HGB_LOW_STANDARD)} style={{ stroke: "#e5ab73", strokeWidth: "2", strokeDasharray: "5,5" }} />

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
                                <DumbbellLine x1={x1} x2={x2} y1={beginY} y2={beginY} ispreop={true} />,
                                <DumbbellLine x1={x1} x2={x2} y1={endY} y2={endY} ispreop={false} />, interventionLine
                            ])
                        } else { return <></> }
                    } else { return <></> }
                })}
            </g>
        </>
    );
}
export default observer(DumbbellChart)