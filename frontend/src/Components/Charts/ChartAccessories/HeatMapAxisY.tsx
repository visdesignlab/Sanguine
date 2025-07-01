import React from 'react';
import { observer } from 'mobx-react';
import Store from '../../../Interfaces/Store';
import { largeFontSize, regularFontSize } from '../../../Presets/Constants';
import { AttributePlotTooltip } from './AttributePlots/AttributePlotTooltip';
import './HeatMapAxisY.css';

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
      {rowLabels.map(({ y, text, tooltipLabel }, i) => {
        const textHeight = store.configStore.largeFont ? largeFontSize * 1.5 : regularFontSize * 1.5;
        return (
          <AttributePlotTooltip key={i} title={tooltipLabel}>
            <foreignObject
              x={0}
              y={y - textHeight / 2}
              width={width}
              height={textHeight}
              style={{ overflow: 'visible' }}
            >
              <div
                className="y-axis-label-ellipsis"
                style={{
                  fontSize: store.configStore.largeFont ? largeFontSize : regularFontSize,
                  justifyContent: 'right',
                }}
              >
                {text}
              </div>
            </foreignObject>
          </AttributePlotTooltip>
        );
      })}
    </g>
  );
}

export default observer(HeatMapAxisY);
