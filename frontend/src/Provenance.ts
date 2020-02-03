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
        togglePerCase: (event: any, data: any) => void;
        filterSelectionChange: (event: any, data: any) => void;
        yearRangeChange: (data: any) => void;
        addNewChart: (x: string, y: string,i:number) => void;
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

    provenance.addObserver(
      ["currentSelectedChart"],
      (state?: ApplicationState) => {
        store.currentSelectedChart = state
          ? state.currentSelectedChart
          : store.currentSelectedChart;
      }
    );

    provenance.addObserver(["layoutArray"], (state?: ApplicationState) => {
        store.layoutArray = state ? state.layoutArray : store.layoutArray;
    });

    provenance.addObserver(["perCaseSelected"], (state?: ApplicationState) => {
      store.perCaseSelected = state
        ? state.perCaseSelected
        : store.perCaseSelected;
    });

    provenance.addObserver(["yearRange"], (state?: ApplicationState) => {
        store.yearRange = state
            ? state.yearRange
            : store.yearRange;
    })

    provenance.addObserver(["filterSelection"], (state?: ApplicationState) => {
      store.filterSelection = state?state.filterSelection:store.filterSelection  
    })

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

    const addNewChart = (xAxisAttribute: string, yAxisAttribute: string,index:number) => {
        const newLayoutElement: LayoutElement = {
            x_axis_name: xAxisAttribute,
            y_axis_name: yAxisAttribute,  
            i: index.toString()
        } 
        provenance.applyAction("Add new chart",
            (state: ApplicationState) => {
                state.layoutArray.push(newLayoutElement)
                return state;
        })
    }

    const selectChart = (chartID: string) => {
        provenance.applyAction(
            `Selecting ${chartID}`,
            (state: ApplicationState) => {
                if (state.currentSelectedChart === chartID) {
                    state.currentSelectedChart = "-1";
                } else {
                    state.currentSelectedChart = chartID;
                }
                return state;
            }
        )
    }

    const togglePerCase = (event: any, perCaseSelected: any) => {
      provenance.applyAction(
        `Per Case ${perCaseSelected.checked}`,
        (state: ApplicationState) => {
          state.perCaseSelected = perCaseSelected.checked;
          return state;
        }
      )
    };

    const filterSelectionChange = (event: any, newFilterSelection: any) => {
        provenance.applyAction(
            `Change Filter Selection to ${newFilterSelection.value}`,
            (state: ApplicationState) => {
                state.filterSelection = newFilterSelection.value;
                return state;
            }
        )
        console.log(newFilterSelection);
    }

    const yearRangeChange = (newYearRange: any) => {
        if (newYearRange !== store.yearRange) {
            provenance.applyAction(
                `Change Year Range To ${newYearRange}`,
                (state: ApplicationState) => {
                    state.yearRange = newYearRange;
                    return state;
                }
            )
            console.log(newYearRange)
        }
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
        togglePerCase,
        filterSelectionChange,
        yearRangeChange,
        addNewChart
      }
    };


}