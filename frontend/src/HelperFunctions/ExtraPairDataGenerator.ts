/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  median, min, max, mean, sum,
} from 'd3';
import { create as createpd } from 'pdfast';
import {
  SingleCasePoint, BasicAggregatedDatePoint, ExtraPairPoint,
} from '../Interfaces/Types/DataTypes';

const outcomeDataGenerate = (aggregatedBy: string, name: string, label: string, data: BasicAggregatedDatePoint[], hemoglobinDataSet: SingleCasePoint[]) => {
  const temporaryDataHolder: any = {};
  const newData = {} as any;
  const caseDictionary = {} as any;
  data.forEach((dataPoint: BasicAggregatedDatePoint) => {
    temporaryDataHolder[dataPoint.aggregateAttribute] = [];
    caseDictionary[dataPoint.aggregateAttribute] = new Set(dataPoint.caseIDList);
    newData[dataPoint.aggregateAttribute] = { outOfTotal: dataPoint.caseCount };
  });
  hemoglobinDataSet.forEach((ob: any) => {
    if (temporaryDataHolder[ob[aggregatedBy]] && caseDictionary[ob[aggregatedBy]].has(ob.CASE_ID)) {
      temporaryDataHolder[ob[aggregatedBy]].push(ob[name]);
    }
  });
  for (const [key, value] of Object.entries(temporaryDataHolder)) {
    newData[key].calculated = mean(value as any);
    newData[key].actualVal = sum(value as any);
  }
  return ({
    name, label, data: newData, type: 'Basic',
  }) as ExtraPairPoint;
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
      const temporaryDataHolder: any = {};
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
            newData[dataPoint.aggregateAttribute] = { actualVal: dataPoint.zeroCaseNum, calculated: dataPoint.zeroCaseNum / dataPoint.caseCount, outOfTotal: dataPoint.caseCount };
          });
          newExtraPairData.push({
            name: 'ZERO_TRANS', label: 'Zero %', data: newData, type: 'Basic',
          });
          break;

        case 'DEATH':
          newExtraPairData.push(outcomeDataGenerate(aggregatedBy, 'DEATH', 'Death', data, hemoglobinDataSet));
          break;
        case 'VENT':
          newExtraPairData.push(outcomeDataGenerate(aggregatedBy, 'VENT', 'Vent', data, hemoglobinDataSet));
          break;
        case 'ECMO':
          newExtraPairData.push(outcomeDataGenerate(aggregatedBy, 'ECMO', 'ECMO', data, hemoglobinDataSet));
          break;
        case 'STROKE':
          newExtraPairData.push(outcomeDataGenerate(aggregatedBy, 'STROKE', 'Stroke', data, hemoglobinDataSet));
          break;
        case 'AMICAR':
          newExtraPairData.push(outcomeDataGenerate(aggregatedBy, 'AMICAR', 'Amicar', data, hemoglobinDataSet));
          break;
        case 'B12':
          newExtraPairData.push(outcomeDataGenerate(aggregatedBy, 'B12', 'B12', data, hemoglobinDataSet));
          break;
        case 'TXA':
          newExtraPairData.push(outcomeDataGenerate(aggregatedBy, 'TXA', 'TXA', data, hemoglobinDataSet));
          break;
        case 'IRON':
          newExtraPairData.push(outcomeDataGenerate(aggregatedBy, 'IRON', 'Iron', data, hemoglobinDataSet));
          break;

        case 'RISK': {
          // let temporaryDataHolder: any = {}
          data.forEach((dataPoint: BasicAggregatedDatePoint) => {
            temporaryDataHolder[dataPoint.aggregateAttribute] = [];
            caseDictionary[dataPoint.aggregateAttribute] = new Set(dataPoint.caseIDList);
          });
          hemoglobinDataSet.forEach((ob: any) => {
            if (temporaryDataHolder[ob[aggregatedBy]] && caseDictionary[ob[aggregatedBy]].has(ob.CASE_ID)) {
              temporaryDataHolder[ob[aggregatedBy]].push(ob.DRG_WEIGHT);
            }
          });

          // Compute the attribute-wide min and max for 'DRG_WEIGHT' AKA 'RISK'
          const { attributeMin, attributeMax } = getAttributeMinMax(temporaryDataHolder);

          for (const [key, value] of Object.entries(temporaryDataHolder)) {
            medianData[key] = median(value as any);

            // Create the KDE for the attribute using the computed min and max
            let pd = createpd(value, { min: attributeMin, max: attributeMax });
            // pd = [{ x: 0, y: 0 }].concat(pd);

            if ((value as any).length > 5) {
              kdeMaxTemp = (max(pd, (val: any) => val.y) as any) > kdeMaxTemp ? max(pd, (val: any) => val.y) : kdeMaxTemp;
            }

            const reversePd = pd.map((pair: any) => ({ x: pair.x, y: -pair.y })).reverse();
            pd = pd.concat(reversePd);
            newData[key] = { kdeArray: pd, dataPoints: value };
          }
          newExtraPairData.push({
            name: 'RISK', label: 'DRG Weight', data: newData, type: 'Violin', medianSet: medianData, kdeMax: kdeMaxTemp,
          });
          break;
        }
        case 'PREOP_HEMO': {
          data.forEach((dataPoint: BasicAggregatedDatePoint) => {
            newData[dataPoint.aggregateAttribute] = [];
            caseDictionary[dataPoint.aggregateAttribute] = new Set(dataPoint.caseIDList);
          });

          hemoglobinDataSet.forEach((ob: SingleCasePoint) => {
            const resultValue = ob.PREOP_HEMO;
            if (newData[ob[aggregatedBy]] && resultValue > 0 && caseDictionary[ob[aggregatedBy]].has(ob.CASE_ID)) {
              newData[ob[aggregatedBy]].push(resultValue);
            }
          });

          // Compute the attribute-wide min and max for 'PREOP_HEMO'
          const { attributeMin, attributeMax } = getAttributeMinMax(newData);

          for (const prop in newData) {
            if (Object.hasOwn(newData, prop)) {
              medianData[prop] = median(newData[prop]);

              // Create the KDE for the attribute using the computed min and max
              let pd = createpd(newData[prop], { width: 2, min: attributeMin, max: attributeMax });
              // pd = [{ x: 0, y: 0 }].concat(pd);

              if ((newData[prop] as any).length > 5) {
                kdeMaxTemp = (max(pd, (val: any) => val.y) as any) > kdeMaxTemp ? max(pd, (val: any) => val.y) : kdeMaxTemp;
              }

              const reversePd = pd.map((pair: any) => ({ x: pair.x, y: -pair.y })).reverse();
              pd = pd.concat(reversePd);
              newData[prop] = { kdeArray: pd, dataPoints: newData[prop] };
            }
          }
          newExtraPairData.push({
            name: 'PREOP_HEMO', label: 'Preop HGB', data: newData, type: 'Violin', medianSet: medianData, kdeMax: kdeMaxTemp,
          });
          break;
        }
        case 'POSTOP_HEMO': {
          // let newData = {} as any;
          data.forEach((dataPoint: BasicAggregatedDatePoint) => {
            newData[dataPoint.aggregateAttribute] = [];
            caseDictionary[dataPoint.aggregateAttribute] = new Set(dataPoint.caseIDList);
          });
          hemoglobinDataSet.forEach((ob: any) => {
            const resultValue = ob.POSTOP_HEMO;
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
              // pd = [{ x: 0, y: 0 }].concat(pd);

              if ((newData[prop] as any).length > 5) {
                kdeMaxTemp = (max(pd, (val: any) => val.y) as any) > kdeMaxTemp ? max(pd, (val: any) => val.y) : kdeMaxTemp;
              }

              const reversePd = pd.map((pair: any) => ({ x: pair.x, y: -pair.y })).reverse();
              pd = pd.concat(reversePd);
              newData[prop] = { kdeArray: pd, dataPoints: newData[prop] };
            }
          }
          newExtraPairData.push({
            name: 'POSTOP_HEMO', label: 'Postop HGB', data: newData, type: 'Violin', medianSet: medianData, kdeMax: kdeMaxTemp,
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
