/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  median, min, max,
} from 'd3';
import { create as createpd } from 'pdfast';
import {
  AttributePlotData,
  BasicAggregatedDataPoint,
  Surgery,
} from '../Interfaces/Types/DataTypes';
import { generateRegularData } from './ChartDataGenerator';
import { HeatMapLayoutElement } from '../Interfaces/Types/LayoutTypes';
import { BloodComponent, EXTRA_PAIR_OPTIONS } from '../Presets/DataDict';

// Returns AttributePlotData point for 'Basic' extra pair data type.
const getBasicAttributePlotData = (aggregatedBy: string, attributeName: typeof EXTRA_PAIR_OPTIONS[number], attributeLabel: string, data: BasicAggregatedDataPoint[], hemoglobinDataSet: Surgery[]): AttributePlotData<'Basic'> => {
  const temporaryDataHolder: Record<string, number[]> = {};
  const attributeData: AttributePlotData<'Basic'>['attributeData'] = {};
  const caseDictionary: Record<string, Set<number>> = {};

  data.forEach((dataPoint: BasicAggregatedDataPoint) => {
    temporaryDataHolder[dataPoint.aggregateAttribute] = [];
    caseDictionary[dataPoint.aggregateAttribute] = new Set(dataPoint.caseIDList);
    attributeData[dataPoint.aggregateAttribute] = { rowCaseCount: dataPoint.caseCount };
  });

  hemoglobinDataSet.forEach((ob: any) => {
    if (temporaryDataHolder[ob[aggregatedBy]] && caseDictionary[ob[aggregatedBy]].has(ob.CASE_ID)) {
      temporaryDataHolder[ob[aggregatedBy]].push(ob[attributeName]);
    }
  });

  for (const [key, value] of Object.entries(temporaryDataHolder)) {
    attributeData[key].attributeCaseCount = (value as any)
      .filter((v: any) => v != null && v > 0)
      .length;
  }

  // Return an extra pair datapoint which is a basic type
  return {
    attributeName,
    attributeLabel,
    attributeData,
    type: 'Basic',
  };
};

// Generate the data for the extra attribute plot(s) specifically. (Taken from WrapperHeatMap.tsx, to be re-used in CostBarChart.tsx)
export const generateExtraAttributeData = (filteredCases: Surgery[], yAxisVar: HeatMapLayoutElement['yAxisVar'], outcomeComparison: string | undefined, interventionDate: number | undefined, showZero: boolean, xAxisVar: string) => {
  const temporaryDataHolder: Record<string | number, { data: Surgery[], aggregateAttribute: string | number, patientIDList: Set<number> }> = {};
  const secondaryTemporaryDataHolder: Record<string | number, { data: Surgery[], aggregateAttribute: string | number, patientIDList: Set<number> }> = {};
  filteredCases.forEach((singleCase) => {
    if (!temporaryDataHolder[singleCase[yAxisVar]]) {
      temporaryDataHolder[singleCase[yAxisVar]] = {
        aggregateAttribute: singleCase[yAxisVar],
        data: [],
        patientIDList: new Set(),
      };
      secondaryTemporaryDataHolder[singleCase[yAxisVar]] = {
        aggregateAttribute: singleCase[yAxisVar],
        data: [],
        patientIDList: new Set(),
      };
    }

    if ((outcomeComparison && singleCase[outcomeComparison] as number > 0) || (interventionDate && new Date(singleCase.case_date) < new Date(interventionDate))) {
      secondaryTemporaryDataHolder[singleCase[yAxisVar]].data.push(singleCase);
      secondaryTemporaryDataHolder[singleCase[yAxisVar]].patientIDList.add(singleCase.mrn);
    } else {
      temporaryDataHolder[singleCase[yAxisVar]].data.push(singleCase);
      temporaryDataHolder[singleCase[yAxisVar]].patientIDList.add(singleCase.mrn);
    }
  });
  const [tempCaseCount, outputData] = generateRegularData(temporaryDataHolder, showZero, xAxisVar as BloodComponent);
  const [secondCaseCount, secondOutputData] = generateRegularData(secondaryTemporaryDataHolder, showZero, xAxisVar as BloodComponent);
  return [tempCaseCount, secondCaseCount, outputData, secondOutputData];
};
/**
 * Compute an attribute-wide min and max.
 * @param input - The object to compute the min and max over.
 * @returns The min and max of the object.
 */
function getAttributeMinMax(input: Record<string, number[]>): { attributeMin: number, attributeMax: number } {
  const attributeData = Object.values(input).flat();
  return { attributeMin: min(attributeData)!, attributeMax: max(attributeData)! };
}

