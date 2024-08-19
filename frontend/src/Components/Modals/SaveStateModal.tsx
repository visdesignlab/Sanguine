import {
  Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControlLabel, FormGroup, Radio, RadioGroup, TextField,
} from '@mui/material';
import { observer } from 'mobx-react';
import {
  useState, useContext, useEffect,
} from 'react';
import Store from '../../Interfaces/Store';
import { simulateAPIClick } from '../../Interfaces/UserManagement';

type Props = {
    visible: boolean,
    setVisibility: (input: boolean) => void;
};

function SaveStateModal({ visible, setVisibility }: Props) {
  const store = useContext(Store);
  const [stateName, setStateName] = useState('');
  const [publicAccess, setPublicAccess] = useState(false);

  useEffect(() => {
    setStateName(store.configStore.stateToUpdate);
  }, [store.configStore.stateToUpdate]);

  const capitalizeFirstLetter = (string: string) => string.charAt(0).toUpperCase() + string.slice(1);

  const onSuccess = () => {
    setVisibility(false);
    store.configStore.snackBarIsError = false;
    store.configStore.snackBarMessage = 'State saved!';
    store.configStore.openSnackBar = true;
    setStateName('');
    setPublicAccess(false);
  };

  const onFail = (errorMessage: string) => {
    store.configStore.snackBarIsError = true;
    store.configStore.snackBarMessage = `An error occurred: ${errorMessage}`;
    store.configStore.openSnackBar = true;
    console.error('There has been a problem with your fetch operation:', errorMessage);
  };

  const saveNewState = () => {
    const csrftoken = simulateAPIClick();
    if (store.configStore.stateToUpdate) {
      fetch(`${import.meta.env.VITE_APP_QUERY_URL}state`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          Accept: 'application/x-www-form-urlencoded',
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-CSRFToken': csrftoken || '',
          'Access-Control-Allow-Origin': 'https://bloodvis.chpc.utah.edu',
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({
          old_name: store.configStore.stateToUpdate, new_name: stateName, new_definition: store.provenance.exportState(false), new_public: capitalizeFirstLetter(publicAccess.toString()),
        }),
      }).then((response) => {
        if (response.status === 200) {
          store.configStore.stateToUpdate = '';
          store.configStore.loadedStateName = stateName;
          onSuccess();
        } else {
          response.text().then(() => {
            onFail(response.statusText);
          });
        }
      }).catch((error) => {
        onFail(error.toString());
      });
    } else if (store.configStore.checkIfInSavedState(stateName)) {
      store.configStore.snackBarIsError = true;
      store.configStore.snackBarMessage = 'State name duplicate. Please rename.';
      store.configStore.openSnackBar = true;
    } else {
      fetch(`${import.meta.env.VITE_APP_QUERY_URL}state`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/x-www-form-urlencoded',
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-CSRFToken': csrftoken || '',
          'Access-Control-Allow-Origin': 'https://bloodvis.chpc.utah.edu',
          'Access-Control-Allow-Credentials': 'true',
        },
        body: `csrfmiddlewaretoken=${csrftoken}&name=${stateName}&definition=${store.provenance.exportState(false)}&public=${publicAccess.toString()}`,
      }).then((response) => {
        if (response.status === 200) {
          store.configStore.loadedStateName = stateName;
          onSuccess();
        } else {
          response.text().then(() => {
            onFail(response.statusText);
          });
        }
      }).catch((error) => {
        onFail(error.toString());
      });
    }
  };

  return (
    <div>
      <Dialog open={visible}>
        <DialogTitle>Save the current state</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Save the current state with a state name, select the state privacy setting, and then click save.
          </DialogContentText>
          <FormGroup>
            <TextField fullWidth label="State Name" onChange={(e) => { setStateName(e.target.value); }} value={stateName} />
            <RadioGroup row onChange={(e) => { setPublicAccess(e.target.value === 'PublicState'); }} value={publicAccess ? 'PublicState' : 'PrivateState'}>
              <FormControlLabel
                value="PublicState"
                control={(
                  <Radio
                    name="state-public"
                    color="primary"
                  />
                              )}
                label="Public State"
              />
              <FormControlLabel
                value="PrivateState"
                control={
                  <Radio name="state-private" color="primary" />
                            }
                label="Private State"
              />
            </RadioGroup>
          </FormGroup>

        </DialogContent>
        <DialogActions>
          <Button onClick={() => { store.configStore.stateToUpdate = ''; setVisibility(false); }}>Cancel</Button>
          <Button color="primary" disabled={stateName.length === 0} onClick={() => { saveNewState(); }}>Confirm</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default observer(SaveStateModal);
