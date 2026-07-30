// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SNAPSHOT_CONFIG_KEY = "supabase_cached_egress_snapshot";
const REPORT_CONFIG_KEY = "whatsapp_egress_report";
const DELIVERY_CONFIG_KEY = "whatsapp_egress_last_delivery";
const BILLING_PERIOD_DAYS = 30;
const DEFAULT_ORGANIZATION_ID = "uzfkotnamftzmsaidlnb";

const QUOTAS = {
  egress_gb: 5,
  database_size_gb: 0.5,
  storage_size_gb: 1,
  cached_egress_gb: 5,
  edge_function_invocations: 500_000,
  realtime_peak_connections: 200,
  monthly_active_users: 50_000,
  realtime_messages: 2_000_000,
  monthly_active_third_party_users: 50_000,
};

const evolutionApiUrl = (Deno.env.get("EVOLUTION_API_URL") ?? "").replace(/\/$/, "");
const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY") ?? "";
const fallbackInstanceName = Deno.env.get("EVOLUTION_INSTANCE_NAME") ?? "";

const normalizeToken = (value: unknown) => String(value ?? "")
  .trim().replace(/^Bearer\s+/i, "").replace(/^['"]|['"]$/g, "").trim();
const normalizePhone = (value: unknown) => String(value ?? "").replace(/\D/g, "");
const asNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const bytesToGb = (value: number) => value / (1024 ** 3);
const formatDecimal = (value: number, digits = 3) => new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: digits,
}).format(value);
const formatInteger = (value: number) => new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
}).format(value);

type MetricKey = keyof typeof QUOTAS;
type UsageMetrics = Partial<Record<MetricKey, number>>;
type OperationalMetrics = {
  appointmentsCreated: number;
  newClients: number;
  queuePending: number;
  queueFailed: number;
  completedServices: number;
};

const ANOMALY_THRESHOLD = 0.20;
const BASELINE_DAYS = 7;
const MIN_BASELINE_DAYS = 3;

const aliases: Record<MetricKey, string[]> = {
  egress_gb: ["egress", "total_egress", "unified_egress"],
  database_size_gb: ["database_size", "db_size", "disk_size"],
  storage_size_gb: ["storage_size", "storage"],
  cached_egress_gb: ["cached_egress", "cache_egress"],
  edge_function_invocations: ["edge_function_invocations", "function_invocations", "edge_functions_invocations"],
  realtime_peak_connections: ["realtime_peak_connections", "realtime_concurrent_peak_connections", "peak_connections"],
  monthly_active_users: ["monthly_active_users", "mau"],
  realtime_messages: ["realtime_messages", "realtime_message_count"],
  monthly_active_third_party_users: ["monthly_active_third_party_users", "third_party_mau", "third_party_users"],
};

