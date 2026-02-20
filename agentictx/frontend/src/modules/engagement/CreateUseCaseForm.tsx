import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useCasesApi } from "@/api/engagements";
import type { UseCaseCreate } from "@/types";

interface Props {
  engagementId: string;
  onSuccess: () => void;
}

export function CreateUseCaseForm({ engagementId, onSuccess }: Props) {
  const [form, setForm] = useState<UseCaseCreate>({ name: "", description: "" });

  const mutation = useMutation({
    mutationFn: (payload: UseCaseCreate) =>
      useCasesApi.create(engagementId, payload),
    onSuccess,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: UseCaseCreate = { name: form.name };
    if (form.description) payload.description = form.description;
    mutation.mutate(payload);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-text-secondary font-ui">
          Use Case Name <span className="text-accent-warm">*</span>
        </label>
        <input
          className="input"
          placeholder="e.g. Claims Intake & Triage"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-text-secondary font-ui">
          Description
        </label>
        <textarea
          className="input resize-none"
          rows={3}
          placeholder="Brief description of the process being evaluated…"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
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
          onClick={onSuccess}
          disabled={mutation.isPending}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={mutation.isPending || !form.name.trim()}
        >
          {mutation.isPending ? "Adding…" : "Add Use Case"}
        </button>
      </div>
    </form>
  );
}
