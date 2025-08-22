import { observer } from 'mobx-react';
import { Badge } from '@mantine/core';
import { useContext } from 'react';
import { Store } from '../../../Store/Store';

// A small badge that shows the number of filters applied in a given category (date, blood component, patient outcome)
export const FilterCountBadge = observer(({ type }: { type: 'date' | 'bloodComponent' | 'patientOutcome' }) => {
  const store = useContext(Store);

  let count = 0;
  if (type === 'date') {
    count = store.filtersStore.dateFiltersAppliedCount;
  } else if (type === 'bloodComponent') {
    count = store.filtersStore.bloodComponentFiltersAppliedCount;
  } else if (type === 'patientOutcome') {
    count = store.filtersStore.patientOutcomeFiltersAppliedCount;
  }

  return count > 0 ? (
    <Badge color="blue" radius="sm" variant="light">
      {count}
    </Badge>
  ) : null;
});