const normalizeKey = (value: unknown) => String(value ?? "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

const convertMetricValue = (key: MetricKey, value: number, unit: string) => {
  if (!key.endsWith("_gb")) return value;
  const normalizedUnit = unit.toLowerCase();
  if (normalizedUnit.includes("byte") || value > 1024 * 1024) return bytesToGb(value);
  if (normalizedUnit === "mb" || normalizedUnit.includes("megabyte")) return value / 1024;
  if (normalizedUnit === "kb" || normalizedUnit.includes("kilobyte")) return value / (1024 ** 2);
  return value;
};

const extractMetrics = (payload: unknown): UsageMetrics => {
  const metrics: UsageMetrics = {};
  const visit = (node: any, path = "") => {
    if (node == null) return;
    if (Array.isArray(node)) {
      node.forEach((item, index) => visit(item, `${path}_${index}`));
      return;
    }
    if (typeof node !== "object") return;

    const identity = normalizeKey(node.metric ?? node.meter ?? node.name ?? node.slug ?? node.key ?? node.label ?? node.title ?? path);
    const rawValue = asNumber(node.used ?? node.usage ?? node.value ?? node.total ?? node.current ?? node.amount ?? node.sum);
    const unit = String(node.unit ?? node.usage_unit ?? node.value_unit ?? "");

    for (const [metricKey, metricAliases] of Object.entries(aliases) as [MetricKey, string[]][]) {
      const exactProperty = metricAliases.find((alias) => asNumber(node[alias]) !== null);
      if (exactProperty && metrics[metricKey] == null) {
        metrics[metricKey] = convertMetricValue(metricKey, Number(node[exactProperty]), exactProperty.includes("byte") ? "bytes" : unit);
      }
      const matchingAlias = metricAliases.find((alias) => identity === alias || identity.endsWith(`_${alias}`));
      if (matchingAlias && rawValue !== null && metrics[metricKey] == null) {
        metrics[metricKey] = convertMetricValue(metricKey, rawValue, unit);
      }
    }

    for (const [childKey, child] of Object.entries(node)) {
      const childPath = path ? `${path}_${childKey}` : childKey;
      const childNumber = asNumber(child);
      if (childNumber !== null) {
        const normalizedChild = normalizeKey(childPath);
        for (const [metricKey, metricAliases] of Object.entries(aliases) as [MetricKey, string[]][]) {
          if (metrics[metricKey] != null) continue;
          const alias = metricAliases.find((candidate) => normalizedChild === candidate || normalizedChild.endsWith(`_${candidate}`));
          if (alias) metrics[metricKey] = convertMetricValue(metricKey, childNumber, normalizedChild.includes("byte") ? "bytes" : "");
        }
      } else {
        visit(child, childPath);
      }
    }
  };
  visit(payload);
  return metrics;
};

const fetchOfficialUsage = async (token: string, projectRef: string, organizationId: string) => {
  if (!token) return { metrics: {}, source: "no_management_token", attempts: [] };
  const urls = [
    `https://api.supabase.com/platform/organizations/${organizationId}/usage`,
    `https://api.supabase.com/v1/organizations/${organizationId}/usage`,
    `https://api.supabase.com/platform/projects/${projectRef}/usage`,
    `https://api.supabase.com/v1/projects/${projectRef}/usage`,
  ];
  const attempts: Array<{ endpoint: string; status: number; keys?: string[] }> = [];
  let best: { metrics: UsageMetrics; source: string } = { metrics: {}, source: "unavailable" };

  for (const url of urls) {
    try {
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
      const payload = await response.json().catch(() => null);
      const keys = payload && typeof payload === "object" ? Object.keys(payload).slice(0, 30) : [];
      attempts.push({ endpoint: new URL(url).pathname, status: response.status, keys });
      if (!response.ok || !payload) continue;
      const metrics = extractMetrics(payload);
      if (Object.keys(metrics).length > Object.keys(best.metrics).length) best = { metrics, source: new URL(url).pathname };
      if (Object.keys(metrics).length >= 7) break;
    } catch {
      attempts.push({ endpoint: new URL(url).pathname, status: 0 });
    }
  }
  return { ...best, attempts };
};

const percent = (value: number, quota: number) => Math.round((value / quota) * 100);
const metricLine = (icon: string, label: string, value: number | undefined, quota: number, unit = "") => {
  if (value == null) return `${icon} ${label}: indisponível`;
  const format = unit === "GB" ? formatDecimal : formatInteger;
  return `${icon} ${label}: ${format(value)}${unit ? ` ${unit}` : ""} / ${format(quota)}${unit ? ` ${unit}` : ""} (${percent(value, quota)}%)`;
};

const buildConsumptionObservations = (current: OperationalMetrics, history: any[]) => {
  if (history.length < MIN_BASELINE_DAYS) {
    return [`ℹ️ Histórico em formação: ${history.length}/${MIN_BASELINE_DAYS} dias para ativar alertas acima de 20%.`];
  }
  const definitions = [
    { key: "appointmentsCreated", column: "appointments_created", label: "Agendamentos criados" },
    { key: "newClients", column: "new_clients", label: "Novos clientes" },
    { key: "queuePending", column: "whatsapp_pending", label: "Fila pendente do WhatsApp" },
    { key: "queueFailed", column: "whatsapp_failed", label: "Falhas de WhatsApp" },
    { key: "completedServices", column: "completed_services", label: "Serviços concluídos" },
  ] as const;
  const alerts: string[] = [];
  for (const item of definitions) {
    const average = history.reduce((sum, row) => sum + Number(row?.[item.column] || 0), 0) / history.length;
    const currentValue = current[item.key];
    if (average > 0 && currentValue > average * (1 + ANOMALY_THRESHOLD)) {
      const increase = Math.round(((currentValue - average) / average) * 100);
      alerts.push(`🚨 ${item.label}: ${currentValue} — ${increase}% acima da média de ${average.toFixed(1)}/dia.`);
    }
  }
  return alerts.length ? alerts : ["✅ Consumo dentro do padrão diário — nenhuma métrica acima de 20% da média."];
};

const buildUsageMessage = (metrics: UsageMetrics, source: string, operational: OperationalMetrics, observations: string[], baselineDays: number) => {
  const now = new Date();
  return [
    "📊 *Resumo diário do Supabase*",
    `🗓️ ${now.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} às ${now.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })}`,
    "",
    metricLine("🌐", "Egress", metrics.egress_gb, QUOTAS.egress_gb, "GB"),
    metricLine("🗄️", "Banco de dados", metrics.database_size_gb, QUOTAS.database_size_gb, "GB"),
    metricLine("📦", "Storage", metrics.storage_size_gb, QUOTAS.storage_size_gb, "GB"),
    metricLine("⚡", "Cached Egress", metrics.cached_egress_gb, QUOTAS.cached_egress_gb, "GB"),
    metricLine("🧩", "Edge Functions", metrics.edge_function_invocations, QUOTAS.edge_function_invocations),
    metricLine("🔌", "Pico Realtime", metrics.realtime_peak_connections, QUOTAS.realtime_peak_connections),
    metricLine("👤", "Usuários ativos", metrics.monthly_active_users, QUOTAS.monthly_active_users),
    metricLine("💬", "Mensagens Realtime", metrics.realtime_messages, QUOTAS.realtime_messages),
    metricLine("👥", "Usuários terceiros", metrics.monthly_active_third_party_users, QUOTAS.monthly_active_third_party_users),
    "",
    "*Atividade operacional*",
    `📅 Agendamentos criados: ${operational.appointmentsCreated}`,
    `👤 Novos clientes: ${operational.newClients}`,
    `✂️ Serviços concluídos: ${operational.completedServices}`,
    `⏳ WhatsApp pendentes: ${operational.queuePending}`,
    `❌ WhatsApp com falha: ${operational.queueFailed}`,
    "",
    `*Observações de consumo* — base de ${baselineDays} dia(s)`,
    ...observations,
    "",
    source === "official_api" ? "✅ Cotas oficiais sincronizadas." : "ℹ️ Cotas oficiais: consulte o Dashboard do Supabase.",
  ].join("\n");
};

const buildCleanConsumptionObservations = (current: OperationalMetrics, history: any[]) => {
  if (history.length < MIN_BASELINE_DAYS) {
    return [`ℹ️ Histórico em formação: ${history.length}/${MIN_BASELINE_DAYS} dias para ativar alertas acima de 20%.`];
  }
  const definitions = [
    { key: "appointmentsCreated", column: "appointments_created", label: "Agendamentos criados" },
    { key: "newClients", column: "new_clients", label: "Novos clientes" },
    { key: "queuePending", column: "whatsapp_pending", label: "Fila pendente do WhatsApp" },
    { key: "queueFailed", column: "whatsapp_failed", label: "Falhas de WhatsApp" },
    { key: "completedServices", column: "completed_services", label: "Serviços concluídos" },
  ] as const;
  const alerts: string[] = [];
  for (const item of definitions) {
    const average = history.reduce((sum, row) => sum + Number(row?.[item.column] || 0), 0) / history.length;
    const currentValue = current[item.key];
    if (average > 0 && currentValue > average * (1 + ANOMALY_THRESHOLD)) {
      const increase = Math.round(((currentValue - average) / average) * 100);
      alerts.push(`🚨 ${item.label}: ${currentValue} — ${increase}% acima da média de ${average.toFixed(1)}/dia.`);
    }
  }
  return alerts.length ? alerts : ["✅ Consumo dentro do padrão diário — nenhuma métrica acima de 20% da média."];
};

const buildCleanUsageMessage = (metrics: UsageMetrics, source: string, operational: OperationalMetrics, observations: string[], baselineDays: number) => {
  const now = new Date();
  return [
    "📊 *Resumo diário do Supabase*",
    `🗓️ ${now.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} às ${now.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })}`,
    "",
    metricLine("🌐", "Egress", metrics.egress_gb, QUOTAS.egress_gb, "GB"),
    metricLine("🗄️", "Banco de dados", metrics.database_size_gb, QUOTAS.database_size_gb, "GB"),
    metricLine("📦", "Storage", metrics.storage_size_gb, QUOTAS.storage_size_gb, "GB"),
    metricLine("⚡", "Cached Egress", metrics.cached_egress_gb, QUOTAS.cached_egress_gb, "GB"),
    metricLine("🧩", "Edge Functions", metrics.edge_function_invocations, QUOTAS.edge_function_invocations),
    metricLine("🔌", "Pico Realtime", metrics.realtime_peak_connections, QUOTAS.realtime_peak_connections),
    metricLine("👤", "Usuários ativos", metrics.monthly_active_users, QUOTAS.monthly_active_users),
    metricLine("💬", "Mensagens Realtime", metrics.realtime_messages, QUOTAS.realtime_messages),
    metricLine("👥", "Usuários terceiros", metrics.monthly_active_third_party_users, QUOTAS.monthly_active_third_party_users),
    "",
    "*Atividade operacional*",
    `📅 Agendamentos criados: ${operational.appointmentsCreated}`,
    `👤 Novos clientes: ${operational.newClients}`,
    `✂️ Serviços concluídos: ${operational.completedServices}`,
    `⏳ WhatsApp pendentes: ${operational.queuePending}`,
    `❌ WhatsApp com falha: ${operational.queueFailed}`,
    "",
    `*Observações de consumo* — base de ${baselineDays} dia(s)`,
    ...observations,
    "",
    source === "official_api" ? "✅ Cotas oficiais sincronizadas." : "ℹ️ Cotas oficiais: consulte o Dashboard do Supabase.",
  ].join("\n");
};

const readEvolutionPayload = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { raw: text.slice(0, 500) }; }
};

