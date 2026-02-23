import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { businessCaseApi } from "@/api/business_case";
import type { BusinessCase, ModalityUpdate } from "@/types/business_case";

interface Props {
  useCaseId: string;
  bc: BusinessCase;
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between py-2 cursor-pointer">
      <span className="text-sm text-text-secondary">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative w-9 h-5 rounded-full transition-colors focus:outline-none"
        style={{
          backgroundColor: checked ? "var(--accent-primary)" : "var(--bg-border)",
        }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
          style={{ transform: checked ? "translateX(16px)" : "translateX(0)" }}
        />
      </button>
    </label>
  );
}

function ServiceInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="mt-1 mb-2 ml-4">
      <label className="block text-xs text-text-muted mb-1 font-ui">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-bg-primary border border-bg-border text-text-primary text-sm px-2 py-1 focus:outline-none focus:border-accent-primary"
        style={{ borderColor: "var(--bg-border)" }}
      />
    </div>
  );
}

export function ModalityToggleSection({ useCaseId, bc }: Props) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: ModalityUpdate) =>
      businessCaseApi.patchModality(useCaseId, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(["business-case", useCaseId], updated);
    },
  });

  const patch = useCallback(
    (payload: ModalityUpdate) => mutation.mutate(payload),
    [mutation]
  );

  return (
    <div>
      <h3 className="text-xs font-ui uppercase tracking-widest text-text-muted mb-3">
        Modality Profile
      </h3>

      <Toggle
        label="Voice (STT / TTS)"
        checked={bc.has_voice}
        onChange={(v) => patch({ has_voice: v })}
      />
      {bc.has_voice && !bc.has_realtime_audio && (
        <>
          <ServiceInput
            label="STT Service"
            value={bc.stt_service ?? ""}
            onChange={(v) => patch({ stt_service: v || null })}
            placeholder="e.g. Deepgram, Whisper"
          />
          <ServiceInput
            label="TTS Service"
            value={bc.tts_service ?? ""}
            onChange={(v) => patch({ tts_service: v || null })}
            placeholder="e.g. ElevenLabs, Azure TTS"
          />
        </>
      )}

      <Toggle
        label="Realtime Audio API"
        checked={bc.has_realtime_audio}
        onChange={(v) => patch({ has_realtime_audio: v })}
      />

      <Toggle
        label="Image Processing"
        checked={bc.has_image_processing}
        onChange={(v) => patch({ has_image_processing: v })}
      />

      <Toggle
        label="Text Only"
        checked={bc.has_text_only}
        onChange={(v) => patch({ has_text_only: v })}
      />

      <div className="mt-2">
        <ServiceInput
          label="LLM Model"
          value={bc.llm_model ?? ""}
          onChange={(v) => patch({ llm_model: v || null })}
          placeholder="e.g. claude-sonnet-4-6"
        />
        <ServiceInput
          label="IVR Service (if telephony)"
          value={bc.ivr_service ?? ""}
          onChange={(v) => patch({ ivr_service: v || null })}
          placeholder="e.g. Twilio, Genesys"
        />
      </div>
    </div>
  );
}
