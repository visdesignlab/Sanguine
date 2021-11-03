import { initProvenance, Provenance } from '@visdesignlab/trrack';
import { timeFormat } from 'd3';
import { makeAutoObservable } from 'mobx';
import { createContext } from 'react';
import { ChartStore } from './ChartStore';
import { defaultState } from './DefaultState';
import { ProjectConfigStore } from './ProjectConfigStore';
import { SelectionStore } from './SelectionStore';
import { ActionEvents } from './Types/EventTypes';
import { ApplicationState } from './Types/StateTypes';

export class RootStore {
    provenance: Provenance<ApplicationState, ActionEvents>;
    configStore: ProjectConfigStore;
    selectionStore: SelectionStore;
    chartStore: ChartStore;
    private _mainCompWidth: number;

    constructor() {
        this._mainCompWidth = 0;

        this.provenance = initProvenance<ApplicationState, ActionEvents>(
            defaultState
        );
        this.provenance.done();
        this.configStore = new ProjectConfigStore(this);
        this.chartStore = new ChartStore(this);
        this.selectionStore = new SelectionStore(this);
        makeAutoObservable(this);
    }

    get state () {
        return this.provenance.getState(this.provenance.current);
    }

    get isAtRoot () {
        return this.provenance.root.id === this.provenance.current.id;
    }

    get isAtLatest () {
        return this.provenance.current.children.length === 0;
    }

    get proceduresSelection () {
        return this.state.proceduresSelection;
    }

    get dateRange () {
        return [timeFormat("%d-%b-%Y")(new Date(this.state.rawDateRange[0])), timeFormat("%d-%b-%Y")(new Date(this.state.rawDateRange[1]))];
    }
    get mainCompWidth () { return this._mainCompWidth; }
    set mainCompWidth (input: number) { this._mainCompWidth = input; }

}
const Store = createContext(new RootStore());
export default Store;