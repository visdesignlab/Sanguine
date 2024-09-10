import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, List, ListItem, ListItemSecondaryAction, ListItemText, Radio, RadioGroup,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { observer } from 'mobx-react';
import { useContext, useEffect, useState } from 'react';
import Store from '../../Interfaces/Store';
import { simulateAPIClick } from '../../Interfaces/UserManagement';
import UIDInputModal from './UIDInputModal';

type Props = {
    stateName: string;
    openStateAccessControl: boolean;
    setOpenStateAccessControl: (input: boolean) => void;
};

function StateAccessControl({ stateName, openStateAccessControl, setOpenStateAccessControl }: Props) {
  const store = useContext(Store);
  const [uIDShared, updateUIDShared] = useState<string[]>([]);
  const [accessArray, updateAccessArray] = useState<string[]>([]);

  const [openShareUIDDialog, setOpenUIDDialog] = useState(false);

  const passSetOpenUIDDialog = (input: boolean) => {
    setOpenUIDDialog(input);
  };

  const makeStateAccessRequest = () => {
    if (stateName) {
      fetch(`${import.meta.env.VITE_QUERY_URL}state_unids?state_name=${stateName}`)
        .then((response) => response.json())
        .then((data) => {
          //   const result = data.result;
          const shareResult: [string, string][] = data.users_and_roles;
          const uID: string[] = [];
          const access: string[] = [];
          shareResult.forEach((user) => {
            uID.push(user[0]);
            access.push(user[1]);
          });
          updateUIDShared(uID);
          updateAccessArray(access);
        })
        // eslint-disable-next-line no-console
        .catch((error) => { console.log(error); });
    }
  };

  useEffect(() => {
    makeStateAccessRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateName]);

  const changeAccess = (uID: string, newAccess: string) => {
    const csrftoken = simulateAPIClick();
    fetch(`${import.meta.env.VITE_QUERY_URL}share_state`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/x-www-form-urlencoded',
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRFToken': csrftoken || '',
        'Access-Control-Allow-Origin': 'https://bloodvis.chpc.utah.edu',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: `csrfmiddlewaretoken=${csrftoken}&name=${stateName}&user=${uID}&role=${newAccess}`,
    })
      .then((response) => {
        if (response.status === 200) {
          store.configStore.snackBarIsError = false;
          store.configStore.snackBarMessage = 'Change succeed.';
          store.configStore.openSnackBar = true;
          // let newAccessArray = accessArray;
          // newAccessArray[indexInArray] = newAccess
          // updateAccessArray(newAccessArray)
          makeStateAccessRequest();
        } else {
          response.text().then(() => {
            store.configStore.snackBarIsError = true;
            store.configStore.snackBarMessage = `An error occurred: ${response.statusText}`;
            store.configStore.openSnackBar = true;

            console.error('There has been a problem with your fetch operation:', response.statusText);
          });
        }
      }).catch((error) => {
        store.configStore.snackBarIsError = true;
        store.configStore.snackBarMessage = `An error occurred: ${error}`;
        store.configStore.openSnackBar = true;
        console.error('There has been a problem with your fetch operation:', error);
      });
  };

  return (
    <div>
      <Dialog open={openStateAccessControl}>
        <DialogTitle>
          Manage
          {stateName}
          {' '}
          Access
        </DialogTitle>
        <DialogContent style={{ width: '300px' }}>
          <List>
            {
                    accessArray.map((d, i) => (
                      <ListItem key={`${uIDShared[i]}-${d}`}>
                        <ListItemText primary={uIDShared[i]} key={`${uIDShared[i]}`} />
                        <ListItemSecondaryAction>
                          <RadioGroup row onChange={(e) => { changeAccess(uIDShared[i], e.target.value); }} value={d} key={`${uIDShared[i]}-${d}`}>
                            <FormControlLabel
                              value="WR"
                              control={(
                                <Radio
                                  name="WR"
                                  color="primary"
                                />
                                          )}
                              label="WR"
                            />
                            <FormControlLabel
                              value="RE"
                              control={
                                <Radio name="RE" />
                                        }
                              label="RE"
                            />
                          </RadioGroup>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))
}
            <ListItem>
              <ListItemText>
                <IconButton onClick={() => {
                  setOpenUIDDialog(true);
                  setOpenStateAccessControl(false);
                }}
                >
                  <AddIcon />
                </IconButton>
              </ListItemText>
            </ListItem>
          </List>

        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenStateAccessControl(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <UIDInputModal visible={openShareUIDDialog} setVisibility={passSetOpenUIDDialog} stateName={stateName} />
    </div>
  );
}

export default observer(StateAccessControl);
