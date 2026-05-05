// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const TZ = "America/Sao_Paulo";

const getLocalParts = (date = new Date()) => {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
};

const parseTimeToMinutes = (hhmm: string) => {
  const [h, m] = (hhmm || "00:00").split(":").map((n) => Number(n || 0));
  return h * 60 + m;
};

const parseMinutes = (hhmm: string) => {
  const [h, m] = (hhmm || "00:00").split(":").map((n) => Number(n || 0));
  return h * 60 + m;
};

const normalizePhone = (value?: string | null) => {
  const raw = (value || "").replace(/\D/g, "");
  if (!raw) return "";
  if (raw.startsWith("55")) {
    return raw.length >= 12 ? raw : "";
  }
  if (raw.length === 10 || raw.length === 11) return "55" + raw;
  return raw.length >= 12 ? raw : "";
};

const getActiveWhatsAppConfig = async (supabase: any) => {
  let instanceName = "";
  try {
    const { data } = await supabase
      .from("site_config")
      .select("config_value")
      .eq("config_key", "whatsapp_active_instance")
      .maybeSingle();
    const cfg = (data?.config_value || {}) as any;
    if (cfg?.instanceName) instanceName = String(cfg.instanceName);
  } catch {}

  if (!instanceName) {
    const fallback = Deno.env.get("EVOLUTION_INSTANCE_NAME") ?? "";
    instanceName = fallback;
  }

  const evolutionApiUrl = (Deno.env.get("EVOLUTION_API_URL") ?? "").replace(/\/$/, "");
  const apiKey = Deno.env.get("EVOLUTION_API_KEY") ?? "";

  if (!instanceName || !evolutionApiUrl || !apiKey) return null;
  return { instanceName, evolutionApiUrl, apiKey };
};

