import {
  Box, IconButton, List, ListItem, ListItemButton, ListItemSecondaryAction, ListItemText,
  ListSubheader,
} from '@mui/material';
import { useContext } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import { observer } from 'mobx-react';
import Store from '../../../Interfaces/Store';

function CaseList() {
  const store = useContext(Store);
  const { currentBrushedPatientGroup, currentSelectPatient } = store.provenanceState;

  return (
    <Box style={{ height: '20vh' }} p={0.1}>
      <List
        dense
        sx={{
          bgcolor: 'background.paper',
          position: 'relative',
          overflow: 'auto',
          '& ul': { padding: 0 },
          height: '90%',
          width: '100%',
          mt: 0.3,
        }}
        subheader={<li />}
      >
        <ListSubheader sx={{ p: 1 }}>
          <ListItemText primary="Selected Cases" />
          <ListItemSecondaryAction>
            <IconButton
              edge="end"
              onClick={() => {
                store.InteractionStore.updateBrush([]);
              }}
            >
              <CloseIcon />
            </IconButton>
          </ListItemSecondaryAction>
        </ListSubheader>

        {currentBrushedPatientGroup.map((d) => (
          <ListItem
            key={d.CASE_ID}
            selected={(currentSelectPatient && currentSelectPatient.CASE_ID === d.CASE_ID) || false}
          >
            <ListItemButton onClick={() => store.InteractionStore.setCurrentSelectPatient(d)}>
              <ListItemText primary={
                                store.configStore.privateMode ? d.CASE_ID : '----------'
                            }
              />
            </ListItemButton>
          </ListItem>
        ))}

      </List>
    </Box>
  );
}

export default observer(CaseList);
