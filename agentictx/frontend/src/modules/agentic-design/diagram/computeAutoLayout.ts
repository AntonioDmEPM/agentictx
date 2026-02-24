/**
 * Auto-layout computation for the Agent Architecture Diagram.
 *
 * Delegates entirely to buildDiagramLayout with no saved positions,
 * which runs the canonical overlap-free algorithm and returns every node
 * at its clean computed default position.
 *
 * Returns a position map { [nodeId]: { x, y } } (top-left, React Flow convention)
 * ready to be written to node_positions in the DB.
 */
import { buildDiagramLayout } from "./buildDiagramLayout";
import type { AgentSpecification } from "@/types/agentic_design";

export function computeAutoLayout(
  spec: AgentSpecification
): Record<string, { x: number; y: number }> {
  // Passing undefined for savedPositions makes resolvePos() return the computed
  // default for every node — guaranteed overlap-free by buildDiagramLayout's design.
  const { nodes } = buildDiagramLayout(spec, "architecture", undefined, undefined);

  const positions: Record<string, { x: number; y: number }> = {};
  for (const node of nodes) {
    positions[node.id] = { x: node.position.x, y: node.position.y };
  }
  return positions;
}
