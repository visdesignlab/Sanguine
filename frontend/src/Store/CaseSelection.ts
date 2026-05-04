/**
 * Module-level singleton for cross-chart surgery case hover and selection state.
 *
 * Uses a direct synchronous pub/sub pattern — no React, no MobX — so canvas
 * redraws triggered by hover or selection changes happen in the very next
 * animation frame with zero React reconciliation overhead.
 */

type ChangeCallback = () => void;

class CaseSelectionStore {
  /** IDs of currently hovered surgery cases (typically 0 or 1). */
  hoveredCaseIds: Set<string> = new Set();

  /** IDs of currently selected surgery cases. */
  selectedCaseIds: Set<string> = new Set();

  private readonly callbacks = new Set<ChangeCallback>();

  /**
   * Subscribe to any hover/selection change.
   * Returns an unsubscribe function suitable for use as a useEffect cleanup.
   */
  subscribe(cb: ChangeCallback): () => void {
    this.callbacks.add(cb);
    return () => { this.callbacks.delete(cb); };
  }

  private notify(): void {
    this.callbacks.forEach((cb) => cb());
  }

  /** Update the hovered case IDs. No-ops if the set is identical. */
  setHovered(ids: string[]): void {
    if (
      ids.length === this.hoveredCaseIds.size
      && ids.every((id) => this.hoveredCaseIds.has(id))
    ) return;
    this.hoveredCaseIds = new Set(ids);
    this.notify();
  }

  /** Clear all hover state. No-ops if already empty. */
  clearHovered(): void {
    if (this.hoveredCaseIds.size === 0) return;
    this.hoveredCaseIds = new Set();
    this.notify();
  }

  /** Additively add case IDs to the selection without clearing existing ones. */
  addSelected(ids: string[]): void {
    if (ids.length === 0) return;
    const next = new Set(this.selectedCaseIds);
    let changed = false;
    for (const id of ids) {
      if (!next.has(id)) { next.add(id); changed = true; }
    }
    if (changed) {
      this.selectedCaseIds = next;
      this.notify();
    }
  }

  /** Toggle individual case IDs in the selection (add if absent, remove if present). */
  toggleSelected(ids: string[]): void {
    if (ids.length === 0) return;
    const next = new Set(this.selectedCaseIds);
    for (const id of ids) {
      if (next.has(id)) next.delete(id);
      else next.add(id);
    }
    this.selectedCaseIds = next;
    this.notify();
  }

  /** Remove specific case IDs from the selection without clearing others. */
  removeSelected(ids: string[]): void {
    if (ids.length === 0) return;
    const next = new Set(this.selectedCaseIds);
    let changed = false;
    for (const id of ids) {
      if (next.has(id)) { next.delete(id); changed = true; }
    }
    if (changed) {
      this.selectedCaseIds = next;
      this.notify();
    }
  }

  /** Clear all selections. No-ops if already empty. */
  clearSelected(): void {
    if (this.selectedCaseIds.size === 0) return;
    this.selectedCaseIds = new Set();
    this.isFocusModeActive = false;
    this.notify();
  }

  /**
   * Whether the user has clicked the selection badge to lock focus-dimming on.
   * When true, non-selected cases are dimmed in all charts.
   */
  isFocusModeActive: boolean = false;

  /**
   * Whether the user is hovering the selection badge (temporary focus-dimming).
   * When true, non-selected cases are dimmed in all charts.
   */
  isHoveringBadge: boolean = false;

  setFocusModeActive(active: boolean): void {
    if (this.isFocusModeActive === active) return;
    this.isFocusModeActive = active;
    this.notify();
  }

  setHoveringBadge(hovering: boolean): void {
    if (this.isHoveringBadge === hovering) return;
    this.isHoveringBadge = hovering;
    this.notify();
  }
}

export const caseSelection = new CaseSelectionStore();
