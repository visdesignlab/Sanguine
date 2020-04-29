import React, {
    FC,
    useMemo,
    useEffect,
    useState
} from "react";
import { actions } from "../..";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import {
    select,
    scaleLinear,
    scaleBand,
    max,
    axisLeft,
    axisTop,
    interpolateBlues,
    axisBottom,
    interpolateGreys,
    line,
    curveCatmullRom,
    scaleOrdinal,
    range,
    ScaleOrdinal,
    ScaleBand
} from "d3";
import {
    HeatMapDataPoint,
    offset,
    extraPairWidth,
    extraPairPadding,
    AxisLabelDict,
    BloodProductCap,
    minimumOffset
} from "../../Interfaces/ApplicationState";
import { Popup, Button, Icon } from 'semantic-ui-react'
// import SingleViolinPlot from "./SingleViolinPlot";
// import SingleStripPlot from "./SingleStripPlot";
import ExtraPairDumbbell from "../BarChart/ExtraPairDumbbell";
import ExtraPairBar from "../BarChart/ExtraPairBar";
import ExtraPairBasic from "../BarChart/ExtraPairBasic";
import ExtraPairViolin from "../BarChart/ExtraPairViolin";
import SingleHeatPlot from "./SingleHeatPlot";

interface OwnProps {
    aggregatedBy: string;
    valueToVisualize: string;
    chartId: string;
    store?: Store;
    dimensionWhole: { width: number, height: number }
    data: HeatMapDataPoint[];
    svg: React.RefObject<SVGSVGElement>;
    yMax: number;
    //  selectedVal: number | null;
    // stripPlotMode: boolean;
    extraPairDataSet: { name: string, data: any[], type: string, kdeMax?: number, medianSet?: any }[];
}

export type Props = OwnProps;

