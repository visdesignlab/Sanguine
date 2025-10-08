import { useContext, useEffect, useState } from 'react';
import { RangeSlider } from '@mantine/core';
import { useObserver } from 'mobx-react-lite';
import { Store } from '../../../Store/Store';
import { FiltersStore } from '../../../Store/FiltersStore';
import { DEFAULT_DATA_COLOR } from '../../../Theme/mantineTheme';

type NumberArrayKeys<T> = {
  [K in keyof T]: T[K] extends number[] ? K : never
}[keyof T];

export function FilterRangeSlider({ varName }: { varName: NumberArrayKeys<FiltersStore['filterValues']> }) {
  const store = useContext(Store);

  const [value, setValue] = useState(store.filtersStore.filterValues[varName]);
  useEffect(() => {
    if (store.filtersStore.filterValues[varName][0] !== value[0] || store.filtersStore.filterValues[varName][1] !== value[1]) {
      setValue(store.filtersStore.filterValues[varName]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.filtersStore.filterValues[varName]]);

  return useObserver(() => {
    const initial = store.filtersStore.initialFilterValues[varName];
    const [min, max] = initial;
    const changed = value[0] !== initial[0] || value[1] !== initial[1];

    return (
      <RangeSlider
        defaultValue={store.filtersStore.filterValues[varName]}
        value={value}
        size="sm"
        onChange={setValue}
        onChangeEnd={(v) => store.filtersStore.setFilterValue(varName, v)}
        min={min}
        max={max}
        step={varName === 'cell_saver_ml' ? 50 : 1}
        color={changed ? 'blue.6' : DEFAULT_DATA_COLOR}
        marks={[
          { value: min, label: String(min) },
          { value: max, label: String(max) },
        ]}
        minRange={0}
        mb="md"
        mt="xs"
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
    );
  });
}
