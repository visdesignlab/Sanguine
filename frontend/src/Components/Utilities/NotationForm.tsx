import { inject, observer } from "mobx-react";
import React, { FC, useState, useEffect } from "react";
import { actions } from "../..";
import { Form } from "semantic-ui-react";

interface OwnProps {
    //  scale: ScaleOrdinal<any, number>;
    notation: string;
    chartId: string;

}
export type Props = OwnProps;

const NotationForm: FC<Props> = ({ notation, chartId }) => {
    const [notationInput, setNotationInput] = useState(notation)

    useEffect(() => {
        setNotationInput(notation)
    }, [notation])

    const handleSaveNotation = () => {
        actions.changeNotation(chartId, notationInput);
    }

    const handleChange = (value: any) => {
        setNotationInput(value.value)
    }

    return <Form onSubmit={() => handleSaveNotation()}>
        <Form.TextArea style={{ resize: "none" }} onChange={(e, d) => { handleChange(d) }} placeholder="Add notation to this chart." value={notationInput} />
        <Form.Button content="Save" /></Form>
}
export default inject("store")(observer(NotationForm));