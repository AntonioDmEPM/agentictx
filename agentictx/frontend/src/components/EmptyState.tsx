interface Props {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 mb-6 rounded-md bg-bg-elevated border border-bg-border flex items-center justify-center">
        <span className="text-text-muted text-xl">◈</span>
      </div>
      <h3 className="text-base font-medium text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-secondary max-w-xs mb-6">{description}</p>
      {action}
    </div>
  );
}
