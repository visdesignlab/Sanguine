
import React, { FC } from "react";
import { inject, observer } from "mobx-react";
import { extraPairWidth, extraPairPadding, offset, AcronymDictionary } from "../../PresetsProfile";
import { actions } from "../..";
// import ExtraPairViolin from "../BarChart/ExtraPairViolin";
// import ExtraPairBar from "../BarChart/ExtraPairBar";
import ExtraPairBasicInt from "../ExtraPairIntervention/ExtraPairBaiscInt";
import styled from "styled-components";
import ExtraPairBarInt from "../ExtraPairIntervention/ExtraPairBarInt";
import ExtraPairViolinInt from "../ExtraPairIntervention/ExtraPairViolinInt";
import { ExtraPairInterventionPoint } from "../../Interfaces/ApplicationState";
import { max, select, scaleBand, format } from "d3";

//import ExtraPairOutcomes from "../BarChart/ExtraPairOutcomes";

interface OwnProps {
    extraPairDataSet: ExtraPairInterventionPoint[];

    // aggregationScale: ScaleBand<string>
    aggregationScaleDomain: string;
    aggregationScaleRange: string;

    chartId: string;
    // dimension: { height: number, width: number }
    height: number;
}

export type Props = OwnProps;

const InterventionExtraPairGenerator: FC<Props> = ({ extraPairDataSet, aggregationScaleDomain, aggregationScaleRange, chartId, height }: Props) => {

    const currentOffset = offset.regular;
    let transferedDistance = 0
    let returningComponents: any = []

    const extraPairTextGenerator = (nameInput: string, labelInput: string, type: "Basic" | "Violin" | "Bar",
        extraPairDataSet: ExtraPairInterventionPoint) => {
        let explanation = "";
        let spacing = 0;
        switch (type) {
            case "Basic":
                explanation = `Percentage of Patients`
                spacing = extraPairWidth.Basic
                break;
            case "Violin":
                explanation = nameInput === "RISK" ? `Scaled 0-30` : (`Scaled 0-18, line at ${nameInput === "Preop HGB" ? 13 : 7.5}`);
                spacing = extraPairWidth.Dumbbell
                break;
            case "Bar":
                const bandwidth = scaleBand().domain(JSON.parse(aggregationScaleDomain)).range(JSON.parse(aggregationScaleRange)).paddingInner(0.1).bandwidth();
                let maximum = bandwidth > 30 ? max(Object.values(extraPairDataSet.preIntData).concat(Object.values(extraPairDataSet.postIntData))) : max(Object.values(extraPairDataSet.totalIntData))
                explanation = `Scaled 0-${format(".4r")(maximum)}`;
                spacing = extraPairWidth.BarChart;
                break;
        }

        let tooltipText = `${AcronymDictionary[nameInput] ? `${AcronymDictionary[nameInput]}<br/>` : ""}
                 ${explanation}
                <br/> <small>Click to remove</small>`;

        return <ExtraPairText
            x={spacing / 2}
            y={height - currentOffset.bottom + 20}
            onClick={() => {
                actions.removeExtraPair(chartId, nameInput)
                select("#Main-Body").select(".tooltiptext").style("visibility", "hidden");
            }}
            onMouseOver={(e) => {
                select("#Main-Body").select(".tooltiptext")
                    .style("visibility", "visible")
                    .html(tooltipText)
                    .style("left", `${(e.pageX || 0) - document.getElementById("Main-Body")!.offsetLeft}px`)
                    .style("top", `${(e.pageY || 0) - document.getElementById("Main-Body")!.offsetTop + 10}px`);
            }}
            onMouseOut={() => {
                select("#Main-Body").select(".tooltiptext").style("visibility", "hidden");
            }}
        >{labelInput}</ExtraPairText>
    }

    extraPairDataSet.forEach((pairData, index) => {
        switch (pairData.type) {
            case "Violin":
                transferedDistance += (extraPairWidth.Dumbbell + extraPairPadding)
                returningComponents.push(<g transform={`translate(${transferedDistance - (extraPairWidth.Dumbbell)},0)`}>
                    <ExtraPairViolinInt
                        postMedianSet={pairData.postMedianSet}
                        preMedianSet={pairData.preMedianSet}
                        totalMedianSet={pairData.totalMedianSet}
                        preIntData={pairData.preIntData}
                        postIntData={pairData.postIntData}
                        totalData={pairData.totalIntData}
                        halfKdeMax={pairData.halfKdeMax || 0}
                        totalKdeMax={pairData.totalKdeMax || 0}
                        // aggregatedScale={aggregationScale}
                        aggregationScaleDomain={aggregationScaleDomain}
                        aggregationScaleRange={aggregationScaleRange}
                        name={pairData.name} />,
                        {extraPairTextGenerator(pairData.name, pairData.label, "Violin", pairData)}
                </g>);
                break;

            case "BarChart":
                transferedDistance += (extraPairWidth.BarChart + extraPairPadding)
                returningComponents.push(<g transform={`translate(${transferedDistance - (extraPairWidth.BarChart)},0)`}>
                    <ExtraPairBarInt
                        aggregationScaleDomain={aggregationScaleDomain}
                        aggregationScaleRange={aggregationScaleRange}
                        preDataSet={pairData.preIntData}
                        postDataSet={pairData.postIntData}
                        totalDataSet={pairData.totalIntData} />
                    {extraPairTextGenerator(pairData.name, pairData.label, "Bar", pairData)}
                </g>);
                break;
            case "Basic":
                transferedDistance += (extraPairWidth.Basic + extraPairPadding)
                returningComponents.push(<g transform={`translate(${transferedDistance - (extraPairWidth.Basic)},0)`}>
                    <ExtraPairBasicInt
                        aggregationScaleDomain={aggregationScaleDomain}
                        aggregationScaleRange={aggregationScaleRange}
                        preIntData={pairData.preIntData}
                        postIntData={pairData.postIntData}
                        totalData={pairData.totalIntData}
                        name={pairData.name} />
                    {extraPairTextGenerator(pairData.name, pairData.label, "Basic", pairData)}
                </g>);
                break;
        }
    })
    return returningComponents


}

export default inject("store")(observer(InterventionExtraPairGenerator));

const ExtraPairText = styled(`text`)`
  font-size: 11px
  text-anchor: middle
  alignment-baseline:hanging
  cursor:pointer
`
