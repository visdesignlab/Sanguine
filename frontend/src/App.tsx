import { observer } from 'mobx-react';
import { useContext, useState, useEffect } from 'react';
import { useIdleTimer } from 'react-idle-timer';
import Dashboard from './Dashboard';
import Store from './Interfaces/Store';
import { logoutHandler, whoamiAPICall } from './Interfaces/UserManagement';
import { SurgeryUrgencyArray, SurgeryUrgencyType } from './Presets/DataDict';
import BrowserWarning from './Components/Modals/BrowserWarning';
import DataRetrieval from './Components/Modals/DataRetrieval';
import { SingleCasePoint } from './Interfaces/Types/DataTypes';

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
    async function fetchAllCases() {
      await whoamiAPICall();
      try {
        const surgeryCasesFetch = await fetch(`${import.meta.env.VITE_QUERY_URL}get_sanguine_surgery_cases`);
        const surgeryCasesInput: { result: unknown[] } = await surgeryCasesFetch.json();

        // Fix data types for the surgery cases
        let minDate = +Infinity;
        let maxDate = -Infinity;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const surgeryCases = surgeryCasesInput.result.map((d: any) => {
          const preopHemo = parseFloat(`${d.PREOP_HEMO}`);
          const postopHemo = parseFloat(`${d.POSTOP_HEMO}`);
          const drgWeight = parseFloat(`${d.DRG_WEIGHT}`);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const surgeryTypeIndex = SurgeryUrgencyArray.indexOf(d.SURGERY_TYPE_DESC as any);
          const caseDate = new Date(d.CASE_DATE).getTime();

          minDate = Math.min(minDate, caseDate);
          maxDate = Math.max(maxDate, caseDate);

          return {
            ...d,
            CASE_DATE: new Date(d.CASE_DATE).getTime(),
            PRBC_UNITS: d.PRBC_UNITS ? d.PRBC_UNITS : 0,
            FFP_UNITS: d.FFP_UNITS ? d.FFP_UNITS : 0,
            PLT_UNITS: d.PLT_UNITS ? d.PLT_UNITS : 0,
            CRYO_UNITS: d.CRYO_UNITS ? d.CRYO_UNITS : 0,
            CELL_SAVER_ML: d.CELL_SAVER_ML ? d.CELL_SAVER_ML : 0,
            PREOP_HEMO: !Number.isNaN(preopHemo) ? preopHemo : null,
            POSTOP_HEMO: !Number.isNaN(postopHemo) ? postopHemo : null,
            VENT: d.VENT ? d.VENT : 0,
            DRG_WEIGHT: !Number.isNaN(drgWeight) ? drgWeight : 0,
            DEATH: d.DEATH === 'Y' ? 1 : 0,
            ECMO: d.ECMO ? d.ECMO : 0,
            STROKE: d.STROKE ? d.STROKE : 0,
            TXA: d.TXA ? d.TXA : 0,
            B12: d.B12 ? d.B12 : 0,
            AMICAR: d.AMICAR ? d.AMICAR : 0,
            IRON: d.IRON ? d.IRON : 0,
            SURGERY_TYPE_DESC: (surgeryTypeIndex > -1 ? SurgeryUrgencyArray[surgeryTypeIndex] : 'Unknown') as SurgeryUrgencyType,
          } as SingleCasePoint;
        });

        if (surgeryCases?.length === 0) {
          throw new Error('There was an issue fetching data. No results were returned.');
        }

        store.allCases = surgeryCases;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        setDataLoadingFailed(true);
      } finally {
        setDataLoading(false);
      }
    }

    fetchAllCases();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Dashboard />
      <>
        <BrowserWarning />
        <DataRetrieval dataLoading={dataLoading} dataLoadingFailed={dataLoadingFailed} />
      </>
    </>
  );
}

export default observer(App);
