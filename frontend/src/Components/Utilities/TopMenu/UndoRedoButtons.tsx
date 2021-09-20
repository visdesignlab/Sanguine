import ButtonGroup from "@material-ui/core/ButtonGroup";
import { observer } from "mobx-react";
import { FC, useContext } from "react";
import RedoIcon from '@material-ui/icons/Redo';
import UndoIcon from '@material-ui/icons/Undo';
import Store from "../../../Interfaces/Store";
import { IconButton } from "@material-ui/core";

const UndoRedoButtons: FC = () => {
    const store = useContext(Store);

    return <ButtonGroup>
        <IconButton disabled={store.isAtRoot} onClick={() => { store.provenance.undo() }}>
            <UndoIcon />
        </IconButton>

        <IconButton disabled={store.isAtLatest} onClick={() => { store.provenance.redo() }}>
            <RedoIcon />
        </IconButton>
    </ButtonGroup>

}
export default observer(UndoRedoButtons)