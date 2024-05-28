import { observer } from "mobx-react";
import { useContext, useMemo, useRef } from "react";
import { FC, useState } from "react";
import { sortHelper } from "../../../HelperFunctions/ChartSorting";
import Store from "../../../Interfaces/Store";
import { ExtraPairPoint, HeatMapDataPoint } from "../../../Interfaces/Types/DataTypes";
import { Basic_Gray, BloodProductCap, ExtraPairPadding, ExtraPairWidth, HGB_HIGH_STANDARD, HGB_LOW_STANDARD, MIN_HEATMAP_BANDWIDTH, OffsetDict, largeFontSize, regularFontSize } from "../../../Presets/Constants";
import { stateUpdateWrapperUseJSON } from "../../../Interfaces/StateChecker";
import { useCallback } from "react";
import { AggregationScaleGenerator, ValueScaleGenerator } from "../../../HelperFunctions/Scales";
import { format, max, range } from "d3";
import { BiggerFontProps, ChartG, HeatMapDividerLine } from "../../../Presets/StyledSVGComponents";
import DualColorLegend from "../ChartAccessories/DualColorLegend";
import SingleColorLegend from "../ChartAccessories/SingleColorLegend";
import SingleHeatRow from "./SingleHeatRow";
import useDeepCompareEffect from 'use-deep-compare-effect';
import CaseCountHeader from "../ChartAccessories/CaseCountHeader";
import GeneratorExtraPair from "../ChartAccessories/ExtraPairPlots/GeneratorExtraPair";
import ComparisonLegend from "../ChartAccessories/ComparisonLegend";
import HeatMapAxisX from "../ChartAccessories/HeatMapAxisX";
import HeatMapAxisY from "../ChartAccessories/HeatMapAxisY";
import { BiggerTooltip } from "../../../Presets/StyledComponents";
import { AcronymDictionary } from "../../../Presets/DataDict";
import { Tooltip, styled } from "@mui/material";

const ExtraPairText = styled(`text`) <BiggerFontProps>`
  font-size: ${props => props.biggerFont ? `${largeFontSize}px` : `${regularFontSize}px`};
  text-anchor: middle;
  alignment-baseline:hanging;
  cursor:pointer;
    &:hover tspan {
        opacity:1;
  }
`;

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
};

