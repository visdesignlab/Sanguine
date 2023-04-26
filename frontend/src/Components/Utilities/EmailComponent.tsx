import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { observer } from "mobx-react";
import { FC, useState } from "react";

const EmailComponent: FC = () => {

  const [openDialog, setOpenDialog] = useState(false);

  return <>

    <Dialog open={openDialog}>
      <DialogTitle>Generate Email for Providers</DialogTitle>
      <DialogContent>
        {/* Menu options for provider, time,  */}
        {/* generated text from the menu */}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpenDialog(false)} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
    <Button variant="outlined" onClick={() => setOpenDialog(true)}>
      Email
    </Button>
  </>;
};
export default observer(EmailComponent);
