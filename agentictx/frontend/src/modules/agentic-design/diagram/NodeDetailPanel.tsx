/**
 * NodeDetailPanel — slide-in editor panel for diagram nodes.
 *
 * Opens when the user double-clicks any node on the Agent Architecture Diagram.
 * Shows all editable fields for the node type as a structured form.
 * On Save, builds the correct spec patch and calls onSave.
 */
import { useState, useEffect } from "react";
import type {
  AgentSpecification,
  AutonomyLevel,
  InputChannelType,
  OutputChannelType,
  ToolStatus,
  ToolType,
  ConnectedSystem,
} from "@/types/agentic_design";

// ─── Field helpers ────────────────────────────────────────────────────────────

const LABEL: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 10,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  marginBottom: 3,
  display: "block",
};

const INPUT: React.CSSProperties = {
  width: "100%",
  fontFamily: "var(--font-ui)",
  fontSize: 12,
  color: "var(--text-primary)",
  background: "var(--bg-surface)",
  border: "1px solid var(--bg-border)",
  borderRadius: 4,
  padding: "5px 8px",
  outline: "none",
  boxSizing: "border-box",
};

const TEXTAREA: React.CSSProperties = {
  ...INPUT,
  resize: "vertical",
  minHeight: 56,
};

const SELECT: React.CSSProperties = {
  ...INPUT,
  cursor: "pointer",
};

const FIELD_ROW: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  marginBottom: 12,
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={FIELD_ROW}>
      <span style={LABEL}>{label}</span>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={INPUT}
    />
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
}: {
  value: number | string;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      min={min}
      max={max}
      style={INPUT}
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={TEXTAREA}
    />
  );
}

