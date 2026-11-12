import { supabaseServerClient } from "../../lib/supabaseServerClient";
import { PerformanceDashboard, type ProbeResult } from "./PerformanceDashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function probeUrl(name: string, url: string | undefined): Promise<ProbeResult> {
  if (!url) return { name, status: "unconfigured", latencyMs: null, detail: "URL nicht konfiguriert" };
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    // Follow normal login/locale redirects and evaluate the final response.
    const response = await fetch(url, { method: "GET", cache: "no-store", signal: controller.signal });
    const latencyMs = Date.now() - started;
    return { name, status: response.ok ? "ok" : response.status >= 500 ? "error" : "warning", latencyMs, detail: `HTTP ${response.status}` };
  } catch (error) {
    return { name, status: "error", latencyMs: Date.now() - started, detail: error instanceof Error && error.name === "AbortError" ? "Zeitüberschreitung nach 5 Sekunden" : "Verbindung fehlgeschlagen" };
  } finally {
    clearTimeout(timeout);
  }
}

export default async function PerformancePage() {
  const supabase = supabaseServerClient();
  const dbStarted = Date.now();
  const { error: dbError } = await supabase.from("schools").select("id", { head: true, count: "exact" });
  const probes: ProbeResult[] = [{
    name: "Supabase / Datenbank",
    status: dbError ? "error" : "ok",
    latencyMs: Date.now() - dbStarted,
    detail: dbError ? "Datenbankabfrage fehlgeschlagen" : "Lesende Testabfrage erfolgreich",
  }];

  const [player, teacher, editorial] = await Promise.all([
    probeUrl("Player-App", process.env.DR1FT_PLAYER_URL),
    probeUrl("Teacher-App", process.env.DR1FT_TEACHER_URL),
    probeUrl("Editorial-App", process.env.DR1FT_EDITORIAL_URL),
  ]);
  probes.push(player, teacher, editorial);

  return <PerformanceDashboard probes={probes} checkedAt={new Date().toISOString()} />;
}
