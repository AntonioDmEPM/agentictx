import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { engagementsApi } from "@/api/engagements";
import type { EngagementCreate } from "@/types";

interface Props {
  onSuccess: () => void;
}

export function CreateEngagementForm({ onSuccess }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<EngagementCreate>({
    client_name: "",
    industry: "",
    engagement_type: "",
  });

  const mutation = useMutation({
    mutationFn: engagementsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["engagements"] });
      onSuccess();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: EngagementCreate = { client_name: form.client_name };
    if (form.industry) payload.industry = form.industry;
    if (form.engagement_type) payload.engagement_type = form.engagement_type;
    mutation.mutate(payload);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-text-secondary font-ui">
          Client Name <span className="text-accent-warm">*</span>
        </label>
        <input
          className="input"
          placeholder="e.g. Acme Insurance"
          value={form.client_name}
          onChange={(e) => setForm({ ...form, client_name: e.target.value })}
          required
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-text-secondary font-ui">Industry</label>
        <input
          className="input"
          placeholder="e.g. Financial Services"
          value={form.industry}
          onChange={(e) => setForm({ ...form, industry: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-text-secondary font-ui">
          Engagement Type
        </label>
        <input
          className="input"
          placeholder="e.g. Agentic Assessment"
          value={form.engagement_type}
          onChange={(e) => setForm({ ...form, engagement_type: e.target.value })}
        />
      </div>

      {mutation.error && (
        <p className="text-xs text-accent-warm">
          {(mutation.error as Error).message}
        </p>
      )}

      <div className="flex justify-end gap-3 mt-2">
        <button
          type="button"
          className="btn-ghost"
          onClick={() => onSuccess()}
          disabled={mutation.isPending}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={mutation.isPending || !form.client_name.trim()}
        >
          {mutation.isPending ? "Creating…" : "Create Engagement"}
        </button>
      </div>
    </form>
  );
}
