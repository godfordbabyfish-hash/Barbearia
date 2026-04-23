// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type DailyReportConfig = {
  enabled: boolean;
  schedule_time: string;
  weekly_enabled?: boolean;
  weekly_schedule_time?: string;
  weekly_day_of_week?: number;
  monthly_enabled?: boolean;
  monthly_schedule_time?: string;
  monthly_day_of_month?: number;
  phone_number: string;
  include_insights?: boolean;
  include_roi?: boolean;
  include_goals?: boolean;
  goals?: {
    daily_gross_revenue?: number;
    weekly_gross_revenue?: number;
    monthly_gross_revenue?: number;
    week_starts_on?: "monday";
  };
  last_sent?: string;
  last_sent_weekly?: string;
  last_sent_monthly?: string;
};

type ReportType = "daily" | "weekly" | "monthly";

type ReportLogStatus = "success" | "error" | "skipped";

type ServiceMap = Record<string, { title: string; price: number }>;

const logReportEvent = async (
  supabase: any,
  params: {
    reportType: ReportType;
    status: ReportLogStatus;
    targetPhone: string;
    periodStart?: string;
    periodEnd?: string;
    grossRevenue?: number;
    netProfit?: number;
    roi?: number;
    goalsDailyPct?: number;
    goalsWeeklyPct?: number;
    goalsMonthlyPct?: number;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  }
) => {
  const {
    reportType,
    status,
    targetPhone,
    periodStart,
    periodEnd,
    grossRevenue,
    netProfit,
    roi,
    goalsDailyPct,
    goalsWeeklyPct,
    goalsMonthlyPct,
    errorMessage,
    metadata,
  } = params;

  try {
    await supabase.from("whatsapp_report_logs").insert({
      report_type: reportType,
      status,
      phone_number: targetPhone,
      period_start: periodStart ?? null,
      period_end: periodEnd ?? null,
      gross_revenue: Number(grossRevenue || 0),
      net_profit: Number(netProfit || 0),
      roi: Number(roi || 0),
      goals_daily_pct: Number(goalsDailyPct || 0),
      goals_weekly_pct: Number(goalsWeeklyPct || 0),
      goals_monthly_pct: Number(goalsMonthlyPct || 0),
      error_message: errorMessage ?? null,
      metadata: metadata || {},
    });
  } catch (logError) {
    console.error("Error writing whatsapp_report_logs:", logError);
  }
};

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

const formatMoney = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const toPercent = (value: number) => `${value.toFixed(1)}%`;

const getGoalStatusSymbol = (achieved: number, goal: number) => {
  if (!goal || goal <= 0) return "⚪";
  const ratio = achieved / goal;
  if (ratio >= 1) return "✅";
  if (ratio >= 0.7) return "⚠️";
  return "🛑";
};

const getWeekRangeMondaySunday = (baseDateString: string) => {
  const base = new Date(`${baseDateString}T00:00:00`);
  const day = base.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const start = new Date(base);
  start.setDate(base.getDate() + diffToMonday);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const toDate = (d: Date) => d.toISOString().split("T")[0];
  return { start: toDate(start), end: toDate(end) };
};

const getMonthRange = (baseDateString: string) => {
  const base = new Date(`${baseDateString}T00:00:00`);
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  const toDate = (d: Date) => d.toISOString().split("T")[0];
  return { start: toDate(start), end: toDate(end) };
};

const parseTimeToMinutes = (hhmm: string) => {
  const [h, m] = (hhmm || "00:00").split(":").map((n) => Number(n || 0));
  return h * 60 + m;
};

const getDaysInMonth = (dateString: string) => {
  const [year, month] = dateString.split("-").map((v) => Number(v));
  return new Date(year, month, 0).getDate();
};

const getWeekday = (dateString: string) => new Date(`${dateString}T00:00:00`).getDay();

const getDayOfMonth = (dateString: string) => Number(dateString.split("-")[2] || 1);