function Select({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={SELECT}>
      {options.map((o) => (
        <option key={o.value} value={o.value} style={{ background: "var(--bg-surface)" }}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ─── Node type label mapping ──────────────────────────────────────────────────

function getNodeTypeLabel(nodeId: string): string {
  if (nodeId.startsWith("agent-")) return "Agent Node";
  if (nodeId.startsWith("input-")) return "Input Channel";
  if (nodeId === "prompt-system") return "System Prompt";
  if (nodeId.startsWith("prompt-dynamic-")) return "Dynamic Context";
  if (nodeId === "prompt-fewshot") return "Few-Shot Examples";
  if (nodeId.startsWith("prompt-guardrail-")) return "Guardrail";
  if (nodeId.startsWith("tool-") && !nodeId.includes("-", 5)) return "Tool / MCP";
  if (nodeId.startsWith("system-")) return "System Node";
  if (nodeId.startsWith("output-")) return "Output Channel";
  return "Node";
}

// ─── Component ────────────────────────────────────────────────────────────────

interface NodeDetailPanelProps {
  nodeId: string;
  spec: AgentSpecification;
  onSave: (patch: Partial<AgentSpecification>) => void;
  onClose: () => void;
  isSaving: boolean;
}

export function NodeDetailPanel({
  nodeId,
  spec,
  onSave,
  onClose,
  isSaving,
}: NodeDetailPanelProps) {
  const label = getNodeTypeLabel(nodeId);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: 320,
        height: "100%",
        background: "var(--bg-elevated)",
        borderLeft: "1px solid var(--bg-border)",
        display: "flex",
        flexDirection: "column",
        zIndex: 10,
        boxShadow: "-4px 0 16px rgba(0,0,0,0.4)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 14px",
          borderBottom: "1px solid var(--bg-border)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {label}
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
            padding: "0 2px",
          }}
        >
          ×
        </button>
      </div>

      {/* Body — scrollable form */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 14px",
        }}
      >
        <NodeForm nodeId={nodeId} spec={spec} onSave={onSave} onClose={onClose} isSaving={isSaving} />
      </div>
    </div>
  );
}

// ─── Form dispatcher ──────────────────────────────────────────────────────────

function NodeForm({
  nodeId,
  spec,
  onSave,
  onClose,
  isSaving,
}: NodeDetailPanelProps) {
  if (nodeId.startsWith("agent-")) {
    return <AgentForm spec={spec} onSave={onSave} onClose={onClose} isSaving={isSaving} />;
  }
  if (nodeId.startsWith("input-")) {
    const i = parseInt(nodeId.split("-")[1], 10);
    return <InputChannelForm spec={spec} index={i} onSave={onSave} onClose={onClose} isSaving={isSaving} />;
  }
  if (nodeId === "prompt-system") {
    return <SystemPromptForm spec={spec} onSave={onSave} onClose={onClose} isSaving={isSaving} />;
  }
  if (nodeId.startsWith("prompt-dynamic-")) {
    const i = parseInt(nodeId.split("prompt-dynamic-")[1], 10);
    return <DynamicContextForm spec={spec} index={i} onSave={onSave} onClose={onClose} isSaving={isSaving} />;
  }
  if (nodeId === "prompt-fewshot") {
    return <FewShotForm spec={spec} onSave={onSave} onClose={onClose} isSaving={isSaving} />;
  }
  if (nodeId.startsWith("prompt-guardrail-")) {
    const i = parseInt(nodeId.split("prompt-guardrail-")[1], 10);
    return <GuardrailForm spec={spec} index={i} onSave={onSave} onClose={onClose} isSaving={isSaving} />;
  }
  if (nodeId.startsWith("tool-")) {
    const parts = nodeId.split("-");
    if (parts.length === 2) {
      const ti = parseInt(parts[1], 10);
      return <ToolForm spec={spec} toolIndex={ti} onSave={onSave} onClose={onClose} isSaving={isSaving} />;
    }
  }
  if (nodeId.startsWith("system-")) {
    const parts = nodeId.split("-");
    const ti = parseInt(parts[1], 10);
    const si = parseInt(parts[2], 10);
    return <SystemNodeForm spec={spec} toolIndex={ti} sysIndex={si} onSave={onSave} onClose={onClose} isSaving={isSaving} />;
  }
  if (nodeId.startsWith("output-")) {
    const i = parseInt(nodeId.split("-")[1], 10);
    return <OutputChannelForm spec={spec} index={i} onSave={onSave} onClose={onClose} isSaving={isSaving} />;
  }
  return (
    <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-muted)" }}>
      No editable fields for this node.
    </p>
  );
}

// ─── Save footer ──────────────────────────────────────────────────────────────

function SaveFooter({
  onSave,
  onClose,
  isSaving,
}: {
  onSave: () => void;
  onClose: () => void;
  isSaving: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        marginTop: 16,
        paddingTop: 14,
        borderTop: "1px solid var(--bg-border)",
      }}
    >
      <button
        onClick={onSave}
        disabled={isSaving}
        style={{
          flex: 1,
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          fontWeight: 600,
          padding: "7px 0",
          background: isSaving ? "var(--bg-border)" : "var(--accent-primary)",
          color: isSaving ? "var(--text-muted)" : "white",
          border: "none",
          borderRadius: 4,
          cursor: isSaving ? "default" : "pointer",
        }}
      >
        {isSaving ? "Saving…" : "Save"}
      </button>
      <button
        onClick={onClose}
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          padding: "7px 14px",
          background: "none",
          color: "var(--text-secondary)",
          border: "1px solid var(--bg-border)",
          borderRadius: 4,
          cursor: "pointer",
        }}
      >
        Cancel
      </button>
    </div>
  );
}

// ─── Agent form ───────────────────────────────────────────────────────────────

