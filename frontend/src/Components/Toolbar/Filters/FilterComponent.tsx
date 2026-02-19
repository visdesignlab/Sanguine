import {
  useCallback, useContext, useMemo, useRef,
} from 'react';
import { useObserver } from 'mobx-react';
import { range, scaleBand, scaleLinear } from 'd3';
import { Flex, Input, Tooltip } from '@mantine/core';
import { Store } from '../../../Store/Store';
import { HistogramData } from '../../../Types/database';
import { BLOOD_PRODUCT_COLOR_THEME } from '../../../Types/application';
import { DEFAULT_DATA_COLOR } from '../../../Theme/mantineTheme';
import { FilterRangeSlider } from './FilterRangeSlider';
import { BLOOD_COMPONENTS, BloodComponent, CELL_SAVER_ML } from '../../../Types/bloodProducts';

export function FilterComponent({ data, unitName }: { unitName: BloodComponent | 'los', data: HistogramData}) {
  const store = useContext(Store);
  const svgRef = useRef<SVGSVGElement>(null);
  const svgHeight = 40;

  function rangeChanged(
    key: BloodComponent | 'los',
  ) {
    const cur = store.filterValues[key];
    const init = store.initialFilterValues[key];
    return cur[0] !== init[0] || cur[1] !== init[1];
  }

  const maxUnit = useMemo(() => {
    const unitBins = data ? data.map((d) => parseInt(d.units, 10)) : [];
    return Math.max(...unitBins);
  }, [data]);

  const bandScale = useCallback(() => {
    const dataBins = range(0, maxUnit + 1, unitName === CELL_SAVER_ML ? 50 : 1).map(String);
    const svgWidth = svgRef.current ? svgRef.current.clientWidth : 0;
    return scaleBand(dataBins, [0, svgWidth]);
  }, [maxUnit, unitName]);

  const maxCountExcludeZeroUnit = useMemo(() => (data ? Math.max(...data.map((d) => (d.units === '0' ? 0 : d.count))) : 0), [data]);

  const barHeightScale = useCallback(() => scaleLinear([0, maxCountExcludeZeroUnit], [0, svgHeight]).clamp(true), [maxCountExcludeZeroUnit]);
  const filterToolTip = 'Filter for Visits That Used ...';

  return useObserver(() => {
    const bgColor = getComputedStyle(document.body).backgroundColor;
    return (
      <Tooltip label={filterToolTip} position="top-start">
        <Input.Wrapper
          label={BLOOD_COMPONENTS.find((c) => c.value === unitName)?.label.base || unitName}
          mb="lg"
          styles={{ label: { color: rangeChanged(unitName) ? 'var(--mantine-color-blue-filled)' : undefined } }}
        >
          <Flex
            justify="center"
            style={{ display: store.state.ui.showFilterHistograms ? 'flex' : 'none' }}
          >
            <svg style={{ display: store.uiState.showFilterHistograms ? 'flex' : 'none' }} ref={svgRef} height={svgHeight} width="100%">
              <defs>
                <linearGradient id={`grad${unitName}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={bgColor} />
                  <stop offset="40%" stopColor={BLOOD_PRODUCT_COLOR_THEME[unitName]} />
                  <stop offset="100%" stopColor={BLOOD_PRODUCT_COLOR_THEME[unitName]} />
                </linearGradient>
              </defs>
              {data && data.map((d, i) => (
                <rect
                  key={i}
                  x={bandScale()(d.units) || 0}
                  y={svgHeight - barHeightScale()(d.count)}
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
          </Flex>
          <FilterRangeSlider
            paddingLeft={store.uiState.showFilterHistograms ? ((bandScale()('0') ?? 0) + 0.5 * bandScale().bandwidth() || 0) : 0}
            paddingRight={
            store.uiState.showFilterHistograms
              ? ((svgRef.current ? svgRef.current.clientWidth : 0)
              - ((bandScale()(String(maxUnit)) ?? 0)
               + bandScale().bandwidth() * 0.5)) : 0
}
            varName={unitName}
          />
        </Input.Wrapper>
      </Tooltip>
    );
  });
}
