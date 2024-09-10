import { IconButton, Tooltip } from '@mui/material';
import { useContext } from 'react';
import OpenWithIcon from '@mui/icons-material/OpenWith';
import CloseIcon from '@mui/icons-material/Close';

import Store from '../../Interfaces/Store';

type Props = {
    chartID: string;
};
function ChartStandardButtons({ chartID }: Props) {
  const store = useContext(Store);
  return (
    < >
      <Tooltip title="Move chart">
        <IconButton size="small" className="move-icon">
          <OpenWithIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Remove chart">
        <IconButton size="small" onClick={() => { store.chartStore.removeChart(chartID); }}>
          <CloseIcon />
        </IconButton>
      </Tooltip>

    </>
  );
}

export default ChartStandardButtons;
