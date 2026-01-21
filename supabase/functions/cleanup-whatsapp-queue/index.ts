import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[Cleanup Queue] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({
          success: false,
          error: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados nas variáveis de ambiente.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Contar quantos registros existem antes de limpar
    const { count, error: countError } = await supabase
      .from("whatsapp_notifications_queue")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("[Cleanup Queue] Error counting rows:", countError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Erro ao contar registros da fila.",
          details: countError.message,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Se não tiver nada, apenas retornar
    if (!count || count === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          deleted: 0,
          message: "Fila já estava vazia.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[Cleanup Queue] Deleting ${count} rows from whatsapp_notifications_queue...`);

    // Deletar todos os registros (usa um filtro neutro para evitar delete sem WHERE)
    const { error: deleteError } = await supabase
      .from("whatsapp_notifications_queue")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (deleteError) {
      console.error("[Cleanup Queue] Error deleting rows:", deleteError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Erro ao limpar fila de WhatsApp.",
          details: deleteError.message,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("[Cleanup Queue] Queue cleaned successfully.");

    return new Response(
      JSON.stringify({
        success: true,
        deleted: count,
        message: `Fila limpa com sucesso. Registros removidos: ${count}`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("[Cleanup Queue] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || "Erro desconhecido ao limpar fila.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

