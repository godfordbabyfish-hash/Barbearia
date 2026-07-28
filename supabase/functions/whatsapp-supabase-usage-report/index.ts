
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

const ANOMALY_THRESHOLD = 0.20;
const BASELINE_DAYS = 7;
const MIN_BASELINE_DAYS = 3;

type OperationalMetrics = {
  appointmentsCreated: number;
  newClients: number;
  queuePending: number;
  queueFailed: number;
  completedServices: number;
};

const buildConsumptionObservations = (current: OperationalMetrics, history: any[]) => {
  if (history.length < MIN_BASELINE_DAYS) {
    return [`ℹ️ Histórico em formação: ${history.length}/${MIN_BASELINE_DAYS} dias para ativar os alertas.`];
  }

  const definitions = [
    { key: "appointmentsCreated", column: "appointments_created", label: "Agendamentos criados" },
    { key: "newClients", column: "new_clients", label: "Novos clientes" },
    { key: "queuePending", column: "whatsapp_pending", label: "Fila pendente do WhatsApp" },
    { key: "queueFailed", column: "whatsapp_failed", label: "Falhas de WhatsApp" },
    { key: "completedServices", column: "completed_services", label: "Serviços concluídos" },
  ] as const;

  const alerts: string[] = [];
  for (const definition of definitions) {
    const average = history.reduce(
      (sum, row) => sum + Number(row?.[definition.column] || 0),
      0,
    ) / history.length;
    const currentValue = current[definition.key];
    if (average > 0 && currentValue > average * (1 + ANOMALY_THRESHOLD)) {
      const increase = Math.round(((currentValue - average) / average) * 100);
      alerts.push(`🚨 ${definition.label}: ${currentValue} — ${increase}% acima da média de ${average.toFixed(1)}/dia.`);
    }
  }

  return alerts.length
    ? alerts
    : ["✅ Consumo dentro do padrão diário — nenhuma métrica acima de 20% da média."];
};

const generateSupabaseUsageMessage = (params: {
  now: Date;
  metrics: OperationalMetrics;
  observations: string[];
  baselineDays: number;
  projectRef: string;
}) => {
  const { now, metrics, observations, baselineDays, projectRef } = params;
  const appointmentsToday = metrics.appointmentsCreated;
  const leadsToday = metrics.newClients;
  const queueCount = metrics.queuePending;

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
  lines.push(`• Serviços concluídos: ${metrics.completedServices}`);
  lines.push(`• WhatsApp com falha: ${metrics.queueFailed}`);
  lines.push("");
  lines.push(`*Observações de consumo* — base de ${baselineDays} dia(s)`);
  observations.forEach((observation) => lines.push(observation));
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
      if (!internalKey || internalKey === "CHANGE_ME_SUPABASE_USAGE_REPORT_INTERNAL_KEY" || String(body?.internal_key || "") !== internalKey) {
        return new Response(
          JSON.stringify({ success: false, error: "Chave interna inválida" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      const accessToken = String(req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
      const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
      if (authError || !authData.user) {
        return new Response(JSON.stringify({ success: false, error: "Sessão inválida" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authData.user.id)
        .in("role", ["admin", "gestor"]);
      if (!roles?.length) {
        return new Response(JSON.stringify({ success: false, error: "Acesso restrito ao admin/gestor" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
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

    const [appointmentsCount, newClientsCount, queuePendingCount, queueFailedCount, completedCount, historyResult] = await Promise.all([
      supabase.from("appointments").select("id", { count: "exact", head: true }).gte("created_at", todayStart).lte("created_at", todayEnd),
      supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", todayStart).lte("created_at", todayEnd),
      supabase.from("whatsapp_notifications_queue").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("whatsapp_notifications_queue").select("id", { count: "exact", head: true }).eq("status", "failed"),
      supabase.from("appointments").select("id", { count: "exact", head: true }).eq("appointment_date", nowLocal.date).eq("status", "completed"),
      supabase
        .from("operational_usage_snapshots")
        .select("snapshot_date,appointments_created,new_clients,whatsapp_pending,whatsapp_failed,completed_services")
        .lt("snapshot_date", nowLocal.date)
        .order("snapshot_date", { ascending: false })
        .limit(BASELINE_DAYS),
    ]);

    const metrics: OperationalMetrics = {
      appointmentsCreated: appointmentsCount.count || 0,
      newClients: newClientsCount.count || 0,
      queuePending: queuePendingCount.count || 0,
      queueFailed: queueFailedCount.count || 0,
      completedServices: completedCount.count || 0,
    };
    const history = historyResult.data || [];
    const observations = buildConsumptionObservations(metrics, history);

    const { error: snapshotError } = await supabase
      .from("operational_usage_snapshots")
      .upsert({
        snapshot_date: nowLocal.date,
        appointments_created: metrics.appointmentsCreated,
        new_clients: metrics.newClients,
        whatsapp_pending: metrics.queuePending,
        whatsapp_failed: metrics.queueFailed,
        completed_services: metrics.completedServices,
        updated_at: new Date().toISOString(),
      }, { onConflict: "snapshot_date" });
    if (snapshotError) throw snapshotError;

    const projectRef = supabaseUrl.split("https://")[1].split(".")[0];

    const message = generateSupabaseUsageMessage({
      now: new Date(),
      metrics,
      observations,
      baselineDays: history.length,
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
        metrics,
        observations,
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
