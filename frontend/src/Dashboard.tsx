import {
  Divider, Snackbar, Tab, Tabs, Alert, Grid,
} from '@mui/material';
import { observer } from 'mobx-react';
import { useContext, useState } from 'react';

import LeftToolBox from './Components/Utilities/LeftToolBox/LeftToolBox';
import RegularModeMenu from './Components/Utilities/TopMenu/RegularModeMenu';

import LayoutGenerator from './Components/LayoutGenerator';
import DetailView from './Components/Utilities/DetailView/DetailView';
import Store from './Interfaces/Store';
import { SnackBarCloseTime } from './Presets/Constants';
import TabPanel from './Components/Utilities/TabPanel';
import WrapperSankey from './Components/Charts/Sankey/WrapperSankey';

function Dashboard() {
  const store = useContext(Store);
  const [tabValue, setTabValue] = useState(0);

  const handleChange = (_: unknown, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <>
      <RegularModeMenu />

      <Grid container direction="row">
        <Grid item xs={2} sx={{ height: 'calc(100vh - 64px)', overflow: 'auto' }}>
          <LeftToolBox />
        </Grid>
        <Divider orientation="vertical" flexItem style={{ marginRight: '-1px' }} />
        <Grid item xs={8} sx={{ height: 'calc(100vh - 64px)', overflow: 'auto' }}>
          <Tabs
            value={tabValue}
            onChange={handleChange}
            indicatorColor="primary"
            textColor="primary"
            centered
          >
            <Tab label="Main Dashboard" />
            <Tab label="Sankey" />
          </Tabs>
          <TabPanel
            value={tabValue}
            index={0}
          >
            <LayoutGenerator />
          </TabPanel>
          <TabPanel
            value={tabValue}
            index={1}
          >
            <WrapperSankey />
          </TabPanel>
        </Grid>
        <Divider orientation="vertical" flexItem style={{ marginRight: '-1px' }} />
        <Grid item xs={2} sx={{ height: 'calc(100vh - 64px)', overflow: 'auto' }}>
          <DetailView />
        </Grid>
      </Grid>

      <Snackbar open={store.configStore.openSnackBar} autoHideDuration={SnackBarCloseTime} onClose={() => { store.configStore.openSnackBar = false; }}>
        <Alert onClose={() => { store.configStore.openSnackBar = false; }} severity={store.configStore.snackBarIsError ? 'error' : 'success'}>
          {store.configStore.snackBarMessage}
        </Alert>
      </Snackbar>
    </>
  );
}
export default observer(Dashboard);
