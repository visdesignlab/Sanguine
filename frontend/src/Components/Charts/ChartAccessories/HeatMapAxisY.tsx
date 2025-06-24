import React from 'react';
import { observer } from 'mobx-react';
import Store from '../../../Interfaces/Store';
import { largeFontSize, regularFontSize } from '../../../Presets/Constants';
import { AttributePlotTooltip } from './AttributePlots/AttributePlotTooltip';

/**
 * Creates a y axis of hoverable rowLabels for a heatmap.
 * @param position - The [x, y] position of the axis.
 * @param width - The width of the axis.
 * @param rowLabels - An array of rowLabel objects. Each rowLabel has `y` position, `text` label, and `tooltipLabel`.
 */
function HeatMapAxisY({
  position,
  width,
  rowLabels,
}: {
  position: [number, number];
  width: number;
  rowLabels: { y: number; text: string; tooltipLabel: string }[];
}) {
  const store = React.useContext(Store);
  return (
    <g className="axes-y" transform={`translate(${position[0]}, ${position[1]})`}>
      {/** For every row label, create and position it with a tooltip */}
      {rowLabels.map(({ y, text, tooltipLabel }, i) => (
        <AttributePlotTooltip key={i} title={tooltipLabel}>
          <text
            className="y-axis-label"
            x={width}
            y={y}
            fontSize={store.configStore.largeFont ? largeFontSize : regularFontSize}
            style={{ userSelect: 'none' }}
            textAnchor="end"
          >
            {text}
          </text>
        </AttributePlotTooltip>
      ))}
    </g>
  );
}

export default observer(HeatMapAxisY);
