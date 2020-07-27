import React, {
    FC
} from "react";
import { inject, observer } from "mobx-react";
import { extraPairWidth, extraPairPadding, offset } from "../../PresetsProfile";
import { actions } from "../..";
import ExtraPairViolin from "../BarChart/ExtraPairViolin";
import ExtraPairBar from "../BarChart/ExtraPairBar";
import ExtraPairBasic from "../BarChart/ExtraPairBasic";
import styled from "styled-components";


interface OwnProps {
    extraPairDataSet: { name: string, data: any[], type: string, kdeMax?: number, medianSet?: any }[];
    // aggregationScale: ScaleBand<string>

    aggregationScaleDomain: string;
    aggregationScaleRange: string;
    chartId: string;
    height: number;
}

export type Props = OwnProps;

const ExtraPairPlotGenerator: FC<Props> = ({ extraPairDataSet, aggregationScaleDomain, aggregationScaleRange, chartId, height }: Props) => {

    const currentOffset = offset.regular;

    // const aggregationScale = useCallback(() => {
    //     const domain = JSON.parse(aggregationScaleDomain);
    //     const range = JSON.parse(aggregationScaleRange)
    //     const aggregationScale = scaleBand()
    //         .domain(domain)
    //         .range(range)
    //         .paddingInner(0.1);
    //     return aggregationScale
    // }, [aggregationScaleDomain, aggregationScaleRange])

    let transferedDistance = 0
    let returningComponents: any = []
    console.log(extraPairDataSet)
    extraPairDataSet.map((pairData, index) => {
        switch (pairData.type) {
            // case "Dumbbell":
            //     transferedDistance += (extraPairWidth.Dumbbell + extraPairPadding)
            //     returningComponents.push(<g transform={`translate(${transferedDistance - (extraPairWidth.Dumbbell)},0)`}>
            //         <ExtraPairDumbbell aggregatedScale={aggregationScale()} dataSet={pairData.data} />,
            //             <ExtraPairText
            //             x={extraPairWidth.Dumbbell / 2}
            //             y={height - currentOffset.bottom + 20}
            //             onClick={() => actions.removeExtraPair(chartId, pairData.name)}
            //         >{pairData.name}</ExtraPairText>
            //     </g>);
            //     break;
            case "Violin":
                transferedDistance += (extraPairWidth.Dumbbell + extraPairPadding)
                returningComponents.push(<g transform={`translate(${transferedDistance - (extraPairWidth.Dumbbell)},0)`}>
                    <ExtraPairViolin
                        medianSet={pairData.medianSet}
                        aggregationScaleDomain={aggregationScaleDomain}
                        aggregationScaleRange={aggregationScaleRange}
                        //                        aggregatedScale={aggregationScale()}
                        dataSet={pairData.data}
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
                    <ExtraPairBar
                        aggregationScaleDomain={aggregationScaleDomain}
                        aggregationScaleRange={aggregationScaleRange}
                        dataSet={pairData.data} />
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

                    <ExtraPairBasic
                        aggregationScaleDomain={aggregationScaleDomain}
                        aggregationScaleRange={aggregationScaleRange}
                        name={pairData.name}
                        dataSet={pairData.data} />
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

export default inject("store")(observer(ExtraPairPlotGenerator));

const ExtraPairText = styled(`text`)`
  font-size: 11px
  text-anchor: middle
  alignment-baseline:hanging
  cursor:pointer
`
