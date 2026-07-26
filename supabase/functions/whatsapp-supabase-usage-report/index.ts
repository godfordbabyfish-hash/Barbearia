
// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TZ = "America/Sao_Paulo";
const evolutionApiUrlEnv = (Deno.env.get("EVOLUTION_API_URL") ?? "").replace(/\/$/, "");
const evolutionApiKeyEnv = Deno.env.get("EVOLUTION_API_KEY") ?? "";
const evolutionInstanceNameEnv = Deno.env.get("EVOLUTION_INSTANCE_NAME") ?? "";

const getLocalDateTimeParts = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "00";

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
};

const normalizePhone = (value: string) => (value || "").replace(/\D/g, "");

const getActiveWhatsAppConfig = async (supabase: any) => {
  let instanceName = "";

  try {
    const { data: activeInstanceData } = await supabase
      .from("site_config")
      .select("config_value")
      .eq("config_key", "whatsapp_active_instance")
      .maybeSingle();

    const activeCfg = (activeInstanceData?.config_value || {}) as any;
    if (activeCfg?.instanceName) {
      instanceName = String(activeCfg.instanceName);
    }
  } catch {
    // fallback abaixo
  }

  if (!instanceName) {
    try {
      const { data: legacyData } = await supabase
        .from("site_config")
        .select("config_value")
        .eq("config_key", "whatsapp_instance")
        .maybeSingle();

      const legacyCfg = (legacyData?.config_value || {}) as any;
      if (legacyCfg?.active === false) return null;
      if (legacyCfg?.instanceName) {
        instanceName = String(legacyCfg.instanceName);
      }
    } catch {
      // fallback abaixo
    }
  }

  if (!instanceName) {
    instanceName = evolutionInstanceNameEnv;
  }

  if (!instanceName || !evolutionApiUrlEnv || !evolutionApiKeyEnv) {
    return null;
  }

  return {
    instanceName,
    evolutionApiUrl: evolutionApiUrlEnv,
    apiKey: evolutionApiKeyEnv,
  };
};

const getSupabaseUsageReportConfig = async (supabase: any) => {
  const { data, error } = await supabase
    .from("site_config")
    .select("config_value")
    .eq("config_key", "whatsapp_supabase_usage_report")
    .maybeSingle();

  if (error || !data?.config_value) return null;
  return data.config_value as any;
};

const saveSupabaseUsageReportConfig = async (supabase: any, config: any) => {
  const { error } = await supabase
    .from("site_config")
    .upsert(
      {
        config_key: "whatsapp_supabase_usage_report",
        config_value: config,
      },
      { onConflict: "config_key" }
    );

  if (error) throw error;
};

const sendEvolutionMessage = async (cfg: { evolutionApiUrl: string; apiKey: string; instanceName: string }, phone: string, text: string) => {
  const url = `${cfg.evolutionApiUrl}/message/sendText/${cfg.instanceName}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: cfg.apiKey,
    },
    body: JSON.stringify({
      number: phone,
      text,
      options: {
        delay: 900,
        presence: "composing",
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Erro Evolution API (${response.status}): ${body}`);
  }

  return await response.json().catch(() => ({}));
};

