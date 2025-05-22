import { observer } from 'mobx-react';
import { useContext, useState, useEffect } from 'react';
import { useIdleTimer } from 'react-idle-timer';
import Dashboard from './Dashboard';
import Store from './Interfaces/Store';
import { logoutHandler, whoamiAPICall } from './Interfaces/UserManagement';
import BrowserWarning from './Components/Modals/BrowserWarning';
import DataRetrieval from './Components/Modals/DataRetrieval';
import { Patient } from './Interfaces/Types/DataTypes';

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
        const patsRequest = await fetch(`${import.meta.env.VITE_QUERY_URL}get_all_data`);
        const pats = await patsRequest.json() as Patient[];

        if (pats.length === 0) {
          throw new Error('There was an issue fetching data. No results were returned.');
        }

        store.allPatients = pats;
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
