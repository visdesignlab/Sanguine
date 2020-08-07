import React, { FC, useCallback } from "react";
import Store from "../../Interfaces/Store";
import { inject, observer } from "mobx-react";
import { scaleLinear, format, interpolateGreys, scaleBand } from "d3";
import { extraPairWidth, basic_gray } from "../../PresetsProfile"
import { Popup } from "semantic-ui-react";
import { greyScaleRange } from "../../PresetsProfile";

interface OwnProps {
    dataSet: any[];
    aggregationScaleDomain: string;
    aggregationScaleRange: string;
    store?: Store;
    name: string;
}

export type Props = OwnProps;

const ExtraPairBasic: FC<Props> = ({ name, dataSet, aggregationScaleRange, aggregationScaleDomain }: Props) => {


    const aggregationScale = useCallback(() => {
        const domain = JSON.parse(aggregationScaleDomain);
        const range = JSON.parse(aggregationScaleRange);
        const aggregationScale = scaleBand().domain(domain).range(range).paddingInner(0.1);
        return aggregationScale
    }, [aggregationScaleDomain, aggregationScaleRange])

    const valueScale = scaleLinear().domain([0, 1]).range(greyScaleRange);


    return (
        <>
            {Object.entries(dataSet).map(([val, dataVal]) => {
                // console.log(val, dataVal)
                return (
                    [<Popup
                        content={`${dataVal.actualVal}/${dataVal.outOfTotal}`}
                        trigger={
                            <rect
                                x={0}
                                y={aggregationScale()(val)}
                                // fill={interpolateGreys(caseScale(dataPoint.caseCount))}
                                fill={dataVal.calculated !== undefined ? interpolateGreys(valueScale(dataVal.calculated)) : "white"}
                                //fill={secondary_gray}
                                opacity={0.8}
                                width={extraPairWidth.Basic}
                                height={aggregationScale().bandwidth()} />
                        } />,

                    <line
                        opacity={dataVal.calculated !== undefined ? 0 : 1}
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
                        opacity={dataVal.calculated !== undefined ? 1 : 0}
                        fill="white"
                        alignmentBaseline={"central"}
                        fontSize="12px"
                        textAnchor={"middle"}>{Math.round(dataVal.calculated * 100) === 0 && dataVal.calculated > 0 ? "<1%" : format(".0%")(dataVal.calculated)}</text>]

                )
            })}
        </>
    )
}

export default inject("store")(observer(ExtraPairBasic));
