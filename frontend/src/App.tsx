import { useContext, useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { MantineProvider } from '@mantine/core';
import { useIdleTimer } from 'react-idle-timer';
import { Shell } from './Shell/Shell';
import { Store } from './Store/Store';
import { mantineTheme } from './Theme/mantineTheme';
import { logoutHandler, whoamiAPICall } from './Store/UserManagement';
import { BrowserWarning } from './Components/Modals/BrowserWarning';
import { DataRetrieval } from './Components/Modals/DataRetrieval';
import { conn } from './duckdb';

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
        store.duckDB = conn;
        const queryUrl = import.meta.env.VITE_QUERY_URL;
        if (typeof queryUrl === 'undefined' || !queryUrl) {
          console.error('VITE_QUERY_URL is undefined');
          setDataLoadingFailed(true);
          setDataLoading(false);
          return;
        }

        await store.duckDB.query(`
          CREATE TABLE IF NOT EXISTS visits AS
          SELECT * FROM read_parquet('${import.meta.env.VITE_QUERY_URL}get_all_data');
          
          CREATE TABLE IF NOT EXISTS filteredVisitIds AS
          SELECT visit_no FROM visits;

          CREATE VIEW IF NOT EXISTS filteredVisits AS
          SELECT v.*
          FROM visits v
          INNER JOIN filteredVisitIds fvi ON v.visit_no = fvi.visit_no;
        `);

        await store.updateAllVisitsLength();
        await store.filtersStore.calculateDefaultFilterValues();
        await store.updateFilteredVisitsLength();

        await store.filtersStore.generateHistogramData();
        await store.dashboardStore.computeChartData();
        await store.dashboardStore.computeStatData();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        console.error('Error fetching visits data:', e);
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
