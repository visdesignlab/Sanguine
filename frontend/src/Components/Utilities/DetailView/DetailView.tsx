import { Divider } from '@mui/material';
import { observer } from 'mobx-react';
import { useContext } from 'react';
import Store from '../../../Interfaces/Store';
import CaseInfo from './CaseInfo';
import CaseList from './CaseList';

function DetailView() {
  const store = useContext(Store);
  const { currentSelectedPatientGroup } = store.provenanceState;

  return (
    <div
      style={{ visibility: currentSelectedPatientGroup.length > 0 ? 'visible' : 'hidden' }}
    >
      <CaseList />
      <Divider />
      <CaseInfo />
    </div>
  );
}

export default observer(DetailView);
