import React, {
    FC
} from "react";
import { inject, observer } from "mobx-react";
import { extraPairWidth, extraPairPadding, offset, Accronym } from "../../PresetsProfile";
import { actions } from "../..";
import ExtraPairViolin from "../ExtraPair/ExtraPairViolin";
import ExtraPairBar from "../ExtraPair/ExtraPairBar";
import ExtraPairBasic from "../ExtraPair/ExtraPairBasic";
import styled from "styled-components";
import { select, max, format } from "d3";
import { ExtraPairPoint } from "../../Interfaces/ApplicationState";


interface OwnProps {
    extraPairDataSet: ExtraPairPoint[];
    // aggregationScale: ScaleBand<string>

    aggregationScaleDomain: string;
    aggregationScaleRange: string;
    chartId: string;
    height: number;
}

export type Props = OwnProps;

const ExtraPairPlotGenerator: FC<Props> = ({ extraPairDataSet, aggregationScaleDomain, aggregationScaleRange, chartId, height }: Props) => {

    const currentOffset = offset.regular;




    const extraPairTextGenerator = (nameInput: string, labelInput: string, type: "Basic" | "Violin" | "Bar",
        extraPairDataSet: ExtraPairPoint) => {
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
                let maximum = max(Object.values(extraPairDataSet.data));
                explanation = `Scaled 0-${format(".4r")(maximum)}`;
                spacing = extraPairWidth.BarChart;
                break;
        }

        let tooltipText = `${(Accronym as any)[nameInput] ? `${(Accronym as any)[nameInput]}<br/>` : ""}
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

    let transferedDistance = 0
    let returningComponents: any = []
    console.log(extraPairDataSet)
    extraPairDataSet.map((pairData, index) => {
        switch (pairData.type) {
            case "Violin":
                transferedDistance += (extraPairWidth.Dumbbell + extraPairPadding)
                returningComponents.push(<g transform={`translate(${transferedDistance - (extraPairWidth.Dumbbell)},0)`}>
                    <ExtraPairViolin
                        medianSet={pairData.medianSet}
                        aggregationScaleDomain={aggregationScaleDomain}
                        aggregationScaleRange={aggregationScaleRange}
                        //                        aggregatedScale={aggregationScale()}
                        dataSet={pairData.data}
                        name={pairData.name}
                        kdeMax={pairData.kdeMax ? pairData.kdeMax : (0)} />,

                   {extraPairTextGenerator(pairData.name, pairData.label, "Violin", pairData)}
                </g>);
                break;

            case "BarChart":
                transferedDistance += (extraPairWidth.BarChart + extraPairPadding)
                returningComponents.push(<g transform={`translate(${transferedDistance - (extraPairWidth.BarChart)},0)`}>
                    <ExtraPairBar
                        aggregationScaleDomain={aggregationScaleDomain}
                        aggregationScaleRange={aggregationScaleRange}
                        dataSet={pairData.data} />
                    {extraPairTextGenerator(pairData.name, pairData.label, "Bar", pairData)}
                </g>);
                break;

            case "Basic":
                transferedDistance += (extraPairWidth.Basic + extraPairPadding)
                returningComponents.push(<g transform={`translate(${transferedDistance - (extraPairWidth.Basic)},0)`}>

                    <ExtraPairBasic
                        aggregationScaleDomain={aggregationScaleDomain}
                        aggregationScaleRange={aggregationScaleRange}
                        name={pairData.name}
                        dataSet={pairData.data} />
                    {extraPairTextGenerator(pairData.name, pairData.label, "Basic", pairData)}
                </g>);
                break;

        }
    })
    return returningComponents
}



/**
 * if ((Accronym as any)[word]) {
            output.push((<div className="tooltip" style={{ cursor: "help" }}>{word}<span className="tooltiptext">{`${(Accronym as any)[word]}`}</span></div>))
 */

export default inject("store")(observer(ExtraPairPlotGenerator));

const ExtraPairText = styled(`text`)`
  font-size: 11px
  text-anchor: middle
  alignment-baseline:hanging
  cursor:pointer
`
