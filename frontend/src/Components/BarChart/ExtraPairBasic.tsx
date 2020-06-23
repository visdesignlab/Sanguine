import React, { FC, useCallback } from "react";
import Store from "../../Interfaces/Store";
import { inject, observer } from "mobx-react";
import { scaleLinear, format, interpolateGreys, scaleBand } from "d3";
import { extraPairWidth } from "../../PresetsProfile"
import { Popup } from "semantic-ui-react";
import { greyScaleRange } from "../../PresetsProfile";

interface OwnProps {
    dataSet: any[];
    aggregationScaleDomain: string;
    aggregationScaleRange: string;
    store?: Store;
}

export type Props = OwnProps;

const ExtraPairBasic: FC<Props> = ({ dataSet, aggregationScaleRange, aggregationScaleDomain }: Props) => {


    const aggregationScale = useCallback(() => {
        const domain = JSON.parse(aggregationScaleDomain);
        const range = JSON.parse(aggregationScaleRange);
        const aggregationScale = scaleBand().domain(domain).range(range).paddingInner(0.1);
        return aggregationScale
    }, [aggregationScaleDomain, aggregationScaleRange])

    // const [valueScale] = useMemo(() => {
    //    // console.log(dataSet)
    //     const valueScale = scaleLinear().domain([0, 1]).range(greyScaleRange)

    //     return [valueScale];
    // }, [dataSet])

    const valueScale = scaleLinear().domain([0, 1]).range(greyScaleRange)

    // const valueScale = useCallback(()=>{

    // })


    return (
        <>
            {Object.entries(dataSet).map(([val, dataVal]) => {
                // console.log(val, dataVal)
                return (
                    [<Popup
                        content={(dataVal.number)}
                        trigger={
                            <rect
                                x={0}
                                y={aggregationScale()(val)}
                                // fill={interpolateGreys(caseScale(dataPoint.caseCount))}
                                fill={interpolateGreys(valueScale(dataVal.percentage))}
                                //fill={secondary_gray}
                                opacity={0.8}
                                width={extraPairWidth.Basic}
                                height={aggregationScale().bandwidth()} />
                        } />,

                    <text x={extraPairWidth.Basic * 0.5}
                        y={
                            aggregationScale()(val)! +
                            0.5 * aggregationScale().bandwidth()
                        }
                        fill="white"
                        alignmentBaseline={"central"}
                        fontSize="12px"
                        textAnchor={"middle"}>{format(".0%")(dataVal.percentage)}</text>]


                )
            })}
        </>
    )
}

export default inject("store")(observer(ExtraPairBasic));
