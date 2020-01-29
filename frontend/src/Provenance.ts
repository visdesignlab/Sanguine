import { Provenance, initProvenance, isStateNode, } from '@visdesignlab/provenance-lib-core'
import {
  ApplicationState,
  defaultState,
  LayoutElement
} from "./Interfaces/ApplicationState";
import { store } from './Interfaces/Store';

interface AppProvenance{
    provenance: Provenance<ApplicationState>;
    actions: {
        goForward: () => void;
        goBack: () => void;
        setLayoutArray: (newLayoutArray: LayoutElement[]) => void;
        selectChart: (newSelectedID: string) => void;
    }
}
export function setupProvenance(): AppProvenance{
    const provenance = initProvenance(defaultState, true);
    provenance.addGlobalObserver(() => {
         let isAtRoot = false;

         const currentNode = provenance.current();

         if (isStateNode(currentNode)) {
           isAtRoot = currentNode.parent === provenance.root().id;
         }

         store.isAtRoot = isAtRoot;
         store.isAtLatest = provenance.current().children.length === 0;
    })

    provenance.addObserver(["currentSelected"], (state?: ApplicationState) => {
      store.currentSelectedChart = state
        ? state.currentSelected
        : store.currentSelectedChart;
    });

    provenance.addObserver(["layoutArray"], (state?: ApplicationState) => {
        store.layoutArray = state ? state.layoutArray : store.layoutArray;
    });

    provenance.done();

    const setLayoutArray = (layoutArray: LayoutElement[], skipProvenance:boolean=false) => {
        if (skipProvenance) {
            return
        }
        provenance.applyAction(
            "Setting Layout Array",
            (state: ApplicationState) => {
                state.layoutArray = layoutArray;
                return state;
            }
        )
    }

    const selectChart = (chartID: string) => {
        provenance.applyAction(
            `Selecting ${chartID}`,
            (state: ApplicationState) => {
                if (state.currentSelected === chartID) {
                    state.currentSelected = '-1'
                } else {
                    state.currentSelected = chartID
                }
                return state;
            }
        )
    }

    const goForward = () => {
        provenance.goForwardOneStep();
    };

    const goBack = () => {
        provenance.goBackOneStep();
    };

    return {
      provenance,
      actions: {
        goBack,
        goForward,
        setLayoutArray,
        selectChart,
      }
    };


}