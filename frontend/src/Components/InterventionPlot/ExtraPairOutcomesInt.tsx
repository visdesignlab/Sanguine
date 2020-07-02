import React, { FC, useCallback } from "react";
import Store from "../../Interfaces/Store";
import { inject, observer } from "mobx-react";
import { format, scaleBand, scaleLinear, interpolateGreys } from "d3";
import { extraPairWidth, greyScaleRange } from "../../PresetsProfile"
import { Popup } from "semantic-ui-react";
import { secondary_gray } from "../../PresetsProfile";

interface OwnProps {
    totalData: any[];
    preIntData: any[];
    postIntData: any[];
    outcomeName: string;
    //  aggregatedScale: ScaleBand<string>;
    aggregationScaleDomain: string;
    aggregationScaleRange: string;
    //yMax:number;
    store?: Store;
}

export type Props = OwnProps;

const ExtraPairBasicInt: FC<Props> = ({ totalData, outcomeName, preIntData, postIntData, aggregationScaleRange, aggregationScaleDomain, store }: Props) => {
    // const [valueScale] = useMemo(() => {
    //     //console.log(dataSet)
    //     const valueScale = scaleLinear().domain([0, 1]).range([0.25, 0.8])

    //     return [valueScale];
    // }, [])

    const aggregatedScale = useCallback(() => {
        const aggregatedScale = scaleBand().domain(JSON.parse(aggregationScaleDomain)).range(JSON.parse(aggregationScaleRange)).paddingInner(0.1);
        return aggregatedScale
    }, [aggregationScaleDomain, aggregationScaleRange])
    const outcomeScale = useCallback(() => {
        let outcomeScale;
        if (outcomeName === "RISK") {
            outcomeScale = scaleLinear().domain([0, 30]).range(greyScaleRange)
        } else {
            outcomeScale = scaleLinear().domain([0, 1]).range(greyScaleRange)
        }
        return outcomeScale
    }, [outcomeName])
    const outputText = () => {
        let output = [];
        if (aggregatedScale().bandwidth() > 40) {
            output = Object.entries(preIntData).map(([val, dataVal]) => {
                return (
                    [<Popup
                        content={format(".4r")(dataVal)}
                        trigger={
                            <rect
                                x={0}
                                y={aggregatedScale()(val)}
                                // fill={interpolateGreys(caseScale(dataPoint.caseCount))}
                                // fill={interpolateGreys(valueScale(dataVal))}
                                fill={interpolateGreys(outcomeScale()(dataVal || 0))}
                                opacity={0.8}
                                width={extraPairWidth.Basic}
                                height={aggregatedScale().bandwidth() * 0.5} />
                        } />,

                    <text x={extraPairWidth.Basic * 0.5}
                        y={
                            aggregatedScale()(val)! +
                            0.25 * aggregatedScale().bandwidth()
                        }
                        fill="white"
                        alignmentBaseline={"central"}
                        textAnchor={"middle"}>{format(".2f")(dataVal)}</text>]
                )
            })
            output = output.concat(Object.entries(postIntData).map(([val, dataVal]) => {
                // console.log(val, dataVal)
                return (
                    [<Popup
                        content={format(".4r")(dataVal)}
                        trigger={
                            <rect
                                x={0}
                                y={aggregatedScale()(val)! + 0.5 * aggregatedScale().bandwidth()}
                                // fill={interpolateGreys(caseScale(dataPoint.caseCount))}
                                // fill={interpolateGreys(valueScale(dataVal))}
                                fill={interpolateGreys(outcomeScale()(dataVal || 0))}
                                opacity={0.8}
                                width={extraPairWidth.Basic}
                                height={aggregatedScale().bandwidth() * 0.5} />
                        } />,

                    <text x={extraPairWidth.Basic * 0.5}
                        y={
                            aggregatedScale()(val)! +
                            0.75 * aggregatedScale().bandwidth()
                        }
                        fill="white"
                        alignmentBaseline={"central"}
                        textAnchor={"middle"}>{format(".2f")(dataVal)}</text>]


                )
            }))
        } else {
            output = Object.entries(totalData).map(([val, dataVal]) => {
                console.log(val, dataVal)
                return (
                    [<Popup
                        content={format(".4r")(dataVal)}
                        trigger={
                            <rect
                                x={0}
                                y={aggregatedScale()(val)}
                                // fill={interpolateGreys(caseScale(dataPoint.caseCount))}
                                // fill={interpolateGreys(valueScale(dataVal))}
                                fill={interpolateGreys(outcomeScale()(dataVal || 0))}
                                opacity={0.8}
                                width={extraPairWidth.Basic}
                                height={aggregatedScale().bandwidth()} />
                        } />,

                    <text x={extraPairWidth.Basic * 0.5}
                        y={
                            aggregatedScale()(val)! +
                            0.5 * aggregatedScale().bandwidth()
                        }
                        fill="white"
                        alignmentBaseline={"central"}
                        textAnchor={"middle"}>{format(".2f")(dataVal)}</text>]


                )
            })
        }
        return output
    }

    return (
        <>
            {outputText()}
        </>
    )
}

export default inject("store")(observer(ExtraPairBasicInt));
