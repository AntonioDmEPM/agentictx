/**
 * Renders snap alignment guide lines on the React Flow canvas.
 *
 * Must be rendered as a direct child of <ReactFlow> so it can access
 * useViewport() from the React Flow context.
 *
 * Converts canvas-coordinate snap positions to screen-space pixel positions
 * using the current viewport transform (x, y, zoom).
 */
import { useViewport } from "@xyflow/react";
import type { SnapLine } from "./snapGuides";

interface Props {
  lines: SnapLine[];
}

export function SnapGuidesOverlay({ lines }: Props) {
  const { x: vpX, y: vpY, zoom } = useViewport();

  if (lines.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 100,
      }}
    >
      {lines.map((line, i) =>
        line.type === "v" ? (
          // Vertical guide line — fixed X, full canvas height
          <div
            key={i}
            style={{
              position: "absolute",
              left: line.pos * zoom + vpX,
              top: 0,
              bottom: 0,
              width: 1,
              background: "rgba(79, 127, 255, 0.8)",
              pointerEvents: "none",
            }}
          />
        ) : (
          // Horizontal guide line — fixed Y, full canvas width
          <div
            key={i}
            style={{
              position: "absolute",
              top: line.pos * zoom + vpY,
              left: 0,
              right: 0,
              height: 1,
              background: "rgba(79, 127, 255, 0.8)",
              pointerEvents: "none",
            }}
          />
        )
      )}
    </div>
  );
}
