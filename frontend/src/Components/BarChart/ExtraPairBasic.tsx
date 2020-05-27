import React, { FC, useEffect, useMemo, useCallback } from "react";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import { ScaleBand, scaleOrdinal, range, scaleLinear, ScaleOrdinal, max, format, interpolateGreys, scaleBand } from "d3";
import { extraPairWidth } from "../../Interfaces/ApplicationState"
import { Popup } from "semantic-ui-react";
import { secondary_gray, greyScaleRange } from "../../ColorProfile";

interface OwnProps {
    dataSet: any[];
    aggregationScaleDomain: string;
    aggregationScaleRange: string;
    store?: Store;
}

export type Props = OwnProps;

const ExtraPairBasic: FC<Props> = ({ dataSet, aggregationScaleRange, aggregationScaleDomain, store }: Props) => {


    const aggregationScale = useCallback(() => {
        const domain = JSON.parse(aggregationScaleDomain);
        const range = JSON.parse(aggregationScaleRange);
        const aggregationScale = scaleBand().domain(domain).range(range)
        return aggregationScale
    }, [aggregationScaleDomain, aggregationScaleRange])

    const [valueScale] = useMemo(() => {
        console.log(dataSet)
        const valueScale = scaleLinear().domain([0, 1]).range(greyScaleRange)

        return [valueScale];
    }, [dataSet])

    return (
        <>
            {Object.entries(dataSet).map(([val, dataVal]) => {
                console.log(val, dataVal)
                return (
                    [<Popup
                        content={format(".4r")(dataVal)}
                        trigger={
                            <rect
                                x={0}
                                y={aggregationScale()(val)}
                                // fill={interpolateGreys(caseScale(dataPoint.caseCount))}
                                // fill={interpolateGreys(valueScale(dataVal))}
                                fill={secondary_gray}
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
                        textAnchor={"middle"}>{format(".0%")(dataVal)}</text>]


                )
            })}
        </>
    )
}

export default inject("store")(observer(ExtraPairBasic));
