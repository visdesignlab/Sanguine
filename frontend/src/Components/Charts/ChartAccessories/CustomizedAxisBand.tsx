import {
  useCallback, useContext, useEffect, useState,
} from 'react';
import { observer } from 'mobx-react';
import {
  scaleBand,
} from 'd3';
import { basicGray, secondaryGray } from '../../../Presets/Constants';
import {
  AxisText, CustomAxisColumnBackground, CustomAxisLine, CustomAxisLineBox,
} from '../../../Presets/StyledSVGComponents';
import Store from '../../../Interfaces/Store';
import { ScatterDataPoint } from '../../../Interfaces/Types/DataTypes';

type Props = {
  scaleDomain: string;
  scaleRange: string;
  scalePadding: number;
  chartHeight: number;
  data: ScatterDataPoint[];
  xAxisVar: string;
};

function CustomizedAxisBand({
  scaleDomain, scaleRange, scalePadding, chartHeight, data, xAxisVar,
}: Props) {
  const store = useContext(Store);
  const { InteractionStore } = store;

  const [hoveredColumn, setHoveredColumn] = useState<number | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);

  const scale = useCallback(() => {
    const domain = JSON.parse(scaleDomain);
    const range = JSON.parse(scaleRange);

    const sc = scaleBand()
      .domain(domain)
      .range(range)
      .padding(scalePadding);

    return sc;
  }, [scaleDomain, scaleRange, scalePadding]);

  // Add a new handler that updates both the local hoveredColumn state and the store.
  const handleColumnHover = (columnIndex: number | null) => {
    setHoveredColumn(columnIndex);
    if (columnIndex !== null) {
      // Filter the data using dp.xVal because the column represents the x-axis category.
      const pointsInColumn = data.filter((dp: ScatterDataPoint) => dp.xVal === columnIndex);
      // Update the hover store with all case IDs in that column
      store.InteractionStore.hoveredCaseIds = pointsInColumn.map(
        (dp: ScatterDataPoint) => dp.case.CASE_ID,
      );
    } else {
      // Clear hovered cases when no column is hovered.
      store.InteractionStore.hoveredCaseIds = [];
    }
  };

  const handleColumnClick = (columnValue: number) => {
    const pointsInColumn = data.filter(
      (dp: ScatterDataPoint) => dp.xVal === columnValue,
    );
    const caseIds = pointsInColumn.map(
      (dp: ScatterDataPoint) => Number(dp.case.CASE_ID),
    );

    if (selectedColumn === columnValue) {
      // If the column is already selected, clear it.
      setSelectedColumn(null);
      store.InteractionStore.clearSelectedCases();
      store.InteractionStore.selectedCaseIds = store.InteractionStore.selectedCaseIds.filter(
        (id: number) => !caseIds.includes(id),
      );
      return;
    }

    setSelectedColumn(columnValue);
    store.InteractionStore.selectedCaseIds = caseIds;
    store.InteractionStore.selectedAttribute = [xAxisVar, columnValue];
  };

  // Reset selectedColumn when the something else is selected
  useEffect(() => {
    if (selectedColumn !== null) {
      // Get the case IDs for the currently selected column.
      const pointsInColumn = data.filter(
        (dp: ScatterDataPoint) => dp.xVal === selectedColumn,
      );
      const columnCaseIds = pointsInColumn.map(
        (dp: ScatterDataPoint) => Number(dp.case.CASE_ID),
      );
        // If there exists at least one different selected case ID in the store, clear the selected column.
      const storeCaseIds = store.InteractionStore.selectedCaseIds;
      const isSame = columnCaseIds.length === storeCaseIds.length
          && columnCaseIds.every((id) => storeCaseIds.includes(id));
      if (!isSame) {
        setSelectedColumn(null);
      }
    }
  }, [store.InteractionStore.selectedCaseIds, data, selectedColumn]);

  return (
    <>
      {scale().domain().map((number, idx) => {
        const x1 = scale()(number) || 0;
        const x2 = x1 + scale().bandwidth();
        return (
          <g
            key={idx}
            onMouseEnter={() => handleColumnHover(idx)}
            onMouseLeave={() => handleColumnHover(null)}
            onClick={() => handleColumnClick(idx)}
          >
            <CustomAxisLine x1={x1} x2={x2} />
            <CustomAxisLineBox x={x1} width={x2 - x1} fill={idx % 2 === 1 ? secondaryGray : basicGray} />
            <CustomAxisColumnBackground
              x={x1}
              width={x2 - x1}
              chartHeight={chartHeight}
              fill={
              selectedColumn === idx
                ? InteractionStore.backgroundSelectedColor
                : hoveredColumn === idx
                  ? InteractionStore.backgroundHoverColor
                  : idx % 2 === 1
                    ? 'white'
                    : 'black'
              }
              opacity={selectedColumn === idx || hoveredColumn === idx ? 0.5 : 0.05}
            />
            <AxisText biggerFont={store.configStore.largeFont} x={x1} width={x2 - x1}>{number}</AxisText>
          </g>
        );
      })}
    </>
  );
}
export default observer(CustomizedAxisBand);