const findProviderMessageId = (payload: any) => String(
  payload?.key?.id ?? payload?.message?.key?.id ?? payload?.messageId ?? payload?.id ?? "",
).trim();

const checkWhatsappNumber = async (instanceName: string, phone: string) => {
  const response = await fetch(`${evolutionApiUrl}/chat/whatsappNumbers/${instanceName}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: evolutionApiKey },
    body: JSON.stringify({ numbers: [phone] }),
  });
  const payload = await readEvolutionPayload(response);
  if (response.status === 404) {
    return { normalizedNumber: phone, jid: "", provider: null, validation: "unsupported" };
  }
  if (!response.ok) throw new Error(`Falha ao validar o número no WhatsApp (Evolution ${response.status})`);
  const result = Array.isArray(payload) ? payload[0] : payload?.data?.[0] ?? payload?.[0] ?? payload;
  const exists = result?.exists === true || result?.isWhatsapp === true || result?.isWhatsApp === true;
  if (!exists) throw new Error("O número configurado não foi encontrado no WhatsApp");
  const normalizedNumber = normalizePhone(result?.jid ?? result?.number ?? phone) || phone;
  return { normalizedNumber, jid: String(result?.jid ?? ""), provider: result, validation: "confirmed" };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = (JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}')['edge_functions_20260730'] || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) ?? "";
    const internalKey = Deno.env.get("USAGE_SYNC_INTERNAL_KEY") ?? "";
    const isInternal = body?.internal === true;
    if (isInternal && (!internalKey || String(body?.internal_key ?? "") !== internalKey)) {
      return new Response(JSON.stringify({ success: false, error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    if (!isInternal) {
      const accessToken = normalizeToken(req.headers.get("Authorization"));
      if (!accessToken) {
        return new Response(JSON.stringify({ success: false, error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: authData, error: authError } = await service.auth.getUser(accessToken);
      if (authError || !authData.user) {
        return new Response(JSON.stringify({ success: false, error: "Sessão inválida" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: roles } = await service.from("user_roles").select("role").eq("user_id", authData.user.id).in("role", ["admin", "gestor"]);
      if (!roles?.length) {
        return new Response(JSON.stringify({ success: false, error: "Acesso restrito ao admin/gestor" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }
    const projectRef = Deno.env.get("SUPABASE_PROJECT_REF") || new URL(supabaseUrl).hostname.split(".")[0];
    const organizationId = Deno.env.get("SUPABASE_ORGANIZATION_ID") || DEFAULT_ORGANIZATION_ID;
    const managementToken = normalizeToken(Deno.env.get("MANAGEMENT_ACCESS_TOKEN") || Deno.env.get("SUPABASE_MANAGEMENT_ACCESS_TOKEN"));
    const official = await fetchOfficialUsage(managementToken, projectRef, organizationId);

    const localDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const todayStart = `${localDate}T00:00:00-03:00`;
    const todayEnd = `${localDate}T23:59:59-03:00`;
    const [appointments, newClients, pending, failed, completed, historyResult] = await Promise.all([
      service.from("appointments").select("id", { count: "exact", head: true }).gte("created_at", todayStart).lte("created_at", todayEnd),
      service.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", todayStart).lte("created_at", todayEnd),
      service.from("whatsapp_notifications_queue").select("id", { count: "exact", head: true }).eq("status", "pending"),
      service.from("whatsapp_notifications_queue").select("id", { count: "exact", head: true }).eq("status", "failed"),
      service.from("appointments").select("id", { count: "exact", head: true }).eq("appointment_date", localDate).eq("status", "completed"),
      service.from("operational_usage_snapshots")
        .select("snapshot_date,appointments_created,new_clients,whatsapp_pending,whatsapp_failed,completed_services")
        .lt("snapshot_date", localDate)
        .order("snapshot_date", { ascending: false })
        .limit(BASELINE_DAYS),
    ]);
    const operational: OperationalMetrics = {
      appointmentsCreated: appointments.count || 0,
      newClients: newClients.count || 0,
      queuePending: pending.count || 0,
      queueFailed: failed.count || 0,
      completedServices: completed.count || 0,
    };
    const history = historyResult.data || [];
    const observations = buildCleanConsumptionObservations(operational, history);
    await service.from("operational_usage_snapshots").upsert({
      snapshot_date: localDate,
      appointments_created: operational.appointmentsCreated,
      new_clients: operational.newClients,
      whatsapp_pending: operational.queuePending,
      whatsapp_failed: operational.queueFailed,
      completed_services: operational.completedServices,
      updated_at: new Date().toISOString(),
    }, { onConflict: "snapshot_date" });

    const { data: previousRow } = await service.from("site_config").select("config_value").eq("config_key", SNAPSHOT_CONFIG_KEY).maybeSingle();
    const previous = (previousRow?.config_value ?? {}) as any;
    const metrics: UsageMetrics = { ...(previous.metrics ?? {}), ...official.metrics };
    if (typeof body?.manual_used_gb === "number" && body.manual_used_gb >= 0 && metrics.cached_egress_gb == null) {
      metrics.cached_egress_gb = body.manual_used_gb;
    }
    const now = new Date();
    const snapshot = {
      used_gb: metrics.cached_egress_gb ?? Number(previous.used_gb ?? 0),
      days_elapsed: now.getUTCDate(),
      period_days: BILLING_PERIOD_DAYS,
      updated_at: now.toISOString(),
      metrics,
      source: { method: Object.keys(official.metrics).length ? "official_api" : "cached_snapshot", endpoint: official.source },
    };
    await service.from("site_config").upsert({ config_key: SNAPSHOT_CONFIG_KEY, config_value: snapshot }, { onConflict: "config_key" });

    let whatsappReportSent = false;
    let whatsappReportError: string | null = null;
    let whatsappDelivery: any = null;
    if (isInternal || body?.send_whatsapp === true) {
      try {
        const { data: cfgRow } = await service.from("site_config").select("config_value").eq("config_key", REPORT_CONFIG_KEY).maybeSingle();
        const cfg = (cfgRow?.config_value ?? {}) as any;
        if (!cfg.enabled) throw new Error("Envio do relatório está desativado");
        const phone = normalizePhone(cfg.phone_number);
        if (!phone) throw new Error("Número do relatório não configurado");
        const { data: instanceRow } = await service.from("site_config").select("config_value").eq("config_key", "whatsapp_active_instance").maybeSingle();
        const instanceName = (instanceRow?.config_value as any)?.instanceName || fallbackInstanceName;
        if (!instanceName || !evolutionApiUrl || !evolutionApiKey) throw new Error("Conexão do WhatsApp incompleta");
        const numberCheck = await checkWhatsappNumber(instanceName, phone);
        const response = await fetch(`${evolutionApiUrl}/message/sendText/${instanceName}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: evolutionApiKey },
          body: JSON.stringify({ number: numberCheck.normalizedNumber, text: buildCleanUsageMessage(metrics, snapshot.source.method, operational, observations, history.length), options: { delay: 900, presence: "composing" } }),
        });
        const providerPayload = await readEvolutionPayload(response);
        if (!response.ok) throw new Error(`Evolution API recusou o envio (${response.status})`);
        const providerMessageId = findProviderMessageId(providerPayload);
        if (!providerMessageId) {
          const diagnostic = {
            accepted: false,
            error: "Evolution aceitou a chamada, mas não devolveu comprovante da mensagem",
            http_status: response.status,
            response_type: Array.isArray(providerPayload) ? "array" : typeof providerPayload,
            response_keys: providerPayload && typeof providerPayload === "object" ? Object.keys(providerPayload).slice(0, 20) : [],
            key_fields: providerPayload?.key && typeof providerPayload.key === "object" ? Object.keys(providerPayload.key).slice(0, 20) : [],
            destination_suffix: phone.slice(-4),
            failed_at: new Date().toISOString(),
          };
          await service.from("site_config").upsert({ config_key: DELIVERY_CONFIG_KEY, config_value: diagnostic }, { onConflict: "config_key" });
          throw new Error(diagnostic.error);
        }
        whatsappDelivery = {
          accepted: true,
          provider_message_id: providerMessageId,
          provider_status: String(providerPayload?.status ?? providerPayload?.message?.status ?? "accepted"),
          destination_suffix: phone.slice(-4),
          destination_jid: numberCheck.jid || null,
          number_validation: numberCheck.validation,
          instance_name: instanceName,
          accepted_at: new Date().toISOString(),
        };
        await service.from("site_config").upsert({ config_key: DELIVERY_CONFIG_KEY, config_value: whatsappDelivery }, { onConflict: "config_key" });
        whatsappReportSent = true;
      } catch (error: any) {
        whatsappReportError = error?.message || "Erro no envio do WhatsApp";
        whatsappDelivery = {
          accepted: false,
          error: whatsappReportError,
          failed_at: new Date().toISOString(),
        };
        await service.from("site_config").upsert({ config_key: DELIVERY_CONFIG_KEY, config_value: whatsappDelivery }, { onConflict: "config_key" });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      snapshot,
      operational,
      observations,
      metrics_found: Object.keys(official.metrics),
      source: official.source,
      attempts: official.attempts,
      whatsapp_report_sent: whatsappReportSent,
      whatsapp_report_error: whatsappReportError,
      whatsapp_delivery: whatsappDelivery,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error?.message || "Erro interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
