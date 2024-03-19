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
import { SingleCasePoint } from './Types/DataTypes';

export class RootStore {
    provenance: Provenance<ApplicationState, ActionEvents>;
    configStore: ProjectConfigStore;
    selectionStore: SelectionStore;
    chartStore: ChartStore;

    _allCases: SingleCasePoint[];
    
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

        this._allCases = [];

        makeAutoObservable(this);
    }

    get provenanceState () {
        return this.provenance.getState(this.provenance.current);
    }

    get isAtRoot () {
        return this.provenance.root.id === this.provenance.current.id;
    }

    get isAtLatest () {
        return this.provenance.current.children.length === 0;
    }

    get proceduresSelection () {
        return this.provenanceState.proceduresSelection;
    }

    get allCases () {
        return this._allCases;
    }
    
    set allCases(input: SingleCasePoint[]) {
        this._allCases = input;
    }

    get filteredCases () {
        return this._allCases.map((d) => d);
        // return this.allCases.filter((d) => {
        //     return this.state.proceduresSelection.filter((p) => p.procedureName === d.PROCEDURE_NAME).length > 0;
        // });
    }

    get dateRange () {
        return [timeFormat("%d-%b-%Y")(new Date(this.provenanceState.rawDateRange[0])), timeFormat("%d-%b-%Y")(new Date(this.provenanceState.rawDateRange[1]))];
    }
    get mainCompWidth () { return this._mainCompWidth; }
    set mainCompWidth (input: number) { this._mainCompWidth = input; }

}
const Store = createContext(new RootStore());
export default Store;