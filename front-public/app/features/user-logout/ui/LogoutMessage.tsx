export function LogoutMessage() {
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white/80 p-6 text-center text-sm text-slate-600 shadow-sm">
      <h1 className="text-lg font-semibold text-slate-900">Signing you out</h1>
      <p>
        We are ending your session and redirecting you to the home page. If nothing happens, refresh the page or close
        the tab for security.
      </p>
    </div>
  );
}
