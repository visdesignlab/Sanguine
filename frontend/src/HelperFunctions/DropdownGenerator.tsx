import { MenuItem } from '@mui/material';
import { DropdownInputTypes } from '../Interfaces/Types/DropdownInputType';

export const DropdownGenerator = (input: DropdownInputTypes[], withNone?: boolean) => {
  let output = input.map((d) => (
    <MenuItem value={d.value} key={d.key}>
      {' '}
      {d.text}
      {' '}
    </MenuItem>
  ));
  if (withNone) {
    output = [(
      <MenuItem value="" key="NONE">
        <em>None</em>
      </MenuItem>
    )].concat(output);
  }
  return output;
};
