import ButtonGroup from "@material-ui/core/ButtonGroup";
import { observer } from "mobx-react";
import { FC, useContext } from "react";
import RedoIcon from '@material-ui/icons/Redo';
import UndoIcon from '@material-ui/icons/Undo';
import Store from "../../../Interfaces/Store";
import { IconButton, Tooltip } from "@material-ui/core";
import { useStyles } from "../../../Presets/StyledComponents";

const UndoRedoButtons: FC = () => {
    const store = useContext(Store);
    const styles = useStyles();

    return <ButtonGroup size="small">

        <IconButton disabled={store.isAtRoot} onClick={() => { store.provenance.undo() }}>
            <Tooltip title={<div>  <p className={styles.tooltipFont}>Undo</p></div>}>
                <UndoIcon />
            </Tooltip>
        </IconButton>


        <IconButton disabled={store.isAtLatest} onClick={() => { store.provenance.redo() }}>
            <Tooltip title={<div>  <p className={styles.tooltipFont}>Redo</p></div>}>
                <RedoIcon />
            </Tooltip>
        </IconButton>

    </ButtonGroup>

}
export default observer(UndoRedoButtons)