const sendEvolutionMessage = async (
  cfg: { instanceName: string; evolutionApiUrl: string; apiKey: string },
  phone: string,
  text: string,
) => {
  const url = `${cfg.evolutionApiUrl}/message/sendText/${cfg.instanceName}`;
  const number = normalizePhone(phone);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: cfg.apiKey,
    },
    body: JSON.stringify({ number, text, options: { delay: 800, presence: "composing" } }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Evolution API error ${res.status}: ${body}`);
  }
  return await res.json().catch(() => ({}));
};

const LIST_MAX_ITEMS = 20; // se exceder, envia só o resumo

const buildMessageForBarber = (barberName: string, items: any[]) => {
  const lines: string[] = [];
  lines.push(`⏰ *Lembrete diário*`);
  lines.push(`Olá, *${barberName || "Barbeiro"}*!`);

  if (items.length > LIST_MAX_ITEMS) {
    lines.push(
      `Você tem *${items.length}* atendimento(s) que passaram do horário e ainda estão ativos. ` +
      `Conclua ou cancele no sistema para manter sua agenda organizada.`,
    );
    lines.push("");
    lines.push("Obrigado! 💈");
    return lines.join("\n");
  }

  lines.push(
    `Você tem atendimento(s) que passaram do horário e ainda estão ativos. Conclua ou cancele para manter a agenda organizada:`,
  );
  lines.push("");
  for (const apt of items) {
    const date = new Date(`${apt.appointment_date}T00:00:00`).toLocaleDateString("pt-BR");
    const time = String(apt.appointment_time || "").slice(0, 5);
    const client = apt.profiles?.name || "Cliente";
    const service = apt.services?.title || "Serviço";
    lines.push(`• ${date} às ${time} — ${client} (${service})`);
  }
  lines.push("");
  lines.push("Obrigado! 💈");
  return lines.join("\n");
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ success: false, error: "SUPABASE envs ausentes" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const body = (await req.json().catch(() => ({}))) as { action?: string } | undefined;
    const force = body?.action === "send-now";

    const waCfg = await getActiveWhatsAppConfig(supabase);
    if (!waCfg) {
      return new Response(
        JSON.stringify({ success: false, error: "Instância WhatsApp não configurada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Local date/time (America/Sao_Paulo)
    const nowLocal = getLocalParts();

    // Load admin config (enable + schedule time + last_sent)
    let cfg: { enabled?: boolean; schedule_time?: string; last_sent?: string } = {};
    try {
      const { data } = await supabase
        .from("site_config")
        .select("config_value")
        .eq("config_key", "whatsapp_overdue_barber")
        .maybeSingle();
      cfg = (data?.config_value as any) || {};
    } catch {}

    const enabled = Boolean(cfg.enabled ?? false);
    const scheduleTime = String(cfg.schedule_time || "07:00");
    const lastSentRaw = cfg.last_sent as string | undefined;

    const nowMinutes = parseTimeToMinutes(nowLocal.time);
    const targetMinutes = parseTimeToMinutes(scheduleTime);

    const lastSentDate = lastSentRaw ? new Date(lastSentRaw) : null;
    const lastSentLocalDate = lastSentDate ? getLocalParts(lastSentDate).date : null;
    const alreadySentToday = lastSentLocalDate === nowLocal.date;

    if (!force) {
      if (!enabled) {
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: "disabled-in-config" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (alreadySentToday) {
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: "already-sent-today" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (nowMinutes < targetMinutes) {
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: "before-schedule-time" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // If not forced, this function can be scheduled at 10:00 UTC (~07:00 local). No gate here.

    // Load potentially overdue appointments: pending/confirmed, not API, without implicit completion
    const { data, error } = await supabase
      .from("appointments")
      .select(
        `id, appointment_date, appointment_time, status, booking_type, payment_method, photo_url,
         client_id, barber_id, service_id,
         services:services(title),
         barbers:barbers(name, whatsapp_phone),
         profiles:profiles(name)`,
      )
      .in("status", ["pending", "confirmed"]) // still active
      .neq("booking_type", "api");

    if (error) throw error;

    const nowMinutesForOverdue = parseMinutes(nowLocal.time);
    const today = nowLocal.date;

    const overdue = (data || []).filter((apt: any) => {
      if (apt.payment_method || apt.photo_url) return false; // implicit completion
      const aptDate = String(apt.appointment_date);
      const aptTime = String(apt.appointment_time || "00:00");
      if (aptDate < today) return true;
      if (aptDate > today) return false;
      return parseMinutes(aptTime) < nowMinutesForOverdue;
    });

    if (!overdue.length) {
      return new Response(
        JSON.stringify({ success: true, message: "Sem agendamentos atrasados ativos" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Group by barber (require whatsapp_phone)
    const groups = new Map<string, { barberName: string; items: any[] }>();
    for (const apt of overdue) {
      const phone = normalizePhone(apt.barbers?.whatsapp_phone);
      if (!phone) continue;
      const key = phone;
      const g = groups.get(key) || { barberName: String(apt.barbers?.name || "Barbeiro"), items: [] };
      g.items.push(apt);
      groups.set(key, g);
    }

    let sent = 0;
    let skipped = 0;
    let errors: Array<{ phone: string; error: string }> = [];

    for (const [phone, grp] of groups.entries()) {
      try {
        const text = buildMessageForBarber(grp.barberName, grp.items);
        await sendEvolutionMessage(waCfg, phone, text);
        sent++;
        // small delay to avoid throttling
        await new Promise((r) => setTimeout(r, 800));
      } catch (e: any) {
        errors.push({ phone, error: e?.message || String(e) });
      }
    }

    // Save last_sent if any was sent and not a force with zero sends
    if ((sent > 0 || groups.size === 0) && !force) {
      try {
        const newCfg = { enabled, schedule_time: scheduleTime, last_sent: new Date().toISOString() };
        await supabase
          .from("site_config")
          .upsert({ config_key: "whatsapp_overdue_barber", config_value: newCfg as any }, { onConflict: "config_key" });
      } catch {}
    }

    return new Response(
      JSON.stringify({ success: true, total_barbers: groups.size, sent, skipped, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
