
import { initProvenance, Provenance } from '@visdesignlab/trrack'
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

    constructor() {
        this.provenance = initProvenance<ApplicationState, ActionEvents>(
            defaultState,
            //Is this correct way to allow load from url?
            { loadFromUrl: true }
        )
        this.provenance.done();
        this.configStore = new ProjectConfigStore(this);
        this.chartStore = new ChartStore(this);
        this.selectionStore = new SelectionStore(this);
    }

    get state() {
        return this.provenance.getState(this.provenance.current)
    }


}
const Store = createContext(new RootStore())
export default Store;
//we can seperate out actions into categories