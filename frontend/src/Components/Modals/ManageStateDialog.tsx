import {
  Button, DialogActions, DialogContent, IconButton, List, ListItem, ListItemSecondaryAction, ListItemText, Tooltip,
  Dialog, DialogTitle,
} from '@mui/material';
import { useContext, useState } from 'react';
import DeleteIcon from '@mui/icons-material/Delete';
import ShareIcon from '@mui/icons-material/Share';
import EditIcon from '@mui/icons-material/Edit';
import { observer } from 'mobx-react';
import { simulateAPIClick } from '../../Interfaces/UserManagement';
import Store from '../../Interfaces/Store';
import StateAccessControl from './StateAccessControl';
import { BiggerTooltip } from '../../Presets/StyledComponents';

type Props = {
    setOpenSaveState: (input: boolean) => void;
    setVisbility: (input: boolean) => void;
    visible: boolean;
};

function ManageStateDialog({ setOpenSaveState, setVisbility, visible }: Props) {
  const store = useContext(Store);

  const [stateNameToChange, setStateNameToChange] = useState('');

  const [openStateAccessControl, setOpenStateAccessControl] = useState(false);

  const removeState = (stateName: string) => {
    const csrftoken = simulateAPIClick();
    fetch(`${import.meta.env.VITE_QUERY_URL}state`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        Accept: 'application/x-www-form-urlencoded',
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRFToken': csrftoken || '',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify({ name: stateName }),
    }).then((response) => {
      if (response.status === 200) {
        if (store.configStore.loadedStateName === stateName) {
          store.configStore.loadedStateName = '';
        }
        store.configStore.savedState = store.configStore.savedState.filter((d) => d !== stateName);
        store.configStore.snackBarIsError = false;
        store.configStore.snackBarMessage = 'Deletion succeed.';
        store.configStore.openSnackBar = true;
      } else {
        response.text().then(() => {
          store.configStore.snackBarMessage = `An error occurred: ${response.statusText}`;
          store.configStore.snackBarIsError = true;
          store.configStore.openSnackBar = true;
          console.error('There has been a problem with your fetch operation:', response.statusText);
        });
      }
    }).catch((error) => {
      store.configStore.snackBarMessage = `An error occurred: ${error}`;
      store.configStore.snackBarIsError = true;
      store.configStore.openSnackBar = true;
      console.error('There has been a problem with your fetch operation:', error);
    });
  };

  const changeStateAccess = (stateName: string) => {
    setVisbility(false);
    setOpenStateAccessControl(true);
    setStateNameToChange(stateName);
  };

  // const changeStateName = ()

  return (
    <div>
      <Dialog open={visible} fullWidth>
        <DialogTitle>Manage Saved States</DialogTitle>
        <DialogContent>
          <List>
            {store.configStore.savedState.map((d, idx) => (
              <ListItem key={idx}>
                <ListItemText primary={d} style={{ maxWidth: '375px' }} />
                <ListItemSecondaryAction>
                  <IconButton onClick={() => {
                    setVisbility(false);
                    store.configStore.stateToUpdate = d;
                    setOpenSaveState(true);
                  }}
                  >
                    <Tooltip title={<BiggerTooltip>Edit State</BiggerTooltip>}>
                      <EditIcon />
                    </Tooltip>
                  </IconButton>
                  <IconButton onClick={() => { changeStateAccess(d); }}>
                    <Tooltip title={<BiggerTooltip>Manage Sharing</BiggerTooltip>}>
                      <ShareIcon />
                    </Tooltip>
                  </IconButton>
                  <IconButton onClick={() => { removeState(d); }}>
                    <Tooltip title={<BiggerTooltip>Delete State</BiggerTooltip>}>
                      <DeleteIcon />
                    </Tooltip>
                  </IconButton>

                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVisbility(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
      <StateAccessControl openStateAccessControl={openStateAccessControl} setOpenStateAccessControl={setOpenStateAccessControl} stateName={stateNameToChange} />
    </div>
  );
}

export default observer(ManageStateDialog);
