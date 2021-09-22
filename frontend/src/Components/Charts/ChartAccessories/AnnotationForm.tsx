import { TextField } from "@material-ui/core"
import { observer } from "mobx-react"
import { FC, useState, useContext } from "react"
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
            style={{ width: "100%" }}
            id="outlined-multiline-static"
            label="Notes"
            multiline
            size="small"
            value={formInput}
            variant="outlined"
            onBlur={() => {
                if (formInput !== annotationText) {
                    store.chartStore.changeNotation(chartI, formInput);
                    store.configStore.openNoteSaveSuccessMessage = true;
                }
            }}
            onChange={(e) => { setFormInput(e.target.value) }}
        />

    </div>
    )
}

export default observer(AnnotationForm);