function AgentForm({
  spec,
  onSave,
  onClose,
  isSaving,
}: Omit<NodeDetailPanelProps, "nodeId">) {
  const [name, setName] = useState(spec.name ?? "");
  const [purpose, setPurpose] = useState(spec.purpose ?? "");
  const [model, setModel] = useState(spec.model ?? "");
  const [autonomy, setAutonomy] = useState(spec.autonomy_level ?? "full_delegation");

  useEffect(() => {
    setName(spec.name ?? "");
    setPurpose(spec.purpose ?? "");
    setModel(spec.model ?? "");
    setAutonomy(spec.autonomy_level ?? "full_delegation");
  }, [spec.id]);

  const handleSave = () => {
    onSave({ name: name.trim() || spec.name, purpose, model, autonomy_level: autonomy as AutonomyLevel });
    onClose();
  };

  return (
    <>
      <Field label="Name">
        <TextInput value={name} onChange={setName} placeholder="Agent name" />
      </Field>
      <Field label="Purpose">
        <TextArea value={purpose} onChange={setPurpose} placeholder="One-sentence purpose" />
      </Field>
      <Field label="Model">
        <TextInput value={model} onChange={setModel} placeholder="e.g. claude-sonnet-4-6" />
      </Field>
      <Field label="Autonomy Level">
        <Select
          value={autonomy}
          onChange={(v) => setAutonomy(v as AutonomyLevel)}
          options={[
            { value: "full_delegation", label: "Full Delegation" },
            { value: "supervised_execution", label: "Supervised Execution" },
            { value: "assisted_mode", label: "Assisted Mode" },
          ]}
        />
      </Field>
      <SaveFooter onSave={handleSave} onClose={onClose} isSaving={isSaving} />
    </>
  );
}

// ─── Input channel form ───────────────────────────────────────────────────────

function InputChannelForm({
  spec,
  index,
  onSave,
  onClose,
  isSaving,
}: Omit<NodeDetailPanelProps, "nodeId"> & { index: number }) {
  const ch = spec.input_channels?.[index];
  const [name, setName] = useState(ch?.name ?? "");
  const [type, setType] = useState(ch?.type ?? "voice");
  const [description, setDescription] = useState(ch?.description ?? "");
  const [tokens, setTokens] = useState(ch?.estimated_tokens_per_call ?? 0);

  useEffect(() => {
    const c = spec.input_channels?.[index];
    setName(c?.name ?? "");
    setType(c?.type ?? "voice");
    setDescription(c?.description ?? "");
    setTokens(c?.estimated_tokens_per_call ?? 0);
  }, [spec.id, index]);

  if (!ch) return <NotFound label="Input channel" />;

  const handleSave = () => {
    const updated = [...(spec.input_channels ?? [])];
    updated[index] = { ...updated[index], name, type: type as InputChannelType, description, estimated_tokens_per_call: tokens };
    onSave({ input_channels: updated });
    onClose();
  };

  return (
    <>
      <Field label="Name">
        <TextInput value={name} onChange={setName} />
      </Field>
      <Field label="Type">
        <Select
          value={type}
          onChange={(v) => setType(v as InputChannelType)}
          options={[
            { value: "voice", label: "Voice" },
            { value: "form", label: "Form" },
            { value: "system_event", label: "System Event" },
            { value: "agent_handoff", label: "Agent Handoff" },
          ]}
        />
      </Field>
      <Field label="Description">
        <TextArea value={description} onChange={setDescription} placeholder="What this channel carries" />
      </Field>
      <Field label="Est. Tokens / Call">
        <NumberInput value={tokens} onChange={setTokens} min={0} />
      </Field>
      <SaveFooter onSave={handleSave} onClose={onClose} isSaving={isSaving} />
    </>
  );
}

// ─── System prompt form ───────────────────────────────────────────────────────

