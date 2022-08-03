import ButtonGroup from "@material-ui/core/ButtonGroup";
import { observer } from "mobx-react";
import { FC, useContext } from "react";
import RedoIcon from '@mui/icons-material/Redo';
import UndoIcon from '@mui/icons-material/Undo';
import Store from "../../../Interfaces/Store";
import { IconButton, Tooltip } from "@mui/material";


const UndoRedoButtons: FC = () => {
    const store = useContext(Store);


    return <ButtonGroup size="small">

        <IconButton disabled={store.isAtRoot} onClick={() => { store.provenance.undo(); }}>
            <Tooltip title={<div>  <p className={styles.tooltipFont}>Undo</p></div>}>
                <UndoIcon />
            </Tooltip>
        </IconButton>


        <IconButton disabled={store.isAtLatest} onClick={() => { store.provenance.redo(); }}>
            <Tooltip title={<div>  <p className={styles.tooltipFont}>Redo</p></div>}>
                <RedoIcon />
            </Tooltip>
        </IconButton>

    </ButtonGroup>;

};
export default observer(UndoRedoButtons);