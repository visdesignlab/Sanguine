import React from 'react';
import { TextField, Box } from '@mui/material';

export interface TargetRangeInputProps {
  targetRange: (number | undefined)[];
  setTargetRange: React.Dispatch<React.SetStateAction<(number | undefined)[]>>;
  xMin: number;
  xMax: number;
}

function TargetRangeInput({
  targetRange,
  setTargetRange,
  xMin,
  xMax,
}: TargetRangeInputProps) {
  const handleChange = (index: 0 | 1) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    const parsed = text === '' ? undefined : parseFloat(text);
    const newRange: (number | undefined)[] = [...targetRange];
    newRange[index] = parsed;
    setTargetRange(newRange);
  };

  // helper to normalize display value
  const displayValue = (val: number | undefined) => (val != null ? val : '');

  // Min & Max input fields
  const targetInput = (index: 0 | 1) => (
    <TextField
      type="number"
      size="small"
      variant="outlined"
      value={displayValue(targetRange[index])}
      onChange={handleChange(index)}
      sx={{ width: 40, minWidth: 20 }}
      inputProps={{
        style: { padding: '2px 4px', fontSize: '0.75rem', textAlign: 'center' },
        min: xMin,
        max: xMax,
      }}
    />
  );

  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      {/* Min field */}
      {targetInput(0)}
      {/* Max field */}
      {targetInput(1)}
    </Box>
  );
}

export default TargetRangeInput;
