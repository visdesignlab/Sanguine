import React, {
  useState, useRef, useCallback, useEffect, type RefObject,
} from 'react';

export type BrushRect = { x1: number; y1: number; x2: number; y2: number };
type InteractionMode = 'idle' | 'selecting' | 'moving' | 'resizing';

/** Returns the CSS cursor string for a pointer at (x, y) relative to a selection box. */
function getBrushCursor(x: number, y: number, box: BrushRect, tol = 10): string {
  const minX = Math.min(box.x1, box.x2); const maxX = Math.max(box.x1, box.x2);
  const minY = Math.min(box.y1, box.y2); const maxY = Math.max(box.y1, box.y2);
  if (Math.abs(x - minX) < tol && Math.abs(y - minY) < tol) return 'nw-resize';
  if (Math.abs(x - maxX) < tol && Math.abs(y - minY) < tol) return 'ne-resize';
  if (Math.abs(x - minX) < tol && Math.abs(y - maxY) < tol) return 'sw-resize';
  if (Math.abs(x - maxX) < tol && Math.abs(y - maxY) < tol) return 'se-resize';
  if (Math.abs(y - minY) < tol && x > minX && x < maxX) return 'n-resize';
  if (Math.abs(y - maxY) < tol && x > minX && x < maxX) return 's-resize';
  if (Math.abs(x - minX) < tol && y > minY && y < maxY) return 'w-resize';
  if (Math.abs(x - maxX) < tol && y > minY && y < maxY) return 'e-resize';
  return (x > minX && x < maxX && y > minY && y < maxY) ? 'move' : 'crosshair';
}

interface UseBrushSelectionOptions {
  chartRef: RefObject<HTMLDivElement | null>;
  height: number;
  marginTop: number;
  bottomMargin: number;
  dragLimit: number;
  extractBoxIds: (box: BrushRect) => string[];
  onClickPoint: () => void;
  getSelectedCaseIds: () => Set<string>;
  setSelected: (ids: string[]) => void;
}

export function useBrushSelection({
  chartRef,
  height,
  marginTop,
  bottomMargin,
  dragLimit,
  extractBoxIds,
  onClickPoint,
  getSelectedCaseIds,
  setSelected,
}: UseBrushSelectionOptions) {
  const [selection, setSelection] = useState<BrushRect | null>(null);
  const [appliedSelection, setAppliedSelection] = useState<BrushRect | null>(null);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('idle');
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [brushCursor, setBrushCursor] = useState('crosshair');

  // Mutable refs used inside stable callbacks to avoid stale closures
  const initialSelection = useRef<BrushRect | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const prevSelectionRef = useRef<Set<string>>(new Set());
  const optsRef = useRef<UseBrushSelectionOptions>(null!);
  optsRef.current = {
    height, marginTop, bottomMargin, dragLimit, extractBoxIds, onClickPoint, chartRef, getSelectedCaseIds, setSelected,
  };

  // Single ref for all mutable interaction state — read inside stable callbacks
  const brushRef = useRef<{
    mode: InteractionMode; resizeHandle: string | null;
    appliedSelection: BrushRect | null; selection: BrushRect | null;
  }>({
    mode: 'idle', resizeHandle: null, appliedSelection: null, selection: null,
  });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const {
      chartRef: ref, marginTop: mt, height: h, bottomMargin: bm, extractBoxIds: extract,
    } = optsRef.current;
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left; const y = e.clientY - rect.top;
    const chartTop = mt; const chartBottom = h - bm;

    const applied = brushRef.current.appliedSelection;
    if (applied) {
      const cursor = getBrushCursor(x, y, applied);
      if (cursor.endsWith('-resize') || cursor === 'move') {
        if (cursor === 'move') {
          brushRef.current.mode = 'moving'; setInteractionMode('moving'); dragStart.current = { x, y };
        } else {
          const handle = cursor.slice(0, -7);
          brushRef.current.mode = 'resizing'; setInteractionMode('resizing');
          brushRef.current.resizeHandle = handle; setResizeHandle(handle);
        }
        initialSelection.current = { ...applied };
        const boxIds = new Set(extract(applied));
        prevSelectionRef.current = new Set([...optsRef.current.getSelectedCaseIds()].filter((id) => !boxIds.has(id)));
        return;
      }
    }

    if (y < chartTop || y > chartBottom) {
      brushRef.current.appliedSelection = null; setAppliedSelection(null);
      brushRef.current.selection = null; setSelection(null);
      return;
    }

    prevSelectionRef.current = new Set(optsRef.current.getSelectedCaseIds());
    brushRef.current.mode = 'selecting'; setInteractionMode('selecting');
    const box: BrushRect = {
      x1: x, y1: y, x2: x, y2: y,
    };
    brushRef.current.selection = box; setSelection(box);
    brushRef.current.appliedSelection = null; setAppliedSelection(null);
    initialSelection.current = box;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const {
      chartRef: ref, marginTop: mt, height: h, bottomMargin: bm,
    } = optsRef.current;
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left; const y = e.clientY - rect.top;
    const chartTop = mt; const chartBottom = h - bm;
    const clampedY = Math.max(chartTop, Math.min(y, chartBottom));
    const { mode, appliedSelection: applied } = brushRef.current;

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
      const init = initialSelection.current; const handle = brushRef.current.resizeHandle;
      const nMinX = handle?.includes('w') ? x : Math.min(init.x1, init.x2);
      const nMaxX = handle?.includes('e') ? x : Math.max(init.x1, init.x2);
      const nMinY = handle?.includes('n') ? clampedY : Math.min(init.y1, init.y2);
      const nMaxY = handle?.includes('s') ? clampedY : Math.max(init.y1, init.y2);
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
    const { dragLimit: limit, extractBoxIds: extract, onClickPoint: onClick } = optsRef.current;

    const isClick = mode !== 'moving' && mode !== 'resizing' && dx < limit && dy < limit;
    if (isClick) {
      onClick();
      brushRef.current.appliedSelection = null; setAppliedSelection(null);
    } else {
      optsRef.current.setSelected([...prevSelectionRef.current, ...extract(sel)]);
      brushRef.current.appliedSelection = sel; setAppliedSelection(sel);
    }
    brushRef.current.selection = null; setSelection(null);
  }, []);

  // Points that fall outside a shrinking box are deselected immediately.
  useEffect(() => {
    const sel = brushRef.current.selection;
    if (!sel) return;
    const dx = Math.abs(sel.x2 - sel.x1);
    const dy = Math.abs(sel.y2 - sel.y1);
    if (dx < optsRef.current.dragLimit && dy < optsRef.current.dragLimit) return;
    optsRef.current.setSelected([...prevSelectionRef.current, ...optsRef.current.extractBoxIds(sel)]);
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
