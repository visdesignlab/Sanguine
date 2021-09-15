import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Typography } from "@material-ui/core";
import { observer } from "mobx-react";
import { FC, useContext } from "react";
import Store from "../../Interfaces/Store";

const InfoDialog: FC = () => {
    const store = useContext(Store);
    return (<Dialog open={store.configStore.openAboutDialog}>
        <DialogTitle >About Sanguine</DialogTitle>
        <DialogContent>
            <DialogContentText>
                <Typography gutterBottom>
                    This project is a collaboration between Visualization Design Lab and ARUP at University of Utah. We visualize blood usage in cardiac surgeries and associated patient and surgery attributes. Through this interactive visualization tool, we hope to offer clinical practitioners a better overall view on the use of blood, thus facilitating better patient outcomes.
                </Typography>
                <Typography gutterBottom>
                    We have published paper on this project in <i>Information Visualization</i>. Check out the paper on the <a href="https://doi.org/10.1177/14738716211028565" target="_blank">publisher's site</a>. Here is a <a href="https://youtu.be/DhTNyvCJgtM" target="_blank">video</a> accompanied with the publication.
                </Typography>

            </DialogContentText>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => store.configStore.openAboutDialog = false} color="primary">
                Close
            </Button>
        </DialogActions>
    </Dialog>)
}

export default observer(InfoDialog)