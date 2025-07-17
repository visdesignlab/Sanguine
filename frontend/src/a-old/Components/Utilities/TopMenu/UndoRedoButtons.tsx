import { observer } from 'mobx-react';
import { useContext } from 'react';
import RedoIcon from '@mui/icons-material/Redo';
import UndoIcon from '@mui/icons-material/Undo';
import { ButtonGroup, IconButton, Tooltip } from '@mui/material';
import Store from '../../../Interfaces/Store';

function UndoRedoButtons() {
  const store = useContext(Store);

  return (
    <ButtonGroup size="small">

      <IconButton disabled={store.isAtRoot} onClick={() => { store.provenance.undo(); }}>
        <Tooltip title="Undo">
          <UndoIcon />
        </Tooltip>
      </IconButton>

      <IconButton disabled={store.isAtLatest} onClick={() => { store.provenance.redo(); }}>
        <Tooltip title="Redo">
          <RedoIcon />
        </Tooltip>
      </IconButton>

    </ButtonGroup>
  );
}

export default observer(UndoRedoButtons);
