// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SNAPSHOT_CONFIG_KEY = "supabase_cached_egress_snapshot";
const BILLING_PERIOD_DAYS = 30;
const EGRESS_WHATSAPP_CONFIG_KEY = "whatsapp_egress_report";

const evolutionApiUrlEnv = (Deno.env.get("EVOLUTION_API_URL") ?? "").replace(/\/$/, "");
const evolutionApiKeyEnv = Deno.env.get("EVOLUTION_API_KEY") ?? "";
const evolutionInstanceNameEnv = Deno.env.get("EVOLUTION_INSTANCE_NAME") ?? "";

function normalizeAuthToken(value: string | null | undefined): string {
  const raw = String(value || "").trim();
  const withoutBearer = raw.replace(/^Bearer\s+/i, "");
  return withoutBearer.replace(/^['\"]|['\"]$/g, "").trim();
}

const normalizePhone = (value: string) => (value || "").replace(/\D/g, "");

const formatNumber = (value: number, digits = 2) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value || 0);

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

const sendEvolutionMessage = async (
  cfg: { evolutionApiUrl: string; apiKey: string; instanceName: string },
  phone: string,
  text: string
) => {
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
    const body = await response.text().catch(() => "");
    throw new Error(`Erro Evolution API (${response.status}): ${body}`);
  }
};

const buildEgressWhatsappMessage = (snapshot: any) => {
  const usedGb = Number(snapshot?.used_gb || 0);
  const daysElapsed = Math.max(1, Number(snapshot?.days_elapsed || BILLING_PERIOD_DAYS));
  const periodDays = Math.max(1, Number(snapshot?.period_days || BILLING_PERIOD_DAYS));
  const dailyMb = (usedGb * 1024) / daysElapsed;
  const projectedGb = (dailyMb * periodDays) / 1024;

  const now = new Date();
  const dayOfMonth = now.getDate();
  const accumulatedMonthGb = (dailyMb * dayOfMonth) / 1024;

  const lines = [
    "🌐 *Report Diário de Egress*",
    `🗓️ ${now.toLocaleDateString("pt-BR")}`,
    "",
    `📦 Acumulado do ciclo: ${formatNumber(usedGb, 3)} GB`,
    `📅 Dias no ciclo: ${Math.round(daysElapsed)}/${Math.round(periodDays)}`,
    `📉 Consumo diário médio: ${formatNumber(dailyMb, 1)} MB/dia`,
    `📆 Acumulado estimado no mês: ${formatNumber(accumulatedMonthGb, 3)} GB`,
    `🔮 Projeção para ${Math.round(periodDays)} dias: ${formatNumber(projectedGb, 3)} GB`,
  ];

  return lines.join("\n");
};

const bytesToGb = (bytes: number) => bytes / (1024 ** 3);

const parseProjectRefFromUrl = (supabaseUrl: string) => {
  try {
    const hostname = new URL(supabaseUrl).hostname;
    return hostname.split(".")[0] || "";
  } catch {
    return "";
  }
};

const asNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getLastDaysRange = (days: number) => {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - Math.max(1, days));

  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
};

