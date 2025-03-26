import { makeAutoObservable } from 'mobx';
// eslint-disable-next-line import/no-cycle
import { RootStore } from './Store';

export class HoverStore {
  rootStore: RootStore;

  // Currently hovered case IDs
  private _hoveredCaseIds: number[];

  // Color of the smaller mark hover
  public readonly smallHoverColor: string;

  // Color of a larger background hover
  public readonly backgroundHoverColor: string;

  // Currently hovered provider IDs
  private _hoveredProviderIds: number[];

  // Extends the root store
  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;

    // Currently hovered case IDs
    this._hoveredCaseIds = [];

    // Currently hovered provider IDs
    this._hoveredProviderIds = [];

    // Color of the hover
    this.smallHoverColor = '#FFCF76';

    // Color of the hover
    this.backgroundHoverColor = '#FFE8BE';

    // Make the store observable
    makeAutoObservable(this);
  }

  get hoveredCaseIds() {
    return this._hoveredCaseIds;
  }

  set hoveredCaseIds(ids: number[]) {
    this._hoveredCaseIds = structuredClone(ids);
  }

  get hoveredProviderIds() {
    return this._hoveredProviderIds;
  }

  set hoveredProviderIds(ids: number[]) {
    this._hoveredProviderIds = ids;

    // Update the hovered case IDs based on the hovered provider IDs
    this._hoveredCaseIds = this.rootStore.allCases
      .filter((caseRecord) => ids.includes(Number(caseRecord.SURGEON_PROV_ID))
      || ids.includes(Number(caseRecord.ANESTH_PROV_ID)))
      .map((caseRecord) => caseRecord.CASE_ID);
  }
}