const HeatMap: FC<Props> = ({ extraPairDataSet, chartId, store, aggregatedBy, valueToVisualize, dimensionWhole, data, svg, yMax }: Props) => {

    const svgSelection = select(svg.current);

    const {
        // perCaseSelected,
        currentSelectPatient,
        currentSelectSet
    } = store!;

    const [extraPairTotalWidth, setExtraPairTotlaWidth] = useState(0)

    useEffect(() => {
        let totalWidth = 0
        extraPairDataSet.forEach((d) => {
            totalWidth += (extraPairWidth[d.type] + extraPairPadding)
        })
        setExtraPairTotlaWidth(totalWidth)
    }, [extraPairDataSet])

    const [dimension, aggregationScale, valueScale, caseScale] = useMemo(() => {

        const caseMax = max(data.map(d => d.caseCount)) || 0;
        const caseScale = scaleLinear().domain([0, caseMax]).range([0.25, 0.8])
        const dimension = {
            height: dimensionWhole.height,
            width: dimensionWhole.width - extraPairTotalWidth
        }

        const xVals = data
            .map(dp => dp.aggregateAttribute)
            .sort();



        let valueScale = scaleBand()
            .domain(range(0, BloodProductCap[valueToVisualize]) as any)
            .range([offset.left, dimension.width - offset.right - offset.margin])
            .paddingInner(0.01);

        let aggregationScale = scaleBand()
            .domain(xVals)
            .range([dimension.height - offset.bottom, offset.top])
            .paddingInner(0.1);

        return [dimension, aggregationScale, valueScale, caseScale];
    }, [dimensionWhole, data, yMax, extraPairDataSet])

    const aggregationLabel = axisLeft(aggregationScale);
    const valueLabel = axisBottom(valueScale);

    svgSelection
        .select(".axes")
        .select(".x-axis")
        .attr(
            "transform",
            `translate(${offset.left + extraPairTotalWidth}, 0)`
        )
        .call(aggregationLabel as any)
        .selectAll("text")
        .attr("transform", `translate(-35,0)`)

    svgSelection
        .select(".axes")
        .select(".y-axis")
        .attr(
            "transform",
            `translate(${extraPairTotalWidth} ,${dimension.height - offset.bottom})`
        )
        .call(valueLabel as any);

    svgSelection
        // .select(".axes")
        .select(".x-label")
        .attr("x", dimension.width * 0.5)
        .attr("y", dimension.height - offset.bottom + 20)
        .attr("alignment-baseline", "hanging")
        .attr("font-size", "11px")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(${extraPairTotalWidth},0)`)
        .text(() => {
            //const trailing = perCaseSelected ? " / Case" : "";
            return AxisLabelDict[valueToVisualize] ? AxisLabelDict[valueToVisualize] : valueToVisualize
        }
        );

    svgSelection
        //.select(".axes")
        .select(".y-label")
        .attr("y", dimension.height - offset.bottom + 20)
        .attr("x", offset.left - 55)
        .attr("font-size", "11px")
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "hanging")
        .attr("transform", `translate(${extraPairTotalWidth},0)`)
        .text(
            AxisLabelDict[aggregatedBy] ? AxisLabelDict[aggregatedBy] : aggregatedBy
        );

    const decideIfSelected = (d: HeatMapDataPoint) => {
        if (currentSelectPatient) {
            return currentSelectPatient[aggregatedBy] === d.aggregateAttribute
        }
        else if (currentSelectSet.length > 0) {
            //let selectSet: SelectSet;
            for (let selectSet of currentSelectSet) {
                if (aggregatedBy === selectSet.set_name && selectSet.set_value.includes(d.aggregateAttribute))
                    return true;
            }
            return false;
        }
        else {
            return false;
        }
        //  return true;
    }


    // const decideIfSelected = (d: BarChartDataPoint) => {
    //   if (selectedVal) {
    //     return selectedVal === d.aggregateAttribute
    //   }
    //   else if (currentSelectSet.length > 0) {
    //     //let selectSet: SelectSet;
    //     for (let selectSet of currentSelectSet) {
    //       if (d.case[selectSet.set_name] === selectSet.set_value)
    //         return true;
    //     }
    //     return

    //   else {
    //     return false;
    //   }
    // }

    const generateExtraPairPlots = () => {
        let transferedDistance = 0
        let returningComponents: any = []
        extraPairDataSet.map((pairData, index) => {
            switch (pairData.type) {
                case "Dumbbell":
                    transferedDistance += (extraPairWidth.Dumbbell + extraPairPadding)
                    returningComponents.push(<g transform={`translate(${transferedDistance - (extraPairWidth.Dumbbell)},0)`}>
                        <ExtraPairDumbbell aggregatedScale={aggregationScale} dataSet={pairData.data} />,
            <ExtraPairText
                            x={extraPairWidth.Dumbbell / 2}
                            y={dimension.height - offset.bottom + 20}
                            onClick={() => actions.removeExtraPair(chartId, pairData.name)}
                        >{pairData.name}</ExtraPairText>
                    </g>);
                    break;
                case "Violin":
                    transferedDistance += (extraPairWidth.Dumbbell + extraPairPadding)
                    returningComponents.push(<g transform={`translate(${transferedDistance - (extraPairWidth.Dumbbell)},0)`}>
                        <ExtraPairViolin
                            medianSet={pairData.medianSet}
                            aggregatedScale={aggregationScale}
                            dataSet={pairData.data}
                            name={pairData.name}
                            kdeMax={pairData.kdeMax ? pairData.kdeMax : (0)} />,
            <ExtraPairText
                            x={extraPairWidth.Dumbbell / 2}
                            y={dimension.height - offset.bottom + 20}
                            onClick={() => actions.removeExtraPair(chartId, pairData.name)}
                        >{pairData.name}</ExtraPairText>
                    </g>);
                    break;
                case "BarChart":
                    transferedDistance += (extraPairWidth.BarChart + extraPairPadding)
                    returningComponents.push(<g transform={`translate(${transferedDistance - (extraPairWidth.BarChart)},0)`}>
                        <ExtraPairBar aggregatedScale={aggregationScale} dataSet={pairData.data} />
                        <ExtraPairText
                            x={extraPairWidth.BarChart / 2}
                            y={dimension.height - offset.bottom + 20}
                            onClick={() => actions.removeExtraPair(chartId, pairData.name)}
                        >{pairData.name}</ExtraPairText>
                    </g>);
                    break;
                case "Basic":
                    transferedDistance += (extraPairWidth.Basic + extraPairPadding)
                    returningComponents.push(<g transform={`translate(${transferedDistance - (extraPairWidth.Basic)},0)`}>
                        <ExtraPairBasic aggregatedScale={aggregationScale} dataSet={pairData.data} />
                        <ExtraPairText
                            x={extraPairWidth.Basic / 2}
                            y={dimension.height - offset.bottom + 20}
                            onClick={() => actions.removeExtraPair(chartId, pairData.name)}
                        >{pairData.name}</ExtraPairText>
                    </g>);
                    break;
            }
        })
        return returningComponents
    }

    const outputSinglePlotElement = (dataPoint: HeatMapDataPoint) => {

        return ([<SingleHeatPlot
            isSelected={decideIfSelected(dataPoint)}
            bandwidth={aggregationScale.bandwidth()}
            valueScale={valueScale as ScaleBand<any>}
            aggregatedBy={aggregatedBy}
            dataPoint={dataPoint}
            howToTransform={(`translate(-${offset.left},${aggregationScale(
                dataPoint.aggregateAttribute
            )})`).toString()}
        />])


    }

    return (
        <>
            <line x1={1} x2={1} y1={offset.top} y2={dimension.height - offset.bottom} style={{ stroke: "#e5e5e5", strokeWidth: "1" }} />
            <g className="axes">
                <g className="x-axis"></g>
                <g className="y-axis"></g>
                <text className="x-label" />
                <text className="y-label" />
            </g>
            <g className="chart"
                transform={`translate(${offset.left + extraPairTotalWidth},0)`}
            >
                {data.map((dataPoint) => {
                    return outputSinglePlotElement(dataPoint).concat([
                        <rect
                            fill={interpolateGreys(caseScale(dataPoint.caseCount))}
                            x={-40}
                            y={aggregationScale(dataPoint.aggregateAttribute)}
                            width={35}
                            height={aggregationScale.bandwidth()}
                        />,
                        <text
                            fill="white"
                            x={-22.5}
                            y={
                                aggregationScale(dataPoint.aggregateAttribute)! +
                                0.5 * aggregationScale.bandwidth()
                            }
                            alignmentBaseline={"central"}
                            textAnchor={"middle"}
                        >
                            {dataPoint.caseCount}
                        </text>,
                    ]);
                })}
            </g>
            <g className="extraPairChart">
                {generateExtraPairPlots()}
            </g>


        </>
    );
}
export default inject("store")(observer(HeatMap));

const ExtraPairText = styled(`text`)`
  font-size: 11px
  text-anchor: middle
  alignment-baseline:hanging
  cursor:pointer
`
