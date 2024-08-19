import { Button, Menu, MenuItem } from '@mui/material';
import { observer } from 'mobx-react';
import {
  useEffect, useState, useContext,
} from 'react';
import { NestedMenuItem } from 'mui-nested-menu';
import Store from '../../../Interfaces/Store';
import ManageStateDialog from '../../Modals/ManageStateDialog';
import SaveStateModal from '../../Modals/SaveStateModal';
import { CenterAlignedDiv } from '../../../Presets/StyledComponents';

function StateManagementSuite() {
  const store = useContext(Store);
  const [openSaveState, setOpenSaveState] = useState(false);
  const [openManageState, setOpenManageState] = useState(false);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  async function fetchSavedStates() {
    fetch(`${import.meta.env.VITE_APP_QUERY_URL}state`)
      .then((result) => result.json())
      .then((result) => {
        if (result) {
          const resultList = result.map((d: string[]) => d);
          store.configStore.savedState = resultList;
        }
      });
  }

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    fetchSavedStates();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  useEffect(() => {
    fetch(`${import.meta.env.VITE_APP_QUERY_URL}state`)
      .then((result) => result.json())
      .then((result) => {
        if (result) {
          const resultList = result.map((d: unknown) => d);
          store.configStore.savedState = resultList;
        }
      });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSavedState = async (name: string) => {
    const res = await (fetch(`${import.meta.env.VITE_APP_QUERY_URL}state?name=${name}`));
    const result = await res.json();
    store.provenance.importState(result.definition);
  };

  return (
    <CenterAlignedDiv>
      <Button variant="outlined" onClick={handleClick} aria-controls="simple-menu" aria-haspopup="true">States</Button>
      <Menu anchorEl={anchorEl} keepMounted open={Boolean(anchorEl)} onClose={() => handleClose()}>

        <NestedMenuItem parentMenuOpen={Boolean(anchorEl)} label="Load Saved State">
          {store.configStore.savedState.length > 0 ? store.configStore.savedState.map((d) => (
            <MenuItem
              key={`share${d}`}
              onClick={() => {
                handleClose();
                loadSavedState(d);
                store.configStore.loadedStateName = d;
              }}
            >
              {d}
            </MenuItem>
          )) : <MenuItem disabled>No Available</MenuItem>}
        </NestedMenuItem>

        {/* TODO add presets. */}

        <NestedMenuItem parentMenuOpen={Boolean(anchorEl)} label="Load from Preset">
          <MenuItem>Preset 1</MenuItem>
          <MenuItem>Preset 2</MenuItem>
          <MenuItem>Preset 3</MenuItem>
        </NestedMenuItem>
        <MenuItem onClick={() => { handleClose(); setOpenSaveState(true); }}>Save as a New State</MenuItem>
        <MenuItem onClick={() => { handleClose(); setOpenManageState(true); }}>Manage Saved States</MenuItem>
      </Menu>
      <ManageStateDialog setVisbility={setOpenManageState} visible={openManageState} setOpenSaveState={setOpenSaveState} />
      <SaveStateModal visible={openSaveState} setVisibility={setOpenSaveState} />

    </CenterAlignedDiv>
  );
}

export default observer(StateManagementSuite);
