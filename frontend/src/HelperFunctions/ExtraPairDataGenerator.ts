/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  median, min, max,
} from 'd3';
import { create as createpd } from 'pdfast';
import {
  SingleCasePoint, BasicAggregatedDatePoint, ExtraPairPoint,
} from '../Interfaces/Types/DataTypes';
import { generateRegularData } from './ChartDataGenerator';

// Returns ExtraPairData point for 'Basic' extra pair data type.
const getBasicExtraPairData = (aggregatedBy: string, attributeName: string, attributeLabel: string, data: BasicAggregatedDatePoint[], hemoglobinDataSet: SingleCasePoint[]) => {
  const temporaryDataHolder: any = {};
  const attributeData = {} as any;
  const caseDictionary = {} as any;
  data.forEach((dataPoint: BasicAggregatedDatePoint) => {
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
  return ({
    name: attributeName, label: attributeLabel, data: attributeData, type: 'Basic',
  }) as ExtraPairPoint;
};

// Generate the data for the extra attribute plot(s) specifically. (Taken from WrapperHeatMap.tsx, to be re-used in CostBarChart.tsx)
export const generateExtraAttributeData = (filteredCases: SingleCasePoint[], yAxisVar: string, outcomeComparison: string | undefined, interventionDate: number | undefined, showZero: boolean, xAxisVar: string) => {
  const temporaryDataHolder: Record<string | number, { data: SingleCasePoint[], aggregateAttribute: string | number, patientIDList: Set<number> }> = {};
  const secondaryTemporaryDataHolder: Record<string | number, { data: SingleCasePoint[], aggregateAttribute: string | number, patientIDList: Set<number> }> = {};
  filteredCases.forEach((singleCase: SingleCasePoint) => {
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

    if ((outcomeComparison && singleCase[outcomeComparison] as number > 0) || (interventionDate && new Date(singleCase.CASE_DATE) < new Date(interventionDate))) {
      secondaryTemporaryDataHolder[singleCase[yAxisVar]].data.push(singleCase);
      secondaryTemporaryDataHolder[singleCase[yAxisVar]].patientIDList.add(singleCase.MRN);
    } else {
      temporaryDataHolder[singleCase[yAxisVar]].data.push(singleCase);
      temporaryDataHolder[singleCase[yAxisVar]].patientIDList.add(singleCase.MRN);
    }
  });
  const [tempCaseCount, outputData] = generateRegularData(temporaryDataHolder, showZero, xAxisVar as 'PRBC_UNITS' | 'FFP_UNITS' | 'PLT_UNITS' | 'CRYO_UNITS' | 'CELL_SAVER_ML');
  const [secondCaseCount, secondOutputData] = generateRegularData(secondaryTemporaryDataHolder, showZero, xAxisVar as 'PRBC_UNITS' | 'FFP_UNITS' | 'PLT_UNITS' | 'CRYO_UNITS' | 'CELL_SAVER_ML');
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

export const generateExtrapairPlotData = (aggregatedBy: string, hemoglobinDataSet: SingleCasePoint[], extraPairArray: string[], data: BasicAggregatedDatePoint[]) => {
  const newExtraPairData: ExtraPairPoint[] = [];
  if (extraPairArray.length > 0) {
    extraPairArray.forEach((variable: string) => {
      const newData = {} as any;
      const caseDictionary = {} as any;
      const medianData = {} as any;
      let kdeMaxTemp: any = 0;
      switch (variable) {
        case 'TOTAL_TRANS':
          // let newDataBar = {} as any;
          data.forEach((dataPoint) => {
            newData[dataPoint.aggregateAttribute] = dataPoint.totalVal;
          });
          newExtraPairData.push({
            name: 'TOTAL_TRANS', label: 'Total', data: newData, type: 'BarChart',
          });
          break;
        case 'PER_CASE':
          // let newDataPerCase = {} as any;
          data.forEach((dataPoint: BasicAggregatedDatePoint) => {
            newData[dataPoint.aggregateAttribute] = dataPoint.totalVal / dataPoint.caseCount;
          });
          newExtraPairData.push({
            name: 'PER_CASE', label: 'Per Case', data: newData, type: 'BarChart',
          });
          break;
        case 'ZERO_TRANS':
          // let newDataPerCase = {} as any;
          data.forEach((dataPoint: BasicAggregatedDatePoint) => {
            newData[dataPoint.aggregateAttribute] = { attributeCaseCount: dataPoint.zeroCaseNum, rowCaseCount: dataPoint.caseCount };
          });
          newExtraPairData.push({
            name: 'ZERO_TRANS', label: 'Zero %', data: newData, type: 'Basic',
          });
          break;

        case 'DEATH':
          newExtraPairData.push(getBasicExtraPairData(aggregatedBy, 'DEATH', 'Death', data, hemoglobinDataSet));
          break;
        case 'VENT':
          newExtraPairData.push(getBasicExtraPairData(aggregatedBy, 'VENT', 'Vent', data, hemoglobinDataSet));
          break;
        case 'ECMO':
          newExtraPairData.push(getBasicExtraPairData(aggregatedBy, 'ECMO', 'ECMO', data, hemoglobinDataSet));
          break;
        case 'STROKE':
          newExtraPairData.push(getBasicExtraPairData(aggregatedBy, 'STROKE', 'Stroke', data, hemoglobinDataSet));
          break;
        case 'AMICAR':
          newExtraPairData.push(getBasicExtraPairData(aggregatedBy, 'AMICAR', 'Amicar', data, hemoglobinDataSet));
          break;
        case 'B12':
          newExtraPairData.push(getBasicExtraPairData(aggregatedBy, 'B12', 'B12', data, hemoglobinDataSet));
          break;
        case 'TXA':
          newExtraPairData.push(getBasicExtraPairData(aggregatedBy, 'TXA', 'TXA', data, hemoglobinDataSet));
          break;
        case 'IRON':
          newExtraPairData.push(getBasicExtraPairData(aggregatedBy, 'IRON', 'Iron', data, hemoglobinDataSet));
          break;

        case 'DRG_WEIGHT':
        case 'PREOP_HEMO':
        case 'POSTOP_HEMO': {
          // let newData = {} as any;
          data.forEach((dataPoint: BasicAggregatedDatePoint) => {
            newData[dataPoint.aggregateAttribute] = [];
            caseDictionary[dataPoint.aggregateAttribute] = new Set(dataPoint.caseIDList);
          });
          hemoglobinDataSet.forEach((ob: any) => {
            const resultValue = ob[variable];
            if (newData[ob[aggregatedBy]] && resultValue > 0 && caseDictionary[ob[aggregatedBy]].has(ob.CASE_ID)) {
              newData[ob[aggregatedBy]].push(resultValue);
            }
          });

          // Compute the attribute-wide min and max for 'POSTOP_HEMO'
          const { attributeMin, attributeMax } = getAttributeMinMax(newData);

          for (const prop in newData) {
            if (Object.hasOwn(newData, prop)) {
              medianData[prop] = median(newData[prop]);

              // Create the KDE for the attribute using the computed min and max
              let pd = createpd(newData[prop], { width: 2, min: attributeMin, max: attributeMax });
              pd = [{ x: 0, y: 0 }].concat(pd);

              if ((newData[prop] as any).length > 5) {
                kdeMaxTemp = (max(pd, (val: any) => val.y) as any) > kdeMaxTemp ? max(pd, (val: any) => val.y) : kdeMaxTemp;
              }

              const reversePd = pd.map((pair: any) => ({ x: pair.x, y: -pair.y })).reverse();
              pd = pd.concat(reversePd);
              newData[prop] = { kdeArray: pd, dataPoints: newData[prop] };
            }
          }
          newExtraPairData.push({
            name: variable, label: variable, data: newData, type: 'Violin', medianSet: medianData, kdeMax: kdeMaxTemp,
          });
          break;
        }
        default:
          break;
      }
    });
  }
  return newExtraPairData;
};
