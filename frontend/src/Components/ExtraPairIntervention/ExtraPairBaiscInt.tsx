import React, { FC, useCallback } from "react";
import Store from "../../Interfaces/Store";
import { inject, observer } from "mobx-react";
import { format, scaleBand, scaleLinear, interpolateGreys } from "d3";
import { extraPairWidth, greyScaleRange, basic_gray } from "../../PresetsProfile"
import { Popup } from "semantic-ui-react";

interface OwnProps {
    totalData: any[];
    preIntData: any[];
    postIntData: any[];
    //  aggregationScale: ScaleBand<string>;
    aggregationScaleDomain: string;
    aggregationScaleRange: string;
    //yMax:number;
    name: string;
    store?: Store;
}

export type Props = OwnProps;

const ExtraPairBasicInt: FC<Props> = ({ totalData, name, preIntData, postIntData, aggregationScaleRange, aggregationScaleDomain, store }: Props) => {


    const aggregationScale = useCallback(() => {
        const aggregationScale = scaleBand().domain(JSON.parse(aggregationScaleDomain)).range(JSON.parse(aggregationScaleRange)).paddingInner(0.1);
        return aggregationScale
    }, [aggregationScaleDomain, aggregationScaleRange])

    const valueScale = useCallback(() => {
        let valueScale;
        if (name === "RISK") {
            valueScale = scaleLinear().domain([0, 30]).range(greyScaleRange);
        } else {
            valueScale = scaleLinear().domain([0, 1]).range(greyScaleRange);
        }
        return valueScale;
    }, [name])

    //  scaleLinear().domain([0, 1]).range(greyScaleRange)

    const outputText = () => {
        let output = [];
        if (aggregationScale().bandwidth() > 30) {
            output = Object.entries(preIntData).map(([val, dataVal]) => {
                return (
                    [<Popup
                        content={`${dataVal.actualVal} /${dataVal.outOfTotal}`}
                        trigger={
                            <rect
                                x={0}
                                y={aggregationScale()(val)}
                                // fill={interpolateGreys(caseScale(dataPoint.caseCount))}
                                fill={!isNaN(dataVal.calculated) ? interpolateGreys(valueScale()(dataVal.calculated)) : "white"}
                                //fill={secondary_gray}
                                opacity={0.8}
                                width={extraPairWidth.Basic}
                                height={aggregationScale().bandwidth() * 0.5} />
                        } />,
                    <line
                        opacity={!isNaN(dataVal.calculated) ? 0 : 1}
                        y1={0.25 * aggregationScale().bandwidth() + aggregationScale()(val)!}
                        y2={0.25 * aggregationScale().bandwidth() + aggregationScale()(val)!}
                        x1={0.35 * extraPairWidth.Basic}
                        x2={0.65 * extraPairWidth.Basic}
                        strokeWidth={0.5}
                        stroke={basic_gray}
                    />,
                    <text x={extraPairWidth.Basic * 0.5}
                        y={
                            aggregationScale()(val)! +
                            0.25 * aggregationScale().bandwidth()
                        }
                        opacity={!isNaN(dataVal.calculated) ? 1 : 0}
                        fill="white"
                        alignmentBaseline={"central"}
                        textAnchor={"middle"}>{Math.round(dataVal.calculated * 100) === 0 && dataVal.calculated > 0 ? "<1%" : format(".0%")(dataVal.calculated)}</text>]
                )
            })
            output = output.concat(Object.entries(postIntData).map(([val, dataVal]) => {
                // console.log(val, dataVal)
                return (
                    [<Popup
                        content={`${dataVal.actualVal}/${dataVal.outOfTotal}`}
                        trigger={
                            <rect
                                x={0}
                                y={aggregationScale()(val)! + 0.5 * aggregationScale().bandwidth()}
                                // fill={interpolateGreys(caseScale(dataPoint.caseCount))}
                                fill={!isNaN(dataVal.calculated) ? interpolateGreys(valueScale()(dataVal.calculated)) : "white"}
                                //fill={secondary_gray}
                                opacity={0.8}
                                width={extraPairWidth.Basic}
                                height={aggregationScale().bandwidth() * 0.5} />
                        } />,
                    <line
                        opacity={!isNaN(dataVal.calculated) ? 0 : 1}
                        y1={0.75 * aggregationScale().bandwidth() + aggregationScale()(val)!}
                        y2={0.75 * aggregationScale().bandwidth() + aggregationScale()(val)!}
                        x1={0.35 * extraPairWidth.Basic}
                        x2={0.65 * extraPairWidth.Basic}
                        strokeWidth={0.5}
                        stroke={basic_gray}
                    />,
                    <text x={extraPairWidth.Basic * 0.5}
                        y={
                            aggregationScale()(val)! +
                            0.75 * aggregationScale().bandwidth()
                        }
                        opacity={!isNaN(dataVal.calculated) ? 1 : 0}
                        fill="white"
                        alignmentBaseline={"central"}
                        textAnchor={"middle"}>{Math.round(dataVal.calculated * 100) === 0 && dataVal.calculated > 0 ? "<1%" : format(".0%")(dataVal.calculated)}</text>]


                )
            }))
        } else {

            output = Object.entries(totalData).map(([val, dataVal]) => {
                return (
                    [<Popup
                        content={`${dataVal.actualVal}/${dataVal.outOfTotal}`}
                        trigger={

                            <rect
                                x={0}
                                y={aggregationScale()(val)}
                                // fill={interpolateGreys(caseScale(dataPoint.caseCount))}
                                fill={!isNaN(dataVal.calculated) ? interpolateGreys(valueScale()(dataVal.calculated)) : "white"}
                                //fill={secondary_gray}
                                opacity={0.8}
                                width={extraPairWidth.Basic}
                                height={aggregationScale().bandwidth() * 0.5} />


                        } />,
                    <line
                        opacity={!isNaN(dataVal.calculated) ? 0 : 1}
                        y1={0.5 * aggregationScale().bandwidth() + aggregationScale()(val)!}
                        y2={0.5 * aggregationScale().bandwidth() + aggregationScale()(val)!}
                        x1={0.35 * extraPairWidth.Basic}
                        x2={0.65 * extraPairWidth.Basic}
                        strokeWidth={0.5}
                        stroke={basic_gray}
                    />,
                    <text x={extraPairWidth.Basic * 0.5}
                        y={
                            aggregationScale()(val)! +
                            0.5 * aggregationScale().bandwidth()
                        }
                        fill="white"
                        opacity={!isNaN(dataVal.calculated) ? 1 : 0}
                        alignmentBaseline={"central"}
                        textAnchor={"middle"}>{Math.round(dataVal.calculated * 100) === 0 && dataVal.calculated > 0 ? "<1%" : format(".0%")(dataVal.calculated)}</text>]


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
