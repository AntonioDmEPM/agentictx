import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { businessCaseApi } from "@/api/business_case";
import type { BusinessCase, BusinessCaseScenario, ScenarioCreate, ScenarioUpdate } from "@/types/business_case";

interface Props {
  useCaseId: string;
  bc: BusinessCase;
}

function PriceField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [local, setLocal] = useState(String(value));

  const commit = () => {
    const parsed = parseFloat(local);
    if (!isNaN(parsed)) onChange(parsed);
    else setLocal(String(value));
  };

  return (
    <div className="mb-2">
      <label className="block text-xs text-text-muted font-ui mb-0.5">{label}</label>
      <div className="flex items-center gap-1">
        <span className="text-text-muted text-xs font-ui">$</span>
        <input
          type="number"
          value={local}
          step={0.0001}
          min={0}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          className="w-full bg-bg-primary border border-bg-border text-text-primary text-sm px-2 py-1 font-ui focus:outline-none focus:border-accent-primary"
          style={{ borderColor: "var(--bg-border)" }}
        />
      </div>
    </div>
  );
}

function ScenarioCard({
  scenario,
  bc,
  useCaseId,
  onDelete,
}: {
  scenario: BusinessCaseScenario;
  bc: BusinessCase;
  useCaseId: string;
  onDelete: () => void;
}) {
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const updateMut = useMutation({
    mutationFn: (payload: ScenarioUpdate) =>
      businessCaseApi.updateScenario(useCaseId, scenario.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-case", useCaseId] });
    },
  });

  const patch = (payload: ScenarioUpdate) => updateMut.mutate(payload);

  const useVoice = bc.has_voice && !bc.has_realtime_audio;
  const useRealtimeAudio = bc.has_realtime_audio;
  const hasIvr = !!bc.ivr_service;
  const hasImage = bc.has_image_processing;

  return (
    <div
      className="border p-3 mb-3"
      style={{ borderColor: "var(--bg-border)", backgroundColor: "var(--bg-elevated)" }}
    >
      {/* Scenario name */}
      <div className="flex items-center justify-between mb-3">
        <input
          type="text"
          defaultValue={scenario.name}
          onBlur={(e) => {
            if (e.target.value !== scenario.name) {
              patch({ name: e.target.value });
            }
          }}
          className="text-sm font-medium text-text-primary bg-transparent border-b border-bg-border focus:outline-none focus:border-accent-primary flex-1"
          style={{ borderColor: "var(--bg-border)" }}
        />
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-xs text-text-muted hover:text-accent-warm ml-3 font-ui"
          >
            Delete
          </button>
        ) : (
          <div className="flex gap-2 ml-3">
            <button
              onClick={onDelete}
              className="text-xs text-accent-warm font-ui"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-text-muted font-ui"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Pricing fields gated by modality */}
      {useRealtimeAudio ? (
        <>
          <PriceField
            label="Audio Input Tokens (per 1k)"
            value={scenario.llm_input_price_per_1k}
            onChange={(v) => patch({ llm_input_price_per_1k: v })}
          />
          <PriceField
            label="Audio Output Tokens (per 1k)"
            value={scenario.llm_output_price_per_1k}
            onChange={(v) => patch({ llm_output_price_per_1k: v })}
          />
        </>
      ) : (
        <>
          <PriceField
            label="LLM Input (per 1k tokens)"
            value={scenario.llm_input_price_per_1k}
            onChange={(v) => patch({ llm_input_price_per_1k: v })}
          />
          <PriceField
            label="LLM Output (per 1k tokens)"
            value={scenario.llm_output_price_per_1k}
            onChange={(v) => patch({ llm_output_price_per_1k: v })}
          />
          <PriceField
            label="Cached Input (per 1k tokens)"
            value={scenario.cached_input_price_per_1k}
            onChange={(v) => patch({ cached_input_price_per_1k: v })}
          />
        </>
      )}

      {useVoice && (
        <>
          <PriceField
            label="STT (per minute)"
            value={scenario.stt_price_per_minute}
            onChange={(v) => patch({ stt_price_per_minute: v })}
          />
          <PriceField
            label="TTS (per 1k chars)"
            value={scenario.tts_price_per_1k_chars}
            onChange={(v) => patch({ tts_price_per_1k_chars: v })}
          />
        </>
      )}

      {hasIvr && (
        <PriceField
          label="IVR (per minute)"
          value={scenario.ivr_price_per_minute}
          onChange={(v) => patch({ ivr_price_per_minute: v })}
        />
      )}

      {hasImage && (
        <PriceField
          label="Image Processing (per image)"
          value={scenario.image_price_per_image}
          onChange={(v) => patch({ image_price_per_image: v })}
        />
      )}
    </div>
  );
}

export function ScenarioConfigSection({ useCaseId, bc }: Props) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const createMut = useMutation({
    mutationFn: (payload: ScenarioCreate) =>
      businessCaseApi.createScenario(useCaseId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-case", useCaseId] });
      setNewName("");
      setShowAdd(false);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (scenarioId: string) =>
      businessCaseApi.deleteScenario(useCaseId, scenarioId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-case", useCaseId] });
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3 mt-5">
        <h3 className="text-xs font-ui uppercase tracking-widest text-text-muted">
          Scenarios
        </h3>
        <button
          onClick={() => setShowAdd(true)}
          className="text-xs font-ui px-2 py-0.5 border"
          style={{
            borderColor: "var(--accent-primary)",
            color: "var(--accent-primary)",
          }}
        >
          + Add Scenario
        </button>
      </div>

      {showAdd && (
        <div className="mb-3 flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Scenario name (e.g. Preferred)"
            className="flex-1 bg-bg-primary border border-bg-border text-text-primary text-sm px-2 py-1 focus:outline-none focus:border-accent-primary font-ui"
            style={{ borderColor: "var(--bg-border)" }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newName.trim()) {
                createMut.mutate({ name: newName.trim() });
              }
              if (e.key === "Escape") {
                setShowAdd(false);
                setNewName("");
              }
            }}
            autoFocus
          />
          <button
            onClick={() => {
              if (newName.trim()) createMut.mutate({ name: newName.trim() });
            }}
            className="text-xs font-ui px-3 py-1"
            style={{ backgroundColor: "var(--accent-primary)", color: "white" }}
          >
            Create
          </button>
          <button
            onClick={() => { setShowAdd(false); setNewName(""); }}
            className="text-xs font-ui px-2 py-1 text-text-muted"
          >
            Cancel
          </button>
        </div>
      )}

      {bc.scenarios.length === 0 && !showAdd && (
        <p className="text-xs text-text-muted font-ui">
          No scenarios yet. Add one to configure pricing.
        </p>
      )}

      {bc.scenarios.map((s) => (
        <ScenarioCard
          key={s.id}
          scenario={s}
          bc={bc}
          useCaseId={useCaseId}
          onDelete={() => deleteMut.mutate(s.id)}
        />
      ))}
    </div>
  );
}
