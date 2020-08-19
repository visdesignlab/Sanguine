import { observable, computed } from 'mobx'
import {
    defaultState,
    LayoutElement,
    SelectSet,
    SingleCasePoint
} from "./ApplicationState";
import { timeFormat } from 'd3';

export default class Store {
    @observable isAtRoot: boolean = true;
    @observable isAtLatest: boolean = true;
    //  @observable currentSelectedChart: string = defaultState.currentSelectedChart;
    @observable layoutArray: LayoutElement[] = defaultState.layoutArray;
    // @observable perCaseSelected: boolean = defaultState.perCaseSelected;
    @observable showZero: boolean = defaultState.showZero;
    //@observable yearRange: number[] = defaultState.yearRange;

    @observable rawDateRange: number[] = defaultState.rawDateRange;

    @observable procedureTypeSelection: [boolean, boolean, boolean] = defaultState.procedureTypeSelection;
    @observable proceduresSelection: string[] = defaultState.proceduresSelection;
    // @computed get proceduresSelection() {
    //   return (JSON.parse(this.rawproceduresSelection) as string[])
    // }
    @observable outcomesSelection: string = defaultState.outcomesSelection;

    @observable currentBrushedPatientGroup: SingleCasePoint[] = defaultState.currentBrushedPatientGroup;

    @computed get currentSelectPatientGroupIDs() {
        let ids = this.currentSelectPatientGroup.map(d => d.CASE_ID);
        return ids
    }

    @observable totalAggregatedCaseCount: number = defaultState.totalAggregatedCaseCount;
    @observable totalIndividualCaseCount: number = defaultState.totalIndividualCaseCount

    // @observable dumbbellSorted: boolean = defaultState.dumbbellSorted;
    @observable currentSelectSet: SelectSet[] = defaultState.currentSelectSet;
    // @observable currentSelectPatient: SingleCasePoint | null = defaultState.currentSelectPatient;
    // @computed get actualYearRange() {
    //   return [this.yearRange[0] + 2014, this.yearRange[1] + 2014]
    // }
    @computed get dateRange() {
        return [timeFormat("%d-%b-%Y")(new Date(this.rawDateRange[0])), timeFormat("%d-%b-%Y")(new Date(this.rawDateRange[1]))]

    }
    // @computed get noProcedureTypeSelected(){
    //     return !(this.procedureTypeSelection[0] || this.procedureTypeSelection[1] || this.procedureTypeSelection[2])
    // }

    @observable nextAddingIndex: number = defaultState.nextAddingIndex;
    @observable currentOutputFilterSet: SelectSet[] = defaultState.currentOutputFilterSet;

    @observable currentSelectPatientGroup: SingleCasePoint[] = defaultState.currentSelectPatientGroup;

    @observable isLoggedIn: boolean = process.env.REACT_APP_REQUIRE_LOGIN === "true" ? false : true;
    @observable previewMode: boolean = false;
    @observable loadingModalOpen: boolean = true;
    // @observable csrftoken: string | null = ""

}


export const store = new Store()