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

    // async function fetchChartData() {
    //     let dataResult: { aggregation: any, outcome: number }[] = []

    //     const aggreArray = Object.keys(dataSet)
    //     const patientIDArray = Object.values(dataSet)

    //     for (let i = 0; i < aggreArray.length; i++) {
    //         let patientOutcome;
    //         let patientOutcomeResult;
    //         let meanOutput;
    //         // const t0 = performance.now();
    //         switch (outcomeName) {
    //             case "RISK":
    //                 patientOutcome = await fetch(`http://localhost:8000/api/risk_score?patient_ids=${patientIDArray[i]}`)
    //                 patientOutcomeResult = await patientOutcome.json();
    //                 meanOutput = mean(patientOutcomeResult.map((d: any) => parseFloat(d.apr_drg_weight)));
    //                 break;
    //             case "Vent":
    //                 patientOutcome = await fetch(`http://localhost:8000/api/patient_outcomes?patient_ids=${patientIDArray[i]}`)
    //                 patientOutcomeResult = await patientOutcome.json();
    //                 meanOutput = mean(patientOutcomeResult.map((d: any) => parseFloat(d.gr_than_1440_vent)));
    //                 break;
    //             case "Mortality":
    //                 patientOutcome = await fetch(`http://localhost:8000/api/patient_outcomes?patient_ids=${patientIDArray[i]}`)
    //                 patientOutcomeResult = await patientOutcome.json();
    //                 meanOutput = mean(patientOutcomeResult.map((d: any) => parseFloat(d.patient_death)));
    //                 break;
    //         }
    //         //  const t1 = performance.now();
    //         // console.log(`Call to fetch ${outcomeName} of ${patientIDArray.length} patients, took ${t1 - t0} milliseconds.`);
    //         console.log(patientOutcomeResult)
    //         dataResult.push({ aggregation: aggreArray[i], outcome: meanOutput ? meanOutput : 0 })
    //     }

    //     setDataOtuput(dataResult)
    // }

    // useEffect(() => {
    //     fetchChartData();

    // }, [dataSet]);

    // const [valueScale] = useMemo(() => {
    //     console.log(dataSet)
    //     const valueScale = scaleLinear().domain([0, 1]).range([0.25, 0.8])

    //     return [valueScale];
    // }, [dataSet, aggregatedScale])

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