function SystemPromptForm({
  spec,
  onSave,
  onClose,
  isSaving,
}: Omit<NodeDetailPanelProps, "nodeId">) {
  const sp = spec.prompt_requirements?.system_prompt;
  const [description, setDescription] = useState(sp?.description ?? "");
  const [tokens, setTokens] = useState(sp?.estimated_tokens ?? 0);
  const [cache, setCache] = useState(sp?.cache_hit_pct ?? 95);
  const [effort, setEffort] = useState(sp?.engineering_effort ?? "");

  useEffect(() => {
    const s = spec.prompt_requirements?.system_prompt;
    setDescription(s?.description ?? "");
    setTokens(s?.estimated_tokens ?? 0);
    setCache(s?.cache_hit_pct ?? 95);
    setEffort(s?.engineering_effort ?? "");
  }, [spec.id]);

  const handleSave = () => {
    onSave({
      prompt_requirements: {
        ...spec.prompt_requirements,
        system_prompt: { description, estimated_tokens: tokens, cache_hit_pct: cache, engineering_effort: effort || undefined },
      },
    });
    onClose();
  };

  return (
    <>
      <Field label="Description">
        <TextArea value={description} onChange={setDescription} placeholder="What the system prompt instructs" />
      </Field>
      <Field label="Est. Tokens">
        <NumberInput value={tokens} onChange={setTokens} min={0} />
      </Field>
      <Field label="Cache Hit %">
        <NumberInput value={cache} onChange={(v) => setCache(Math.min(100, Math.max(0, v)))} min={0} max={100} />
      </Field>
      <Field label="Engineering Effort">
        <TextInput value={effort} onChange={setEffort} placeholder="e.g. 3d" />
      </Field>
      <SaveFooter onSave={handleSave} onClose={onClose} isSaving={isSaving} />
    </>
  );
}

// ─── Dynamic context form ─────────────────────────────────────────────────────

function DynamicContextForm({
  spec,
  index,
  onSave,
  onClose,
  isSaving,
}: Omit<NodeDetailPanelProps, "nodeId"> & { index: number }) {
  const dc = spec.prompt_requirements?.dynamic_context?.[index];
  const [name, setName] = useState(dc?.name ?? "");
  const [source, setSource] = useState(dc?.source ?? "");
  const [tokens, setTokens] = useState(dc?.estimated_tokens_per_call ?? 0);
  const [cache, setCache] = useState(dc?.cache_hit_pct ?? 15);
  const [freq, setFreq] = useState(dc?.fetch_frequency ?? "");

  useEffect(() => {
    const d = spec.prompt_requirements?.dynamic_context?.[index];
    setName(d?.name ?? "");
    setSource(d?.source ?? "");
    setTokens(d?.estimated_tokens_per_call ?? 0);
    setCache(d?.cache_hit_pct ?? 15);
    setFreq(d?.fetch_frequency ?? "");
  }, [spec.id, index]);

  if (!dc) return <NotFound label="Dynamic context" />;

  const handleSave = () => {
    const updated = [...(spec.prompt_requirements?.dynamic_context ?? [])];
    updated[index] = { ...updated[index], name, source, estimated_tokens_per_call: tokens, cache_hit_pct: cache, fetch_frequency: freq || undefined };
    onSave({ prompt_requirements: { ...spec.prompt_requirements, dynamic_context: updated } });
    onClose();
  };

  return (
    <>
      <Field label="Name">
        <TextInput value={name} onChange={setName} placeholder="e.g. Customer Data" />
      </Field>
      <Field label="Source">
        <TextInput value={source} onChange={setSource} placeholder="e.g. CRM system" />
      </Field>
      <Field label="Est. Tokens / Call">
        <NumberInput value={tokens} onChange={setTokens} min={0} />
      </Field>
      <Field label="Cache Hit %">
        <NumberInput value={cache} onChange={(v) => setCache(Math.min(100, Math.max(0, v)))} min={0} max={100} />
      </Field>
      <Field label="Fetch Frequency">
        <TextInput value={freq} onChange={setFreq} placeholder="e.g. per_call" />
      </Field>
      <SaveFooter onSave={handleSave} onClose={onClose} isSaving={isSaving} />
    </>
  );
}

