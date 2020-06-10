import React, { FC, useEffect, useMemo, useCallback } from "react";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import { ScaleBand, scaleOrdinal, range, scaleLinear, ScaleOrdinal, max, format, scaleBand } from "d3";
import { extraPairWidth } from "../../PresetsProfile"
import { Popup } from "semantic-ui-react";

interface OwnProps {
    preDataSet: any[];
    postDataSet: any[];
    totalDataSet: any[];
    //  aggregatedScale: ScaleBand<string>;
    aggregationScaleDomain: string;
    aggregationScaleRange: string;
    //yMax:number;
    store?: Store;
}

export type Props = OwnProps;

const ExtraPairBarInt: FC<Props> = ({ preDataSet, postDataSet, totalDataSet, aggregationScaleRange, aggregationScaleDomain, store }: Props) => {
    const [valueScale, halfValueScale] = useMemo(() => {

        const valueScale = scaleLinear().domain([0, max(Object.values(totalDataSet))]).range([0, extraPairWidth.BarChart])
        const halfValueScale = scaleLinear().domain([0, max(Object.values(preDataSet).concat(Object.values(postDataSet)))]).range([0, extraPairWidth.BarChart])
        return [valueScale, halfValueScale];
    }, [totalDataSet])

    const aggregatedScale = useCallback(() => {
        const aggregatedScale = scaleBand().domain(JSON.parse(aggregationScaleDomain)).range(JSON.parse(aggregationScaleRange)).paddingInner(0.1);
        return aggregatedScale
    }, [aggregationScaleDomain, aggregationScaleRange])

    const generateOutput = () => {
        let output: any[] = [];
        if (aggregatedScale().bandwidth() > 40) {
            output = Object.entries(preDataSet).map(([val, dataVal]) => {
                return (
                    <Popup
                        content={format(".4r")(dataVal)}
                        trigger={
                            <rect
                                x={0}
                                y={aggregatedScale()(val)}
                                fill={"#404040"}
                                opacity={0.8}
                                width={halfValueScale(dataVal)}
                                height={aggregatedScale().bandwidth() * 0.5} />
                        } />
                )
            })

            output = output.concat(Object.entries(postDataSet).map(([val, dataVal]) => {
                return (
                    [<Popup
                        content={format(".4r")(dataVal)}
                        trigger={
                            <rect
                                x={0}
                                y={aggregatedScale()(val)! + 0.5 * aggregatedScale().bandwidth()}
                                fill={"#404040"}
                                opacity={0.8}
                                width={halfValueScale(dataVal)}
                                height={aggregatedScale().bandwidth() * 0.5} />
                        } />,
                    <line x1={0} x2={extraPairWidth.BarChart} stroke="white" y1={aggregatedScale()(val)! + 0.5 * aggregatedScale().bandwidth()} y2={aggregatedScale()(val)! + 0.5 * aggregatedScale().bandwidth()} />]
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
                                y={aggregatedScale()(val)}
                                fill={"#404040"}
                                opacity={0.8}
                                width={valueScale(dataVal)}
                                height={aggregatedScale().bandwidth()} />
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
