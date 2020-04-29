import React, {
    FC,
    useMemo,
    useEffect,
    useState
} from "react";
import Store from "../../Interfaces/Store";
import { inject, observer } from "mobx-react";
import { extraPairWidth, extraPairPadding, offset } from "../../Interfaces/ApplicationState";
import ExtraPairDumbbell from "../BarChart/ExtraPairDumbbell";
import { actions } from "../..";
import ExtraPairViolin from "../BarChart/ExtraPairViolin";
import ExtraPairBar from "../BarChart/ExtraPairBar";
import ExtraPairBasic from "../BarChart/ExtraPairBasic";
import { ScaleBand } from "d3";
import styled from "styled-components";

interface OwnProps {
    extraPairDataSet: { name: string, data: any[], type: string, kdeMax?: number, medianSet?: any }[];
    aggregationScale: ScaleBand<string>
    chartId: string;
    dimension: { height: number, width: number }
}

export type Props = OwnProps;

const ExtraPairPlotGenerator: FC<Props> = ({ extraPairDataSet, aggregationScale, chartId, dimension }: Props) => {


    let transferedDistance = 0
    let returningComponents: any = []
    console.log(extraPairDataSet)
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

export default inject("store")(observer(ExtraPairPlotGenerator));

const ExtraPairText = styled(`text`)`
  font-size: 11px
  text-anchor: middle
  alignment-baseline:hanging
  cursor:pointer
`
