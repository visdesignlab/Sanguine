import { Indicator } from '@mantine/core';
import { IconFilter } from '@tabler/icons-react';
import { useObserver } from 'mobx-react';
import { useContext } from 'react';
import { Store } from '../../../Store/Store';
import { useThemeConstants } from '../../../Theme/mantineTheme';

export function FilterIcon() {
  const store = useContext(Store);
  const { iconStroke } = useThemeConstants();

  return useObserver(() => (
    <Indicator inline label={store.totalFiltersAppliedCount} disabled={store.totalFiltersAppliedCount === 0} size={18} color="blue.4" offset={-5}>
      <IconFilter stroke={iconStroke} />
    </Indicator>
  ));
}
