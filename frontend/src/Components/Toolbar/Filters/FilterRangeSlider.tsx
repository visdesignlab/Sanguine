import {
  useContext, useEffect, useMemo, useState,
} from 'react';
import { RangeSlider, RangeSliderValue } from '@mantine/core';
import { useObserver } from 'mobx-react-lite';
import { Store } from '../../../Store/Store';
import { FiltersStore, MANUAL_INFINITY, ProductMaximums } from '../../../Store/FiltersStore';
import { DEFAULT_DATA_COLOR } from '../../../Theme/mantineTheme';

type NumberArrayKeys<T> = {
  [K in keyof T]: T[K] extends number[] ? K : never
}[keyof T];

export function FilterRangeSlider({ varName }: { varName: NumberArrayKeys<FiltersStore['filterValues']> }) {
  const store = useContext(Store);

  const [value, setValue] = useState(store.filtersStore.filterValues[varName]);

  // Hard set a max so that outliers will not cuase slider unuseable
  const reasonableMax = useMemo(() => Math.min(ProductMaximums[varName] ?? MANUAL_INFINITY, store.filtersStore.initialFilterValues[varName][1]), [varName, store.filtersStore.initialFilterValues]);

  // we only want to update this when the reasonableMax updates, which should only be when the actual data changes, not when the user is sliding
  useEffect(() => {
    setValue([store.filtersStore.filterValues[varName][0], reasonableMax]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reasonableMax]);

  function setStoreFilterValue(v: RangeSliderValue) {
    if (v[1] === reasonableMax) {
      store.filtersStore.setFilterValue(varName, [value[0], store.filtersStore.initialFilterValues[varName][1]]);
    } else {
      store.filtersStore.setFilterValue(varName, v);
    }
  }

  const min = useMemo(() => store.filtersStore.initialFilterValues[varName][0], [varName, store.filtersStore.initialFilterValues]);

  const changed = useMemo(() => value[0] !== min || value[1] !== reasonableMax, [value, min, reasonableMax]);

  const actualMax = useMemo(() => store.filtersStore.filterValues[varName][1], [varName, store.filtersStore.filterValues]);

  return useObserver(() => (
    <RangeSlider
      defaultValue={store.filtersStore.filterValues[varName]}
      value={value}
      size="sm"
      onChange={setValue}
      onChangeEnd={(v) => setStoreFilterValue(v)}
      min={min}
      max={reasonableMax}
      step={varName === 'cell_saver_ml' ? 50 : 1}
      color={changed ? 'blue.6' : DEFAULT_DATA_COLOR}
      marks={[
        { value: min, label: `${min}` },
        { value: reasonableMax, label: `${reasonableMax}${actualMax > reasonableMax ? '+' : ''}` },
      ]}
      minRange={0}
      mb="xl"
      styles={{
        label: {
          backgroundColor: 'white',
          color: changed ? 'var(--mantine-color-blue-6)' : DEFAULT_DATA_COLOR,
          border: '1px solid var(--mantine-color-gray-4)',
          boxShadow: changed
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
