import { TextField } from '@mui/material';
import { observer } from 'mobx-react';
import { useState, useContext, useEffect } from 'react';
import Store from '../../../Interfaces/Store';

type Props = {
  annotationText: string;
  chartI: string;
};

function AnnotationForm({ annotationText, chartI }: Props) {
  const [formInput, setFormInput] = useState(annotationText);
  const store = useContext(Store);

  useEffect(() => {
    setFormInput(annotationText);
  }, [annotationText]);

  return (
    <div>
      <TextField
        style={{ width: '100%' }}
        id="outlined-multiline-static"
        label="Notes"
        multiline
        size="small"
        value={formInput}
        variant="outlined"
        onBlur={() => {
          if (formInput !== annotationText) {
            store.chartStore.changeNotation(chartI, formInput);
            store.configStore.openSnackBar = true;
            store.configStore.snackBarMessage = 'Note Saved Locally.';
            store.configStore.snackBarIsError = false;
          }
        }}
        onChange={(e) => { setFormInput(e.target.value); }}
      />

    </div>
  );
}

export default observer(AnnotationForm);
