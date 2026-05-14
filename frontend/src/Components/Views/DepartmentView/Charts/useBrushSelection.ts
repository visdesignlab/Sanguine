/**
 * Shared hook that encapsulates the 2-D box-selection interaction (draw, move, resize)
 * used by both DumbbellChartContent and ScatterPlot.
 *
 * Each chart supplies its own `extractBoxIds` (which case IDs fall inside a given rect)
 * and `onClickPoint` (what to do when the user clicks without dragging — typically toggle
 * the currently-hovered point). Everything else is generic brush state.
 */
import React, {
  useState, useRef, useCallback, useEffect, useContext, type RefObject,
} from 'react';
import { Store } from '../../../../Store/Store';
import { caseSelection } from '../../../../Store/CaseSelection';

export type BrushRect = { x1: number; y1: number; x2: number; y2: number };
type InteractionMode = 'idle' | 'selecting' | 'moving' | 'resizing';

/** Returns the CSS cursor string for a pointer at (x, y) relative to a selection box. */
function getBrushCursor(x: number, y: number, box: BrushRect, tol = 10): string {
  const minX = Math.min(box.x1, box.x2);
  const maxX = Math.max(box.x1, box.x2);
  const minY = Math.min(box.y1, box.y2);
  const maxY = Math.max(box.y1, box.y2);
  if (Math.abs(x - minX) < tol && Math.abs(y - minY) < tol) return 'nw-resize';
  if (Math.abs(x - maxX) < tol && Math.abs(y - minY) < tol) return 'ne-resize';
  if (Math.abs(x - minX) < tol && Math.abs(y - maxY) < tol) return 'sw-resize';
  if (Math.abs(x - maxX) < tol && Math.abs(y - maxY) < tol) return 'se-resize';
  if (Math.abs(y - minY) < tol && x > minX && x < maxX) return 'n-resize';
  if (Math.abs(y - maxY) < tol && x > minX && x < maxX) return 's-resize';
  if (Math.abs(x - minX) < tol && y > minY && y < maxY) return 'w-resize';
  if (Math.abs(x - maxX) < tol && y > minY && y < maxY) return 'e-resize';
  if (x > minX && x < maxX && y > minY && y < maxY) return 'move';
  return 'crosshair';
}

interface UseBrushSelectionOptions {
  /** Ref to the chart container div — used to translate client coords to chart coords. */
  chartRef: RefObject<HTMLDivElement | null>;
  /** Total pixel height of the chart area (including margins). */
  height: number;
  /** Top margin in pixels — brush is constrained below this y. */
  marginTop: number;
  /** Bottom margin in pixels — brush is constrained above `height - bottomMargin`. */
  bottomMargin: number;
  /** Minimum drag distance before treating the gesture as a box draw vs. a click. */
  dragLimit: number;
  /** Given a brush rect, return the case_ids whose data points fall inside it. */
  extractBoxIds: (box: BrushRect) => string[];
  /** Called when the user clicks without dragging — typically toggles the hovered point. */
  onClickPoint: () => void;
}

export interface BrushSelectionReturn {
  /** The live brush rect while dragging (null when not dragging). */
  selection: BrushRect | null;
  /** The persisted box shown after a drag completes (null when cleared). */
  appliedSelection: BrushRect | null;
  interactionMode: InteractionMode;
  /** Active resize handle identifier, e.g. 'nw', 'se' (null when not resizing). */
  resizeHandle: string | null;
  /** CSS cursor to use when idle, based on pointer proximity to the selection box. */
  brushCursor: string;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: () => void;
}