const walkForCandidate = (
  node: any,
  path = ""
): { usedGb: number | null; daysElapsed: number | null; metricType: "cached_egress" | "egress" } | null => {
  const pathKey = path.toLowerCase();

  if (typeof node === "number") {
    if (pathKey.includes("egress")) {
      const asGb = pathKey.includes("byte") ? bytesToGb(node) : node;
      return {
        usedGb: Math.max(0, asGb),
        daysElapsed: null,
        metricType: pathKey.includes("cached") || pathKey.includes("cache") ? "cached_egress" : "egress",
      };
    }
    return null;
  }

  if (!node || typeof node !== "object") return null;

  const usedGb =
    asNumber(node.cached_egress_gb) ??
    asNumber(node.cachedEgressGb) ??
    asNumber(node.cached_egress) ??
    asNumber(node.cachedEgress) ??
    asNumber(node.cached_egress_total_gb) ??
    asNumber(node.cachedEgressTotalGb) ??
    asNumber(node.cached_egress_usage_gb) ??
    asNumber(node.cachedEgressUsageGb) ??
    asNumber(node.cache_egress_gb) ??
    asNumber(node.cacheEgressGb);

  const egressGb =
    asNumber(node.egress_gb) ??
    asNumber(node.egressGb) ??
    asNumber(node.total_egress_gb) ??
    asNumber(node.totalEgressGb) ??
    asNumber(node.egress_usage_gb) ??
    asNumber(node.egressUsageGb);

  const usedBytes =
    asNumber(node.cached_egress_bytes) ??
    asNumber(node.cachedEgressBytes) ??
    asNumber(node.cached_egress_total_bytes) ??
    asNumber(node.cachedEgressTotalBytes) ??
    asNumber(node.cached_egress_usage_bytes) ??
    asNumber(node.cachedEgressUsageBytes) ??
    asNumber(node.cache_egress_bytes) ??
    asNumber(node.cacheEgressBytes);

  const egressBytes =
    asNumber(node.egress_bytes) ??
    asNumber(node.egressBytes) ??
    asNumber(node.total_egress_bytes) ??
    asNumber(node.totalEgressBytes) ??
    asNumber(node.egress_usage_bytes) ??
    asNumber(node.egressUsageBytes);

  const daysElapsed =
    asNumber(node.days_elapsed) ??
    asNumber(node.daysElapsed) ??
    asNumber(node.period_days) ??
    asNumber(node.periodDays);

  const metricKey = String(
    node.metric ??
      node.meter ??
      node.name ??
      node.slug ??
      node.key ??
      node.label ??
      node.title ??
      node.metric_name ??
      node.metricName ??
      ""
  ).toLowerCase();
  const metricContext = `${pathKey} ${metricKey}`;

  const metricValue =
    asNumber(node.used) ??
    asNumber(node.usage) ??
    asNumber(node.value) ??
    asNumber(node.total) ??
    asNumber(node.current) ??
    asNumber(node.amount) ??
    asNumber(node.sum);

  const metricUnit = String(
    node.unit ?? node.usage_unit ?? node.usageUnit ?? node.value_unit ?? ""
  ).toLowerCase();

  const metricLooksLikeCachedEgress =
    (metricContext.includes("cached") || metricContext.includes("cache")) && metricContext.includes("egress");
  const metricLooksLikeEgress = metricContext.includes("egress");

  const inferredCachedGb =
    usedGb ??
    (usedBytes !== null ? bytesToGb(usedBytes) : null) ??
    (metricLooksLikeCachedEgress && metricValue !== null
      ? metricUnit.includes("byte")
        ? bytesToGb(metricValue)
        : metricValue
      : null);

  const inferredEgressGb =
    egressGb ??
    (egressBytes !== null ? bytesToGb(egressBytes) : null) ??
    (metricLooksLikeEgress && metricValue !== null
      ? metricUnit.includes("byte")
        ? bytesToGb(metricValue)
        : metricValue
      : null);

  const inferredGb = inferredCachedGb ?? inferredEgressGb;

  if (inferredGb !== null) {
    return {
      usedGb: Math.max(0, inferredGb),
      daysElapsed: daysElapsed !== null ? Math.max(1, Math.round(daysElapsed)) : null,
      metricType: inferredCachedGb !== null ? "cached_egress" : "egress",
    };
  }

  if (Array.isArray(node)) {
    for (let index = 0; index < node.length; index += 1) {
      const item = node[index];
      const found = walkForCandidate(item, `${path}[${index}]`);
      if (found?.usedGb !== null) return found;
    }
    return null;
  }

  for (const [key, value] of Object.entries(node)) {
    const nextPath = path ? `${path}.${String(key)}` : String(key);
    const found = walkForCandidate(value, nextPath);
    if (found?.usedGb !== null) return found;
  }

  return null;
};

