import { timeFormat } from 'd3';
import { observer } from 'mobx-react';
import { useContext } from 'react';
import {
  ListItem, List, ListItemSecondaryAction, ListItemText, Switch, IconButton, Tooltip, Box,
} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import Store from '../../../Interfaces/Store';
import { AcronymDictionary } from '../../../Presets/DataDict';
import { InheritWidthGrid } from '../../../Presets/StyledComponents';
import { ProcedureStringGenerator } from '../../../HelperFunctions/ProcedureStringGenerator';

function CurrentView() {
  const store = useContext(Store);
  const { allCases } = store;

  const generateSurgery = () => {
    const output: JSX.Element[] = [];
    if (store.provenanceState.proceduresSelection.length === 0) {
      output.push(<span key="all">All</span>);
    } else {
      const procedureString = ProcedureStringGenerator(store.provenanceState.proceduresSelection).replace(/%20/g, ' ');
      const stringArray = procedureString.split(' ');

      stringArray.forEach((word, idx) => {
        const wordWithoutSymbol = word.replace(/[^a-zA-Z ]/g, '');
        if (AcronymDictionary[wordWithoutSymbol as never]) {
          output.push((
            <Tooltip key={`${idx}-${word}`} title={<div key={`${idx}-${word}`}>{AcronymDictionary[wordWithoutSymbol as never]}</div>}>
              <div className="tooltip" key={`${idx}-${word}`} style={{ cursor: 'help' }}>
                {word}
              </div>
            </Tooltip>));
        } else {
          output.push((<span style={{ color: `${word === 'AND' || word === 'OR' ? 'lightcoral' : undefined}` }} key={`${idx}-${word}`}>{`${idx !== 0 ? ' ' : ''}${word}${idx !== stringArray.length - 1 ? ' ' : ''}`}</span>));
        }
      });
    }
    return output;
  };

  return (
    <InheritWidthGrid item>
      <Box style={{ height: '30vh', overflow: 'auto' }}>
        <List dense>
          <ListItem alignItems="flex-start" style={{ width: '100%' }} key="Date">
            <ListItemText
              primary="Date Range"
              secondary={`${timeFormat('%b %d, %Y')(new Date(store.provenanceState.rawDateRange[0]))} - ${timeFormat('%b %d, %Y')(new Date(store.provenanceState.rawDateRange[1]))}`}
            />

          </ListItem>

          {/* TODO change this into "toggle axis" instead of "show zero" */}
          <ListItem key="Show Zero">
            <ListItemText primary="Show Zero Transfused" />
            <ListItemSecondaryAction>
              <Switch
                checked={store.provenanceState.showZero}
                color="primary"
                onChange={(e) => { store.configStore.toggleShowZero(e.target.checked); }}
              />
            </ListItemSecondaryAction>
          </ListItem>

          <ListItem key="AggreCaseCount">
            <ListItemText
              primary="Aggregated Cases"
              secondary={`${store.chartStore.totalAggregatedCaseCount}/${allCases.length}`}
            />

          </ListItem>

          <ListItem key="IndiCaseCount">
            <ListItemText
              primary="Individual Cases"
              secondary={`${store.chartStore.totalIndividualCaseCount}/${allCases.length}`}
            />
            <ListItemSecondaryAction>
              <Tooltip title="Case count can be reduced by both filter and missing data.">
                <IconButton size="small" disableRipple>
                  <ErrorIcon />
                </IconButton>

              </Tooltip>
            </ListItemSecondaryAction>
          </ListItem>

          <ListItem key="SurgeryList">
            <ListItemText primary="Procedure" secondary={generateSurgery()} />
          </ListItem>

        </List>
      </Box>
    </InheritWidthGrid>
  );
}

export default observer(CurrentView);
