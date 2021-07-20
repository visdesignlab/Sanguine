import Button from "@material-ui/core/Button";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import { observer } from "mobx-react";
import { FC, useContext } from "react";
import RedoIcon from '@material-ui/icons/Redo';
import UndoIcon from '@material-ui/icons/Undo';
import Store from "../../../Interfaces/Store";
import { useStyles } from "../../../Presets/StyledComponents";

const UndoRedoButtons: FC = () => {
    const store = useContext(Store);

    return <div className={useStyles().centerAlignment}>
        <ButtonGroup variant="outlined">
            <Button endIcon={<UndoIcon />} disabled={store.isAtRoot} onClick={() => { store.provenance.undo() }}>
                Undo
            </Button>

            <Button endIcon={<RedoIcon />} disabled={store.isAtLatest} onClick={() => { store.provenance.redo() }}>
                Redo
            </Button>
        </ButtonGroup>
    </div>
}
export default observer(UndoRedoButtons)