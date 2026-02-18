import {
  useCallback, useContext, useMemo, useRef,
} from 'react';
import { useObserver } from 'mobx-react';
import { range, scaleBand, scaleLinear } from 'd3';
import { Store } from '../../../Store/Store';
import { HistogramData } from '../../../Types/database';
import { BLOOD_PRODUCT_COLOR_THEME } from '../../../Types/application';
import { DEFAULT_DATA_COLOR } from '../../../Theme/mantineTheme';

export function FilterComponent({ data, unitName }: {unitName:string, data: HistogramData}) {
  const store = useContext(Store);
  const svgRef = useRef<SVGSVGElement>(null);

  const bandScale = useCallback(() => {
    const unitBins = data ? data.map((d) => parseInt(d.units, 10)) : [];
    const maxUnit = Math.max(...unitBins);
    const dataBins = range(0, maxUnit + 1, unitName === 'cell_saver_ml' ? 50 : 1).map(String);
    const svgWidth = svgRef.current ? svgRef.current.clientWidth : 0;
    return scaleBand(dataBins, [0, svgWidth]);
  }, [data, unitName, svgRef]);

  const maxCountExcludeZeroUnit = useMemo(() => (data ? Math.max(...data.map((d) => (d.units === '0' ? 0 : d.count))) : 0), [data]);

  const barHeightScale = useCallback(() => scaleLinear([0, maxCountExcludeZeroUnit], [0, 30]).clamp(true), [maxCountExcludeZeroUnit]);

  return useObserver(() => {
    const bgColor = getComputedStyle(document.body).backgroundColor;
    return (
      <svg ref={svgRef} height={30} width="calc(100% - 12px)">
        <defs>
          <linearGradient id={`grad${unitName}`} x1="0%" y1="0%" x2="0%" y2="100%">
            {/* start color */}
            <stop offset="0%" stopColor={bgColor} />
            <stop offset="40%" stopColor={BLOOD_PRODUCT_COLOR_THEME[unitName]} />
            <stop offset="100%" stopColor={BLOOD_PRODUCT_COLOR_THEME[unitName]} />
            {/* end color (background) */}
          </linearGradient>
        </defs>
        {data && data.map((d, i) => (
          <rect
            key={i}
            x={bandScale()(d.units) || 0}
            y={30 - barHeightScale()(d.count)}
            width={bandScale().bandwidth()}
            height={barHeightScale()(d.count)}
            fill={
              d.count
                > maxCountExcludeZeroUnit ? `url(#grad${unitName})` : (BLOOD_PRODUCT_COLOR_THEME[unitName] || DEFAULT_DATA_COLOR)
}
          >
            <title>{`${d.units}:${d.count}`}</title>
          </rect>
        ))}
      </svg>
    );
  });
}
