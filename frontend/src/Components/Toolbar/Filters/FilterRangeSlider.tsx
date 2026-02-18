import { RangeSliderValue, RangeSlider } from '@mantine/core';
import { useObserver } from 'mobx-react';
import {
  useContext, useMemo, useState, useEffect,
} from 'react';
import {
  Store, MANUAL_INFINITY, ApplicationState,
} from '../../../Store/Store';
import { DEFAULT_DATA_COLOR } from '../../../Theme/mantineTheme';

type NumberArrayKeys<T> = {
  [K in keyof T]: T[K] extends number[] ? K : never
}[keyof T];

export function FilterRangeSlider({ varName, paddingLeft, paddingRight }: { varName: NumberArrayKeys<ApplicationState['filterValues']>; paddingLeft: number; paddingRight: number }) {
  const store = useContext(Store);

  // Initial filter range & store filter range
  const [initialFilterMin, initialFilterMax] = store.initialFilterValues[varName];
  const [currentFilterMin, currentFilterMax] = store.filterValues[varName];

  // TODO redo the clamping logic
  // Clamp slider max value to prevent outliers
  const clampedMax = useMemo(
    // () => Math.min(ProductMaximums[varName] ?? MANUAL_INFINITY, initialFilterMax),
    () => Math.min(MANUAL_INFINITY, initialFilterMax),
    [varName, initialFilterMax],
  );

  // Local state for smooth sliding
  const [sliderValues, setSliderValues] = useState<[number, number]>(
    [currentFilterMin, Math.min(currentFilterMax, clampedMax)],
  );

  // Sync with store updates
  useEffect(
    () => setSliderValues([currentFilterMin, Math.min(currentFilterMax, clampedMax)]),
    [currentFilterMin, currentFilterMax, clampedMax],
  );

  const isFilterActive = useMemo(
    () => sliderValues[0] !== initialFilterMin || sliderValues[1] !== clampedMax,
    [sliderValues, initialFilterMin, clampedMax],
  );

  function setStoreFilterValue(v: RangeSliderValue) {
    store.setFilterValue(varName, [v[0], v[1] === clampedMax ? initialFilterMax : v[1]]);
  }

  return useObserver(() => (
    <RangeSlider
      value={sliderValues}
      size="sm"
      onChange={setSliderValues}
      onChangeEnd={(v) => setStoreFilterValue(v)}
      min={initialFilterMin}
      max={clampedMax}
      step={varName === 'cell_saver_ml' ? 50 : 1}
      color={isFilterActive ? 'blue.6' : DEFAULT_DATA_COLOR}
      marks={[
        { value: initialFilterMin, label: `${initialFilterMin}` },
        { value: clampedMax, label: `${clampedMax}` },
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
