import { observer } from "mobx-react";
import { useContext } from "react";
import { FC, useState } from "react";
import { sortHelper } from "../../../HelperFunctions/ChartSorting";
import Store from "../../../Interfaces/Store";
import { ExtraPairPoint, HeatMapDataPoint } from "../../../Interfaces/Types/DataTypes";
import { BloodProductCap, DifferentialSquareWidth, ExtraPairPadding, ExtraPairWidth, OffsetDict, postop_color, preop_color } from "../../../Presets/Constants";
import { stateUpdateWrapperUseJSON } from "../../../Interfaces/StateChecker";
import { useCallback } from "react";
import { AggregationScaleGenerator, ValueScaleGenerator } from "../../../HelperFunctions/Scales";
import { range, timeFormat } from "d3";
import HeatMapAxis from "../ChartAccessories/HeatMapAxis";
import { ChartG, HeatMapDividerLine } from "../../../Presets/StyledSVGComponents";
import DualColorLegend from "../ChartAccessories/DualColorLegend";
import SingleColorLegend from "../ChartAccessories/SingleColorLegend";
import SingleHeatRow from "./SingleHeatRow";
import useDeepCompareEffect from 'use-deep-compare-effect';
import CaseCountHeader from "../ChartAccessories/CaseCountHeader";
import GeneratorExtraPair from "../ChartAccessories/ExtraPairPlots/GeneratorExtraPair";
import ComparisonLegend from "../ChartAccessories/ComparisonLegend";


type Props = {
    dimensionWidth: number;
    dimensionHeight: number;
    xAggregationOption: string;
    yValueOption: string;
    chartId: string;
    data: HeatMapDataPoint[];
    svg: React.RefObject<SVGSVGElement>;
    extraPairDataSet: ExtraPairPoint[];
    extraPairTotalWidth: number;
    interventionDate?: number;
    secondaryData?: HeatMapDataPoint[];
    secondaryExtraPairDataSet?: ExtraPairPoint[];
    firstTotal: number;
    secondTotal: number;
    outcomeComparison: string;
}

