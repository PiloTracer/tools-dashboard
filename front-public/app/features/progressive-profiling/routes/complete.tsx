import { useNavigate } from "@remix-run/react";

export default function ProfilingComplete() {
  const navigate = useNavigate();
  return (
    <main>
      <h1>All Set!</h1>
      <button type="button" onClick={() => navigate("/dashboard")}>Go to dashboard</button>
    </main>
  );
}
