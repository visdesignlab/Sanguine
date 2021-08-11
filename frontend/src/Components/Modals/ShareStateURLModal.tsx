import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Snackbar, TextField } from "@material-ui/core";
import { observer } from "mobx-react";
import { FC, useContext, useState, useRef } from "react";
import ClipboardJS from 'clipboard';
import Store from "../../Interfaces/Store";
import FileCopyIcon from '@material-ui/icons/FileCopy';
import { Alert } from "@material-ui/lab";


type Props = {
    shareUrl: string;
}

const ShareStateUrlModal: FC<Props> = ({ shareUrl }: Props) => {

    const store = useContext(Store);
    const urlRef = useRef(null);
    new ClipboardJS(`.copy-clipboard`);
    const [showAlert, setShowAlert] = useState(false)

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
            {/* Not sure why this doesn't work. the clipboard */}
            <DialogActions>
                <Button onClick={() => { store.configStore.openShareURLDialog = false }}>
                    Close
                </Button>
                <Button startIcon={<FileCopyIcon />} data-clipboard-text={shareUrl} className="copy-clipboard" onClick={() => { setShowAlert(true) }}>
                    Copy
                </Button>

            </DialogActions>
        </Dialog>
        <Snackbar open={showAlert} autoHideDuration={6000} onClose={() => { setShowAlert(false) }}>
            <Alert onClose={() => { setShowAlert(false) }} severity="success">
                Copied to clipboard
            </Alert>
        </Snackbar>
    </div>)
}

export default observer(ShareStateUrlModal);