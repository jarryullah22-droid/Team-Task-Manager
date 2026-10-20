export default function FullPageLoader({ label = 'Loading...' }) {
  return (
    <div className="flex h-full min-h-screen items-center justify-center bg-slate-100">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
        <span className="text-sm font-medium">{label}</span>
      </div>
    </div>
  );
}
