import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Snackbar, TextField } from "@material-ui/core";
import { observer } from "mobx-react";
import { FC, useContext, useState, useRef } from "react";
import Store from "../../Interfaces/Store";
import FileCopyIcon from '@material-ui/icons/FileCopy';
import { Alert } from "@material-ui/lab";
import { copyTextToClipboard } from "../../HelperFunctions/Clipboard";


type Props = {
    shareUrl: string;
}

const ShareStateUrlModal: FC<Props> = ({ shareUrl }: Props) => {

    const store = useContext(Store);
    const urlRef = useRef(null);
    const [showAlert, setShowAlert] = useState(false)
    const [errorOccured, setErrorOccured] = useState(false);

    return (<div>
        <Dialog open={store.configStore.openShareURLDialog} onClose={() => { store.configStore.openShareURLDialog = false }} >
            <DialogTitle>Use the following URL to share your state</DialogTitle>
            <DialogContent>
                <DialogContentText>Length of URL: {shareUrl.length}</DialogContentText>

            </DialogContent>
            <TextField
                ref={urlRef}
                multiline
                disabled
                style={{ maxHeight: "300px", padding: "15px", overflow: "auto", wordBreak: "break-all" }}
                value={shareUrl}
            />
            <DialogActions>
                <Button onClick={() => { store.configStore.openShareURLDialog = false }}>
                    Close
                </Button>
                <Button startIcon={<FileCopyIcon />} onClick={() => {
                    setErrorOccured(!copyTextToClipboard(shareUrl) || false);
                    setShowAlert(true)
                }}>
                    Copy
                </Button>

            </DialogActions>
        </Dialog>
        <Snackbar open={showAlert} autoHideDuration={6000} onClose={() => { setShowAlert(false) }}>
            <Alert onClose={() => { setShowAlert(false) }} severity={errorOccured ? "error" : "success"}>
                {errorOccured ? "An error occured. Please copy the URL manually." : "Copied to clipboard"}
            </Alert>
        </Snackbar>

    </div>)
}

export default observer(ShareStateUrlModal);