// ─── Few-shot examples form ───────────────────────────────────────────────────

function FewShotForm({
  spec,
  onSave,
  onClose,
  isSaving,
}: Omit<NodeDetailPanelProps, "nodeId">) {
  const fs = spec.prompt_requirements?.few_shot_examples;
  const [description, setDescription] = useState(fs?.description ?? "");
  const [tokens, setTokens] = useState(fs?.estimated_tokens ?? 0);
  const [cache, setCache] = useState(fs?.cache_hit_pct ?? 90);
  const [freq, setFreq] = useState(fs?.update_frequency ?? "");

  useEffect(() => {
    const f = spec.prompt_requirements?.few_shot_examples;
    setDescription(f?.description ?? "");
    setTokens(f?.estimated_tokens ?? 0);
    setCache(f?.cache_hit_pct ?? 90);
    setFreq(f?.update_frequency ?? "");
  }, [spec.id]);

  const handleSave = () => {
    onSave({
      prompt_requirements: {
        ...spec.prompt_requirements,
        few_shot_examples: { description, estimated_tokens: tokens, cache_hit_pct: cache, update_frequency: freq || undefined },
      },
    });
    onClose();
  };

  return (
    <>
      <Field label="Description">
        <TextArea value={description} onChange={setDescription} placeholder="What examples cover" />
      </Field>
      <Field label="Est. Tokens">
        <NumberInput value={tokens} onChange={setTokens} min={0} />
      </Field>
      <Field label="Cache Hit %">
        <NumberInput value={cache} onChange={(v) => setCache(Math.min(100, Math.max(0, v)))} min={0} max={100} />
      </Field>
      <Field label="Update Frequency">
        <TextInput value={freq} onChange={setFreq} placeholder="e.g. monthly" />
      </Field>
      <SaveFooter onSave={handleSave} onClose={onClose} isSaving={isSaving} />
    </>
  );
}

// ─── Guardrail form ───────────────────────────────────────────────────────────

function GuardrailForm({
  spec,
  index,
  onSave,
  onClose,
  isSaving,
}: Omit<NodeDetailPanelProps, "nodeId"> & { index: number }) {
  const g = spec.prompt_requirements?.guardrails?.[index];
  const [description, setDescription] = useState(g?.description ?? "");
  const [type, setType] = useState(g?.type ?? "safety");
  const [tokens, setTokens] = useState(g?.estimated_tokens ?? 0);
  const [cache, setCache] = useState(g?.cache_hit_pct ?? 95);

  useEffect(() => {
    const gr = spec.prompt_requirements?.guardrails?.[index];
    setDescription(gr?.description ?? "");
    setType(gr?.type ?? "safety");
    setTokens(gr?.estimated_tokens ?? 0);
    setCache(gr?.cache_hit_pct ?? 95);
  }, [spec.id, index]);

  if (!g) return <NotFound label="Guardrail" />;

  const handleSave = () => {
    const updated = [...(spec.prompt_requirements?.guardrails ?? [])];
    updated[index] = { description, type: type as "safety" | "compliance" | "scope", estimated_tokens: tokens, cache_hit_pct: cache };
    onSave({ prompt_requirements: { ...spec.prompt_requirements, guardrails: updated } });
    onClose();
  };

  return (
    <>
      <Field label="Description">
        <TextArea value={description} onChange={setDescription} placeholder="What this guardrail enforces" />
      </Field>
      <Field label="Type">
        <Select
          value={type}
          onChange={(v) => setType(v as "safety" | "compliance" | "scope")}
          options={[
            { value: "safety", label: "Safety" },
            { value: "compliance", label: "Compliance" },
            { value: "scope", label: "Scope" },
          ]}
        />
      </Field>
      <Field label="Est. Tokens">
        <NumberInput value={tokens} onChange={setTokens} min={0} />
      </Field>
      <Field label="Cache Hit %">
        <NumberInput value={cache} onChange={(v) => setCache(Math.min(100, Math.max(0, v)))} min={0} max={100} />
      </Field>
      <SaveFooter onSave={handleSave} onClose={onClose} isSaving={isSaving} />
    </>
  );
}

