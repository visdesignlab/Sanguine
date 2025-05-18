import { Autocomplete, Container, TextField } from '@mui/material';
import { observer } from 'mobx-react';
import { useContext, useState } from 'react';
import Store from '../../../Interfaces/Store';
import { ProcedureEntry } from '../../../Interfaces/Types/DataTypes';
import { InheritWidthGrid } from '../../../Presets/StyledComponents';

function SurgerySearchBar({ surgeryList }: { surgeryList: ProcedureEntry[] }) {
  const store = useContext(Store);

  const [input, setInput] = useState<ProcedureEntry | null>(null);

  const searchHandler = (value: ProcedureEntry | null) => {
    if (value) {
      if (store.provenanceState.proceduresSelection.filter((d) => d.procedureName === value.procedureName).length === 0) {
        store.interactionStore.updateProcedureSelection(value, false);
        setInput(null);
      }
    }
  };

  return (
    <InheritWidthGrid item>
      <Container style={{ paddingTop: '5px', paddingBottom: '5px' }}>
        <Autocomplete
          options={surgeryList}
          onChange={(e, v) => { searchHandler(v); }}
          value={input as unknown as ProcedureEntry}
          getOptionLabel={(option) => option.procedureName || ''}
          renderInput={(params) => <TextField {...params} label="Search Procedure" variant="outlined" />}
        />
      </Container>
    </InheritWidthGrid>
  );
}

export default observer(SurgerySearchBar);
