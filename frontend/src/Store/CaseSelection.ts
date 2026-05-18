/**
 * CaseSelectionStore implements a manual pub/sub pattern for high-performance
 * cross-chart interactions (hovering, box-selection, etc.) on the Department View.
 *
 * This allows canvas-based charts to update their highlights without triggering
 * a full React reconciliation cycle on every mouse move.
 */

import {
  useState, useEffect,
} from 'react';

export class CaseSelectionStore {
  // --- State ---
  hoveredCaseIds: Set<string> = new Set();

  selectedCaseIds: Set<string> = new Set();

  isFocusModeActive: boolean = false;

  isHoveringBadge: boolean = false;

  // --- Subscriptions ---
  private subscribers: Set<() => void> = new Set();

  subscribe(callback: () => void) {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notify() {
    this.subscribers.forEach((cb) => cb());
  }

  // --- Actions ---

  setHovered(ids: string[]) {
    // Basic optimization: don't notify if the set of IDs hasn't changed
    if (ids.length === this.hoveredCaseIds.size && ids.every((id) => this.hoveredCaseIds.has(id))) return;
    this.hoveredCaseIds = new Set(ids);
    this.notify();
  }

  clearHovered() {
    if (this.hoveredCaseIds.size === 0) return;
    this.hoveredCaseIds = new Set();
    this.notify();
  }

  addSelected(ids: string[]) {
    if (ids.length === 0) return;
    const sizeBefore = this.selectedCaseIds.size;
    const next = new Set(this.selectedCaseIds);
    ids.forEach((id) => next.add(id));
    if (next.size === sizeBefore) return;
    this.selectedCaseIds = next;
    this.notify();
  }

  toggleSelected(ids: string[]) {
    if (ids.length === 0) return;
    const next = new Set(this.selectedCaseIds);
    ids.forEach((id) => {
      if (next.has(id)) next.delete(id);
      else next.add(id);
    });
    this.selectedCaseIds = next;
    this.notify();
  }

  removeSelected(ids: string[]) {
    if (ids.length === 0) return;
    const sizeBefore = this.selectedCaseIds.size;
    const next = new Set(this.selectedCaseIds);
    ids.forEach((id) => next.delete(id));
    if (next.size === sizeBefore) return;
    this.selectedCaseIds = next;
    this.notify();
  }

  clearSelected() {
    if (this.selectedCaseIds.size === 0 && !this.isFocusModeActive) return;
    this.selectedCaseIds = new Set();
    this.isFocusModeActive = false;
    this.notify();
  }

  setSelected(ids: string[]) {
    this.selectedCaseIds = new Set(ids);
    if (ids.length === 0) this.isFocusModeActive = false;
    this.notify();
  }

  setFocusModeActive(active: boolean) {
    if (this.isFocusModeActive === active) return;
    this.isFocusModeActive = active;
    this.notify();
  }

  setHoveringBadge(hovering: boolean) {
    if (this.isHoveringBadge === hovering) return;
    this.isHoveringBadge = hovering;
    this.notify();
  }
}

// Singleton instance
export const caseSelection = new CaseSelectionStore();

const snapshot = () => ({
  selectedCaseIds: caseSelection.selectedCaseIds,
  hoveredCaseIds: caseSelection.hoveredCaseIds,
  isFocusModeActive: caseSelection.isFocusModeActive,
  isHoveringBadge: caseSelection.isHoveringBadge,
});

export function useCaseSelection() {
  const [state, setState] = useState(snapshot);
  useEffect(() => caseSelection.subscribe(() => setState(snapshot())), []);
  return state;
}
