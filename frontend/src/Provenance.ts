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
      toggleDumbbell: (event: any, data: any) => void;
        filterSelectionChange: (event: any, data: any) => void;
        yearRangeChange: (data: any) => void;
        addNewChart: (x: string, y: string, i: number) => void;
      removeChart: (event: any, i: any) => void;
      updateCaseCount: (newCaseCount: number) => void;
    }
}
export function setupProvenance(): AppProvenance{
    const provenance = initProvenance(defaultState, true);
    provenance.addGlobalObserver(() => {
         let isAtRoot = false;
         const currentNode = provenance.current();
         //if (isStateNode(currentNode)) {
           isAtRoot = currentNode.id === provenance.root().id;
         //}
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
  
  provenance.addObserver(["dumbbellSorted"], (state?: ApplicationState) => {
    store.dumbbellSorted = state ? state.dumbbellSorted : store.dumbbellSorted;
    })

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

    const removeChart = (event: any,child:any) => {
    //    console.log(event,index)
        const remove_index=child.children.key
        provenance.applyAction(
          `remove chart ${remove_index}`,
          (state: ApplicationState) => {
            state.layoutArray = state.layoutArray.filter(
              d => d.i !== remove_index
            );
            return state;
          }
        );
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
  
  const toggleDumbbell = (event: any, dumbbellSorted: any) => {
    provenance.applyAction(
      `dumbbell sort ${dumbbellSorted}`,
      (state: ApplicationState) => {
        state.dumbbellSorted = dumbbellSorted.checked;
        return state;
      }
    )
  }

    const filterSelectionChange = (event: any, newFilterSelection: any) => {
        provenance.applyAction(
            `Change Filter Selection to ${newFilterSelection.value}`,
            (state: ApplicationState) => {
                state.filterSelection = newFilterSelection.value;
                return state;
            }
        )
       // console.log(newFilterSelection);
    }

    const yearRangeChange = (newYearRange: any) => {
      provenance.applyAction(
        `Change Year Range To ${newYearRange}`,
        (state: ApplicationState) => {
          if (newYearRange !== state.yearRange) {
            state.yearRange = newYearRange;
          }
          return state;
        }
      );
    };
  
  const updateCaseCount = (newCaseCount: number) => {
  //  if (store.totalCaseCount < newCaseCount){
      store.totalCaseCount = newCaseCount;
  //  }
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
        toggleDumbbell,
        filterSelectionChange,
        yearRangeChange,
        addNewChart,
        removeChart,
        updateCaseCount
      }
    };


}