const HeatMap: FC<Props> = ({ outcomeComparison, interventionDate, secondaryExtraPairDataSet, dimensionHeight, secondaryData, dimensionWidth, xAggregationOption, yValueOption, chartId, data, svg, extraPairDataSet, extraPairTotalWidth, firstTotal, secondTotal }: Props) => {
    const store = useContext(Store);
    const currentOffset = OffsetDict.regular;
    const [xVals, setXVals] = useState<any[]>([]);
    const [caseMax, setCaseMax] = useState(0);

    const extraPairTextGenerator = (nameInput: string, labelInput: string, type: "Basic" | "Violin" | "BarChart",
        extraPairDataSet: ExtraPairPoint, index: number, allExtraPairs: ExtraPairPoint[]) => {
        let explanation = "";
        let spacing = 0;
        switch (type) {
            case "Basic":
                explanation = `Percentage of Patients`;
                spacing = ExtraPairWidth.Basic;
                break;
            case "Violin":
                explanation = nameInput === "RISK" ? `Scaled 0-30` : (`Scaled 0-18, line at ${nameInput === "Preop HGB" ? HGB_HIGH_STANDARD : HGB_LOW_STANDARD}`);
                spacing = ExtraPairWidth.Violin;
                break;
            case "BarChart":
                let maximum = max(Object.values(extraPairDataSet.data));
                explanation = `Scaled 0-${format(".4r")(maximum)}`;
                spacing = ExtraPairWidth.BarChart;
                break;
        }

        let tooltipText = <BiggerTooltip>
            {AcronymDictionary[nameInput] ? `${AcronymDictionary[nameInput]}` : undefined}
            {AcronymDictionary[nameInput] ? <br /> : <></>}
            {explanation} <br />
            (Click to remove)
        </BiggerTooltip>;

        const xPadding: number = allExtraPairs.slice(0, index + 1).map((extraPair) => ExtraPairWidth[extraPair.type] + ExtraPairPadding).reduce((partialSum, a) => partialSum + a , 0);

        return (
            <Tooltip title={tooltipText}>
                <ExtraPairText
                    x={xPadding - ExtraPairWidth[type]/2}
                    y={dimensionHeight - currentOffset.bottom + 25}
                    biggerFont={store.configStore.largeFont}
                    onClick={() => {
                        store.chartStore.removeExtraPair(chartId, nameInput);
                    }}
                >
                    {labelInput}
                    <RemoveTSpan x={xPadding - ExtraPairWidth[type]/2} dy="-0.5em" >x</RemoveTSpan>
                </ExtraPairText>
            </Tooltip>);


    };


    useDeepCompareEffect(() => {
        const [tempxVals, newCaseMax] = sortHelper(data, xAggregationOption, store.provenanceState.showZero, secondaryData);
        stateUpdateWrapperUseJSON(xVals, tempxVals, setXVals);
        setCaseMax(newCaseMax as number);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, store.provenanceState.showZero, xAggregationOption, secondaryData]);

    const chartHeight = useMemo(() => Math.max(
        dimensionHeight,
        data.length * MIN_HEATMAP_BANDWIDTH(secondaryData) + OffsetDict.regular.top + OffsetDict.regular.bottom,
    ), [data.length, dimensionHeight, secondaryData]);

    const aggregationScale = useCallback(() => {
        return AggregationScaleGenerator(xVals, chartHeight, currentOffset);
    }, [xVals, currentOffset, chartHeight]);

    const valueScale = useCallback(() => {
        let outputRange;
        if (yValueOption === "CELL_SAVER_ML") {
            outputRange = [-1].concat(range(0, BloodProductCap[yValueOption] + 100, 100));

        } else {
            outputRange = range(0, BloodProductCap[yValueOption] + 1);
        }
        return ValueScaleGenerator(outputRange, currentOffset, dimensionWidth, extraPairTotalWidth);
    }, [dimensionWidth, extraPairTotalWidth, yValueOption, currentOffset]);

    const innerSvg = useRef<SVGSVGElement | null>(null);


    return (<g>
        <foreignObject style={{ width: '100%', height: `${dimensionHeight - currentOffset.bottom - currentOffset.top}px`, overflow: 'scroll', overflowY: 'scroll'}} transform={`translate(0,${currentOffset.top})`}>
            <svg style={{ height: `${chartHeight - currentOffset.bottom - currentOffset.top}px`, width: '100%' }} ref={innerSvg}>
                <HeatMapAxisY
                    svg={innerSvg}
                    currentOffset={currentOffset}
                    xVals={xVals}
                    isValueScaleBand={true}
                    dimensionHeight={chartHeight}
                    dimensionWidth={dimensionWidth}
                    extraPairTotalWidth={extraPairTotalWidth}
                    yValueOption={yValueOption}
                    valueScaleDomain={JSON.stringify(valueScale().domain())}
                    valueScaleRange={JSON.stringify(valueScale().range())}
                    xAggregationOption={xAggregationOption} 
                />
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
                            </g>);
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
                            </g>);
                    }) : <></>}
                </g>
                <g className="extraPairChart">
                    <GeneratorExtraPair
                        extraPairDataSet={extraPairDataSet}
                        secondaryExtraPairDataSet={secondaryExtraPairDataSet ? secondaryExtraPairDataSet : undefined}
                        chartId={chartId}
                        aggregationScaleDomain={JSON.stringify(aggregationScale().domain())}
                        aggregationScaleRange={JSON.stringify(aggregationScale().range())}
                        height={chartHeight} />

                </g>
            </svg>
        </foreignObject>

        {/* Render after chart to render on top */}
        {extraPairDataSet.map((extraPair, index) => extraPairTextGenerator(extraPair.name, extraPair.label, extraPair.type, extraPair, index, extraPairDataSet))}
        <HeatMapAxisX
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
            xAggregationOption={xAggregationOption} 
        />

        {/* Make the top elements render on top */}
        <rect fill="#FFFFFF" width={dimensionWidth} height={currentOffset.top} />
        <HeatMapDividerLine dimensionHeight={chartHeight} currentOffset={currentOffset} />

        <g className="legend" transform="translate(0,5)">
            {outputGradientLegend(store.provenanceState.showZero, dimensionWidth)}
        </g>

        {secondaryData ? <ComparisonLegend
            dimensionWidth={dimensionWidth}
            interventionDate={interventionDate}
            firstTotal={firstTotal}
            secondTotal={secondTotal}
            outcomeComparison={outcomeComparison}
        /> : <></>}
    </g>);
};

export default observer(HeatMap);

export const outputGradientLegend = (showZero: boolean, dimensionWidth: number) => {
    if (!showZero) {
        return <DualColorLegend dimensionWidth={dimensionWidth} />;
    } else {
        return <SingleColorLegend dimensionWidth={dimensionWidth} />;
    }
};

const RemoveTSpan = styled(`tspan`)`
    font-size:10px;
    fill:${Basic_Gray};
    opacity:0;
     &:hover{
        opacity:1;
     }
`;