const getRangeForType = (dateString: string, reportType: ReportType) => {
  if (reportType === "daily") {
    return { start: dateString, end: dateString };
  }
  if (reportType === "weekly") {
    return getWeekRangeMondaySunday(dateString);
  }
  return getMonthRange(dateString);
};

const normalizeConfig = (cfg: DailyReportConfig): DailyReportConfig => ({
  ...cfg,
  weekly_enabled: Boolean(cfg.weekly_enabled),
  weekly_schedule_time: cfg.weekly_schedule_time || "21:00",
  weekly_day_of_week: Number.isFinite(Number(cfg.weekly_day_of_week)) ? Number(cfg.weekly_day_of_week) : 0,
  monthly_enabled: Boolean(cfg.monthly_enabled),
  monthly_schedule_time: cfg.monthly_schedule_time || "21:00",
  monthly_day_of_month: Number.isFinite(Number(cfg.monthly_day_of_month)) ? Number(cfg.monthly_day_of_month) : 1,
  include_goals: cfg.include_goals !== false,
  include_insights: cfg.include_insights !== false,
  include_roi: cfg.include_roi !== false,
});

const getLastSentKeyByType = (reportType: ReportType) => {
  if (reportType === "weekly") return "last_sent_weekly";
  if (reportType === "monthly") return "last_sent_monthly";
  return "last_sent";
};

const isAlreadySentForType = (cfg: DailyReportConfig, reportType: ReportType, nowDate: string) => {
  const key = getLastSentKeyByType(reportType);
  const raw = (cfg as any)?.[key] as string | undefined;
  if (!raw) return false;

  const sentDate = getLocalDateTimeParts(new Date(raw)).date;
  if (reportType === "daily") {
    return sentDate === nowDate;
  }
  if (reportType === "weekly") {
    const nowWeek = getWeekRangeMondaySunday(nowDate);
    const sentWeek = getWeekRangeMondaySunday(sentDate);
    return nowWeek.start === sentWeek.start;
  }
  const [nowYearMonth] = [nowDate.slice(0, 7)];
  const [sentYearMonth] = [sentDate.slice(0, 7)];
  return nowYearMonth === sentYearMonth;
};

const shouldSendBySchedule = (cfg: DailyReportConfig, reportType: ReportType, nowDate: string, nowTime: string) => {
  const nowMinutes = parseTimeToMinutes(nowTime);

  if (reportType === "daily") {
    if (!cfg.enabled) return false;
    return nowMinutes >= parseTimeToMinutes(cfg.schedule_time || "22:00");
  }

  if (reportType === "weekly") {
    if (!cfg.weekly_enabled) return false;
    if (getWeekday(nowDate) !== Number(cfg.weekly_day_of_week || 0)) return false;
    return nowMinutes >= parseTimeToMinutes(cfg.weekly_schedule_time || "21:00");
  }

  if (!cfg.monthly_enabled) return false;
  const daysInMonth = getDaysInMonth(nowDate);
  const targetDay = Math.min(daysInMonth, Math.max(1, Number(cfg.monthly_day_of_month || 1)));
  if (getDayOfMonth(nowDate) !== targetDay) return false;
  return nowMinutes >= parseTimeToMinutes(cfg.monthly_schedule_time || "21:00");
};

