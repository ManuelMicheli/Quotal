export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="relative flex items-center" aria-hidden="true">
      <div className="flex-1 border-t border-white/[0.08]" />
      <span className="px-4 text-xs uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      <div className="flex-1 border-t border-white/[0.08]" />
    </div>
  )
}
