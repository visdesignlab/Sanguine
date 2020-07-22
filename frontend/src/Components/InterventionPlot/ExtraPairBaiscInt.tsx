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
    //  aggregatedScale: ScaleBand<string>;
    aggregationScaleDomain: string;
    aggregationScaleRange: string;
    //yMax:number;
    name: string;
    store?: Store;
}

export type Props = OwnProps;

const ExtraPairBasicInt: FC<Props> = ({ totalData, name, preIntData, postIntData, aggregationScaleRange, aggregationScaleDomain, store }: Props) => {


    const aggregatedScale = useCallback(() => {
        const aggregatedScale = scaleBand().domain(JSON.parse(aggregationScaleDomain)).range(JSON.parse(aggregationScaleRange)).paddingInner(0.1);
        return aggregatedScale
    }, [aggregationScaleDomain, aggregationScaleRange])

    const valueScale = useCallback(() => {
        let valueScale;
        if (name === "RISK") {
            valueScale = scaleLinear().domain([0, 30]).range(greyScaleRange);
        } else {
            valueScale = scaleLinear().domain([0, 1]).range(greyScaleRange);
        }
        return valueScale;
    }, [])

    //  scaleLinear().domain([0, 1]).range(greyScaleRange)

    const outputText = () => {
        let output = [];
        if (aggregatedScale().bandwidth() > 40) {
            output = Object.entries(preIntData).map(([val, dataVal]) => {
                return (
                    [<Popup
                        content={name === "RISK" ? format(".2f")(dataVal.actualVal) : dataVal.actualVal}
                        trigger={
                            <rect
                                x={0}
                                y={aggregatedScale()(val)}
                                // fill={interpolateGreys(caseScale(dataPoint.caseCount))}
                                fill={interpolateGreys(valueScale()(dataVal.calculated))}
                                //fill={secondary_gray}
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
                        textAnchor={"middle"}>{name === "RISK" ? format(".2f")(dataVal.calculated) : format(".0%")(dataVal.calculated)}</text>]
                )
            })
            output = output.concat(Object.entries(postIntData).map(([val, dataVal]) => {
                // console.log(val, dataVal)
                return (
                    [<Popup
                        content={name === "RISK" ? format(".2f")(dataVal.actualVal) : dataVal.actualVal}
                        trigger={
                            <rect
                                x={0}
                                y={aggregatedScale()(val)! + 0.5 * aggregatedScale().bandwidth()}
                                // fill={interpolateGreys(caseScale(dataPoint.caseCount))}
                                fill={interpolateGreys(valueScale()(dataVal.calculated))}
                                //fill={secondary_gray}
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
                        textAnchor={"middle"}>{name === "RISK" ? format(".2f")(dataVal.calculated) : format(".0%")(dataVal.calculated)}</text>]


                )
            }))
        } else {

            output = Object.entries(totalData).map(([val, dataVal]) => {
                return (
                    [<Popup
                        content={name === "RISK" ? format(".2f")(dataVal.actualVal) : dataVal.actualVal}
                        trigger={
                            <g>
                                <rect
                                    x={0}
                                    y={aggregatedScale()(val)}
                                    // fill={interpolateGreys(caseScale(dataPoint.caseCount))}
                                    fill={interpolateGreys(valueScale()(preIntData[(val as any)].calculated))}
                                    //fill={secondary_gray}
                                    opacity={0.8}
                                    width={extraPairWidth.Basic}
                                    height={aggregatedScale().bandwidth() * 0.5} />
                                <rect
                                    x={0}
                                    y={aggregatedScale()(val)! + aggregatedScale().bandwidth() * 0.5}
                                    // fill={interpolateGreys(caseScale(dataPoint.caseCount))}
                                    fill={interpolateGreys(valueScale()(postIntData[(val as any)].calculated))}
                                    //fill={secondary_gray}
                                    opacity={0.8}
                                    width={extraPairWidth.Basic}
                                    height={aggregatedScale().bandwidth() * 0.5} />
                            </g>
                        } />,
                    <text x={extraPairWidth.Basic * 0.5}
                        y={
                            aggregatedScale()(val)! +
                            0.5 * aggregatedScale().bandwidth()
                        }
                        fill="white"
                        alignmentBaseline={"central"}
                        textAnchor={"middle"}>{name === "RISK" ? format(".2f")(dataVal.calculated) : format(".0%")(dataVal.calculated)}</text>]


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
