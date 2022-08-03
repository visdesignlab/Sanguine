/** @jsxImportSource @emotion/react */
import { Autocomplete, Container, Grid, TextField } from "@mui/material";
import { observer } from "mobx-react";
import { useContext } from "react";
import { FC, useState } from "react";
import Store from "../../../Interfaces/Store";
import { ProcedureEntry } from "../../../Interfaces/Types/DataTypes";
import { allCss } from "../../../Presets/StyledComponents";

type Props = { surgeryList: any[]; };

const SurgerySearchBar: FC<Props> = ({ surgeryList }: Props) => {
    const store = useContext(Store);

    const [input, setInput] = useState("");

    const searchHandler = (input: ProcedureEntry) => {
        if (input) {
            if (store.state.proceduresSelection.filter(d => d.procedureName === input.procedureName).length === 0) {
                store.selectionStore.updateProcedureSelection(input, false);
                setInput("");
            }
        }
    };

    return (
        <Grid item css={allCss.gridWidth}>
            <Container style={{ paddingTop: "5px", paddingBottom: "5px" }}>
                <Autocomplete
                    options={surgeryList}
                    onChange={(e, v) => { searchHandler(v); }}
                    value={input}
                    getOptionLabel={(option) => option.procedureName || ""}
                    renderInput={(params) =>
                        <TextField {...params} label="Search Procedure" variant="outlined" />}
                />
            </Container>
        </Grid>
    );
};

export default observer(SurgerySearchBar);