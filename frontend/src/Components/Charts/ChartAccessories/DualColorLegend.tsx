import {
  interpolateGreys,
  interpolateReds,
} from 'd3';
import { thirdGray } from '../../../Presets/Constants';

type Props = {
    dimensionWidth: number;
};

function DualColorLegend({ dimensionWidth }: Props) {
  return (
    <g>
      <defs>
        <linearGradient id="gradient1" x1="0" x2="1" y1="0" y2="0" colorInterpolation="CIE-LCHab">
          <stop offset="0%" stopColor={interpolateReds(0.1)} />
          <stop offset="50%" stopColor={interpolateReds(0.55)} />
          <stop offset="100%" stopColor={interpolateReds(1)} />
        </linearGradient>
        <linearGradient id="gradient2" x1="0" x2="1" y1="0" y2="0" colorInterpolation="CIE-LCHab">
          <stop offset="0%" stopColor={interpolateGreys(0.25)} />
          <stop offset="50%" stopColor={interpolateGreys(0.525)} />
          <stop offset="100%" stopColor={interpolateGreys(0.8)} />
        </linearGradient>
      </defs>
      <rect
        x={0.7 * (dimensionWidth)}
        y={10}
        width={0.2 * (dimensionWidth)}
        height={8}
        fill="url(#gradient1)"
      />
      <rect
        x={0.7 * (dimensionWidth)}
        y={18}
        width={0.2 * (dimensionWidth)}
        height={8}
        fill="url(#gradient2)"
      />
      <text
        x={0.7 * (dimensionWidth) - 2}
        y={18}
        alignmentBaseline="middle"
        textAnchor="end"
        fontSize="11px"
        fill={thirdGray}
      >
        0%
      </text>
      <text
        x={0.9 * (dimensionWidth) + 2}
        y={18}
        alignmentBaseline="middle"
        textAnchor="start"
        fontSize="11px"
        fill={thirdGray}
      >
        100%
      </text>
      <text
        x={0.8 * (dimensionWidth)}
        y={25}
        alignmentBaseline="hanging"
        textAnchor="middle"
        fontSize="11px"
        fill={thirdGray}
      >
        % out of all patients
      </text>
      <text
        x={0.8 * (dimensionWidth)}
        y={8}
        alignmentBaseline="baseline"
        textAnchor="middle"
        fontSize="11px"
        fill={thirdGray}
      >
        % out of patients with 1+ transfusions
      </text>

    </g>
  );
}

export default DualColorLegend;
