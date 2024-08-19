import {
  Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField,
} from '@mui/material';
import { observer } from 'mobx-react';
import { useContext, useState } from 'react';
import Store from '../../Interfaces/Store';

type Props = {
    bloodComponent: string;
    visible: boolean;
    setVisibility: (input: boolean) => void;
};
function CostInputDialog({ bloodComponent, visible, setVisibility }: Props) {
  const store = useContext(Store);

  const [costInput, setCostInput] = useState(0);

  const saveCostInput = () => {
    store.configStore.changeCostConfig(bloodComponent, costInput);
    setVisibility(false);
    setCostInput(0);
  };

  return (
    <Dialog open={visible}>
      <DialogTitle>
        Change Cost for
        {bloodComponent}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          Current Cost for
          {bloodComponent}
          {' '}
          is $
          {store.provenanceState.BloodProductCost[bloodComponent]}
        </DialogContentText>
        <TextField type="number" fullWidth label="New Cost" onChange={(e) => { setCostInput(parseInt(e.target.value, 10)); }} value={costInput} />
      </DialogContent>

      <DialogActions>
        <Button onClick={() => setVisibility(false)}>Cancel</Button>
        <Button
          color="primary"
          onClick={saveCostInput}
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default observer(CostInputDialog);
