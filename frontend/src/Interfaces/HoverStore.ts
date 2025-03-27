import { makeAutoObservable } from 'mobx';
// eslint-disable-next-line import/no-cycle
import { RootStore } from './Store';

type AttributeFilter = [name: string, value: string | number | boolean];

export class HoverStore {
  rootStore: RootStore;

  // Currently hovered case IDs
  private _hoveredCaseIds: number[];

  // Color of the smaller mark hover
  public readonly smallHoverColor: string;

  // Color of a larger background hover
  public readonly backgroundHoverColor: string;

  // Currently hovered provider IDs
  private _hoveredAttribute?: AttributeFilter;

  // Extends the root store
  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;

    // Currently hovered case IDs
    this._hoveredCaseIds = [];

    // Currently hovered provider IDs
    this._hoveredAttribute = undefined;

    // Color of the hover
    this.smallHoverColor = '#FFCF76';

    // Color of the hover
    this.backgroundHoverColor = '#FFE8BE';

    // Make the store observable
    makeAutoObservable(this);
  }

  get hoveredCaseIds() {
    // Update the hovered case IDs based on the hovered provider IDs
    if (this._hoveredAttribute !== undefined) {
      return this.rootStore.filteredCases
        .filter((caseRecord) => caseRecord[this._hoveredAttribute![0]] === this._hoveredAttribute![1])
        .map((caseRecord) => caseRecord.CASE_ID);
    }

    return this._hoveredCaseIds;
  }

  set hoveredCaseIds(ids: number[]) {
    this._hoveredCaseIds = structuredClone(ids);
  }

  get hoveredAttribute() {
    return this._hoveredAttribute;
  }

  set hoveredAttribute(filter: AttributeFilter | undefined) {
    this._hoveredAttribute = filter;
  }
}