export const generateAttributePlotData = (aggregatedBy: string, hemoglobinDataSet: Surgery[], attributePlotArray: string[], data: BasicAggregatedDataPoint[]) => {
  const newAttributePlotData: AttributePlotData<'Violin' | 'BarChart' | 'Basic'>[] = [];
  if (attributePlotArray.length > 0) {
    attributePlotArray.forEach((attributeName: string) => {
      const attributeData: AttributePlotData<'Violin' | 'BarChart' | 'Basic'>['attributeData'] = {};
      const caseDictionary = {} as any;
      const medianData = {} as any;
      let kdeMaxTemp: any = 0;

      switch (attributeName) {
        case 'TOTAL_TRANS':
          data.forEach((dataPoint) => {
            attributeData[dataPoint.aggregateAttribute] = dataPoint.totalVal; // Using 1 as rowCaseCount gives total per attribute (instead of per case)
          });
          newAttributePlotData.push({
            attributeName: 'TOTAL_TRANS', attributeLabel: 'Total', attributeData, type: 'BarChart',
          });
          break;
        case 'PER_CASE':
          data.forEach((dataPoint: BasicAggregatedDataPoint) => {
            attributeData[dataPoint.aggregateAttribute] = dataPoint.totalVal / dataPoint.caseCount;
          });
          newAttributePlotData.push({
            attributeName: 'PER_CASE', attributeLabel: 'Per Case', attributeData, type: 'BarChart',
          });
          break;
        case 'ZERO_TRANS':
          data.forEach((dataPoint: BasicAggregatedDataPoint) => {
            attributeData[dataPoint.aggregateAttribute] = { attributeCaseCount: dataPoint.zeroCaseNum, rowCaseCount: dataPoint.caseCount };
          });
          newAttributePlotData.push({
            attributeName: 'ZERO_TRANS', attributeLabel: 'Zero %', attributeData, type: 'Basic',
          });
          break;

        case 'DEATH':
          newAttributePlotData.push(getBasicAttributePlotData(aggregatedBy, 'DEATH', 'Death', data, hemoglobinDataSet));
          break;
        case 'VENT':
          newAttributePlotData.push(getBasicAttributePlotData(aggregatedBy, 'VENT', 'Vent', data, hemoglobinDataSet));
          break;
        case 'ECMO':
          newAttributePlotData.push(getBasicAttributePlotData(aggregatedBy, 'ECMO', 'ECMO', data, hemoglobinDataSet));
          break;
        case 'STROKE':
          newAttributePlotData.push(getBasicAttributePlotData(aggregatedBy, 'STROKE', 'Stroke', data, hemoglobinDataSet));
          break;
        case 'AMICAR':
          newAttributePlotData.push(getBasicAttributePlotData(aggregatedBy, 'AMICAR', 'Amicar', data, hemoglobinDataSet));
          break;
        case 'B12':
          newAttributePlotData.push(getBasicAttributePlotData(aggregatedBy, 'B12', 'B12', data, hemoglobinDataSet));
          break;
        case 'TXA':
          newAttributePlotData.push(getBasicAttributePlotData(aggregatedBy, 'TXA', 'TXA', data, hemoglobinDataSet));
          break;
        case 'IRON':
          newAttributePlotData.push(getBasicAttributePlotData(aggregatedBy, 'IRON', 'Iron', data, hemoglobinDataSet));
          break;

        case 'DRG_WEIGHT':
        case 'PREOP_HEMO':
        case 'POSTOP_HEMO': {
          const dataPoints: Record<string, number[]> = {};
          data.forEach((dataPoint: BasicAggregatedDataPoint) => {
            dataPoints[dataPoint.aggregateAttribute] = [] as number[];
            caseDictionary[dataPoint.aggregateAttribute] = new Set(dataPoint.caseIDList);
          });
          hemoglobinDataSet.forEach((ob: any) => {
            const resultValue = ob[attributeName];
            if (dataPoints[ob[aggregatedBy]] && resultValue > 0 && caseDictionary[ob[aggregatedBy]].has(ob.CASE_ID)) {
              (dataPoints[ob[aggregatedBy]] as number[]).push(resultValue);
            }
          });

          // Compute the attribute-wide min and max for 'POSTOP_HEMO'
          const { attributeMin, attributeMax } = getAttributeMinMax(dataPoints);

          Object.entries(dataPoints).forEach(([key, value]) => {
            if (value.length > 0) {
              medianData[key] = median(value);

              // Create the KDE for the attribute using the computed min and max
              let pd = createpd(value, { width: 2, min: attributeMin, max: attributeMax });
              pd = [{ x: 0, y: 0 }].concat(pd);

              if (value.length > 5) {
                kdeMaxTemp = (max(pd, (val: any) => val.y) as any) > kdeMaxTemp ? max(pd, (val: any) => val.y) : kdeMaxTemp;
              }

              const reversePd = pd.map((pair: any) => ({ x: pair.x, y: -pair.y })).reverse();
              pd = pd.concat(reversePd);
              attributeData[key] = { kdeArray: pd, dataPoints: value };
            }
          });
          newAttributePlotData.push({
            attributeName,
            attributeLabel: attributeName,
            attributeData,
            type: 'Violin',
            medianSet: medianData,
            kdeMax: kdeMaxTemp,
          });
          break;
        }
        default:
          break;
      }
    });
  }
  return newAttributePlotData;
};
