import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from "@mui/material";
import { observer } from "mobx-react";
import { FC, useContext, useState } from "react";
import Store from "../../Interfaces/Store";

type Props = {
  bloodComponent: string;
};
const CostInputDialog: FC<Props> = ({ bloodComponent }: Props) => {
  const store = useContext(Store);

  const [costInput, setCostInput] = useState(0);

  const saveCostInput = () => {
    store.configStore.changeCostConfig(bloodComponent, costInput);
    store.configStore.openCostInputModal = false;
    setCostInput(0);
  };

  return (
    <Dialog open={store.configStore.openCostInputModal}>
      <DialogTitle>Change Cost for {bloodComponent}</DialogTitle>
      <DialogContent>
        <DialogContentText>Current Cost for {bloodComponent} is ${store.state.BloodProductCost[bloodComponent]}</DialogContentText>
        <TextField type="number" fullWidth label="New Cost" onChange={(e) => { setCostInput(parseInt(e.target.value)); }} value={costInput} />
      </DialogContent>

      <DialogActions>
        <Button onClick={() => { store.configStore.openCostInputModal = false; }}>Cancel</Button>
        <Button color="primary"
          onClick={saveCostInput}>
          Confirm
        </Button>
      </DialogActions>
    </Dialog>);
};

export default observer(CostInputDialog);