export function useBrushSelection({
  chartRef,
  height,
  marginTop,
  bottomMargin,
  dragLimit,
  extractBoxIds,
  onClickPoint,
}: UseBrushSelectionOptions): BrushSelectionReturn {
  const store = useContext(Store);
  const [selection, setSelection] = useState<BrushRect | null>(null);
  const [appliedSelection, setAppliedSelection] = useState<BrushRect | null>(null);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('idle');
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [brushCursor, setBrushCursor] = useState('crosshair');

  // Mutable refs used inside stable callbacks to avoid stale closures
  const initialSelection = useRef<BrushRect | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const prevSelectionRef = useRef<Set<string>>(new Set());

  // Keep layout/callback opts in a ref so callbacks don't recreate on every layout change
  const optsRef = useRef({
    height, marginTop, bottomMargin, dragLimit, extractBoxIds, onClickPoint, chartRef,
  });
  optsRef.current = {
    height, marginTop, bottomMargin, dragLimit, extractBoxIds, onClickPoint, chartRef,
  };

  // Single ref for all mutable interaction state — read inside stable callbacks
  const brushRef = useRef<{
    mode: InteractionMode;
    resizeHandle: string | null;
    appliedSelection: BrushRect | null;
    selection: BrushRect | null;
  }>({
    mode: 'idle', resizeHandle: null, appliedSelection: null, selection: null,
  });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const {
      chartRef: ref, marginTop: mt, height: h, bottomMargin: bm, extractBoxIds: extract,
    } = optsRef.current;
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const chartTop = mt;
    const chartBottom = h - bm;

    const applied = brushRef.current.appliedSelection;
    if (applied) {
      const cursor = getBrushCursor(x, y, applied);
      if (cursor.endsWith('-resize')) {
        const handle = cursor.slice(0, -7); // 'nw-resize' → 'nw'
        brushRef.current.mode = 'resizing'; setInteractionMode('resizing');
        brushRef.current.resizeHandle = handle; setResizeHandle(handle);
        initialSelection.current = { ...applied };
        const boxIds = new Set(extract(applied));
        prevSelectionRef.current = new Set([...caseSelection.selectedCaseIds].filter((id) => !boxIds.has(id)));
        return;
      }
      if (cursor === 'move') {
        brushRef.current.mode = 'moving'; setInteractionMode('moving');
        dragStart.current = { x, y };
        initialSelection.current = { ...applied };
        const boxIds = new Set(extract(applied));
        prevSelectionRef.current = new Set([...caseSelection.selectedCaseIds].filter((id) => !boxIds.has(id)));
        return;
      }
    }

    if (y < chartTop || y > chartBottom) {
      brushRef.current.appliedSelection = null; setAppliedSelection(null);
      brushRef.current.selection = null; setSelection(null);
      return;
    }

    prevSelectionRef.current = new Set(caseSelection.selectedCaseIds);
    brushRef.current.mode = 'selecting'; setInteractionMode('selecting');
    const box: BrushRect = {
      x1: x, y1: y, x2: x, y2: y,
    };
    brushRef.current.selection = box; setSelection(box);
    brushRef.current.appliedSelection = null; setAppliedSelection(null);
    initialSelection.current = box;
  }, [store]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const {
      chartRef: ref, marginTop: mt, height: h, bottomMargin: bm,
    } = optsRef.current;
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const chartTop = mt;
    const chartBottom = h - bm;
    const clampedY = Math.max(chartTop, Math.min(y, chartBottom));
    const { mode } = brushRef.current;
    const applied = brushRef.current.appliedSelection;

    if (mode === 'idle') {
      setBrushCursor(applied ? getBrushCursor(x, y, applied) : 'crosshair');
    }

    const setBox = (box: BrushRect) => { brushRef.current.selection = box; setSelection(box); };

    if (mode === 'selecting' && initialSelection.current) {
      setBox({ ...initialSelection.current, x2: x, y2: clampedY });
    } else if (mode === 'moving' && initialSelection.current && dragStart.current) {
      const dx = x - dragStart.current.x;
      const dy = y - dragStart.current.y;
      const cMinY = Math.min(initialSelection.current.y1, initialSelection.current.y2);
      const cMaxY = Math.max(initialSelection.current.y1, initialSelection.current.y2);
      let clampedDy = dy;
      if (cMinY + dy < chartTop) clampedDy = chartTop - cMinY;
      if (cMaxY + dy > chartBottom) clampedDy = chartBottom - cMaxY;
      setBox({
        x1: initialSelection.current.x1 + dx,
        y1: initialSelection.current.y1 + clampedDy,
        x2: initialSelection.current.x2 + dx,
        y2: initialSelection.current.y2 + clampedDy,
      });
    } else if (mode === 'resizing' && initialSelection.current) {
      const handle = brushRef.current.resizeHandle;
      const minX = Math.min(initialSelection.current.x1, initialSelection.current.x2);
      const maxX = Math.max(initialSelection.current.x1, initialSelection.current.x2);
      const minY = Math.min(initialSelection.current.y1, initialSelection.current.y2);
      const maxY = Math.max(initialSelection.current.y1, initialSelection.current.y2);
      let nMinX = minX; let nMaxX = maxX; let nMinY = minY; let nMaxY = maxY;
      if (handle?.includes('w')) nMinX = x;
      if (handle?.includes('e')) nMaxX = x;
      if (handle?.includes('n')) nMinY = clampedY;
      if (handle?.includes('s')) nMaxY = clampedY;
      setBox({
        x1: nMinX, y1: nMinY, x2: nMaxX, y2: nMaxY,
      });
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    const { mode } = brushRef.current;
    brushRef.current.mode = 'idle'; setInteractionMode('idle');
    brushRef.current.resizeHandle = null; setResizeHandle(null);
    dragStart.current = null;
    initialSelection.current = null;

    const sel = brushRef.current.selection;
    if (!sel) return;

    const dx = Math.abs(sel.x2 - sel.x1);
    const dy = Math.abs(sel.y2 - sel.y1);
    const {
      dragLimit: limit, extractBoxIds: extract, onClickPoint: onClick,
    } = optsRef.current;

    if (mode === 'moving' || mode === 'resizing') {
      caseSelection.setSelected([...prevSelectionRef.current, ...extract(sel)]);
      brushRef.current.appliedSelection = sel; setAppliedSelection(sel);
      brushRef.current.selection = null; setSelection(null);
      return;
    }

    if (dx < limit && dy < limit) {
      onClick();
      brushRef.current.appliedSelection = null; setAppliedSelection(null);
    } else {
      caseSelection.setSelected([...prevSelectionRef.current, ...extract(sel)]);
      brushRef.current.appliedSelection = sel; setAppliedSelection(sel);
    }
    brushRef.current.selection = null; setSelection(null);
  }, [store]);

  // Live-update the global selection as the box changes during drag / move / resize.
  // Points that fall outside a shrinking box are deselected immediately.
  useEffect(() => {
    const sel = brushRef.current.selection;
    if (!sel) return;
    const dx = Math.abs(sel.x2 - sel.x1);
    const dy = Math.abs(sel.y2 - sel.y1);
    if (dx < optsRef.current.dragLimit && dy < optsRef.current.dragLimit) return;
    caseSelection.setSelected([...prevSelectionRef.current, ...optsRef.current.extractBoxIds(sel)]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection]); // intentionally depends on selection state (triggers on every box update)

  return {
    selection,
    appliedSelection,
    interactionMode,
    resizeHandle,
    brushCursor,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}