// ─── Tool / MCP form ──────────────────────────────────────────────────────────

function ToolForm({
  spec,
  toolIndex,
  onSave,
  onClose,
  isSaving,
}: Omit<NodeDetailPanelProps, "nodeId"> & { toolIndex: number }) {
  const tool = spec.tool_stack?.[toolIndex];
  const [name, setName] = useState(tool?.name ?? "");
  const [type, setType] = useState(tool?.type ?? "mcp_server");
  const [status, setStatus] = useState(tool?.status ?? "new");
  const [buildEffort, setBuildEffort] = useState(tool?.build_effort ?? "");
  const [inputTok, setInputTok] = useState(tool?.input_tokens_per_call ?? 0);
  const [outputTok, setOutputTok] = useState(tool?.output_tokens_per_call ?? 0);
  const [cacheHit, setCacheHit] = useState(tool?.output_cache_hit_pct ?? 0);
  const [systems, setSystems] = useState<ConnectedSystem[]>(tool?.connected_systems ?? []);

  useEffect(() => {
    const t = spec.tool_stack?.[toolIndex];
    setName(t?.name ?? "");
    setType(t?.type ?? "mcp_server");
    setStatus(t?.status ?? "new");
    setBuildEffort(t?.build_effort ?? "");
    setInputTok(t?.input_tokens_per_call ?? 0);
    setOutputTok(t?.output_tokens_per_call ?? 0);
    setCacheHit(t?.output_cache_hit_pct ?? 0);
    setSystems(t?.connected_systems ?? []);
  }, [spec.id, toolIndex]);

  if (!tool) return <NotFound label="Tool" />;

  const handleSave = () => {
    const updated = [...(spec.tool_stack ?? [])];
    updated[toolIndex] = {
      ...updated[toolIndex],
      name,
      type: type as ToolType,
      status: status as ToolStatus,
      build_effort: buildEffort || undefined,
      input_tokens_per_call: inputTok,
      output_tokens_per_call: outputTok,
      output_cache_hit_pct: cacheHit,
      connected_systems: systems,
    };
    onSave({ tool_stack: updated });
    onClose();
  };

  const addSystem = () =>
    setSystems((prev) => [
      ...prev,
      { name: "New System", node_prefix: "S", type: "system", status: "existing" },
    ]);

  const updateSystem = (si: number, patch: Partial<ConnectedSystem>) =>
    setSystems((prev) => prev.map((s, idx) => (idx === si ? { ...s, ...patch } : s)));

  const removeSystem = (si: number) =>
    setSystems((prev) => prev.filter((_, idx) => idx !== si));

  return (
    <>
      <Field label="Name">
        <TextInput value={name} onChange={setName} />
      </Field>
      <Field label="Type">
        <Select
          value={type}
          onChange={(v) => setType(v as ToolType)}
          options={[
            { value: "mcp_server", label: "MCP Server" },
            { value: "knowledge_base", label: "Knowledge Base" },
          ]}
        />
      </Field>
      <Field label="Build Status">
        <Select
          value={status}
          onChange={(v) => setStatus(v as ToolStatus)}
          options={[
            { value: "existing", label: "Existing" },
            { value: "new", label: "New" },
            { value: "pending", label: "Pending" },
            { value: "blocked", label: "Blocked" },
          ]}
        />
      </Field>
      <Field label="Build Effort">
        <TextInput value={buildEffort} onChange={setBuildEffort} placeholder="e.g. 2w" />
      </Field>
      <Field label="Input Tokens / Call">
        <NumberInput value={inputTok} onChange={setInputTok} min={0} />
      </Field>
      <Field label="Output Tokens / Call">
        <NumberInput value={outputTok} onChange={setOutputTok} min={0} />
      </Field>
      <Field label="Output Cache Hit %">
        <NumberInput value={cacheHit} onChange={(v) => setCacheHit(Math.min(100, Math.max(0, v)))} min={0} max={100} />
      </Field>

      {/* Connected systems */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={LABEL}>Connected Systems</span>
          <button
            onClick={addSystem}
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10,
              background: "none",
              border: "1px solid var(--bg-border)",
              borderRadius: 3,
              padding: "2px 7px",
              color: "var(--accent-primary)",
              cursor: "pointer",
            }}
          >
            + Add
          </button>
        </div>
        {systems.length === 0 && (
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--text-muted)", marginBottom: 0 }}>
            No connected systems.
          </p>
        )}
        {systems.map((sys, si) => (
          <SystemEditRow
            key={si}
            system={sys}
            onChange={(patch) => updateSystem(si, patch)}
            onRemove={() => removeSystem(si)}
          />
        ))}
      </div>

      <SaveFooter onSave={handleSave} onClose={onClose} isSaving={isSaving} />
    </>
  );
}

