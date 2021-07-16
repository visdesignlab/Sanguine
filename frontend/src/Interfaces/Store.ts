import { initProvenance, Provenance } from '@visdesignlab/trrack'
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
    private _isAtRoot: boolean;
    private _isAtLatest: boolean;
    private _mainCompWidth: number;

    constructor() {
        this._isAtLatest = true;
        this._isAtRoot = true;
        this._mainCompWidth = 0

        this.provenance = initProvenance<ApplicationState, ActionEvents>(
            defaultState,
            //Is this correct way to allow load from url?
            // { loadFromUrl: true }
        )

        this.provenance.addGlobalObserver(() => {
            let isAtRoot = false;
            const currentNode = this.provenance.current;
            isAtRoot = currentNode.id === this.provenance.root.id;
            this._isAtRoot = isAtRoot;
            this._isAtLatest = this.provenance.current.children.length === 0;

        })
        this.provenance.done();
        this.configStore = new ProjectConfigStore(this);
        this.chartStore = new ChartStore(this);
        this.selectionStore = new SelectionStore(this);
        makeAutoObservable(this, { provenance: false })
    }

    get state() {
        return this.provenance.getState(this.provenance.current)
    }

    get dateRange() {
        return [timeFormat("%d-%b-%Y")(new Date(this.state.rawDateRange[0])), timeFormat("%d-%b-%Y")(new Date(this.state.rawDateRange[1]))]
    }
    get isAtRoot() { return this._isAtRoot }
    get isAtLatest() { return this._isAtLatest }
    get mainCompWidth() { return this._mainCompWidth }
    set mainCompWidth(input: number) { this._mainCompWidth = input }

}
const Store = createContext(new RootStore())
export default Store;
//we can seperate out actions into categories