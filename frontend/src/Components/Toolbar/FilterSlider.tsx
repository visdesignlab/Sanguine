import { useContext, useEffect, useState } from 'react';
import { RangeSlider } from '@mantine/core';
import { Store } from '../../Store/Store';
import { FiltersStore } from '../../Store/FiltersStore';

type NumberArrayKeys<T> = {
  [K in keyof T]: T[K] extends number[] ? K : never
}[keyof T];

export function FilterRangeSlider({ varName }: { varName: NumberArrayKeys<FiltersStore['filterValues']> }) {
  const store = useContext(Store);

  const [value, setValue] = useState(store.filtersStore.filterValues[varName]);
  useEffect(() => {
    if (store.filtersStore.filterValues.visitRBCs[0] !== value[0] || store.filtersStore.filterValues.visitRBCs[1] !== value[1]) {
      setValue(store.filtersStore.filterValues[varName]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.filtersStore.filterValues.visitRBCs]);

  return (
    <RangeSlider
      defaultValue={store.filtersStore.filterValues[varName]}
      value={value}
      onChange={setValue}
      onChangeEnd={(v) => store.filtersStore.setFilterValue(varName, v)}
      min={store.filtersStore.initialFilterValues[varName][0]}
      max={store.filtersStore.initialFilterValues[varName][1]}
      step={varName === 'visitCellSaver' ? 50 : 1}
      marks={store.filtersStore.initialFilterValues[varName].map((val) => ({ value: val, label: String(val) }))}
      minRange={0}
      mb="md"
    />
  );
}
