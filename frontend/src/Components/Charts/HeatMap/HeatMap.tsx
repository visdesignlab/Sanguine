import { observer } from "mobx-react";
import { useContext } from "react";
import { FC, useEffect, useState } from "react";
import { HeatMapSortNoComparison } from "../../../HelperFunctions/ChartSorting";
import Store from "../../../Interfaces/Store";
import { ExtraPairPoint, HeatMapDataPoint } from "../../../Interfaces/Types/DataTypes";
import { BloodProductCap, CaseRectWidth, ExtraPairPadding, ExtraPairWidth, offset } from "../../../Presets/Constants";
import { stateUpdateWrapperUseJSON } from "../../../Interfaces/StateChecker";
import { useCallback } from "react";
import { AggregationScaleGenerator, CaseScaleGenerator, ValueScaleGenerator } from "../../../HelperFunctions/Scales";
import { interpolateGreys, range } from "d3";
import HeatMapAxis from "../ChartAccessories/HeatMapAxis";
import { ChartG, HeatMapDividerLine } from "../../../Presets/StyledSVGComponents";
import DualColorLegend from "../ChartAccessories/DualColorLegend";
import SingleColorLegend from "../ChartAccessories/SingleColorLegend";
import SingleHeatRow from "./SingleHeatRow";
import useDeepCompareEffect from 'use-deep-compare-effect'

type Props = {
    dimensionWidth: number;
    dimensionHeight: number;
    xAggregationOption: string;
    yValueOption: string;
    chartId: string;
    data: HeatMapDataPoint[];
    svg: React.RefObject<SVGSVGElement>;
    extraPairDataSet: ExtraPairPoint[];
}

const HeatMap: FC<Props> = ({ dimensionHeight, dimensionWidth, xAggregationOption, yValueOption, chartId, data, svg, extraPairDataSet }: Props) => {
    const store = useContext(Store)
    const currentOffset = offset.regular;
    const [extraPairTotalWidth, setExtraPairTotlaWidth] = useState(0)
    const [xVals, setXVals] = useState<any[]>([]);
    const [caseMax, setCaseMax] = useState(0);

    useDeepCompareEffect(() => {
        let totalWidth = extraPairDataSet.length > 0 ? (extraPairDataSet.length + 1) * ExtraPairPadding : 0;
        extraPairDataSet.forEach((d) => {
            totalWidth += (ExtraPairWidth[d.type])
        })
        console.log(totalWidth)
        setExtraPairTotlaWidth(totalWidth)

    }, [extraPairDataSet])

    useDeepCompareEffect(() => {
        const [tempxVals, newCaseMax] = HeatMapSortNoComparison(data, xAggregationOption, store.state.showZero)
        stateUpdateWrapperUseJSON(xVals, tempxVals, setXVals);
        setCaseMax(newCaseMax as number)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, store.state.showZero, xAggregationOption])

    const aggregationScale = useCallback(() => {
        return AggregationScaleGenerator(xVals, dimensionHeight, currentOffset)
    }, [dimensionHeight, xVals, currentOffset])

    const caseScale = useCallback(() => {
        return CaseScaleGenerator(caseMax)
    }, [caseMax])

    const valueScale = useCallback(() => {
        let outputRange
        if (yValueOption === "CELL_SAVER_ML") {
            outputRange = [-1].concat(range(0, BloodProductCap[yValueOption] + 100, 100))

        } else {
            outputRange = range(0, BloodProductCap[yValueOption] + 1)
        }
        return ValueScaleGenerator(outputRange, currentOffset, dimensionWidth, extraPairTotalWidth)
    }, [dimensionWidth, extraPairTotalWidth, yValueOption, currentOffset]);

    const outputSinglePlotElement = (dataPoint: HeatMapDataPoint) => {
        return ([<SingleHeatRow
            bandwidth={aggregationScale().bandwidth()}
            valueScaleDomain={JSON.stringify(valueScale().domain())}
            valueScaleRange={JSON.stringify(valueScale().range())}
            dataPoint={dataPoint}
            howToTransform={(`translate(-${currentOffset.left},${aggregationScale()(
                dataPoint.aggregateAttribute
            )})`).toString()}
        />])
    }


    return <>
        <HeatMapDividerLine dimensionHeight={dimensionHeight} currentOffset={currentOffset} />
        <HeatMapAxis
            svg={svg}
            currentOffset={currentOffset}
            xVals={xVals}
            dimensionHeight={dimensionHeight}
            dimensionWidth={dimensionHeight}
            extraPairTotalWidth={extraPairTotalWidth}
            yValueOption={yValueOption}
            valueScaleDomain={JSON.stringify(valueScale().domain())}
            valueScaleRange={JSON.stringify(valueScale().range())}
            xAggregationOption={xAggregationOption} />
        <g className="legend">
            {outputGradientLegend(store.state.showZero, dimensionWidth)}
        </g>
        <ChartG currentOffset={currentOffset} extraPairTotalWidth={extraPairTotalWidth}>
            {data.map((dataPoint) => {
                return outputSinglePlotElement(dataPoint).concat([
                    <rect
                        fill={interpolateGreys(caseScale()(store.state.showZero ? dataPoint.caseCount : (dataPoint.caseCount - dataPoint.zeroCaseNum)))}
                        x={-CaseRectWidth - 5}
                        y={aggregationScale()(dataPoint.aggregateAttribute)}
                        width={CaseRectWidth}
                        height={aggregationScale().bandwidth()}
                        // stroke={decideSinglePatientSelect(dataPoint) ? highlight_orange : "none"}
                        strokeWidth={2}
                    />,
                    <text
                        fill="white"
                        x={-20}
                        y={
                            aggregationScale()(dataPoint.aggregateAttribute)! +
                            0.5 * aggregationScale().bandwidth()
                        }
                        alignmentBaseline={"central"}
                        textAnchor={"middle"}
                        fontSize="12px"
                    >
                        {store.state.showZero ? dataPoint.caseCount : (dataPoint.caseCount - dataPoint.zeroCaseNum)}
                    </text>,
                ]);
            })}
        </ChartG>
    </>
}
export default observer(HeatMap)

export const outputGradientLegend = (showZero: boolean, dimensionWidth: number) => {
    if (!showZero) {
        return <DualColorLegend dimensionWidth={dimensionWidth} />
    } else {
        return <SingleColorLegend dimensionWidth={dimensionWidth} />
    }
}