function SystemEditRow({
  system,
  onChange,
  onRemove,
}: {
  system: ConnectedSystem;
  onChange: (patch: Partial<ConnectedSystem>) => void;
  onRemove: () => void;
}) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--bg-border)",
        borderRadius: 4,
        padding: "8px 10px",
        marginBottom: 6,
      }}
    >
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <input
          type="text"
          value={system.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="System name"
          style={{ ...INPUT, flex: 1, fontSize: 11 }}
        />
        <button
          onClick={onRemove}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontSize: 14,
            lineHeight: 1,
            padding: "0 2px",
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          type="text"
          value={system.type}
          onChange={(e) => onChange({ type: e.target.value })}
          placeholder="Type (system/db)"
          style={{ ...INPUT, flex: 1, fontSize: 10 }}
        />
        <select
          value={system.status}
          onChange={(e) => onChange({ status: e.target.value as ToolStatus })}
          style={{ ...SELECT, flex: 1, fontSize: 10 }}
        >
          <option value="existing">Existing</option>
          <option value="new">New</option>
          <option value="pending">Pending</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>
    </div>
  );
}

// ─── System node form ─────────────────────────────────────────────────────────

function SystemNodeForm({
  spec,
  toolIndex,
  sysIndex,
  onSave,
  onClose,
  isSaving,
}: Omit<NodeDetailPanelProps, "nodeId"> & { toolIndex: number; sysIndex: number }) {
  const sys = spec.tool_stack?.[toolIndex]?.connected_systems?.[sysIndex];
  const [name, setName] = useState(sys?.name ?? "");
  const [type, setType] = useState(sys?.type ?? "system");
  const [nodePrefix, setNodePrefix] = useState(sys?.node_prefix ?? "S");
  const [status, setStatus] = useState(sys?.status ?? "existing");

  useEffect(() => {
    const s = spec.tool_stack?.[toolIndex]?.connected_systems?.[sysIndex];
    setName(s?.name ?? "");
    setType(s?.type ?? "system");
    setNodePrefix(s?.node_prefix ?? "S");
    setStatus(s?.status ?? "existing");
  }, [spec.id, toolIndex, sysIndex]);

  if (!sys) return <NotFound label="System node" />;

  const handleSave = () => {
    const tools = [...(spec.tool_stack ?? [])];
    const tool = { ...tools[toolIndex] };
    const sysList = [...(tool.connected_systems ?? [])];
    sysList[sysIndex] = { ...sysList[sysIndex], name, type, node_prefix: nodePrefix, status: status as ToolStatus };
    tool.connected_systems = sysList;
    tools[toolIndex] = tool;
    onSave({ tool_stack: tools });
    onClose();
  };

  return (
    <>
      <Field label="Name">
        <TextInput value={name} onChange={setName} />
      </Field>
      <Field label="Node Prefix">
        <TextInput value={nodePrefix} onChange={setNodePrefix} placeholder="S, KB" />
      </Field>
      <Field label="Type">
        <TextInput value={type} onChange={setType} placeholder="system, database, kb" />
      </Field>
      <Field label="Status">
        <Select
          value={status}
          onChange={(v) => setStatus(v as ToolStatus)}
          options={[
            { value: "existing", label: "Existing" },
            { value: "new", label: "New" },
            { value: "pending", label: "Pending" },
            { value: "blocked", label: "Blocked" },
          ]}
        />
      </Field>
      <SaveFooter onSave={handleSave} onClose={onClose} isSaving={isSaving} />
    </>
  );
}

