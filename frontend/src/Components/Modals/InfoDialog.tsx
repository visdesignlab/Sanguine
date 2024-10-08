import {
  Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Typography,
} from '@mui/material';
import { observer } from 'mobx-react';

type Props = {
    openAbout: boolean;
    setOpenAbout: (input: boolean) => void;
};
function InfoDialog({ openAbout, setOpenAbout }: Props) {
  return (
    <Dialog open={openAbout}>
      <DialogTitle>About Sanguine</DialogTitle>
      <DialogContent>
        <DialogContentText>
          <Typography gutterBottom>
            This project is a collaboration between
            {' '}
            <a href="https://vdl.sci.utah.edu/" target="_blank" rel="noopener noreferrer">Visualization Design Lab</a>
            {' '}
            and
            <a href="https://www.aruplab.com/" target="_blank" rel="noopener noreferrer">ARUP Lab</a>
            {' '}
            at University of Utah. We visualize blood usage in cardiac surgeries and associated patient and surgery attributes. Through this interactive visualization tool, we hope to offer clinical practitioners a better overall view on the use of blood, thus facilitating better patient outcomes.
          </Typography>
          <Typography gutterBottom>
            We have published paper on this project in
            {' '}
            <i>Information Visualization</i>
            . Check out the paper on
            <a href="https://vdl.sci.utah.edu/publications/2021_ivi_sanguine/" target="_blank" rel="noopener noreferrer">our website</a>
            {' '}
            or through the
            <a href="https://doi.org/10.1177/14738716211028565" target="_blank" rel="noopener noreferrer">publisher&rsquo;s site</a>
            . Here is a
            <a href="https://youtu.be/DhTNyvCJgtM" target="_blank" rel="noopener noreferrer">video</a>
            {' '}
            accompanied with the publication.
          </Typography>
          <Typography gutterBottom>
            <b>Team behind Sanguine</b>
            :
            <a href="https://vdl.sci.utah.edu/team/lin" target="_blank" rel="noopener noreferrer">Haihan Lin</a>
            ,
            <a href="https://jackwilburn.xyz/" target="_blank" rel="noopener noreferrer">Jack Wilburn</a>
            ,
            <a href="https://www.aruplab.com/experts/metcalf" target="_blank" rel="noopener noreferrer">Ryan A. Metcalf</a>
            , and
            <a href="https://vdl.sci.utah.edu/team/lex/" target="_blank" rel="noopener noreferrer">Alexander Lex</a>
            .
          </Typography>

        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpenAbout(false)} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default observer(InfoDialog);