const getPeriodLabel = (reportType: ReportType, startDate: string, endDate: string) => {
  const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("pt-BR");
  if (reportType === "daily") return fmt(startDate);
  if (reportType === "weekly") return `${fmt(startDate)} a ${fmt(endDate)}`;
  return new Date(`${startDate}T00:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
};

const chunkArray = <T,>(items: T[], chunkSize: number): T[][] => {
  if (items.length <= chunkSize) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
};

const buildServicesMap = async (supabase: any, serviceIds: string[]): Promise<ServiceMap> => {
  if (!serviceIds.length) return {};
  const map: ServiceMap = {};

  for (const idsChunk of chunkArray(serviceIds, 200)) {
    const { data, error } = await supabase
      .from("services")
      .select("id, title, price")
      .in("id", idsChunk);

    if (error) throw error;

    for (const item of data || []) {
      map[item.id] = {
        title: item.title || "Serviço",
        price: Number(item.price || 0),
      };
    }
  }

  return map;
};

const computeServiceRevenue = async (supabase: any, appointments: any[]) => {
  if (!appointments.length) {
    return {
      grossServices: 0,
      serviceCommissions: 0,
      appointmentCount: 0,
      servicesCounter: {} as Record<string, { qty: number; revenue: number }>,
      uniqueClients: 0,
      averageTicket: 0,
    };
  }

  const serviceIds = Array.from(new Set(appointments.map((a) => a.service_id).filter(Boolean)));
  const appointmentIds = appointments.map((a) => a.id);

  const servicesMap = await buildServicesMap(supabase, serviceIds);

  const paymentsByAppointment = new Map<string, number>();

  for (const idsChunk of chunkArray(appointmentIds, 200)) {
    const paymentsResult = await supabase
      .from("appointment_payments")
      .select("appointment_id, amount")
      .in("appointment_id", idsChunk);

    if (paymentsResult.error) throw paymentsResult.error;

    for (const payment of paymentsResult.data || []) {
      const current = paymentsByAppointment.get(payment.appointment_id) || 0;
      paymentsByAppointment.set(payment.appointment_id, current + Number(payment.amount || 0));
    }
  }

  let grossServices = 0;
  let serviceCommissions = 0;
  const servicesCounter: Record<string, { qty: number; revenue: number }> = {};
  const clients = new Set<string>();

  for (const apt of appointments) {
    const fallbackPrice = Number(servicesMap[apt.service_id]?.price || 0);
    const paid = Number(paymentsByAppointment.get(apt.id) || 0);
    const serviceRevenue = paid > 0 ? paid : fallbackPrice;

    grossServices += serviceRevenue;
    serviceCommissions += serviceRevenue * 0.5;

    const serviceName = servicesMap[apt.service_id]?.title || "Serviço";
    if (!servicesCounter[serviceName]) servicesCounter[serviceName] = { qty: 0, revenue: 0 };
    servicesCounter[serviceName].qty += 1;
    servicesCounter[serviceName].revenue += serviceRevenue;

    if (apt.client_id) clients.add(apt.client_id);
  }

  return {
    grossServices,
    serviceCommissions,
    appointmentCount: appointments.length,
    servicesCounter,
    uniqueClients: clients.size,
    averageTicket: appointments.length > 0 ? grossServices / appointments.length : 0,
  };
};

const loadAppointmentsInRange = async (supabase: any, dateStart: string, dateEnd: string) => {
  const { data, error } = await supabase
    .from("appointments")
    .select("id, service_id, client_id")
    .in("status", ["completed", "confirmed"])
    .gte("appointment_date", dateStart)
    .lte("appointment_date", dateEnd);

  if (error) throw error;
  return data || [];
};

const loadProductSalesInRange = async (supabase: any, dateStart: string, dateEnd: string) => {
  const { data, error } = await supabase
    .from("product_sales")
    .select("id, total_price, commission_value")
    .eq("status", "confirmed")
    .gte("sale_date", dateStart)
    .lte("sale_date", dateEnd);

  if (error) throw error;
  return data || [];
};

const loadExpensesInRange = async (supabase: any, dateStart: string, dateEnd: string) => {
  const { data, error } = await supabase
    .from("operational_expenses")
    .select("id, amount")
    .eq("status", "confirmed")
    .gte("expense_date", dateStart)
    .lte("expense_date", dateEnd);

  if (error) throw error;
  return data || [];
};

const loadRevenueForRange = async (supabase: any, dateStart: string, dateEnd: string) => {
  const [appointments, sales] = await Promise.all([
    loadAppointmentsInRange(supabase, dateStart, dateEnd),
    loadProductSalesInRange(supabase, dateStart, dateEnd),
  ]);

  const serviceData = await computeServiceRevenue(supabase, appointments);
  const productGross = sales.reduce((sum: number, s: any) => sum + Number(s.total_price || 0), 0);

  return serviceData.grossServices + productGross;
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

const getDailyReportConfig = async (supabase: any): Promise<DailyReportConfig | null> => {
  const { data, error } = await supabase
    .from("site_config")
    .select("config_value")
    .eq("config_key", "whatsapp_daily_report")
    .maybeSingle();

  if (error || !data?.config_value) return null;
  return data.config_value as DailyReportConfig;
};

const saveDailyReportConfig = async (supabase: any, config: DailyReportConfig) => {
  const { error } = await supabase
    .from("site_config")
    .upsert(
      {
        config_key: "whatsapp_daily_report",
        config_value: config,
      },
      { onConflict: "config_key" }
    );

  if (error) throw error;
};

const buildInsights = (params: {
  reportType: ReportType;
  grossRevenue: number;
  goalTarget: number;
  averageTicket: number;
  comparisonRevenue: number;
  comparisonLabel: string;
  netProfit: number;
  expenses: number;
}) => {
  const { reportType, grossRevenue, goalTarget, averageTicket, comparisonRevenue, comparisonLabel, netProfit, expenses } = params;
  const lines: string[] = [];

  const goalName = reportType === "daily" ? "diária" : reportType === "weekly" ? "semanal" : "mensal";
  const periodLabel = reportType === "daily" ? "dia" : reportType === "weekly" ? "semana" : "mês";

  if (goalTarget > 0) {
    const ratio = (grossRevenue / goalTarget) * 100;
    if (ratio >= 100) {
      lines.push(`Meta ${goalName} superada em ${toPercent(ratio - 100)}.`);
    } else {
      lines.push(`Meta ${goalName} atingida em ${toPercent(ratio)}.`);
    }
  }

  if (comparisonRevenue > 0) {
    const diff = grossRevenue - comparisonRevenue;
    const diffPct = Math.abs(diff / comparisonRevenue) * 100;
    lines.push(
      diff >= 0
        ? `Faturamento ${toPercent(diffPct)} acima de ${comparisonLabel}.`
        : `Faturamento ${toPercent(diffPct)} abaixo de ${comparisonLabel}.`
    );
  }

  if (averageTicket > 0) {
    lines.push(`Ticket médio do ${periodLabel}: ${formatMoney(averageTicket)}.`);
  }

  if (expenses > 0) {
    const expenseRatio = grossRevenue > 0 ? (expenses / grossRevenue) * 100 : 0;
    lines.push(`Despesas operacionais representam ${toPercent(expenseRatio)} do faturamento bruto.`);
  }

  if (netProfit < 0) {
    lines.push("Lucro líquido negativo no dia: atenção ao controle de custos e comissões.");
  }

  return lines.slice(0, 4);
};

const generateMessage = (params: {
  reportType: ReportType;
  periodLabel: string;
  localDate: string;
  metrics: {
    appointmentsCount: number;
    grossServices: number;
    grossProducts: number;
    grossRevenue: number;
    serviceCommissions: number;
    productCommissions: number;
    totalCommissions: number;
    expenses: number;
    netProfit: number;
    roi: number;
    averageTicket: number;
    uniqueClients: number;
  };
  topServices: Array<{ name: string; qty: number; revenue: number }>;
  goalsProgress: {
    daily: { goal: number; achieved: number; percent: number };
    weekly: { goal: number; achieved: number; percent: number };
    monthly: { goal: number; achieved: number; percent: number };
  };
  includeGoals: boolean;
  includeRoi: boolean;
  includeInsights: boolean;
  insights: string[];
}) => {
  const {
    reportType,
    periodLabel,
    localDate,
    metrics,
    topServices,
    goalsProgress,
    includeGoals,
    includeRoi,
    includeInsights,
    insights,
  } = params;

  const lines: string[] = [];
  const title = reportType === "daily" ? "📊 *Resumo Diário*" : reportType === "weekly" ? "📊 *Resumo Semanal*" : "📊 *Resumo Mensal*";
  lines.push(title);
  lines.push(`🗓️ ${periodLabel || new Date(`${localDate}T00:00:00`).toLocaleDateString("pt-BR")}`);
  lines.push("");

  lines.push("*Números principais*");
  lines.push(`💰 Bruto: ${formatMoney(metrics.grossRevenue)}`);
  lines.push(`✂️ Comissões: ${formatMoney(metrics.totalCommissions)}`);
  lines.push(`🧾 Despesas: ${formatMoney(metrics.expenses)}`);
  lines.push(`🏦 Líquido: ${formatMoney(metrics.netProfit)}`);
  lines.push(`👥 Clientes: ${metrics.uniqueClients} | 📌 Atend.: ${metrics.appointmentsCount}`);

  if (includeRoi) {
    lines.push(`📈 ROI: ${toPercent(metrics.roi)}`);
  }

  lines.push(`🎯 Ticket médio: ${formatMoney(metrics.averageTicket)}`);

  if (topServices.length > 0) {
    lines.push("");
    lines.push(`*Top serviços (${reportType === "daily" ? "dia" : reportType === "weekly" ? "semana" : "mês"})*`);
    topServices.slice(0, 3).forEach((item, idx) => {
      lines.push(`${idx + 1}. ${item.name} — ${item.qty}x (${formatMoney(item.revenue)})`);
    });
  }

  if (includeGoals) {
    const dailySymbol = getGoalStatusSymbol(goalsProgress.daily.achieved, goalsProgress.daily.goal);
    const weeklySymbol = getGoalStatusSymbol(goalsProgress.weekly.achieved, goalsProgress.weekly.goal);
    const monthlySymbol = getGoalStatusSymbol(goalsProgress.monthly.achieved, goalsProgress.monthly.goal);

    lines.push("");
    lines.push("*Metas (faturamento bruto)*");
    lines.push(
      `${dailySymbol} Dia: ${formatMoney(goalsProgress.daily.achieved)} / ${formatMoney(goalsProgress.daily.goal)} (${toPercent(
        goalsProgress.daily.percent
      )})`
    );
    lines.push(
      `${weeklySymbol} Semana: ${formatMoney(goalsProgress.weekly.achieved)} / ${formatMoney(
        goalsProgress.weekly.goal
      )} (${toPercent(goalsProgress.weekly.percent)})`
    );
    lines.push(
      `${monthlySymbol} Mês: ${formatMoney(goalsProgress.monthly.achieved)} / ${formatMoney(goalsProgress.monthly.goal)} (${toPercent(
        goalsProgress.monthly.percent
      )})`
    );
  }

  if (includeInsights && insights.length > 0) {
    lines.push("");
    lines.push("*Insights automáticos* 📌");
    insights.forEach((text) => lines.push(`• ${text}`));
  }

  return lines.join("\n");
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurado");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const body = await req.json().catch(() => ({}));
    const forceSendNow = body?.action === "send-now";
    const requestedType = (body?.report_type || "daily") as ReportType;

    const [waConfig, reportConfig] = await Promise.all([
      getActiveWhatsAppConfig(supabase),
      getDailyReportConfig(supabase),
    ]);

    if (!waConfig) {
      return new Response(
        JSON.stringify({ success: false, error: "Instância WhatsApp não configurada/ativa" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!reportConfig) {
      return new Response(
        JSON.stringify({ success: false, error: "Configuração do relatório diário não encontrada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const nowLocal = getLocalDateTimeParts();
    const cfg = normalizeConfig(reportConfig);

    const targetPhone = normalizePhone(reportConfig.phone_number || "");
    if (!targetPhone) {
      return new Response(JSON.stringify({ success: false, error: "Número de destino não configurado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const goals = cfg.goals || {};
    const dailyGoal = Number(goals.daily_gross_revenue || 0);
    const weeklyGoal = Number(goals.weekly_gross_revenue || 0);
    const monthlyGoal = Number(goals.monthly_gross_revenue || 0);

    const weekRange = getWeekRangeMondaySunday(nowLocal.date);
    const monthRange = getMonthRange(nowLocal.date);

    const [weeklyAchieved, monthlyAchieved] = await Promise.all([
      loadRevenueForRange(supabase, weekRange.start, weekRange.end),
      loadRevenueForRange(supabase, monthRange.start, monthRange.end),
    ]);

    const dailyAchieved = await loadRevenueForRange(supabase, nowLocal.date, nowLocal.date);

    const previous7Start = (() => {
      const d = new Date(`${nowLocal.date}T00:00:00`);
      d.setDate(d.getDate() - 7);
      return d.toISOString().split("T")[0];
    })();

    const previousDay = (() => {
      const d = new Date(`${nowLocal.date}T00:00:00`);
      d.setDate(d.getDate() - 1);
      return d.toISOString().split("T")[0];
    })();

    const previous7Revenue = await loadRevenueForRange(supabase, previous7Start, previousDay);
    const previous7Average = previous7Revenue / 7;

    const reportTypes: ReportType[] = forceSendNow ? [requestedType] : ["daily", "weekly", "monthly"];
    const sendResults: any[] = [];
    const sendErrors: any[] = [];
    let updatedConfig: DailyReportConfig = { ...cfg };

    for (const reportType of reportTypes) {
      if (!forceSendNow) {
        if (!shouldSendBySchedule(cfg, reportType, nowLocal.date, nowLocal.time)) {
          continue;
        }
        if (isAlreadySentForType(cfg, reportType, nowLocal.date)) {
          continue;
        }
      }

      try {
        const range = getRangeForType(nowLocal.date, reportType);
        const [appointments, sales, expenses] = await Promise.all([
          loadAppointmentsInRange(supabase, range.start, range.end),
          loadProductSalesInRange(supabase, range.start, range.end),
          loadExpensesInRange(supabase, range.start, range.end),
        ]);

        const serviceData = await computeServiceRevenue(supabase, appointments);
        const grossProducts = sales.reduce((sum: number, s: any) => sum + Number(s.total_price || 0), 0);
        const productCommissions = sales.reduce((sum: number, s: any) => sum + Number(s.commission_value || 0), 0);
        const totalCommissions = serviceData.serviceCommissions + productCommissions;
        const expensesTotal = expenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
        const grossRevenue = serviceData.grossServices + grossProducts;
        const netProfit = grossRevenue - totalCommissions - expensesTotal;
        const roi = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

        const goalsProgress = {
          daily: {
            goal: dailyGoal,
            achieved: reportType === "daily" ? grossRevenue : dailyAchieved,
            percent: 0,
          },
          weekly: {
            goal: weeklyGoal,
            achieved: reportType === "weekly" ? grossRevenue : weeklyAchieved,
            percent: 0,
          },
          monthly: {
            goal: monthlyGoal,
            achieved: reportType === "monthly" ? grossRevenue : monthlyAchieved,
            percent: 0,
          },
        };

        goalsProgress.daily.percent = dailyGoal > 0 ? (goalsProgress.daily.achieved / dailyGoal) * 100 : 0;
        goalsProgress.weekly.percent = weeklyGoal > 0 ? (goalsProgress.weekly.achieved / weeklyGoal) * 100 : 0;
        goalsProgress.monthly.percent = monthlyGoal > 0 ? (goalsProgress.monthly.achieved / monthlyGoal) * 100 : 0;

        const topServices = Object.entries(serviceData.servicesCounter)
          .map(([name, data]) => ({ name, qty: data.qty, revenue: data.revenue }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 3);

        let comparisonBase = previous7Average;
        let comparisonLabel = "média diária dos últimos 7 dias";
        if (reportType === "weekly") {
          const currentWeekStart = new Date(`${range.start}T00:00:00`);
          const prevWeekStart = new Date(currentWeekStart);
          prevWeekStart.setDate(currentWeekStart.getDate() - 7);
          const prevWeekEnd = new Date(currentWeekStart);
          prevWeekEnd.setDate(currentWeekStart.getDate() - 1);
          comparisonBase = await loadRevenueForRange(
            supabase,
            prevWeekStart.toISOString().split("T")[0],
            prevWeekEnd.toISOString().split("T")[0]
          );
          comparisonLabel = "a semana anterior";
        } else if (reportType === "monthly") {
          const startDate = new Date(`${range.start}T00:00:00`);
          const prevMonthStart = new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1);
          const prevMonthEnd = new Date(startDate.getFullYear(), startDate.getMonth(), 0);
          comparisonBase = await loadRevenueForRange(
            supabase,
            prevMonthStart.toISOString().split("T")[0],
            prevMonthEnd.toISOString().split("T")[0]
          );
          comparisonLabel = "o mês anterior";
        }

        const goalTarget = reportType === "daily" ? dailyGoal : reportType === "weekly" ? weeklyGoal : monthlyGoal;

        const insights = buildInsights({
          reportType,
          grossRevenue,
          goalTarget,
          averageTicket: serviceData.averageTicket,
          comparisonRevenue: comparisonBase,
          comparisonLabel,
          netProfit,
          expenses: expensesTotal,
        });

        const message = generateMessage({
          reportType,
          periodLabel: getPeriodLabel(reportType, range.start, range.end),
          localDate: nowLocal.date,
          metrics: {
            appointmentsCount: serviceData.appointmentCount,
            grossServices: serviceData.grossServices,
            grossProducts,
            grossRevenue,
            serviceCommissions: serviceData.serviceCommissions,
            productCommissions,
            totalCommissions,
            expenses: expensesTotal,
            netProfit,
            roi,
            averageTicket: serviceData.averageTicket,
            uniqueClients: serviceData.uniqueClients,
          },
          topServices,
          goalsProgress,
          includeGoals: Boolean(cfg.include_goals),
          includeRoi: Boolean(cfg.include_roi),
          includeInsights: Boolean(cfg.include_insights),
          insights,
        });

        const sendResult = await sendEvolutionMessage(waConfig, targetPhone, message);
        const sentAt = new Date().toISOString();
        (updatedConfig as any)[getLastSentKeyByType(reportType)] = sentAt;

        await logReportEvent(supabase, {
          reportType,
          status: "success",
          targetPhone,
          periodStart: range.start,
          periodEnd: range.end,
          grossRevenue,
          netProfit,
          roi,
          goalsDailyPct: goalsProgress.daily.percent,
          goalsWeeklyPct: goalsProgress.weekly.percent,
          goalsMonthlyPct: goalsProgress.monthly.percent,
          metadata: {
            appointmentsCount: serviceData.appointmentCount,
            productSalesCount: sales.length,
            expensesCount: expenses.length,
          },
        });

        sendResults.push({
          reportType,
          range,
          metrics: {
            grossRevenue,
            totalCommissions,
            expensesTotal,
            netProfit,
            roi,
          },
          sendResult,
        });
      } catch (reportError) {
        const reportMessage = reportError instanceof Error ? reportError.message : String(reportError);
        sendErrors.push({ reportType, error: reportMessage });

        const range = getRangeForType(nowLocal.date, reportType);
        await logReportEvent(supabase, {
          reportType,
          status: "error",
          targetPhone,
          periodStart: range.start,
          periodEnd: range.end,
          errorMessage: reportMessage,
        });
      }
    }

    if (sendResults.length === 0) {
      return new Response(
        JSON.stringify({
          success: sendErrors.length === 0,
          skipped: sendErrors.length === 0,
          reason: sendErrors.length === 0 ? (forceSendNow ? "no-data-or-config" : "no-report-due-now") : "all-report-sends-failed",
          errors: sendErrors,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await saveDailyReportConfig(supabase, updatedConfig);

    return new Response(
      JSON.stringify({
        success: true,
        sent_to: targetPhone,
        date: nowLocal.date,
        reports_sent: sendResults,
        report_errors: sendErrors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in whatsapp-daily-report:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro interno no relatório diário",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
