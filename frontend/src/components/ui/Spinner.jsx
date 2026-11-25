export function Spinner({ text = 'Cargando...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-secondary" />
      <p className="mt-3 text-sm font-medium">{text}</p>
    </div>
  );
}