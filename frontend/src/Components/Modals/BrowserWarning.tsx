import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@material-ui/core";
import { useEffect, useState } from "react";
import { FC } from "react";

const BrowserWarning: FC = () => {
    const [openWarning, setOpenWarning] = useState(false);

    //https://stackoverflow.com/questions/4565112/javascript-how-to-find-out-if-the-user-browser-is-chrome/13348618#13348618
    const isChrome = () => {
        var isChromium = (window as any).chrome;
        var winNav = window.navigator;
        var vendorName = winNav.vendor;
        var isOpera = typeof (window as any).opr !== "undefined";
        var isIEedge = winNav.userAgent.indexOf("Edge") > -1;
        var isIOSChrome = winNav.userAgent.match("CriOS");

        if (isIOSChrome) {
            return true;
        } else if (
            isChromium !== null &&
            typeof isChromium !== "undefined" &&
            vendorName === "Google Inc." &&
            isOpera === false &&
            isIEedge === false
        ) {
            return true;
        } else {
            return false;
        }
    };

    useEffect(() => {
        setOpenWarning(!isChrome());
    }, []);

    return (<Dialog open={openWarning}>
        <DialogTitle >Browser Incompatible</DialogTitle>
        <DialogContent>
            <DialogContentText>
                This application is designed to be used on Chrome. Using it on other browsers may cause inaccurate visual representations of the data.
            </DialogContentText>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setOpenWarning(false)} color="primary">
                I understand
            </Button>
        </DialogActions>
    </Dialog>);
};
export default BrowserWarning;