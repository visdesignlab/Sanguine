import { observer } from "mobx-react";
import { FC, useContext } from "react";
import { Button } from "semantic-ui-react";
import Store from "../../../Interfaces/Store";

const UndoRedoButtons: FC = () => {
    const store = useContext(Store);

    return <Button.Group>
        <Button primary disabled={store.isAtRoot} onClick={() => { store.provenance.undo() }}>
            Undo
        </Button>
        <Button.Or></Button.Or>
        <Button secondary disabled={store.isAtLatest} onClick={() => { store.provenance.redo() }}>
            Redo
        </Button>
    </Button.Group>
}
export default observer(UndoRedoButtons)