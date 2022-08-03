/** @jsxImportSource @emotion/react */
import { Box, Chip } from "@mui/material";
import { observer } from "mobx-react";
import { FC, useContext } from "react";
import Store from "../../../Interfaces/Store";
import { OutcomeOptions } from "../../../Presets/DataDict";
import { allCss } from "../../../Presets/StyledComponents";


const OutcomeChipGroup: FC = () => {
    const store = useContext(Store);
    const { outcomeFilter } = store.state;

    const clickHandler = (input: string) => {
        if (outcomeFilter.includes(input)) {
            store.configStore.changeOutcomeFilter(outcomeFilter.filter(d => d !== input));
        } else {
            store.configStore.changeOutcomeFilter(outcomeFilter.concat([input]));
        }
    };

    return (<Box css={allCss.root}>
        {OutcomeOptions.map((d) => (
            <Chip
                label={d.text}
                key={d.key}
                clickable
                color={outcomeFilter.includes(d.key) ? "primary" : undefined}
                onClick={() => { clickHandler(d.key); }}
            />))}
    </Box>);
};
export default observer(OutcomeChipGroup);