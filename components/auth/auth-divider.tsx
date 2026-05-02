export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="relative flex items-center" aria-hidden="true">
      <div className="border-border/70 flex-1 border-t" />
      <span className="text-muted-foreground eyebrow px-4">{label}</span>
      <div className="border-border/70 flex-1 border-t" />
    </div>
  )
}
