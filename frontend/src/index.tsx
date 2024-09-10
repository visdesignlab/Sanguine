import CssBaseline from '@mui/material/CssBaseline';
import ReactDOM from 'react-dom';

import App from './App';
import './index.css';
import 'mobx-react-lite/batchingForReactDom';

ReactDOM.render(
  <>
    <CssBaseline />
    <App />
  </>,
  document.getElementById('root'),
);
