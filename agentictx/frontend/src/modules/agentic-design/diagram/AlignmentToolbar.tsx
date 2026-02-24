/**
 * Alignment and distribution toolbar for selected diagram nodes.
 *
 * Align buttons: enabled when ≥ 2 nodes selected.
 * Distribute buttons: enabled when ≥ 3 nodes selected.
 */

export type AlignDir = "left" | "centerX" | "right" | "top" | "centerY" | "bottom";
export type DistributeDir = "h" | "v";

interface Props {
  selectionCount: number;
  onAlign: (dir: AlignDir) => void;
  onDistribute: (dir: DistributeDir) => void;
}

// ─── Icons (14×14 inline SVG) ────────────────────────────────────────────────

const AlignLeftIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
    <rect x="1" y="1" width="1.5" height="12" />
    <rect x="3.5" y="2.5" width="8" height="3" rx="0.5" />
    <rect x="3.5" y="8.5" width="5" height="3" rx="0.5" />
  </svg>
);

const AlignCenterHIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
    <rect x="6.5" y="1" width="1" height="12" opacity="0.35" />
    <rect x="2" y="2.5" width="10" height="3" rx="0.5" />
    <rect x="3.5" y="8.5" width="7" height="3" rx="0.5" />
  </svg>
);

const AlignRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
    <rect x="11.5" y="1" width="1.5" height="12" />
    <rect x="2.5" y="2.5" width="8" height="3" rx="0.5" />
    <rect x="5.5" y="8.5" width="5" height="3" rx="0.5" />
  </svg>
);

const AlignTopIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
    <rect x="1" y="1" width="12" height="1.5" />
    <rect x="2.5" y="3.5" width="3" height="8" rx="0.5" />
    <rect x="8.5" y="3.5" width="3" height="5" rx="0.5" />
  </svg>
);

const AlignCenterVIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
    <rect x="1" y="6.5" width="12" height="1" opacity="0.35" />
    <rect x="2.5" y="2" width="3" height="10" rx="0.5" />
    <rect x="8.5" y="3.5" width="3" height="7" rx="0.5" />
  </svg>
);

const AlignBottomIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
    <rect x="1" y="11.5" width="12" height="1.5" />
    <rect x="2.5" y="2.5" width="3" height="8" rx="0.5" />
    <rect x="8.5" y="5.5" width="3" height="5" rx="0.5" />
  </svg>
);

const DistributeHIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
    <rect x="0.5" y="1" width="1" height="12" opacity="0.4" />
    <rect x="12.5" y="1" width="1" height="12" opacity="0.4" />
    <rect x="3" y="3.5" width="3" height="7" rx="0.5" />
    <rect x="8" y="3.5" width="3" height="7" rx="0.5" />
  </svg>
);

const DistributeVIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
    <rect x="1" y="0.5" width="12" height="1" opacity="0.4" />
    <rect x="1" y="12.5" width="12" height="1" opacity="0.4" />
    <rect x="3.5" y="3" width="7" height="3" rx="0.5" />
    <rect x="3.5" y="8" width="7" height="3" rx="0.5" />
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

export function AlignmentToolbar({ selectionCount, onAlign, onDistribute }: Props) {
  const canAlign      = selectionCount >= 2;
  const canDistribute = selectionCount >= 3;

  const Btn = ({
    title,
    icon,
    onClick,
    enabled,
  }: {
    title: string;
    icon: React.ReactNode;
    onClick: () => void;
    enabled: boolean;
  }) => (
    <button
      title={title}
      onClick={() => enabled && onClick()}
      style={{
        background: "none",
        border: "none",
        padding: "3px 4px",
        cursor: enabled ? "pointer" : "default",
        opacity: enabled ? 1 : 0.28,
        color: "var(--text-secondary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 3,
        lineHeight: 0,
      }}
    >
      {icon}
    </button>
  );

  const sep = (
    <div
      style={{
        width: 1,
        height: 12,
        background: "var(--bg-border)",
        margin: "0 2px",
        flexShrink: 0,
      }}
    />
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        border: "1px solid var(--bg-border)",
        borderRadius: 4,
        padding: "1px 3px",
        flexShrink: 0,
      }}
    >
      <Btn title="Align left edges"              icon={<AlignLeftIcon />}    onClick={() => onAlign("left")}      enabled={canAlign} />
      <Btn title="Align horizontal centres"      icon={<AlignCenterHIcon />} onClick={() => onAlign("centerX")}  enabled={canAlign} />
      <Btn title="Align right edges"             icon={<AlignRightIcon />}   onClick={() => onAlign("right")}    enabled={canAlign} />
      {sep}
      <Btn title="Align top edges"               icon={<AlignTopIcon />}     onClick={() => onAlign("top")}      enabled={canAlign} />
      <Btn title="Align vertical centres"        icon={<AlignCenterVIcon />} onClick={() => onAlign("centerY")}  enabled={canAlign} />
      <Btn title="Align bottom edges"            icon={<AlignBottomIcon />}  onClick={() => onAlign("bottom")}   enabled={canAlign} />
      {sep}
      <Btn title="Distribute horizontally (≥3)"  icon={<DistributeHIcon />}  onClick={() => onDistribute("h")}   enabled={canDistribute} />
      <Btn title="Distribute vertically (≥3)"    icon={<DistributeVIcon />}  onClick={() => onDistribute("v")}   enabled={canDistribute} />
    </div>
  );
}
