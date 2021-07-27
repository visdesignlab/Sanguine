import { Container, Grid, TextField } from "@material-ui/core";
import { observer } from "mobx-react";
import { useContext } from "react";
import { FC, useState } from "react";
import Autocomplete from '@material-ui/lab/Autocomplete';
import { stateUpdateWrapperUseJSON } from "../../../Interfaces/StateChecker";
import Store from "../../../Interfaces/Store";
import { useStyles } from "../../../Presets/StyledComponents";

type Props = { surgeryList: any[] }

const SurgerySearchBar: FC<Props> = ({ surgeryList }: Props) => {
    const store = useContext(Store)
    const styles = useStyles()
    const [surgerySearchResult, setsurgerySearchResult] = useState<any[]>([]);
    const [searchSurgeryVal, setSearchSurgeryVal] = useState("");

    const searchHandler = (input: any) => {
        if (input) {
            if (!store.state.proceduresSelection.includes(input.value)) {
                store.selectionStore.updateProcedureSelection(input.value, false);
            }
        }
    }
    return (
        <Grid item className={styles.gridWidth}>
            <Container>
                <Autocomplete
                    options={surgeryList}
                    onChange={(e, v) => { searchHandler(v) }}
                    getOptionLabel={(option) => option.value}
                    renderInput={(params) =>
                        <TextField {...params} label="Combo box" variant="outlined" />}
                />
            </Container>
        </Grid>
    )
}

export default observer(SurgerySearchBar)