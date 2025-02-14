/* eslint-disable no-nested-ternary */
import {
  ListItem, ListItemText, Slider, Stack, Input,
} from '@mui/material';
import { observer } from 'mobx-react';
import { useState, useContext } from 'react';
import useDeepCompareEffect from 'use-deep-compare-effect';
import Store from '../../../Interfaces/Store';
import { ManualInfinity } from '../../../Presets/Constants';
import { AcronymDictionary, BloodComponent, HemoOption } from '../../../Presets/DataDict';

type Props = {
  label: BloodComponent | HemoOption;
  isTestValue?: boolean;
};

function ComponentRangePicker({ label, isTestValue }: Props) {
  const store = useContext(Store);
  const { bloodFilter } = store.provenanceState;
  const [rangeValue, setRangeValue] = useState<number[]>([0, 0]);

  useDeepCompareEffect(() => {
    if (bloodFilter[label][1] === ManualInfinity) {
      setRangeValue([bloodFilter[label][0], store.filterRange[label][1]]);
    } else {
      setRangeValue([bloodFilter[label][0], bloodFilter[label][1]]);
    }
  }, [store.filterRange, bloodFilter]);

  const handleInputMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const newMin = inputValue === '' ? 0 : parseInt(inputValue, 10);
    if (!Number.isNaN(newMin)) {
      setRangeValue([newMin, rangeValue[1]]);
      store.configStore.changeBloodFilter(label, [newMin, rangeValue[1]]);
    }
  };

  const handleInputMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const newMax = inputValue === '' ? 0 : parseInt(inputValue, 10);
    if (!Number.isNaN(newMax)) {
      setRangeValue([rangeValue[0], newMax]);
      store.configStore.changeBloodFilter(label, [rangeValue[0], newMax]);
    }
  };

  return (
    <ListItem>
      <ListItemText
        primary={AcronymDictionary[label] ? AcronymDictionary[label] : label}
        secondary={(
          <Stack direction="row" spacing={2}>
            <Input value={rangeValue[0]} onChange={handleInputMinChange} sx={{ width: '75px' }} inputProps={{ type: 'number' }} />
            <Slider
              max={store.filterRange[label][1]}
              min={store.filterRange[label][0]}
              marks={[
                {
                  value: store.filterRange[label][0],
                  label: store.filterRange[label][0],
                },
                {
                  value: store.filterRange[label][1],
                  label: store.filterRange[label][1],
                },
              ]}
              valueLabelDisplay="auto"
              aria-labelledby="range-slider"
              value={rangeValue}
              step={isTestValue ? 0.1 : (label === 'CELL_SAVER_ML' ? 1000 : undefined)}
              onChangeCommitted={(e, nV) => {
                if (isTestValue) {
                  store.configStore.changeBloodFilter(label, (nV as [number, number]));
                } else {
                  store.configStore.changeBloodFilter(label, (nV as [number, number]));
                }
              }}
              onChange={(e, nV) => {
                setRangeValue((nV as number[]));
              }}
            />
            <Input value={rangeValue[1]} onChange={handleInputMaxChange} sx={{ width: '75px' }} />
          </Stack>
        )}
      />
    </ListItem>
  );
}

export default observer(ComponentRangePicker);
