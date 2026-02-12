import { useContext, useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { MantineProvider } from '@mantine/core';
import { useIdleTimer } from 'react-idle-timer';
import { Shell } from './Shell/Shell';
import { Store } from './Store/Store';
import { mantineTheme } from './Theme/mantineTheme';
import { logoutHandler, whoamiAPICall } from './Store/UserManagement';
import { DataRetrieval } from './Components/Modals/DataRetrieval';
import { initDuckDB } from './duckdb';
import type { ProcedureHierarchyResponse } from './Types/application';

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
        const queryUrl = import.meta.env.VITE_QUERY_URL;
        if (typeof queryUrl === 'undefined' || !queryUrl) {
          console.error('VITE_QUERY_URL is undefined');
          setDataLoadingFailed(true);
          setDataLoading(false);
          return;
        }

        const fetchProcedureHierarchy = async () => {
          try {
            const hierarchyRes = await fetch(`${queryUrl}get_procedure_hierarchy`);
            if (!hierarchyRes.ok) {
              throw new Error(`HTTP error! status: ${hierarchyRes.status}`);
            }
            store.procedureHierarchy = (await hierarchyRes.json()) as ProcedureHierarchyResponse;
          } catch (hierarchyError) {
            console.error('Error fetching procedure hierarchy:', hierarchyError);
            store.procedureHierarchy = null;
          }
        };

        if (store.duckDB) {
          // DuckDB is already initialized so don't re-initialize.
          if (!store.procedureHierarchy) {
            await fetchProcedureHierarchy();
          }
          setDataLoading(false);
          return;
        }

        // Initialize DuckDB here
        const { db, conn } = await initDuckDB();
        store.duckDB = conn!;

        // Fetch visit attributes Parquet file from backend
        const res = await fetch(`${queryUrl}get_visit_attributes`);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        await db.registerFileBuffer('visit_attributes.parquet', new Uint8Array(await res.arrayBuffer()));

        await store.duckDB.query(`
          CREATE TABLE IF NOT EXISTS visits AS
          SELECT * REPLACE (
            COALESCE(CAST(department_ids AS VARCHAR[]), []::VARCHAR[]) AS department_ids,
            COALESCE(CAST(procedure_ids AS VARCHAR[]), []::VARCHAR[]) AS procedure_ids
          )
          FROM read_parquet('visit_attributes.parquet');

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
          SELECT DISTINCT visit_no FROM visits;

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

          CREATE VIEW IF NOT EXISTS aggregatedVisits AS
          SELECT
            visit_no,
            month,
            quarter,
            year,
            dsch_dtm,
            
            -- Sum granular metrics across providers for the visit
            SUM(rbc_units) as rbc_units,
            SUM(ffp_units) as ffp_units,
            SUM(plt_units) as plt_units,
            SUM(cryo_units) as cryo_units,
            -- SUM(whole_units) as whole_units,
            SUM(cell_saver_ml) as cell_saver_ml,

            SUM(rbc_units_cost) as rbc_units_cost,
            SUM(ffp_units_cost) as ffp_units_cost,
            SUM(plt_units_cost) as plt_units_cost,
            SUM(cryo_units_cost) as cryo_units_cost,
            SUM(cell_saver_cost) as cell_saver_cost,
            
            SUM(rbc_adherent) as rbc_adherent,
            SUM(ffp_adherent) as ffp_adherent,
            SUM(plt_adherent) as plt_adherent,
            SUM(cryo_adherent) as cryo_adherent,
            
            -- Max visit-level attributes
            MAX(los) as los,
            MAX(death) as death,
            MAX(vent) as vent,
            MAX(stroke) as stroke,
            MAX(ecmo) as ecmo,
            
            MAX(ms_drg_weight) as ms_drg_weight,
            MAX(age_at_adm) as age_at_adm

          FROM filteredVisits
          GROUP BY visit_no, month, quarter, year, dsch_dtm;
        `);

        await fetchProcedureHierarchy();

        // Update all stores
        await store.updateAllVisitsLength();
        await store.calculateDefaultFilterValues();
        await store.updateFilteredVisitsLength();

        // Initialize provenance with the correct initial filter values
        store.init();

        await store.updateFilteredData();
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
        { /* Data loading modal */}
        <DataRetrieval dataLoading={dataLoading} dataLoadingFailed={dataLoadingFailed} />
      </>
    </MantineProvider>
  );
}

export default observer(App);
