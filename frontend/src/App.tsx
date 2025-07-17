import { observer } from 'mobx-react';
import { useContext, useState, useEffect } from 'react';
import { createTheme, MantineProvider } from '@mantine/core';
import { useIdleTimer } from 'react-idle-timer';
import { Shell } from './Shell/Shell';
import Store from './Interfaces/Store';
import { logoutHandler, whoamiAPICall } from './Interfaces/UserManagement';
import BrowserWarning from './Components/Modals/BrowserWarning';
import DataRetrieval from './Components/Modals/DataRetrieval';
import { Visit } from './Interfaces/Types/DataTypes';
import { mantineTheme } from './Themes/mantineTheme';

function App() {
  const store = useContext(Store);

  const [dataLoading, setDataLoading] = useState(true);
  const [dataLoadingFailed, setDataLoadingFailed] = useState(false);

  useIdleTimer({
    timeout: 1000 * 60 * 30, // 1000 ms * 60 s * 30 min
    onIdle: () => logoutHandler(),
    onAction: () => whoamiAPICall(),
    events: ['mousedown', 'keydown'],
    throttle: 1000 * 60,
  });

  useEffect(() => {
    async function fetchAllPatients() {
      try {
        const visitsRequest = await fetch(`${import.meta.env.VITE_QUERY_URL}get_all_data`);
        const visits = await visitsRequest.json() as Visit[];

        if (visits.length === 0) {
          throw new Error('There was an issue fetching data. No results were returned.');
        }

        store.allVisits = visits;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        setDataLoadingFailed(true);
      } finally {
        setDataLoading(false);
      }
    }

    fetchAllPatients();
  }, []);

  return (
    <MantineProvider theme={mantineTheme}>
      <Shell />
      <>
        <BrowserWarning />
        <DataRetrieval dataLoading={dataLoading} dataLoadingFailed={dataLoadingFailed} />
      </>
    </MantineProvider>
  );
}

export default observer(App);
