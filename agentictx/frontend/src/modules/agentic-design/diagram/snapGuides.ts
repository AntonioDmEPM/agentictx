/**
 * Pure snap-guide computation for the Agent Architecture Diagram.
 *
 * Given a set of nodes being dragged and all nodes on the canvas, computes:
 *   - The nearest alignment opportunity (within threshold canvas pixels)
 *   - A snap delta (dx, dy) to apply to the dragging nodes
 *   - The guide lines to render on the canvas
 *
 * Alignment candidates checked (for both X and Y axes):
 *   dragging_edge ≈ other_left/right/centerX  (vertical guides)
 *   dragging_edge ≈ other_top/bottom/centerY  (horizontal guides)
 */
import type { Node } from "@xyflow/react";

export interface SnapLine {
  type: "h" | "v"; // h = horizontal line (fixed Y), v = vertical line (fixed X)
  pos: number;      // canvas coordinate: Y for "h", X for "v"
}

const SNAP_THRESHOLD = 8; // canvas pixels

function nodeW(n: Node): number {
  return n.measured?.width ?? (n.width as number | undefined) ?? 0;
}
function nodeH(n: Node): number {
  return n.measured?.height ?? (n.height as number | undefined) ?? 0;
}

/** Bounding box of a set of nodes (in canvas coordinates). */
function getBBox(nodes: Node[]) {
  const left   = Math.min(...nodes.map(n => n.position.x));
  const top    = Math.min(...nodes.map(n => n.position.y));
  const right  = Math.max(...nodes.map(n => n.position.x + nodeW(n)));
  const bottom = Math.max(...nodes.map(n => n.position.y + nodeH(n)));
  return { left, top, right, bottom, cx: (left + right) / 2, cy: (top + bottom) / 2 };
}

/** Key edges of a single node. */
function getEdges(n: Node) {
  const w = nodeW(n), h = nodeH(n);
  return {
    left:   n.position.x,
    right:  n.position.x + w,
    cx:     n.position.x + w / 2,
    top:    n.position.y,
    bottom: n.position.y + h,
    cy:     n.position.y + h / 2,
  };
}

/**
 * Compute snap guides for dragging nodes against all other (non-dragging) nodes.
 *
 * @param draggingNodes Nodes being dragged, with their CURRENT (proposed) positions.
 * @param allNodes      All nodes on the canvas (dragging + non-dragging).
 * @param threshold     Snap threshold in canvas pixels.
 */
export function computeSnapGuides(
  draggingNodes: Node[],
  allNodes: Node[],
  threshold = SNAP_THRESHOLD
): { lines: SnapLine[]; snapDx: number; snapDy: number } {
  const draggingIds = new Set(draggingNodes.map(n => n.id));

  // Snap targets: all nodes not currently being dragged
  const others = allNodes.filter(n => !draggingIds.has(n.id));
  if (others.length === 0) return { lines: [], snapDx: 0, snapDy: 0 };

  const bbox = getBBox(draggingNodes);

  let bestXDelta: number | null = null;
  let bestXLinePos: number | null = null;
  let minDX = threshold;

  let bestYDelta: number | null = null;
  let bestYLinePos: number | null = null;
  let minDY = threshold;

  for (const other of others) {
    const r = getEdges(other);

    // X axis: check selection bbox edges against reference node edges
    // [bbox_value, ref_value] — delta = ref - bbox so bbox snaps TO ref
    const xPairs: [number, number][] = [
      [bbox.left,  r.left],
      [bbox.left,  r.right],
      [bbox.cx,    r.cx],
      [bbox.right, r.right],
      [bbox.right, r.left],
    ];
    for (const [dval, rval] of xPairs) {
      const dist = Math.abs(dval - rval);
      if (dist < minDX) {
        minDX        = dist;
        bestXDelta   = rval - dval;
        bestXLinePos = rval;
      }
    }

    // Y axis
    const yPairs: [number, number][] = [
      [bbox.top,    r.top],
      [bbox.top,    r.bottom],
      [bbox.cy,     r.cy],
      [bbox.bottom, r.bottom],
      [bbox.bottom, r.top],
    ];
    for (const [dval, rval] of yPairs) {
      const dist = Math.abs(dval - rval);
      if (dist < minDY) {
        minDY        = dist;
        bestYDelta   = rval - dval;
        bestYLinePos = rval;
      }
    }
  }

  const lines: SnapLine[] = [];
  if (bestXLinePos !== null) lines.push({ type: "v", pos: bestXLinePos });
  if (bestYLinePos !== null) lines.push({ type: "h", pos: bestYLinePos });

  return { lines, snapDx: bestXDelta ?? 0, snapDy: bestYDelta ?? 0 };
}
