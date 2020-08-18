import "./wdyr"
import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import { setupProvenance } from './Interfaces/Provenance'
import { store } from './Interfaces/Store'
import { Provider } from 'mobx-react';
import 'mobx-react-lite/batchingForReactDom'
import "semantic-ui-css/semantic.min.css"

export const { provenance, actions } = setupProvenance();

document.onkeydown = e => {
    let mac = /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform);
    if (!e.shiftKey && (mac ? e.metaKey : e.ctrlKey) && e.which === 90) {
        if (!store.isAtRoot) {
            actions.goBack();
        }
    } else if (e.shiftKey && (mac ? e.metaKey : e.ctrlKey) && e.which === 90) {
        if (!store.isAtLatest) {
            actions.goForward();
        }
    }
}

ReactDOM.render(
    <Provider store={store}>
        <App />
    </Provider>,
    document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
