import React, { FC, useEffect, useMemo, useState, useCallback } from "react";
import Store from "../../Interfaces/Store";
import styled from "styled-components";
import { inject, observer } from "mobx-react";
import { ScaleBand, scaleOrdinal, range, scaleLinear, ScaleOrdinal, max, format, interpolateGreys, mean, scaleBand } from "d3";
import { extraPairWidth } from "../../Interfaces/ApplicationState"
import { Popup } from "semantic-ui-react";
import { secondary_gray } from "../../ColorProfile";

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
    const [dataOutput, setDataOtuput] = useState<{ aggregation: any, outcome: number }[]>([])


    const aggregationScale = useCallback(() => {
        const domain = JSON.parse(aggregationScaleDomain);
        const range = JSON.parse(aggregationScaleRange);
        const aggregationScale = scaleBand().domain(domain).range(range)
        return aggregationScale
    }, [aggregationScaleDomain, aggregationScaleRange])

    async function fetchChartData() {
        let dataResult: { aggregation: any, outcome: number }[] = []

        const aggreArray = Object.keys(dataSet)
        const patientIDArray = Object.values(dataSet)

        for (let i = 0; i < aggreArray.length; i++) {
            let patientOutcome;
            let patientOutcomeResult;
            let meanOutput;
            switch (outcomeName) {
                case "ROM":
                    patientOutcome = await fetch(`http://localhost:8000/api/risk_score?patient_ids=${patientIDArray[i]}`)
                    patientOutcomeResult = await patientOutcome.json();
                    meanOutput = mean(patientOutcomeResult.map((d: any) => parseFloat(d.apr_drg_rom)));
                    break;
                case "SOI":
                    patientOutcome = await fetch(`http://localhost:8000/api/risk_score?patient_ids=${patientIDArray[i]}`)
                    patientOutcomeResult = await patientOutcome.json();
                    meanOutput = mean(patientOutcomeResult.map((d: any) => parseFloat(d.apr_drg_soi)));
                    break;
                case "Vent":
                    patientOutcome = await fetch(`http://localhost:8000/api/patient_outcomes?patient_ids=${patientIDArray[i]}`)
                    patientOutcomeResult = await patientOutcome.json();
                    meanOutput = mean(patientOutcomeResult.map((d: any) => parseFloat(d.gr_than_1440_vent)));
                    break;
                case "Mortality":
                    patientOutcome = await fetch(`http://localhost:8000/api/patient_outcomes?patient_ids=${patientIDArray[i]}`)
                    patientOutcomeResult = await patientOutcome.json();
                    meanOutput = mean(patientOutcomeResult.map((d: any) => parseFloat(d.patient_death)));
                    break;
            }

            dataResult.push({ aggregation: aggreArray[i], outcome: meanOutput ? meanOutput : 0 })
        }

        setDataOtuput(dataResult)
    }

    useEffect(() => {
        fetchChartData();

    }, [dataSet]);

    // const [valueScale] = useMemo(() => {
    //     console.log(dataSet)
    //     const valueScale = scaleLinear().domain([0, 1]).range([0.25, 0.8])

    //     return [valueScale];
    // }, [dataSet, aggregatedScale])

    return (
        <>
            {dataOutput.map((d: { aggregation: any, outcome: number }) => {
                //console.log(val, dataVal)
                return (
                    [<Popup
                        content={format(".4r")(d.outcome)}
                        trigger={
                            <rect
                                x={0}
                                y={aggregationScale()(d.aggregation)}
                                // fill={interpolateGreys(caseScale(dataPoint.caseCount))}
                                // fill={interpolateGreys(valueScale(dataVal))}
                                fill={secondary_gray}
                                opacity={0.8}
                                width={extraPairWidth.Basic}
                                height={aggregationScale().bandwidth()} />
                        } />,

                    <text x={extraPairWidth.Basic * 0.5}
                        y={
                            aggregationScale()(d.aggregation)! +
                            0.5 * aggregationScale().bandwidth()
                        }
                        fill="white"
                        alignmentBaseline={"central"}
                        textAnchor={"middle"}>{format(".2f")(d.outcome)}</text>]


                )
            })}
        </>
    )
}

export default inject("store")(observer(ExtraPairOutcomes));
