import {
  CircularProgress, Dialog, DialogContent, DialogContentText, DialogTitle, Grid,
} from '@mui/material';
import { observer } from 'mobx-react';

type Props = {
    dataLoading: boolean;
    dataLoadingFailed: boolean;
};

function DataRetrievalModal({ dataLoading, dataLoadingFailed }: Props) {
  return (
    <Dialog open={dataLoading || dataLoadingFailed}>
      {dataLoadingFailed
        ? (
          <>
            <DialogTitle>Failed</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Data retrieval failed. Please try later or contact the admins.
              </DialogContentText>
            </DialogContent>
          </>
        )
        : (
          <>
            <DialogTitle>Just one second</DialogTitle>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item>
                  <CircularProgress />
                </Grid>
                <Grid item style={{ alignSelf: 'center' }}>
                  <DialogContentText>

                    We are fetching required data.
                  </DialogContentText>
                </Grid>
              </Grid>
            </DialogContent>
          </>
        )}
    </Dialog>
  );
}
export default observer(DataRetrievalModal);