const HeatMap: FC<Props> = ({ outcomeComparison, interventionDate, secondaryExtraPairDataSet, dimensionHeight, secondaryData, dimensionWidth, xAggregationOption, yValueOption, chartId, data, svg, extraPairDataSet, extraPairTotalWidth, firstTotal, secondTotal }: Props) => {
    const store = useContext(Store)
    const currentOffset = OffsetDict.regular;
    const [xVals, setXVals] = useState<any[]>([]);
    const [caseMax, setCaseMax] = useState(0);


    useDeepCompareEffect(() => {
        const [tempxVals, newCaseMax] = sortHelper(data, xAggregationOption, store.state.showZero, secondaryData)
        stateUpdateWrapperUseJSON(xVals, tempxVals, setXVals);
        setCaseMax(newCaseMax as number)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, store.state.showZero, xAggregationOption, secondaryData])

    const aggregationScale = useCallback(() => {
        return AggregationScaleGenerator(xVals, dimensionHeight, currentOffset)
    }, [dimensionHeight, xVals, currentOffset])

    const valueScale = useCallback(() => {
        let outputRange
        if (yValueOption === "CELL_SAVER_ML") {
            outputRange = [-1].concat(range(0, BloodProductCap[yValueOption] + 100, 100))

        } else {
            outputRange = range(0, BloodProductCap[yValueOption] + 1)
        }
        return ValueScaleGenerator(outputRange, currentOffset, dimensionWidth, extraPairTotalWidth)
    }, [dimensionWidth, extraPairTotalWidth, yValueOption, currentOffset]);


    return (<>
        <HeatMapDividerLine dimensionHeight={dimensionHeight} currentOffset={currentOffset} />
        <HeatMapAxis
            svg={svg}
            currentOffset={currentOffset}
            xVals={xVals}
            isValueScaleBand={true}
            dimensionHeight={dimensionHeight}
            dimensionWidth={dimensionWidth}
            extraPairTotalWidth={extraPairTotalWidth}
            yValueOption={yValueOption}
            valueScaleDomain={JSON.stringify(valueScale().domain())}
            valueScaleRange={JSON.stringify(valueScale().range())}
            xAggregationOption={xAggregationOption} />
        <g className="legend">
            {outputGradientLegend(store.state.showZero, dimensionWidth)}
        </g>

        {secondaryData ? <ComparisonLegend
            dimensionWidth={dimensionWidth}
            interventionDate={interventionDate}
            firstTotal={firstTotal}
            secondTotal={secondTotal}
            outcomeComparison={outcomeComparison}
        /> : <></>}

        <g>
            {data.map((dataPoint) => {
                return (
                    <g>
                        <SingleHeatRow
                            bandwidth={secondaryData ? aggregationScale().bandwidth() * 0.5 : aggregationScale().bandwidth()}
                            valueScaleDomain={JSON.stringify(valueScale().domain())}
                            valueScaleRange={JSON.stringify(valueScale().range())}
                            dataPoint={dataPoint}
                            howToTransform={`translate(0,${(aggregationScale()(dataPoint.aggregateAttribute) || 0) + (secondaryData ? (aggregationScale().bandwidth() * 0.5) : 0)})`}
                        />
                        <ChartG currentOffset={currentOffset} extraPairTotalWidth={extraPairTotalWidth}>
                            <CaseCountHeader
                                caseCount={dataPoint.caseCount}
                                yPos={(aggregationScale()(dataPoint.aggregateAttribute) || 0) + (secondaryData ? (aggregationScale().bandwidth() * 0.5) : 0)}
                                height={(secondaryData ? 0.5 : 1) * aggregationScale().bandwidth()}
                                zeroCaseNum={dataPoint.zeroCaseNum}
                                showComparisonRect={secondaryData ? true : false}
                                isFalseComparison={true}
                                caseMax={caseMax} />
                        </ChartG>
                    </g>)
            })}
            {secondaryData ? secondaryData.map((dataPoint) => {
                return (
                    <g>
                        <SingleHeatRow

                            bandwidth={aggregationScale().bandwidth() * 0.5}
                            valueScaleDomain={JSON.stringify(valueScale().domain())}
                            valueScaleRange={JSON.stringify(valueScale().range())}
                            dataPoint={dataPoint}
                            howToTransform={`translate(0,${(aggregationScale()(dataPoint.aggregateAttribute) || 0)})`}
                        />
                        <ChartG currentOffset={currentOffset} extraPairTotalWidth={extraPairTotalWidth}>
                            <CaseCountHeader
                                showComparisonRect={true}
                                isFalseComparison={false}
                                caseCount={dataPoint.caseCount}
                                yPos={aggregationScale()(dataPoint.aggregateAttribute) || 0}
                                height={0.5 * aggregationScale().bandwidth()}
                                zeroCaseNum={dataPoint.zeroCaseNum}
                                caseMax={caseMax} />
                        </ChartG>
                    </g>)
            }) : <></>}
        </g>
        <g className="extraPairChart">
            <GeneratorExtraPair
                extraPairDataSet={extraPairDataSet}
                secondaryExtraPairDataSet={secondaryExtraPairDataSet ? secondaryExtraPairDataSet : undefined}
                chartId={chartId}
                aggregationScaleDomain={JSON.stringify(aggregationScale().domain())}
                aggregationScaleRange={JSON.stringify(aggregationScale().range())}
                height={dimensionHeight} />

        </g>
    </>)
}

export default observer(HeatMap)

export const outputGradientLegend = (showZero: boolean, dimensionWidth: number) => {
    if (!showZero) {
        return <DualColorLegend dimensionWidth={dimensionWidth} />
    } else {
        return <SingleColorLegend dimensionWidth={dimensionWidth} />
    }
}

