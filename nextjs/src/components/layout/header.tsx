interface HeaderProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
  children?: React.ReactNode;
}

export function Header({ title, description, icon: Icon, children }: HeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-4 md:px-6">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="rounded-lg bg-accent p-2">
            <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
