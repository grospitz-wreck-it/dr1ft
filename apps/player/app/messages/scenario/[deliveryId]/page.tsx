import { ChevronLeft } from "lucide-react";
import { supabaseServerClient } from "../../../../lib/supabaseServerClient";

interface Props { params: { deliveryId: string } }

export default async function ScenarioMessagePage({ params }: Props) {
  const supabase = supabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <main className="min-h-screen grid place-items-center bg-ink text-ash">Bitte einloggen.</main>;

  const { data: classInstanceId } = await supabase.rpc("get_current_class_instance_id");
  if (!classInstanceId) return <main className="min-h-screen grid place-items-center bg-ink text-ash">Keine aktive Klasseninstanz.</main>;

  const { data: delivery } = await supabase
    .from("scenario_message_deliveries")
    .select("id, content_item_id, delivered_at")
    .eq("id", params.deliveryId)
    .eq("class_instance_id", classInstanceId)
    .not("delivered_at", "is", null)
    .maybeSingle();
  if (!delivery) return <main className="min-h-screen grid place-items-center bg-ink text-ash">Diese Nachricht ist nicht verfügbar.</main>;

  const { data: item } = await supabase
    .from("content_items")
    .select("id, title, body, created_at, creators(display_name, handle)")
    .eq("id", delivery.content_item_id)
    .maybeSingle();
  if (!item) return <main className="min-h-screen grid place-items-center bg-ink text-ash">Der Nachrichteninhalt ist nicht verfügbar.</main>;

  const { error: readError } = await supabase.from("scenario_message_reads").upsert(
    { delivery_id: delivery.id, user_id: user.id, read_at: new Date().toISOString() },
    { onConflict: "delivery_id,user_id" }
  );

  const creator = Array.isArray(item.creators) ? item.creators[0] : item.creators;
  return <main className="min-h-screen bg-ink px-4 py-6 text-paper">
    <article className="mx-auto max-w-2xl overflow-hidden rounded-[28px] border border-white/10 bg-white/[.03] shadow-2xl">
      <header className="border-b border-white/10 px-5 py-5 sm:px-7">
        <a href="/messages" className="mb-5 inline-flex items-center gap-1 text-xs text-ash hover:text-paper"><ChevronLeft className="h-4 w-4" /> Zurück zum Postfach</a>
        <p className="text-[10px] font-bold uppercase tracking-[.22em] text-cyan-200/70">DR1FT · Szenario-Nachricht</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{item.title || "Neue Nachricht"}</h1>
        <p className="mt-2 text-xs text-ash">Von {creator?.display_name || creator?.handle || "einer Szenario-Figur"} · {new Date(delivery.delivered_at).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}</p>
      </header>
      <div className="whitespace-pre-wrap px-5 py-7 text-sm leading-7 sm:px-7 sm:py-9">{item.body || "Diese Nachricht enthält keinen Text."}</div>
      {readError && <p className="border-t border-amber-300/20 bg-amber-300/5 px-5 py-3 text-xs text-amber-100">Der Nachrichteninhalt wurde geöffnet, aber der Gelesen-Status konnte nicht gespeichert werden.</p>}
    </article>
  </main>;
}
