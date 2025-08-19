import { useContext, useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { MantineProvider } from '@mantine/core';
import { useIdleTimer } from 'react-idle-timer';
import { Shell } from './Shell/Shell';
import { Store } from './Store/Store';
import { mantineTheme } from './Theme/mantineTheme';
import type { DatabaseVisit } from './Types/database';
import { logoutHandler, whoamiAPICall } from './Store/UserManagement';
import { BrowserWarning } from './Components/Modals/BrowserWarning';
import { DataRetrieval } from './Components/Modals/DataRetrieval';

function App() {
  // Data Loading states
  const store = useContext(Store);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataLoadingFailed, setDataLoadingFailed] = useState(false);

  // Idle timer to log out user after 30 minutes of inactivity
  useIdleTimer({
    timeout: 1000 * 60 * 30, // 1000 ms * 60 s * 30 min
    onIdle: () => logoutHandler(),
    onAction: () => whoamiAPICall(),
    events: ['mousedown', 'keydown'],
    throttle: 1000 * 60,
  });

  // Fetch all visits data on initial load
  useEffect(() => {
    async function fetchAllVisits() {
      setDataLoading(true);
      try {
        // Fetch all visits data
        const visitsRequest = await fetch(`${import.meta.env.VITE_QUERY_URL}get_all_data`);
        const visits = await visitsRequest.json() as DatabaseVisit[];

        // Check if visits data is empty
        if (visits.length === 0) {
          throw new Error('There was an issue fetching data. No results were returned.');
        }

        // Update the store with fetched visits
        store._allVisits = visits;
        store.filtersStore.calculateDefaultFilterValues();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        setDataLoadingFailed(true);
      } finally {
        // Data loading is complete
        setDataLoading(false);
      }
    }
    // Call the function to fetch visits data
    fetchAllVisits();
  }, [store]);

  return (
    // MantineProvider to apply the custom theme
    <MantineProvider theme={mantineTheme}>
      {/** App Shell (Header, Main Content, etc.) */}
      <Shell />
      <>
        {/** Browser incompatibility warning modal */}
        <BrowserWarning />
        { /* Data loading modal */}
        <DataRetrieval dataLoading={dataLoading} dataLoadingFailed={dataLoadingFailed} />
      </>
    </MantineProvider>
  );
}

export default observer(App);
