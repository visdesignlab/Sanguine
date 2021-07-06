import { changeCostConfig, changeOutcomeFilter, changeSurgeryUrgencySelection, dateRangeChange, loadPreset, toggleShowZero } from "./Actions/ProjectConfigActions";
import { RootStore } from "./Store";
import { LayoutElement } from "./Types/LayoutTypes";

export class ProjectConfigStore {
    rootStore: RootStore;

    constructor(rootstore: RootStore) {
        this.rootStore = rootstore;
    }
    get provenance() {
        return this.rootStore.provenance
    }

    changeSurgeryUrgencySelection(input: [boolean, boolean, boolean]) {
        this.provenance.apply(changeSurgeryUrgencySelection(input))
    }

    changeCostConfig(componentName: string, newCost: number) {
        this.provenance.apply(changeCostConfig(componentName, newCost))
    }
    changeOutcomeFilter(newOutcomeFilter: string) {
        this.provenance.apply(changeOutcomeFilter(newOutcomeFilter))
    }

    toggleShowZero(showZero: boolean) {
        this.provenance.apply(toggleShowZero(showZero))
    }
    dateRangeChange(dateRange: number[]) {
        this.provenance.apply(dateRangeChange(dateRange))
    }
    loadPreset(layoutInput: LayoutElement[]) {
        this.provenance.apply(loadPreset(layoutInput))
    }
}