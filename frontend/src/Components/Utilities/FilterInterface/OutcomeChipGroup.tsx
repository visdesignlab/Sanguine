import { Box } from '@mui/material';
import { observer } from 'mobx-react';
import { useContext } from 'react';
import Store from '../../../Interfaces/Store';
import { OutcomeOptions } from '../../../Presets/DataDict';
import { FilterChip } from '../../../Presets/StyledComponents';

function OutcomeChipGroup() {
  const store = useContext(Store);
  const { outcomeFilter } = store.provenanceState;

  const clickHandler = (input: string) => {
    if (outcomeFilter.includes(input)) {
      store.configStore.changeOutcomeFilter(outcomeFilter.filter((d) => d !== input));
    } else {
      store.configStore.changeOutcomeFilter(outcomeFilter.concat([input]));
    }
  };

  return (
    <Box>
      {OutcomeOptions.map((d) => (
        <FilterChip
          style={{ margin: '3px' }}
          label={d.value}
          key={d.key}
          clickable
          color={outcomeFilter.includes(d.key) ? 'primary' : undefined}
          onClick={() => { clickHandler(d.key); }}
        />
      ))}
    </Box>
  );
}

export default observer(OutcomeChipGroup);
