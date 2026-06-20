export function EditorCanvasSkeleton() {
  return (
    <div className="flex-1 flex flex-col bg-surface-container-lowest overflow-hidden animate-pulse">
      <div className="h-14 bg-white/80 border-b border-outline-variant shrink-0" />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 p-8 flex items-center justify-center">
          <div className="w-full max-w-4xl aspect-[16/10] rounded-lg border border-outline-variant bg-surface-container-low">
            <div className="h-full w-full opacity-40 bg-[linear-gradient(#e2e8f0_1px,transparent_1px),linear-gradient(90deg,#e2e8f0_1px,transparent_1px)] bg-[size:40px_40px]" />
          </div>
        </div>
        <aside className="w-[320px] border-l border-outline-variant bg-surface p-8 shrink-0 space-y-4">
          <div className="h-4 w-24 bg-surface-container-high rounded" />
          <div className="h-3 w-full bg-surface-container-high rounded" />
          <div className="h-3 w-3/4 bg-surface-container-high rounded" />
          <div className="h-10 w-full bg-surface-container-high rounded mt-6" />
          <div className="h-10 w-full bg-surface-container-high rounded" />
        </aside>
      </div>
    </div>
  );
}
