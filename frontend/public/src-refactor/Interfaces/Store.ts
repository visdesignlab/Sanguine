
import { initProvenance, Provenance, createAction } from '@visdesignlab/trrack'
import { createContext } from 'react';
import { defaultState } from './DefaultState';
import { ActionEvents } from './Types/EventTypes';
import { ApplicationState } from './Types/StateTypes';

export class ProjectStore {
    provenance: Provenance<ApplicationState, ActionEvents>;

    constructor() {
        this.provenance = initProvenance<ApplicationState, ActionEvents>(
            defaultState,
            //Is this correct way to allow load from url?
            { loadFromUrl: true }
        )
        this.provenance.done();
    }

    get State() {
        return this.provenance.getState(this.provenance.current)
    }


}

//we can seperate out actions into categories 