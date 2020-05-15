import React, { FC, useEffect, useMemo } from "react";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import { ScaleBand, scaleOrdinal, range, scaleLinear, ScaleOrdinal, max, format } from "d3";
import { extraPairWidth } from "../../Interfaces/ApplicationState"
import { Popup } from "semantic-ui-react";

interface OwnProps {
    preDataSet: any[];
    postDataSet: any[];
    totalDataSet: any[];
    aggregatedScale: ScaleBand<string>;
    //yMax:number;
    store?: Store;
}

export type Props = OwnProps;

const ExtraPairBarInt: FC<Props> = ({ preDataSet, postDataSet, totalDataSet, aggregatedScale, store }: Props) => {
    const [valueScale] = useMemo(() => {

        const valueScale = scaleLinear().domain([0, max(Object.values(totalDataSet))]).range([0, extraPairWidth.BarChart])

        return [valueScale];
    }, [totalDataSet, aggregatedScale])

    const generateOutput = () => {
        let output = [];
        if (aggregatedScale.bandwidth() > 40) {
            output = Object.entries(preDataSet).map(([val, dataVal]) => {
                return (
                    <Popup
                        content={format(".4r")(dataVal)}
                        trigger={
                            <rect
                                x={0}
                                y={aggregatedScale(val)}
                                fill={"#404040"}
                                opacity={0.8}
                                width={valueScale(dataVal)}
                                height={aggregatedScale.bandwidth() * 0.5} />
                        } />
                )
            })

            output = output.concat(Object.entries(postDataSet).map(([val, dataVal]) => {
                return (
                    <Popup
                        content={format(".4r")(dataVal)}
                        trigger={
                            <rect
                                x={0}
                                y={aggregatedScale(val)! + 0.5 * aggregatedScale.bandwidth()}
                                fill={"#404040"}
                                opacity={0.8}
                                width={valueScale(dataVal)}
                                height={aggregatedScale.bandwidth() * 0.5} />
                        } />
                )
            }))

        }
        else {
            output = Object.entries(totalDataSet).map(([val, dataVal]) => {
                return (
                    <Popup
                        content={format(".4r")(dataVal)}
                        trigger={
                            <rect
                                x={0}
                                y={aggregatedScale(val)}
                                fill={"#404040"}
                                opacity={0.8}
                                width={valueScale(dataVal)}
                                height={aggregatedScale.bandwidth()} />
                        } />
                )
            })
        }
        return output;
    }


    return (
        <>
            {generateOutput()}
        </>
    )
}

export default inject("store")(observer(ExtraPairBarInt));
