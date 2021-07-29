import { scaleBand, scaleLinear, select } from "d3";
import { FC, useCallback, useEffect, useState } from "react"
import { CostBarChartDataPoint } from "../../../Interfaces/Types/DataTypes"
import { greyScaleRange, OffsetDict } from "../../../Presets/Constants";
import { stateUpdateWrapperUseJSON } from "../../../Interfaces/StateChecker";
import useDeepCompareEffect from "use-deep-compare-effect";
import { observer } from "mobx-react";
import HeatMapAxis from "../ChartAccessories/HeatMapAxis";
import { ChartG } from "../../../Presets/StyledSVGComponents";
import SingleStackedBar from "./SingleStackedBar";

type Props = {
    xAggregationOption: string;
    data: CostBarChartDataPoint[];
    //secondary Data is the "true" data in interventions
    secondaryData?: CostBarChartDataPoint[];
    svg: React.RefObject<SVGSVGElement>;
    dimensionWidth: number;
    dimensionHeight: number;
    maximumCost: number;
    maxSavedNegative: number;
    costMode: boolean;
    showPotential: boolean;
}

const StackedBarChart: FC<Props> = ({ xAggregationOption, secondaryData, svg, data, dimensionWidth, dimensionHeight, maximumCost, maxSavedNegative, costMode, showPotential }: Props) => {
    const svgSelection = select(svg.current);
    const currentOffset = OffsetDict.regular;
    const [caseMax, setCaseMax] = useState(0);
    const [xVals, setXVals] = useState([]);

    useDeepCompareEffect(() => {
        let newCaseMax = 0;
        if (secondaryData) {
            console.log(secondaryData)
            let dataToObj: any = {}
            let dataXVals: string[] = []
            secondaryData.map((d: CostBarChartDataPoint) => {
                dataToObj[d.aggregateAttribute] = d.caseNum;
                newCaseMax = newCaseMax > d.caseNum ? newCaseMax : d.caseNum
                dataXVals.push(d.aggregateAttribute)
            })
            data.map((d: CostBarChartDataPoint) => {
                if (dataToObj[d.aggregateAttribute]) {
                    dataToObj[d.aggregateAttribute] += d.caseNum;
                } else {
                    dataToObj[d.aggregateAttribute] = d.caseNum;
                    dataXVals.push(d.aggregateAttribute)
                }
                newCaseMax = newCaseMax > d.caseNum ? newCaseMax : d.caseNum
            })
            dataXVals.sort((a, b) => {
                if (xAggregationOption === "YEAR") {
                    return parseInt(a) - parseInt(b)
                } else {
                    return dataToObj[a] - dataToObj[b];
                }
            })
            stateUpdateWrapperUseJSON(xVals, dataXVals, setXVals);
            setCaseMax(newCaseMax)
        }
        else {
            const tempXVals = data.sort((a, b) => {
                if (xAggregationOption === "YEAR") {
                    return a.aggregateAttribute - b.aggregateAttribute
                } else {
                    return a.caseNum - b.caseNum
                }
            }).map((dp) => {
                newCaseMax = newCaseMax > dp.caseNum ? newCaseMax : dp.caseNum
                return dp.aggregateAttribute
            });
            stateUpdateWrapperUseJSON(xVals, tempXVals, setXVals);
            setCaseMax(newCaseMax)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, xAggregationOption, secondaryData]);


    const aggregationScale = useCallback(() => {
        const aggregationScale = scaleBand()
            .domain(xVals)
            .range([dimensionHeight - currentOffset.bottom, currentOffset.top])
            .paddingInner(0.1);
        return aggregationScale;
    }, [dimensionHeight, xVals, currentOffset]);

    const valueScale = useCallback(() => {
        let valueScale = scaleLinear()
            .domain([maxSavedNegative, maximumCost])
            .range([currentOffset.left, dimensionWidth - currentOffset.right - currentOffset.margin])
        return valueScale
    }, [dimensionWidth, maximumCost, maxSavedNegative, currentOffset]);

    const caseScale = useCallback(() => {
        const caseScale = scaleLinear().domain([0, caseMax]).range(greyScaleRange);
        return caseScale;
    }, [caseMax])


    return (
        <>
            <HeatMapAxis
                svg={svg}
                currentOffset={currentOffset}
                xVals={xVals}
                isValueScaleBand={false}
                dimensionHeight={dimensionHeight}
                dimensionWidth={dimensionHeight}
                extraPairTotalWidth={0}
                yValueOption={costMode ? "Per Case Cost in Dollars" : "Units per Case"}
                valueScaleDomain={JSON.stringify(valueScale().domain())}
                valueScaleRange={JSON.stringify(valueScale().range())}
                xAggregationOption={xAggregationOption} />
            <g className="chart-comp" >
                {data.map((dp) => {
                    return (
                        <SingleStackedBar
                            dataPoint={dp}
                            howToTransform={(`translate(0,${(aggregationScale()(dp.aggregateAttribute) || 0) + (secondaryData ? (aggregationScale().bandwidth() * 0.5) : 0)})`).toString()}
                            valueScaleDomain={JSON.stringify(valueScale().domain())}
                            valueScaleRange={JSON.stringify(valueScale().range())}
                            bandwidth={secondaryData ? aggregationScale().bandwidth() * 0.5 : aggregationScale().bandwidth()}
                            costMode={costMode}
                            showPotential={showPotential} />)
                })}
                {secondaryData ? secondaryData.map((dp) => {
                    console.log(dp)
                    return (
                        <SingleStackedBar
                            dataPoint={dp}
                            howToTransform={(`translate(0,${aggregationScale()(dp.aggregateAttribute) || 0})`).toString()}
                            valueScaleDomain={JSON.stringify(valueScale().domain())}
                            valueScaleRange={JSON.stringify(valueScale().range())}
                            bandwidth={aggregationScale().bandwidth() * 0.5}
                            costMode={costMode}
                            showPotential={showPotential} />)
                }) : <></>}
            </g>
        </>
    )
}

export default observer(StackedBarChart);