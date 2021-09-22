import { axisBottom, axisLeft, brush, deviation, mean, range, scaleBand, scaleLinear, select } from "d3"
import { observer } from "mobx-react"
import { useContext } from "react"
import { FC, useCallback, useEffect, useState } from "react"
import styled from "styled-components"
import { stateUpdateWrapperUseJSON } from "../../../Interfaces/StateChecker"
import Store from "../../../Interfaces/Store"
import { ScatterDataPoint, SingleCasePoint } from "../../../Interfaces/Types/DataTypes"
import { Basic_Gray, highlight_orange, largeFontSize, OffsetDict, regularFontSize, Third_Gray } from "../../../Presets/Constants"
import { AcronymDictionary } from "../../../Presets/DataDict"
import CustomizedAxisBand from "../ChartAccessories/CustomizedAxisBand"

type Props = {
    xAggregationOption: string;
    yValueOption: string;
    width: number;
    height: number;
    data: ScatterDataPoint[];
    svg: React.RefObject<SVGSVGElement>
    yMin: number;
    yMax: number;
    xMin: number;
    xMax: number;
}

const ScatterPlot: FC<Props> = ({ xAggregationOption, xMax, xMin, yMax, yMin, yValueOption, data, width, height, svg }: Props) => {

    const scalePadding = 0.2;
    const currentOffset = OffsetDict.minimum;
    const store = useContext(Store);
    const { currentBrushedPatientGroup } = store.state
    const svgSelection = select(svg.current);
    const [brushLoc, updateBrushLoc] = useState<[[number, number], [number, number]] | null>(null)
    const [isFirstRender, updateIsFirstRender] = useState(true);
    const [brushedCaseList, updatebrushedCaseList] = useState<number[]>([])

    const updateBrush = (e: any) => {
        updateBrushLoc(e.selection)
    }


    const xAxisScale = useCallback(() => {
        let xAxisScale: any;
        if (xAggregationOption === "CELL_SAVER_ML") {
            xAxisScale = scaleLinear()
                .domain([0.9 * xMin, 1.1 * xMax])
                .range([currentOffset.left, width - currentOffset.right - currentOffset.margin]).nice();
        } else {
            xAxisScale = scaleBand()
                .domain(range(0, xMax + 1) as any)
                .range([currentOffset.left, width - currentOffset.right - currentOffset.margin])
                .padding(scalePadding);
        }
        return xAxisScale;
    }, [xMax, xMin, width, currentOffset, xAggregationOption])

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
            updateIsFirstRender(false);
        }
        else {
            if (brushLoc) {
                let caseList: SingleCasePoint[] = [];
                data.forEach((dataPoint) => {
                    const cx = xAggregationOption === "CELL_SAVER_ML" ? ((xAxisScale()(dataPoint.xVal)) || 0) : ((xAxisScale()(dataPoint.xVal) || 0) + dataPoint.randomFactor * xAxisScale().bandwidth())
                    const cy = yAxisScale()(dataPoint.yVal)
                    if (cx > brushLoc[0][0] && cx < brushLoc[1][0] && cy > brushLoc[0][1] && cy < brushLoc[1][1]) {
                        caseList.push(dataPoint.case)
                    }
                })

                //     !!!!!!!this is the code of checking brushed patient
                if (caseList.length === 0) {
                    updateBrushLoc(null)
                    brushDef.move(svgSelection.select(".brush-layer"), null)
                    store.selectionStore.updateBrush([])
                } else {
                    store.selectionStore.updateBrush(caseList)
                }
            }
            else {
                store.selectionStore.updateBrush([])
            }

        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [brushLoc])


    //Clear the brush
    useEffect(() => {
        clearBrush()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data])

    const clearBrush = () => {
        brushDef.move(svgSelection.select(".brush-layer"), null)
    }

    useEffect(() => {
        let newbrushedCaseList = currentBrushedPatientGroup.map(d => d.CASE_ID)
        stateUpdateWrapperUseJSON(brushedCaseList, newbrushedCaseList, updatebrushedCaseList)
        if (currentBrushedPatientGroup.length === 0) {
            clearBrush()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentBrushedPatientGroup])


    const yAxisLabel = axisLeft(yAxisScale());
    const xAxisLabel = axisBottom(xAxisScale() as any);

    svgSelection
        .select(".axes")
        .select(".y-axis")
        .attr("transform", `translate(${currentOffset.left}, 0)`)
        .attr('display', null)
        .call(yAxisLabel as any)
        .selectAll("text")
        .attr("font-size", store.configStore.largeFont ? largeFontSize : regularFontSize);

    svgSelection
        .select(".axes")
        .select(".y-label")
        .attr("display", null)
        .attr("x", -0.5 * height)
        .attr("y", currentOffset.margin - 10)
        .attr("transform", "rotate(-90)")
        .attr("font-size", store.configStore.largeFont ? largeFontSize : regularFontSize)
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "hanging")
        .text(
            AcronymDictionary[yValueOption] ? AcronymDictionary[yValueOption] : yValueOption
        );

    if (xAggregationOption === "CELL_SAVER_ML") {
        svgSelection.select('.axes')
            .select(".x-axis")
            .call(xAxisLabel as any)
            .selectAll("text")
            .attr("font-size", store.configStore.largeFont ? largeFontSize : regularFontSize);
    }
    else {
        svgSelection.select('.axes')
            .select(".x-axis")
            .selectAll(".tick")
            .remove();
        svgSelection.select('.axes')
            .select(".x-axis")
            .selectAll(".domain")
            .remove();
    }



    svgSelection
        .select(".axes")
        .select(".x-label")
        .attr("y", height - currentOffset.bottom + 20)
        .attr("x", 0.5 * width + currentOffset.margin)
        .attr("alignment-baseline", "hanging")
        .attr("font-size", store.configStore.largeFont ? largeFontSize : regularFontSize)
        .attr("text-anchor", "middle")
        .text(AcronymDictionary[xAggregationOption] ? AcronymDictionary[xAggregationOption] : xAggregationOption);


    const decideIfSelectSet = (d: ScatterDataPoint) => {
        // if (currentSelectSet.length > 0) {
        //     for (let selected of currentSelectSet) {
        //         if (selected.setValues.includes((d.case[selected.setName]) as any)) { return true; }
        //     }
        //     return false;
        // }
        // else {
        //     return false;
        // }
        return false;
    }


    const generateScatterDots = () => {
        let selectedPatients: any[] = [];
        let unselectedPatients: any[] = [];
        let brushedSet = new Set(brushedCaseList)
        let medianSet: any = {}
        data.forEach((dataPoint) => {

            const cx = xAggregationOption === "CELL_SAVER_ML" ? ((xAxisScale()(dataPoint.xVal)) || 0) : ((xAxisScale()(dataPoint.xVal) || 0) + dataPoint.randomFactor * xAxisScale().bandwidth())

            if (medianSet[dataPoint.xVal]) {
                medianSet[dataPoint.xVal].push(dataPoint.yVal)
            } else {
                medianSet[dataPoint.xVal] = [dataPoint.yVal]
            }
            const cy = yAxisScale()(dataPoint.yVal)
            const isSelectSet = decideIfSelectSet(dataPoint);
            const isBrushed = brushedSet.has(dataPoint.case.CASE_ID);

            if (isBrushed || isSelectSet) {
                selectedPatients.push(
                    <ScatterDot cx={cx}
                        cy={cy}
                        isselected={isSelectSet}
                        isbrushed={isBrushed || false} />)
            } else {
                unselectedPatients.push(
                    <ScatterDot cx={cx}
                        cy={cy}
                        isselected={isSelectSet}
                        isbrushed={isBrushed || false} />

                );
            }
        })
        let lineSet: any[] = []
        if (xAggregationOption !== "CELL_SAVER_ML") {

            for (let [key, value] of Object.entries(medianSet)) {
                const meanVal = mean(value as any) || 0
                const std = deviation(value as any) || 0;
                const lowerBound = meanVal - 1.96 * std / Math.sqrt((value as any).length)
                const upperBound = meanVal + 1.96 * std / Math.sqrt((value as any).length)
                lineSet = lineSet.concat(
                    [<StatisticalLine
                        //  opacity={0.5}
                        x1={xAxisScale()(parseInt(key))}
                        y1={yAxisScale()(meanVal)}
                        y2={yAxisScale()(meanVal)}
                        x2={xAxisScale()(parseInt(key)) + xAxisScale().bandwidth() || 0} />,
                    <StatisticalLine
                        // opacity={0.5}
                        x1={xAxisScale()(parseInt(key)) + 0.5 * xAxisScale().bandwidth() || 0}
                        y1={yAxisScale()(lowerBound)}
                        y2={yAxisScale()(upperBound)}
                        x2={xAxisScale()(parseInt(key)) + 0.5 * xAxisScale().bandwidth() || 0} />,
                    ]
                )
            }
        }
        return unselectedPatients.concat(selectedPatients).concat(lineSet)
    }

    return <>
        <g className="chart-comp" >
            <text fontSize="13px"
                fill={Third_Gray} x={width} textAnchor="end" alignmentBaseline="hanging" y={0} className="highlight-label" />

            {generateScatterDots()}
            <g className="brush-layer" />
        </g>
        <g className="axes">
            <g className="y-axis"></g>
            <g className="x-axis" transform={`translate(0 ,${height - currentOffset.bottom} )`}>
                {xAggregationOption !== "CELL_SAVER_ML" ? <CustomizedAxisBand scalePadding={scalePadding} scaleDomain={JSON.stringify(xAxisScale().domain())} scaleRange={JSON.stringify(xAxisScale().range())} /> : <></>}
            </g>
            <text className="x-label" />
            <text className="y-label" />
        </g>

    </>
}

export default observer(ScatterPlot);

interface DotProps {
    isselected: boolean;
    isbrushed: boolean;
}
const ScatterDot = styled(`circle`) <DotProps>`
  r:4px;
  opacity:${props => props.isselected ? 1 : 0.5};
  stroke-width:2px;
  fill:${props => (props.isbrushed || props.isselected ? highlight_orange : Basic_Gray)};
`;


const StatisticalLine = styled(`line`)`
    stroke-width: 3px;
    stroke: #3498d5;
`