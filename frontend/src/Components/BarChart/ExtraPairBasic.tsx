import React, { FC, useEffect, useMemo } from "react";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import { ScaleBand, scaleOrdinal, range, scaleLinear, ScaleOrdinal, max, format, interpolateGreys } from "d3";
import { extraPairWidth } from "../../Interfaces/ApplicationState"
import { Popup } from "semantic-ui-react";

interface OwnProps {
    dataSet: any[];
    aggregatedScale: ScaleBand<string>;
    //yMax:number;
    store?: Store;
}

export type Props = OwnProps;

const ExtraPairBasic: FC<Props> = ({ dataSet, aggregatedScale, store }: Props) => {
    const [valueScale] = useMemo(() => {

        const valueScale = scaleLinear().domain([0, 1]).range([0.25, 0.8])

        return [valueScale];
    }, [dataSet, aggregatedScale])

    return (
        <>
            {Object.entries(dataSet).map(([val, dataVal]) => {
                return (
                    [<Popup
                        content={format(".4r")(dataVal)}
                        trigger={
                            <rect
                                x={0}
                                y={aggregatedScale(val)}
                                // fill={interpolateGreys(caseScale(dataPoint.caseCount))}
                                fill={interpolateGreys(valueScale(dataVal))}
                                opacity={0.8}
                                width={extraPairWidth.Basic}
                                height={aggregatedScale.bandwidth()} />
                        } />,

                    <text x={extraPairWidth.Basic * 0.5}
                        y={
                            aggregatedScale(val)! +
                            0.5 * aggregatedScale.bandwidth()
                        }
                        fill="white"
                        alignmentBaseline={"central"}
                        textAnchor={"middle"}>{format(".0%")(dataVal)}</text>]



                )
            })}
        </>
    )
}

export default inject("store")(observer(ExtraPairBasic));
