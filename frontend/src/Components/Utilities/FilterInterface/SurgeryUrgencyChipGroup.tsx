import { Box } from "@mui/material";
import { observer } from "mobx-react";
import { FC, useContext } from "react";
import { FilterChip } from "../../../Presets/StyledComponents";
import Store from "../../../Interfaces/Store";


const SurgeryUrgencyChipGroup: FC = () => {
    const store = useContext(Store);
    const { surgeryUrgencySelection } = store.state;
    return (<Box>
        <FilterChip size="small" label="Urgent" clickable color={surgeryUrgencySelection[0] ? "primary" : undefined}
            onClick={() => { store.configStore.changeSurgeryUrgencySelection([!surgeryUrgencySelection[0], surgeryUrgencySelection[1], surgeryUrgencySelection[2]]); }} />
        <FilterChip size="small" label="Elective" clickable color={surgeryUrgencySelection[1] ? "primary" : undefined}
            onClick={() => { store.configStore.changeSurgeryUrgencySelection([surgeryUrgencySelection[0], !surgeryUrgencySelection[1], surgeryUrgencySelection[2]]); }} />
        <FilterChip size="small" label="Emergent" clickable color={surgeryUrgencySelection[2] ? "primary" : undefined}
            onClick={() => { store.configStore.changeSurgeryUrgencySelection([surgeryUrgencySelection[0], surgeryUrgencySelection[1], !surgeryUrgencySelection[2]]); }} />
    </Box>);
};

export default observer(SurgeryUrgencyChipGroup);