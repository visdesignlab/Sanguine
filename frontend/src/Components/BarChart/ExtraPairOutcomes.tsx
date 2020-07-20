import React, { FC, useEffect, useState, useCallback } from "react";
import Store from "../../Interfaces/Store";
import { inject, observer } from "mobx-react";
import { scaleLinear, format, interpolateGreys, mean, scaleBand } from "d3";
import { extraPairWidth } from "../../PresetsProfile"
import { Popup } from "semantic-ui-react";
import { greyScaleRange } from "../../PresetsProfile";

interface OwnProps {
    outcomeName: string;
    dataSet: any[];
    aggregationScaleDomain: string;
    aggregationScaleRange: string;
    //yMax:number;
    store?: Store;
}

export type Props = OwnProps;

const ExtraPairOutcomes: FC<Props> = ({ outcomeName, dataSet, aggregationScaleDomain, aggregationScaleRange, store }: Props) => {
    //const [dataOutput, setDataOtuput] = useState<{ aggregation: any, outcome: number }[]>([])


    const aggregationScale = useCallback(() => {
        const domain = JSON.parse(aggregationScaleDomain);
        const range = JSON.parse(aggregationScaleRange);
        const aggregationScale = scaleBand().domain(domain).range(range).paddingInner(0.1);
        return aggregationScale
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

    return (
        <>
            {Object.entries(dataSet).map(([val, dataVal]) => {
                //console.log(val, dataVal)
                return (
                    [<Popup
                        content={format(".4r")(dataVal)}
                        trigger={
                            <rect
                                x={0}
                                y={aggregationScale()(val)}
                                // fill={interpolateGreys(caseScale(dataPoint.caseCount))}
                                // fill={interpolateGreys(valueScale(dataVal))}
                                fill={interpolateGreys(outcomeScale()(dataVal || 0))}
                                opacity={0.8}
                                width={extraPairWidth.Outcomes}
                                height={aggregationScale().bandwidth()} />
                        } />,

                    <text x={extraPairWidth.Outcomes * 0.5}
                        y={
                            aggregationScale()(val)! +
                            0.5 * aggregationScale().bandwidth()
                        }
                        fill="white"
                        alignmentBaseline={"central"}
                        textAnchor={"middle"}
                        fontSize="12px">{format(".2f")(dataVal)}</text>]


                )
            })}
        </>
    )
}

export default inject("store")(observer(ExtraPairOutcomes));
