import { IconButton, TextField } from "@material-ui/core"
import { observer } from "mobx-react"
import { FC, useState, useContext } from "react"
import SaveIcon from '@material-ui/icons/Save';
import Store from "../../../Interfaces/Store";
import { useEffect } from "react";

type Props = {
    annotationText: string;
    chartI: string;
}

const AnnotationForm: FC<Props> = ({ annotationText, chartI }: Props) => {
    const [formInput, setFormInput] = useState(annotationText)
    const store = useContext(Store);

    useEffect(() => {
        setFormInput(annotationText);
    }, [annotationText])

    return (<div>
        <TextField
            style={{ width: "calc(100% - 30px)" }}
            id="outlined-multiline-static"
            label="Annotation"
            multiline
            size="small"
            value={formInput}
            variant="outlined"
            onChange={(e) => { setFormInput(e.target.value) }}
        />
        <IconButton style={{ verticalAlign: "text-top" }} size="small" onClick={() => { store.chartStore.changeNotation(chartI, formInput) }}>
            <SaveIcon />
        </IconButton>
    </div>)
}

export default observer(AnnotationForm);