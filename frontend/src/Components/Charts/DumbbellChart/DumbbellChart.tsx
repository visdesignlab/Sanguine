import {
  select, median, range, scaleLinear, scaleOrdinal, axisLeft, ScaleOrdinal,
} from 'd3';
import { observer } from 'mobx-react';
import {
  useCallback, useEffect, useState, useContext,
} from 'react';
import useDeepCompareEffect from 'use-deep-compare-effect';
import { stateUpdateWrapperUseJSON } from '../../../Interfaces/StateChecker';
import Store from '../../../Interfaces/Store';
import { DumbbellDataPoint } from '../../../Interfaces/Types/DataTypes';
import {
  OffsetDict, HGB_HIGH_STANDARD, HGB_LOW_STANDARD, DumbbellMinimumWidth, largeFontSize, regularFontSize,
} from '../../../Presets/Constants';
import { AcronymDictionary } from '../../../Presets/DataDict';
import { DumbbellLine } from '../../../Presets/StyledSVGComponents';
import CustomizedAxisOrdinal from '../ChartAccessories/CustomizedAxisOrdinal';
import SingleDumbbell from './SingleDumbbell';
import { DumbbellLayoutElement } from '../../../Interfaces/Types/LayoutTypes';

function binSort(a: DumbbellDataPoint, b: DumbbellDataPoint, xAxisVar: DumbbellLayoutElement['xAxisVar'], providerCounts: Record<string, number>) {
  // If xAxisVar is a provider sort by number of data points for this bin.
  if (['SURGEON_PROV_ID', 'ANESTH_PROV_ID'].includes(xAxisVar)) {
    if (providerCounts[a.xVal] > providerCounts[b.xVal]) return -1;
    if (providerCounts[a.xVal] < providerCounts[b.xVal]) return 1;
  }
  // Else we sort ordinal
  return a.xVal - b.xVal;
}

