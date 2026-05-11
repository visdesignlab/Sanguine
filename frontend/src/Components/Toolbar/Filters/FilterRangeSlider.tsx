import { RangeSliderValue, RangeSlider } from '@mantine/core';
import { useObserver } from 'mobx-react-lite';
import { useContext } from 'react';
import { Store, ApplicationState } from '../../../Store/Store';
import { DEFAULT_DATA_COLOR } from '../../../Theme/mantineTheme';
import { CELL_SAVER_ML } from '../../../Types/bloodProducts';

type NumberArrayKeys<T> = {
  [K in keyof T]: T[K] extends number[] ? K : never
}[keyof T];

type FilterRangeSliderProps = {
  varName: NumberArrayKeys<ApplicationState['filterValues']>;
  paddingLeft?: number;
  paddingRight?: number;
};

export function FilterRangeSlider({ varName, paddingLeft, paddingRight }: FilterRangeSliderProps) {
  const store = useContext(Store);

  const [initialFilterMin, initialFilterMax] = store.initialFilterValues[varName];
  const [filterMin, filterMax] = store.filterValues[varName];
  const clampedMax = Math.min(store.clampedMax[varName], initialFilterMax);
  const displayMax = Math.min(filterMax, clampedMax);
  const isFilterActive = filterMin !== initialFilterMin || filterMax !== initialFilterMax;

  const handleCommit = (v: RangeSliderValue) => {
    store.setFilterValue(varName, [v[0], v[1] === clampedMax ? initialFilterMax : v[1]]);
  };

  return useObserver(() => (
    <RangeSlider
      key={`${filterMin}-${filterMax}`}
      defaultValue={[filterMin, displayMax]}
      size="sm"
      onChangeEnd={handleCommit}
      min={initialFilterMin}
      max={clampedMax}
      step={varName === CELL_SAVER_ML ? 50 : 1}
      color={isFilterActive ? 'blue.6' : DEFAULT_DATA_COLOR}
      marks={[
        { value: initialFilterMin, label: `${initialFilterMin}` },
        { value: clampedMax, label: `${clampedMax}${clampedMax < initialFilterMax ? '+' : ''}` },
      ]}
      minRange={0}
      mb="xl"
      styles={{
        root: {
          paddingLeft,
          paddingRight,
        },
        label: {
          backgroundColor: 'white',
          color: isFilterActive ? 'var(--mantine-color-blue-6)' : DEFAULT_DATA_COLOR,
          border: '1px solid var(--mantine-color-gray-4)',
          boxShadow: isFilterActive
            ? '0 1px 3px var(--mantine-color-blue-2)'
            : '0 1px 3px rgba(0,0,0,0.15)',
        },
        track: {
          height: 2,
        },
        bar: {
          height: 2,
        },
        thumb: {
          width: 12,
          height: 12,
          borderWidth: 2,
        },
      }}
    />
  ));
}