const getPayloadCandidates = (projectRef: string, organizationId: string) => {
  const range = getLastDaysRange(BILLING_PERIOD_DAYS);

  const candidates = [
    {
      path: `/platform/projects/${projectRef}/usage`,
      query: "",
    },
    {
      path: `/platform/projects/${projectRef}/usage/daily`,
      query: `?start=${range.start}T00:00:00Z&end=${range.end}T23:59:59Z`,
    },
    {
      path: `/v1/projects/${projectRef}/usage`,
      query: "?interval=30d",
    },
    {
      path: `/v1/projects/${projectRef}/usage`,
      query: "",
    },
    {
      path: `/v1/projects/${projectRef}/analytics/endpoints/usage.api-counts`,
      query: "?interval=1d",
    },
  ];

  if (organizationId) {
    candidates.unshift(
      {
        path: `/platform/organizations/${organizationId}/usage`,
        query: "",
      },
      {
        path: `/platform/organizations/${organizationId}/usage/daily`,
        query: `?start=${range.start}T00:00:00Z&end=${range.end}T23:59:59Z`,
      }
    );
  }

  return candidates;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const managementToken = normalizeAuthToken(
      Deno.env.get("MANAGEMENT_ACCESS_TOKEN") ||
      Deno.env.get("SUPABASE_MANAGEMENT_ACCESS_TOKEN") ||
      ""
    );
    const dashboardJwt = normalizeAuthToken(
      Deno.env.get("DASHBOARD_JWT") ||
      Deno.env.get("SUPABASE_DASHBOARD_JWT") ||
      body?.dashboard_jwt
    );
    const configuredProjectRef = Deno.env.get("SUPABASE_PROJECT_REF") || "";
    const internalSyncKey = Deno.env.get("USAGE_SYNC_INTERNAL_KEY") || "";

    // Auth check
    const isInternalSync = body?.internal === true;
    if (isInternalSync) {
      if (String(body?.internal_key || "") !== internalSyncKey) {
        return new Response(
          JSON.stringify({ success: false, error: "Chave interna inválida" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      const authHeader = req.headers.get("Authorization") || "";
      if (!authHeader) {
        return new Response(
          JSON.stringify({ success: false, error: "Token não fornecido" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const projectRef = configuredProjectRef || parseProjectRefFromUrl(supabaseUrl);
    if (!projectRef) {
      return new Response(
        JSON.stringify({ success: false, error: "Project ref não determinado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try to get usage data
    const authToken = managementToken || dashboardJwt;
    const url = `https://api.supabase.com/platform/projects/${projectRef}/usage`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    const rawText = await response.text().catch(() => "{}");
    let payload: any = null;
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = null;
    }

    const found = walkForCandidate(payload);
    
    if (!found || found.usedGb === null) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Não foi possível extrair dados de egress",
          api_status: response.status,
          has_payload: !!payload
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const snapshot = {
      used_gb: found.usedGb,
      days_elapsed: found.daysElapsed || BILLING_PERIOD_DAYS,
      period_days: BILLING_PERIOD_DAYS,
      updated_at: new Date().toISOString(),
    };

    // Save snapshot
    await serviceClient
      .from("site_config")
      .upsert(
        { config_key: SNAPSHOT_CONFIG_KEY, config_value: snapshot },
        { onConflict: "config_key" }
      );

    // Send WhatsApp if requested
    let whatsappReportSent = false;
    let whatsappReportError: string | null = null;

    if (body?.send_whatsapp === true) {
      try {
        const { data: waData } = await serviceClient
          .from("site_config")
          .select("config_value")
          .eq("config_key", EGRESS_WHATSAPP_CONFIG_KEY)
          .maybeSingle();

        const waConfig = (waData?.config_value || {}) as any;
        if (waConfig?.enabled && waConfig?.phone_number) {
          const wa = await getActiveWhatsAppConfig(serviceClient);
          if (wa) {
            const msg = buildEgressWhatsappMessage(snapshot);
            await sendEvolutionMessage(wa, normalizePhone(waConfig.phone_number), msg);
            whatsappReportSent = true;
          }
        }
      } catch (err: any) {
        whatsappReportError = err?.message || "Erro WhatsApp";
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        snapshot,
        whatsapp_report_sent: whatsappReportSent,
        whatsapp_report_error: whatsappReportError,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error?.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