type Props = {
    data: DumbbellDataPoint[];
    xAxisVar: DumbbellLayoutElement['xAxisVar'];
    dimensionWidth: number,
    dimensionHeight: number;
    svg: React.RefObject<SVGSVGElement>;
    xMin: number;
    xMax: number;
    sortMode: string;
    showPreop: boolean;
    showPostop: boolean;
    showGap: boolean;
};
function DumbbellChart({
  data, xAxisVar, dimensionHeight, dimensionWidth, svg, xMax, xMin, showGap, showPostop, showPreop, sortMode,
}: Props) {
  const [averageForEachTransfused, setAverage] = useState<Record<number | string, { averageStart: number, averageEnd: number }>>({});
  const [sortedData, setSortedData] = useState<DumbbellDataPoint[]>([]);
  const [bins, setBins] = useState<{ num: number, indexEnding: number; }[]>([]);
  const [dataPointsDict, setDataPointDict] = useState<{ title: number, length: number; }[]>([]);
  const [resultRange, setResultRange] = useState<number[]>([]);
  const [indices, setIndices] = useState([]);

  const store = useContext(Store);
  const { currentSelectSet } = store.provenanceState;

  const currentOffset = OffsetDict.minimum;
  const svgSelection = select(svg.current);

  const sortDataHelper = (originalData: DumbbellDataPoint[], sortModeInput: string) => {
    const copyOfData: DumbbellDataPoint[] = JSON.parse(JSON.stringify(originalData));
    const providerCounts = copyOfData.reduce((acc, curr) => {
      if (acc[curr.xVal]) {
        acc[curr.xVal] += 1;
      } else {
        acc[curr.xVal] = 1;
      }
      return acc;
    }, {} as Record<string, number>);
    if (originalData.length > 0) {
      let tempSortedData: DumbbellDataPoint[] = [];
      switch (sortModeInput) {
        case 'Postop':
          tempSortedData = copyOfData.sort(
            (a, b) => {
              if (a.xVal === b.xVal) {
                if (a.endYVal > b.endYVal) return 1;
                if (a.endYVal < b.endYVal) return -1;
              } else {
                return binSort(a, b, xAxisVar, providerCounts);
              }
              return 0;
            },
          );
          break;
        case 'Preop':
          tempSortedData = copyOfData.sort(
            (a, b) => {
              if (a.xVal === b.xVal) {
                if (a.startYVal > b.startYVal) return 1;
                if (a.startYVal < b.startYVal) return -1;
              } else {
                return binSort(a, b, xAxisVar, providerCounts);
              }
              return 0;
            },
          );
          break;
        case 'Gap':
          tempSortedData = copyOfData.sort(
            (a, b) => {
              if (a.xVal === b.xVal) {
                if (Math.abs(a.endYVal - a.startYVal) > Math.abs(b.endYVal - b.startYVal)) return 1;
                if (Math.abs(a.endYVal - a.startYVal) < Math.abs(b.endYVal - b.startYVal)) return -1;
              } else {
                return binSort(a, b, xAxisVar, providerCounts);
              }
              return 0;
            },
          );
          break;
        default:
          break;
      }
      return tempSortedData;
    }
    return [];
  };

  useEffect(() => {
    const tempBins: { num: number, indexEnding: number; }[] = [];
    const tempDataPointsDict: { title: number, length: number; }[] = [];
    if (data.length > 0) {
      const tempSortedData = sortDataHelper(data, sortMode);
      let currentPreOpSum: number[] = [];
      let currentPostOpSum: number[] = [];
      const averageDict: Record<number | string, { averageStart?: number, averageEnd?: number }> = {};
      if (xAxisVar === 'CELL_SAVER_ML') {
        tempSortedData.forEach((d, i) => {
          currentPreOpSum.push(d.startYVal);
          currentPostOpSum.push(d.endYVal);
          const roundedAnswer = Math.floor(d.xVal / 100) * 100;
          if (i === tempSortedData.length - 1) {
            tempBins.push({ num: roundedAnswer, indexEnding: i });
            averageDict[roundedAnswer] = { averageStart: median(currentPreOpSum), averageEnd: median(currentPostOpSum) };
            tempDataPointsDict.push({ title: roundedAnswer, length: currentPreOpSum.length });
          } else if (roundedAnswer !== (Math.floor(tempSortedData[i + 1].xVal / 100) * 100)) {
            tempBins.push({ num: roundedAnswer, indexEnding: i });
            averageDict[(roundedAnswer).toString()] = { averageStart: median(currentPreOpSum), averageEnd: median(currentPostOpSum) };
            tempDataPointsDict.push({ title: roundedAnswer, length: currentPreOpSum.length });
            currentPostOpSum = [];
            currentPreOpSum = [];
          }
        });
      } else {
        tempSortedData.forEach((d, i) => {
          currentPreOpSum.push(d.startYVal);
          currentPostOpSum.push(d.endYVal);
          if (i === tempSortedData.length - 1) {
            tempBins.push({ num: d.xVal, indexEnding: i });
            averageDict[d.xVal] = { averageStart: median(currentPreOpSum), averageEnd: median(currentPostOpSum) };
            tempDataPointsDict.push({ title: d.xVal, length: currentPreOpSum.length });
          } else if (d.xVal !== tempSortedData[i + 1].xVal) {
            tempBins.push({ num: d.xVal, indexEnding: i });
            averageDict[(d.xVal).toString()] = { averageStart: median(currentPreOpSum), averageEnd: median(currentPostOpSum) };
            tempDataPointsDict.push({ title: d.xVal, length: currentPreOpSum.length });
            currentPostOpSum = [];
            currentPreOpSum = [];
          }
        });
      }

      const newIndices = range(0, data.length);
      stateUpdateWrapperUseJSON(indices, newIndices, setIndices);
      stateUpdateWrapperUseJSON(averageForEachTransfused, averageDict, setAverage);
      stateUpdateWrapperUseJSON(sortedData, tempSortedData, setSortedData);
      stateUpdateWrapperUseJSON(dataPointsDict, tempDataPointsDict, setDataPointDict);
      stateUpdateWrapperUseJSON(bins, tempBins, setBins);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    const tempSortedData = sortDataHelper(data, sortMode);
    stateUpdateWrapperUseJSON(sortedData, tempSortedData, setSortedData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortMode]);

  useDeepCompareEffect(() => {
    const widthAllowed = dimensionWidth - currentOffset.left - currentOffset.right;

    const spacing: Record<number, number> = {};

    if (DumbbellMinimumWidth * dataPointsDict.length >= (widthAllowed)) {
      dataPointsDict.forEach((d, i) => {
        spacing[i] = widthAllowed / dataPointsDict.length;
      });
    } else {
      let numberOfTitlesUsingMinimumScale = 0;
      let totalDataPointsNotUsingMinimumScale = 0;
      dataPointsDict.forEach((d, i) => {
        if ((d.length / sortedData.length) * widthAllowed < DumbbellMinimumWidth) {
          spacing[i] = DumbbellMinimumWidth;
          numberOfTitlesUsingMinimumScale += 1;
        } else {
          totalDataPointsNotUsingMinimumScale += d.length;
        }
      });
      const spaceLeft = widthAllowed - numberOfTitlesUsingMinimumScale * DumbbellMinimumWidth;

      dataPointsDict.forEach((d, i) => {
        if (!spacing[i]) {
          spacing[i] = spaceLeft * (d.length / totalDataPointsNotUsingMinimumScale);
        }
      });
    }

    let newResultRange: number[] = [];
    let currentLoc = currentOffset.left;
    dataPointsDict.forEach((d, i) => {
      const calculatedRange = range(currentLoc, currentLoc + spacing[i], spacing[i] / (d.length + 1));
      calculatedRange.splice(0, 1);
      if (calculatedRange.length !== d.length) {
        calculatedRange.splice(calculatedRange.length - 1, 1);
      }
      newResultRange = newResultRange.concat(calculatedRange);
      currentLoc += spacing[i];
    });
    stateUpdateWrapperUseJSON(resultRange, newResultRange, setResultRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataPointsDict, dimensionWidth, currentOffset, sortedData]);

  const testValueScale = useCallback(() => scaleLinear()
    .domain([0.9 * xMin, 1.1 * xMax])
    .range([dimensionHeight - currentOffset.bottom, currentOffset.top]), [xMin, xMax, dimensionHeight, currentOffset]);

  const valueScale = useCallback(() => scaleOrdinal()
    .domain(indices)
    .range(resultRange), [indices, resultRange]);

  const testLabel = axisLeft(testValueScale());

  svgSelection
    .select('.axes')
    .select('.x-label')
    .attr('display', null)
    .attr('y', dimensionHeight - currentOffset.bottom + 20)
    .attr('x', 0.5 * (dimensionWidth))
    .attr('font-size', store.configStore.largeFont ? largeFontSize : regularFontSize)
    .attr('text-anchor', 'middle')
    .attr('alignment-baseline', 'hanging')
    .text(
      AcronymDictionary[xAxisVar] ? AcronymDictionary[xAxisVar] : xAxisVar,
    );
  svgSelection.select('.axes')
    .select('.y-axis')
    .attr('transform', `translate(${currentOffset.left}, 0)`)
    .call(testLabel as never)
    .selectAll('text')
    .attr('font-size', store.configStore.largeFont ? largeFontSize : regularFontSize);

  svgSelection
    .select('.axes')
    .select('.y-label')
    .attr('x', -0.5 * dimensionHeight)
    .attr('y', 0)
    .attr('transform', 'rotate(-90)')
    .attr('alignment-baseline', 'hanging')
    .attr('font-size', store.configStore.largeFont ? largeFontSize : regularFontSize)
    .attr('text-anchor', 'middle')
    .text('Hemoglobin Value');

  const decideIfSelectSet = (d: DumbbellDataPoint) => currentSelectSet.length > 0 && !!currentSelectSet.find((selected) => selected.setValues.includes(`${d.case[selected.setName]}`));

  const generateDumbbells = () => {
    const selectedPatients: JSX.Element[] = [];
    const unselectedPatients: JSX.Element[] = [];

    sortedData.forEach((dataPoint, idx) => {
      const xVal = (valueScale() as unknown as ScaleOrdinal<number, number>)(idx);
      const isSelectSet = decideIfSelectSet(dataPoint);

      if (xVal) {
        if (isSelectSet) {
          selectedPatients.push(
            <SingleDumbbell
              xVal={xVal}
              isSelectSet={isSelectSet}
              dataPoint={dataPoint}
              showGap={showGap}
              showPostop={showPostop}
              showPreop={showPreop}
              circleYValStart={testValueScale()(dataPoint.startYVal)}
              circleYValEnd={testValueScale()(dataPoint.endYVal)}
              key={`dumbbell-${idx}`}
            />,
          );
        } else {
          unselectedPatients.push(
            <SingleDumbbell
              xVal={xVal}
              isSelectSet={isSelectSet}
              dataPoint={dataPoint}
              showGap={showGap}
              showPostop={showPostop}
              showPreop={showPreop}
              circleYValStart={testValueScale()(dataPoint.startYVal)}
              circleYValEnd={testValueScale()(dataPoint.endYVal)}
              key={`dumbbell-${idx}`}
            />,
          );
        }
      }
    });

    return unselectedPatients.concat(selectedPatients);
  };

  return (
    <>
      <g className="axes">
        <g className="x-axis" transform={`translate(0,${dimensionHeight - currentOffset.bottom})`}>
          <CustomizedAxisOrdinal scaleDomain={JSON.stringify(valueScale().domain())} scaleRange={JSON.stringify(valueScale().range())} bins={bins} xAxisVar={xAxisVar} />
        </g>
        <text className="x-label" />
        <g className="y-axis" />
        <text className="y-label" />
      </g>
      <g className="chart-comp">

        {/* Pre op target */}
        {showPreop && <line x1={currentOffset.left} x2={dimensionWidth - currentOffset.right} y1={testValueScale()(HGB_HIGH_STANDARD)} y2={testValueScale()(HGB_HIGH_STANDARD)} style={{ stroke: '#e5ab73', strokeWidth: '2', strokeDasharray: '5,5' }} />}

        {/* Post op target */}
        {showPostop && <line x1={currentOffset.left} x2={dimensionWidth - currentOffset.right} y1={testValueScale()(HGB_LOW_STANDARD)} y2={testValueScale()(HGB_LOW_STANDARD)} style={{ stroke: '#e5ab73', strokeWidth: '2', strokeDasharray: '5,5' }} />}

        {generateDumbbells()}
        {bins.map((numberOb, idx) => {
          if (Object.keys(averageForEachTransfused).length > 0) {
            const x1 = idx === 0 ? (valueScale() as unknown as ScaleOrdinal<number, number>)(0) : (valueScale() as unknown as ScaleOrdinal<number, number>)(bins[idx - 1].indexEnding + 1);
            const x2 = (valueScale() as unknown as ScaleOrdinal<number, number>)(numberOb.indexEnding);
            const beginY = testValueScale()(averageForEachTransfused[(numberOb.num).toString()].averageStart);
            const endY = testValueScale()(averageForEachTransfused[numberOb.num].averageEnd);
            if (x1 && x2) {
              const toReturn = [];
              if (showPreop) {
                toReturn.push(<DumbbellLine x1={x1} x2={x2} y1={beginY} y2={beginY} ispreop key={`db-line-${idx}`} />);
              }
              if (showPostop) {
                toReturn.push(<DumbbellLine x1={x1} x2={x2} y1={endY} y2={endY} ispreop={false} key={`db-line-${idx}-2`} />);
              }
              return toReturn;
            } return null;
          } return null;
        })}
      </g>
    </>
  );
}
export default observer(DumbbellChart);
