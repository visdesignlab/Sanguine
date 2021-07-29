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
import CaseCountHeader from "../ChartAccessories/CaseCountHeader";
import { sortHelper } from "../../../HelperFunctions/ChartSorting";
import { useContext } from "react";
import Store from "../../../Interfaces/Store";

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
    const store = useContext(Store);
    const currentOffset = OffsetDict.regular;
    const [caseMax, setCaseMax] = useState(0);
    const [xVals, setXVals] = useState([]);

    useDeepCompareEffect(() => {
        const [tempxVals, newCaseMax] = sortHelper(data, xAggregationOption, store.state.showZero, secondaryData)
        stateUpdateWrapperUseJSON(xVals, tempxVals, setXVals);
        setCaseMax(newCaseMax as number)
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
                        <g>
                            <SingleStackedBar
                                dataPoint={dp}
                                howToTransform={(`translate(0,${(aggregationScale()(dp.aggregateAttribute) || 0) + (secondaryData ? (aggregationScale().bandwidth() * 0.5) : 0)})`).toString()}
                                valueScaleDomain={JSON.stringify(valueScale().domain())}
                                valueScaleRange={JSON.stringify(valueScale().range())}
                                bandwidth={secondaryData ? aggregationScale().bandwidth() * 0.5 : aggregationScale().bandwidth()}
                                costMode={costMode}
                                showPotential={showPotential} />
                            <ChartG extraPairTotalWidth={0} currentOffset={currentOffset}>
                                <CaseCountHeader
                                    height={(secondaryData ? 0.5 : 1) * aggregationScale().bandwidth()}
                                    zeroCaseNum={0}
                                    yPos={(aggregationScale()(dp.aggregateAttribute) || 0) + (secondaryData ? (aggregationScale().bandwidth() * 0.5) : 0)}
                                    caseMax={caseMax}
                                    caseCount={dp.caseCount} />
                            </ChartG>
                        </g>)
                })}
                {secondaryData ? secondaryData.map((dp) => {
                    console.log(dp)
                    return (
                        <g>
                            <SingleStackedBar
                                dataPoint={dp}
                                howToTransform={(`translate(0,${aggregationScale()(dp.aggregateAttribute) || 0})`).toString()}
                                valueScaleDomain={JSON.stringify(valueScale().domain())}
                                valueScaleRange={JSON.stringify(valueScale().range())}
                                bandwidth={aggregationScale().bandwidth() * 0.5}
                                costMode={costMode}
                                showPotential={showPotential} />
                            <ChartG extraPairTotalWidth={0} currentOffset={currentOffset}>
                                <CaseCountHeader
                                    height={0.5 * aggregationScale().bandwidth()}
                                    zeroCaseNum={0}
                                    yPos={(aggregationScale()(dp.aggregateAttribute) || 0)}
                                    caseMax={caseMax}
                                    caseCount={dp.caseCount} />
                            </ChartG>
                        </g>)
                }) : <></>}

            </g>
        </>
    )
}

export default observer(StackedBarChart);