// ─── Output channel form ──────────────────────────────────────────────────────

function OutputChannelForm({
  spec,
  index,
  onSave,
  onClose,
  isSaving,
}: Omit<NodeDetailPanelProps, "nodeId"> & { index: number }) {
  const ch = spec.output_channels?.[index];
  const [name, setName] = useState(ch?.name ?? "");
  const [type, setType] = useState(ch?.type ?? "system_write");
  const [destination, setDestination] = useState(ch?.destination ?? "");
  const [format, setFormat] = useState(ch?.format ?? "");
  const [tokens, setTokens] = useState(ch?.estimated_tokens ?? 0);
  const [latency, setLatency] = useState<string>(
    ch?.latency_requirement_ms != null ? String(ch.latency_requirement_ms) : ""
  );

  useEffect(() => {
    const c = spec.output_channels?.[index];
    setName(c?.name ?? "");
    setType(c?.type ?? "system_write");
    setDestination(c?.destination ?? "");
    setFormat(c?.format ?? "");
    setTokens(c?.estimated_tokens ?? 0);
    setLatency(c?.latency_requirement_ms != null ? String(c.latency_requirement_ms) : "");
  }, [spec.id, index]);

  if (!ch) return <NotFound label="Output channel" />;

  const handleSave = () => {
    const updated = [...(spec.output_channels ?? [])];
    updated[index] = {
      ...updated[index],
      name,
      type: type as OutputChannelType,
      destination: destination || undefined,
      format: format || undefined,
      estimated_tokens: tokens,
      latency_requirement_ms: latency !== "" ? Number(latency) : null,
    };
    onSave({ output_channels: updated });
    onClose();
  };

  return (
    <>
      <Field label="Name">
        <TextInput value={name} onChange={setName} />
      </Field>
      <Field label="Type">
        <Select
          value={type}
          onChange={(v) => setType(v as OutputChannelType)}
          options={[
            { value: "system_write", label: "System Write" },
            { value: "text_response", label: "Text Response" },
            { value: "agent_handoff", label: "Agent Handoff" },
            { value: "audit_log", label: "Audit Log" },
          ]}
        />
      </Field>
      <Field label="Destination">
        <TextInput value={destination} onChange={setDestination} placeholder="e.g. System of Record" />
      </Field>
      <Field label="Format">
        <TextInput value={format} onChange={setFormat} placeholder="e.g. Structured JSON" />
      </Field>
      <Field label="Est. Tokens">
        <NumberInput value={tokens} onChange={setTokens} min={0} />
      </Field>
      <Field label="Latency Requirement (ms)">
        <input
          type="number"
          value={latency}
          onChange={(e) => setLatency(e.target.value)}
          placeholder="Leave blank if none"
          min={0}
          style={INPUT}
        />
      </Field>
      <SaveFooter onSave={handleSave} onClose={onClose} isSaving={isSaving} />
    </>
  );
}

// ─── Fallback ─────────────────────────────────────────────────────────────────

function NotFound({ label }: { label: string }) {
  return (
    <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text-muted)" }}>
      {label} not found in spec.
    </p>
  );
}
