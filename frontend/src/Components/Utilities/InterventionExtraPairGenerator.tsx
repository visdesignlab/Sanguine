
import React, { FC } from "react";
import { inject, observer } from "mobx-react";
import { extraPairWidth, extraPairPadding, offset } from "../../PresetsProfile";
import { actions } from "../..";
// import ExtraPairViolin from "../BarChart/ExtraPairViolin";
// import ExtraPairBar from "../BarChart/ExtraPairBar";
import ExtraPairBasicInt from "../InterventionPlot/ExtraPairBaiscInt";
import styled from "styled-components";
import ExtraPairBarInt from "../InterventionPlot/ExtraPairBarInt";
import ExtraPairViolinInt from "../InterventionPlot/ExtraPairViolinInt";

//import ExtraPairOutcomes from "../BarChart/ExtraPairOutcomes";

interface OwnProps {
    extraPairDataSet: {
        name: string,
        totalIntData: any[],
        preIntData: any[],
        postIntData: any[],
        type: string,
        kdeMax?: number,
        totalMedianSet?: any,
        preMedianSet?: any,
        postMedianSet?: any
    }[];

    // aggregationScale: ScaleBand<string>
    aggregationScaleDomain: string;
    aggregationScaleRange: string;

    chartId: string;
    // dimension: { height: number, width: number }
    height: number;
}

export type Props = OwnProps;

const InterventionExtraPairGenerator: FC<Props> = ({ extraPairDataSet, aggregationScaleDomain, aggregationScaleRange, chartId, height }: Props) => {

    const currentOffset = offset.regular;

    let transferedDistance = 0
    let returningComponents: any = []
    console.log(extraPairDataSet)
    extraPairDataSet.map((pairData, index) => {
        switch (pairData.type) {
            case "Violin":
                transferedDistance += (extraPairWidth.Dumbbell + extraPairPadding)
                returningComponents.push(<g transform={`translate(${transferedDistance - (extraPairWidth.Dumbbell)},0)`}>
                    <ExtraPairViolinInt
                        postMedianSet={pairData.postMedianSet}
                        preMedianSet={pairData.preMedianSet}
                        totalMedianSet={pairData.totalMedianSet}
                        preIntData={pairData.preIntData}
                        postIntData={pairData.postIntData}
                        totalData={pairData.totalIntData}
                        // aggregatedScale={aggregationScale}
                        aggregationScaleDomain={aggregationScaleDomain}
                        aggregationScaleRange={aggregationScaleRange}
                        name={pairData.name}
                        kdeMax={pairData.kdeMax ? pairData.kdeMax : (0)} />,

                        <ExtraPairText
                        x={extraPairWidth.Dumbbell / 2}
                        y={height - currentOffset.bottom + 20}
                        onClick={() => actions.removeExtraPair(chartId, pairData.name)}
                    >{pairData.name === "RISK" ? pairData.name : `${pairData.name}, ${pairData.name === "Preop HGB" ? 13 : 7.5}`}</ExtraPairText>
                </g>);
                break;

            case "BarChart":
                transferedDistance += (extraPairWidth.BarChart + extraPairPadding)
                returningComponents.push(<g transform={`translate(${transferedDistance - (extraPairWidth.BarChart)},0)`}>
                    <ExtraPairBarInt
                        aggregationScaleDomain={aggregationScaleDomain}
                        aggregationScaleRange={aggregationScaleRange}
                        preDataSet={pairData.preIntData}
                        postDataSet={pairData.postIntData}
                        totalDataSet={pairData.totalIntData} />
                    <ExtraPairText
                        x={extraPairWidth.BarChart / 2}
                        y={height - currentOffset.bottom + 20}
                        onClick={() => actions.removeExtraPair(chartId, pairData.name)}
                    >{pairData.name}</ExtraPairText>
                </g>);
                break;
            case "Basic":
                transferedDistance += (extraPairWidth.Basic + extraPairPadding)
                returningComponents.push(<g transform={`translate(${transferedDistance - (extraPairWidth.Basic)},0)`}>
                    <ExtraPairBasicInt
                        aggregationScaleDomain={aggregationScaleDomain}
                        aggregationScaleRange={aggregationScaleRange}
                        preIntData={pairData.preIntData}
                        postIntData={pairData.postIntData}
                        totalData={pairData.totalIntData}
                        name={pairData.name} />
                    <ExtraPairText
                        x={extraPairWidth.Basic / 2}
                        y={height - currentOffset.bottom + 20}
                        onClick={() => actions.removeExtraPair(chartId, pairData.name)}
                    >{pairData.name}</ExtraPairText>
                </g>);
                break;
        }
    })
    return returningComponents


}

export default inject("store")(observer(InterventionExtraPairGenerator));

const ExtraPairText = styled(`text`)`
  font-size: 11px
  text-anchor: middle
  alignment-baseline:hanging
  cursor:pointer
`