const generateSupabaseUsageMessage = (params: {
  now: Date;
  appointmentsToday: number;
  leadsToday: number;
  queueCount: number;
  projectRef: string;
}) => {
  const { now, appointmentsToday, leadsToday, queueCount, projectRef } = params;

  const dateStr = now.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const lines: string[] = [];
  lines.push("📊 *Uso do Supabase*");
  lines.push(`🗓️ ${dateStr}`);
  lines.push("");
  lines.push("*Atividade do banco*");
  lines.push(`• Agendamentos hoje: ${appointmentsToday}`);
  lines.push(`• Leads hoje: ${leadsToday}`);
  lines.push(`• Fila WhatsApp: ${queueCount}`);
  lines.push("");
  lines.push("Ver Egress, Storage e Billing:");
  lines.push(`https://supabase.com/dashboard/org/${projectRef}/usage`);
  lines.push(`Projeto: ${projectRef}`);

  return lines.join("\n");
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const internalKey = Deno.env.get("SUPABASE_USAGE_REPORT_INTERNAL_KEY") ?? "CHANGE_ME_SUPABASE_USAGE_REPORT_INTERNAL_KEY";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurado");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const body = await req.json().catch(() => ({}));
    const forceSendNow = body?.action === "send-now";

    // Check internal auth
    const isInternalSync = body?.internal === true;
    if (isInternalSync) {
      if (String(body?.internal_key || "") !== internalKey) {
        return new Response(
          JSON.stringify({ success: false, error: "Chave interna inválida" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const [waConfig, reportConfig] = await Promise.all([
      getActiveWhatsAppConfig(supabase),
      getSupabaseUsageReportConfig(supabase),
    ]);

    if (!waConfig) {
      return new Response(
        JSON.stringify({ success: false, error: "Instância WhatsApp não configurada/ativa" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!reportConfig) {
      return new Response(
        JSON.stringify({ success: false, error: "Configuração do relatório de uso do Supabase não encontrada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetPhone = normalizePhone(reportConfig.phone_number || "");
    if (!targetPhone) {
      return new Response(
        JSON.stringify({ success: false, error: "Número de destino não configurado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if enabled and time to send
    const nowLocal = getLocalDateTimeParts();
    if (!forceSendNow) {
      if (!reportConfig.enabled) {
        return new Response(
          JSON.stringify({ success: false, skipped: true, reason: "Relatório desativado" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const scheduleMinutes = parseTimeToMinutes(reportConfig.schedule_time || "12:00");
      const nowMinutes = parseTimeToMinutes(nowLocal.time);

      if (nowMinutes < scheduleMinutes) {
        return new Response(
          JSON.stringify({ success: false, skipped: true, reason: "Ainda não é hora de enviar" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if already sent today
      if (reportConfig.last_sent) {
        const sentDate = getLocalDateTimeParts(new Date(reportConfig.last_sent)).date;
        if (sentDate === nowLocal.date) {
          return new Response(
            JSON.stringify({ success: false, skipped: true, reason: "Relatório já enviado hoje" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Get data
    const todayStart = `${nowLocal.date}T00:00:00`;
    const todayEnd = `${nowLocal.date}T23:59:59`;

    const [appointmentsCount, leadsCount, queueCount] = await Promise.all([
      supabase.from("appointments").select("id", { count: "exact", head: true }).gte("appointment_date", todayStart).lte("appointment_date", todayEnd),
      supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", todayStart).lte("created_at", todayEnd),
      supabase.from("whatsapp_notifications_queue").select("id", { count: "exact", head: true }),
    ]);

    const projectRef = supabaseUrl.split("https://")[1].split(".")[0];

    const message = generateSupabaseUsageMessage({
      now: new Date(),
      appointmentsToday: appointmentsCount.count || 0,
      leadsToday: leadsCount.count || 0,
      queueCount: queueCount.count || 0,
      projectRef,
    });

    // Send message
    const sendResult = await sendEvolutionMessage(waConfig, targetPhone, message);

    // Update last_sent
    const updatedConfig = {
      ...reportConfig,
      last_sent: new Date().toISOString(),
    };
    await saveSupabaseUsageReportConfig(supabase, updatedConfig);

    return new Response(
      JSON.stringify({
        success: true,
        sent_to: targetPhone,
        date: nowLocal.date,
        send_result: sendResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in whatsapp-supabase-usage-report:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro interno no relatório de uso do Supabase",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function parseTimeToMinutes(hhmm: string) {
  const [h, m] = (hhmm || "00:00").split(":").map((n) => Number(n || 0));
  return h * 60 + m;
}
