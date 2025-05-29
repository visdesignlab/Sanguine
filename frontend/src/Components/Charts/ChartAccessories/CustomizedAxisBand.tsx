import {
  useCallback, useContext, useEffect, useState,
} from 'react';
import { observer } from 'mobx-react';
import {
  scaleBand,
} from 'd3';
import {
  basicGray, secondaryGray, backgroundHoverColor, backgroundSelectedColor,
} from '../../../Presets/Constants';
import {
  AxisText, CustomAxisColumnBackground, CustomAxisLine, CustomAxisLineBox,
} from '../../../Presets/StyledSVGComponents';
import Store from '../../../Interfaces/Store';

type Props = {
  scaleDomain: string;
  scaleRange: string;
  scalePadding: number;
  chartHeight: number;
  xAxisVar: string;
};

function CustomizedAxisBand({
  scaleDomain, scaleRange, scalePadding, chartHeight, xAxisVar,
}: Props) {
  const store = useContext(Store);

  const [hoveredColumn, setHoveredColumn] = useState<number | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<number[] | null>([]);

  const scale = useCallback(() => {
    const domain = JSON.parse(scaleDomain);
    const range = JSON.parse(scaleRange);

    const sc = scaleBand()
      .domain(domain)
      .range(range)
      .padding(scalePadding);

    return sc;
  }, [scaleDomain, scaleRange, scalePadding]);

  // Hover handler using the helper function.
  const handleColumnHover = (columnValue: number | null) => {
    if (columnValue !== null) {
      if (selectedColumns && !selectedColumns.includes(columnValue)) {
        setHoveredColumn(columnValue);
      }
      store.interactionStore.hoveredAttribute = [xAxisVar, columnValue];
    }
  };

  // Click handler using the helper function.
  const handleColumnClick = (columnValue: number) => {
    // If the column is already selected, deselect it.
    if (selectedColumns && selectedColumns.includes(columnValue)) {
      // Deselect this column.
      setSelectedColumns((prevSelectedColumns) => prevSelectedColumns?.filter((col) => col !== columnValue) || null);
      store.interactionStore.deselectAttribute([xAxisVar, columnValue]);
      return;
    }
    // Sets the selected column locally (for background highlighting).
    setSelectedColumns((prevSelectedColumns) => [...(prevSelectedColumns || []), columnValue]);

    // Adds all cases matching the selected column to the store's selected case IDs.
    store.interactionStore.addSelectedAttribute([xAxisVar, columnValue]);
  };

  // Update locally selected columns when the store's selected attributes change.
  useEffect(() => {
    const storeAttrs = store.interactionStore.selectedAttributes;
    if (!storeAttrs) {
      setSelectedColumns(null);
    } else {
    // Only keep those attributes that match this axis, pull out their values
      const cols = storeAttrs
        .filter(([attrName]) => attrName === xAxisVar)
        .map(([, value]) => value as number);
      // Set the selected columns to the store's selected attributes
      setSelectedColumns(cols.length > 0 ? cols : null);
    }
  }, [store.interactionStore.selectedAttributes, xAxisVar]);

  return (
    <>
      {scale().domain().map((number, idx) => {
        const x1 = scale()(number) || 0;
        const x2 = x1 + scale().bandwidth();
        return (
          <g
            key={idx}
            onMouseEnter={() => handleColumnHover(idx)}
            onMouseLeave={() => {
              setHoveredColumn(null);
              store.interactionStore.clearHoveredAttribute();
            }}
            onClick={() => handleColumnClick(idx)}
          >
            <CustomAxisLine x1={x1} x2={x2} />
            <CustomAxisLineBox x={x1} width={x2 - x1} fill={idx % 2 === 1 ? secondaryGray : basicGray} />
            <CustomAxisColumnBackground
              x={x1}
              width={x2 - x1}
              chartHeight={chartHeight}
              fill={
                selectedColumns?.includes(idx)
                  ? backgroundSelectedColor
                  : hoveredColumn === idx
                    ? backgroundHoverColor
                    : idx % 2 === 1
                      ? 'white'
                      : 'black'
              }
              opacity={selectedColumns?.includes(idx) || hoveredColumn === idx ? 0.5 : 0.05}
            />
            <AxisText biggerFont={store.configStore.largeFont} x={x1} width={x2 - x1}>{number}</AxisText>
          </g>
        );
      })}
    </>
  );
}
export default observer(CustomizedAxisBand);
