// import "./wdyr"
import whyDidYouRender from '@welldone-software/why-did-you-render';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import 'mobx-react-lite/batchingForReactDom'
import "semantic-ui-css/semantic.min.css"
import React from 'react';

// export const { provenance, actions } = setupProvenance();

// document.onkeydown = e => {
//     let mac = /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform);
//     if (!e.shiftKey && (mac ? e.metaKey : e.ctrlKey) && e.which === 90) {
//         if (!store.isAtRoot) {
//             actions.goBack();
//         }
//     } else if (e.shiftKey && (mac ? e.metaKey : e.ctrlKey) && e.which === 90) {
//         if (!store.isAtLatest) {
//             actions.goForward();
//         }
//     }
// }

// whyDidYouRender(React, {
//     trackAllPureComponents: true,
//     // exclude: [/XGrid|RowCells|GridCell/],
// });

ReactDOM.render(

    <App />
    ,
    document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
