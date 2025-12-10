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
import { initDuckDB } from './duckdb';

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
        if (store.duckDB) {
          // DuckDB is already initialized so don't re-initialize
          setDataLoading(false);
          return;
        }

        // Initialize DuckDB here
        const { db, conn } = await initDuckDB();
        store.duckDB = conn!;

        const queryUrl = import.meta.env.VITE_QUERY_URL;
        if (typeof queryUrl === 'undefined' || !queryUrl) {
          console.error('VITE_QUERY_URL is undefined');
          setDataLoadingFailed(true);
          setDataLoading(false);
          return;
        }

        const res = await fetch(`${queryUrl}get_all_data`);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        await db.registerFileBuffer('data.parquet', new Uint8Array(await res.arrayBuffer()));

        await store.duckDB.query(`
          CREATE TABLE IF NOT EXISTS visits AS
          SELECT * FROM read_parquet('data.parquet');

          CREATE TABLE IF NOT EXISTS costs (
            rbc_units_cost DOUBLE,
            ffp_units_cost DOUBLE,
            plt_units_cost DOUBLE,
            cryo_units_cost DOUBLE,
            cell_saver_cost DOUBLE
          );
          INSERT INTO costs VALUES (
            ${store.unitCosts.rbc_units_cost},
            ${store.unitCosts.ffp_units_cost},
            ${store.unitCosts.plt_units_cost},
            ${store.unitCosts.cryo_units_cost},
            ${store.unitCosts.cell_saver_cost}
          );
          
          CREATE TABLE IF NOT EXISTS filteredVisitIds AS
          SELECT visit_no FROM visits;

          CREATE VIEW IF NOT EXISTS filteredVisits AS
          SELECT
            v.*,
            v.rbc_units * c.rbc_units_cost AS rbc_units_cost,
            v.ffp_units * c.ffp_units_cost AS ffp_units_cost,
            v.plt_units * c.plt_units_cost AS plt_units_cost,
            v.cryo_units * c.cryo_units_cost AS cryo_units_cost,
            CASE WHEN COALESCE(v.cell_saver_ml, 0) > 0 THEN c.cell_saver_cost ELSE 0 END AS cell_saver_cost
          FROM visits v
          INNER JOIN filteredVisitIds fvi ON v.visit_no = fvi.visit_no
          CROSS JOIN costs c;
        `);

        await store.updateAllVisitsLength();
        await store.filtersStore.calculateDefaultFilterValues();
        await store.updateFilteredVisitsLength();

        await store.filtersStore.generateHistogramData();
        await store.dashboardStore.computeChartData();
        await store.dashboardStore.computeStatData();
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
