/** @jsxImportSource @emotion/react */
import { FC } from "react";
import { observer } from "mobx-react";
import { max, format } from "d3";
import { ExtraPairPoint } from "../../../../Interfaces/Types/DataTypes";
import { Basic_Gray, ExtraPairPadding, ExtraPairWidth, HGB_HIGH_STANDARD, HGB_LOW_STANDARD, largeFontSize, OffsetDict, regularFontSize } from "../../../../Presets/Constants";
import { AcronymDictionary } from "../../../../Presets/DataDict";
import { useContext } from "react";
import Store from "../../../../Interfaces/Store";
import ExtraPairViolin from "./ExtraPairViolin";
import ExtraPairBar from "./ExtraPairBar";
import ExtraPairBasic from "./ExtraPairBasic";
import { styled, Tooltip } from "@mui/material";
import { BiggerFontProps } from "../../../../Presets/StyledSVGComponents";
import { BiggerTooltip } from "../../../../Presets/StyledComponents";


interface OwnProps {
    extraPairDataSet: ExtraPairPoint[];
    secondaryExtraPairDataSet?: ExtraPairPoint[];
    aggregationScaleDomain: string;
    aggregationScaleRange: string;
    chartId: string;
    height: number;

}

export type Props = OwnProps;

const ExtraPairPlotGenerator: FC<Props> = ({ extraPairDataSet, secondaryExtraPairDataSet, aggregationScaleDomain, aggregationScaleRange, chartId, height }: Props) => {
    const store = useContext(Store);
    const currentOffset = OffsetDict.regular;
    const extraPairTextGenerator = (nameInput: string, labelInput: string, type: "Basic" | "Violin" | "Bar",
        extraPairDataSet: ExtraPairPoint) => {
        let explanation = "";
        let spacing = 0;
        switch (type) {
            case "Basic":
                explanation = `Percentage of Patients`;
                spacing = ExtraPairWidth.Basic;
                break;
            case "Violin":
                explanation = nameInput === "RISK" ? `Scaled 0-30` : (`Scaled 0-18, line at ${nameInput === "Preop HGB" ? HGB_HIGH_STANDARD : HGB_LOW_STANDARD}`);
                spacing = ExtraPairWidth.Violin;
                break;
            case "Bar":
                let maximum = max(Object.values(extraPairDataSet.data));
                explanation = `Scaled 0-${format(".4r")(maximum)}`;
                spacing = ExtraPairWidth.BarChart;
                break;
        }

        let tooltipText = <BiggerTooltip>
            {AcronymDictionary[nameInput] ? `${AcronymDictionary[nameInput]}` : undefined}
            {AcronymDictionary[nameInput] ? <br /> : <></>}
            {explanation} <br />
            (Click to remove)
        </BiggerTooltip>;

        return (
            <Tooltip title={tooltipText}>
                <ExtraPairText
                    x={spacing / 2}
                    y={height - currentOffset.bottom + 25}
                    biggerFont={store.configStore.largeFont}
                    onClick={() => {
                        store.chartStore.removeExtraPair(chartId, nameInput);
                    }}
                >
                    {labelInput}
                    <RemoveTSpan x={spacing / 2} dy="-0.5em" >x</RemoveTSpan>
                </ExtraPairText>
            </Tooltip>);


    };

    let transferedDistance = 0;
    let returningComponents: any = [];

    extraPairDataSet.forEach((pairData, index) => {
        let temporarySecondary = secondaryExtraPairDataSet;
        if (secondaryExtraPairDataSet) {
            temporarySecondary = secondaryExtraPairDataSet.length > 0 ? temporarySecondary : undefined;
        }
        switch (pairData.type) {
            case "Violin":
                transferedDistance += (ExtraPairWidth.Violin + ExtraPairPadding);
                const calculatedKdeMax = temporarySecondary ? Math.max(pairData.kdeMax || 0, temporarySecondary[index].kdeMax || 0) : (pairData.kdeMax || 0);
                returningComponents.push(
                    <g transform={`translate(${transferedDistance - (ExtraPairWidth.Violin)},0)`}>
                        <ExtraPairViolin
                            medianSet={pairData.medianSet}
                            aggregationScaleDomain={aggregationScaleDomain}
                            aggregationScaleRange={aggregationScaleRange}
                            kdeMax={calculatedKdeMax}
                            dataSet={pairData.data}
                            name={pairData.name}
                            secondaryDataSet={temporarySecondary ? temporarySecondary[index].data : undefined}
                            secondaryMedianSet={temporarySecondary ? temporarySecondary[index].medianSet : undefined}
                        />
                        {extraPairTextGenerator(pairData.name, pairData.label, "Violin", pairData)}
                    </g>);
                break;

            case "BarChart":
                transferedDistance += (ExtraPairWidth.BarChart + ExtraPairPadding);
                returningComponents.push(<g transform={`translate(${transferedDistance - (ExtraPairWidth.BarChart)},0)`}>
                    <ExtraPairBar
                        aggregationScaleDomain={aggregationScaleDomain}
                        aggregationScaleRange={aggregationScaleRange}
                        dataSet={pairData.data}
                        secondaryDataSet={temporarySecondary ? temporarySecondary[index].data : undefined} />
                    {extraPairTextGenerator(pairData.name, pairData.label, "Bar", pairData)}
                </g>);
                break;

            case "Basic":
                transferedDistance += (ExtraPairWidth.Basic + ExtraPairPadding);


                returningComponents.push(<g transform={`translate(${transferedDistance - (ExtraPairWidth.Basic)},0)`}>

                    <ExtraPairBasic
                        aggregationScaleDomain={aggregationScaleDomain}
                        aggregationScaleRange={aggregationScaleRange}
                        secondaryDataSet={temporarySecondary ? temporarySecondary[index].data : undefined}
                        dataSet={pairData.data} />
                    {extraPairTextGenerator(pairData.name, pairData.label, "Basic", pairData)}
                </g>);
                break;

        }
    });
    return returningComponents;
};

export default observer(ExtraPairPlotGenerator);

const RemoveTSpan = styled(`tspan`)`
    font-size:10px;
    fill:${Basic_Gray};
    opacity:0;
     &:hover{
        opacity:1;
     }
`;

const ExtraPairText = styled(`text`) <BiggerFontProps>`
  font-size: ${props => props.biggerFont ? `${largeFontSize}px` : `${regularFontSize}px`};
  text-anchor: middle;
  alignment-baseline:hanging;
  cursor:pointer;
    &:hover tspan {
        opacity:1;
  }
`;

