// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_BUCKET = Deno.env.get("STORAGE_BUCKET") || "appointment-photos";
const DEFAULT_RETENTION_DAYS = Number.parseInt(Deno.env.get("PHOTO_RETENTION_DAYS") || "90", 10);
const DEFAULT_BATCH_SIZE = Math.min(500, Math.max(50, Number.parseInt(Deno.env.get("PHOTO_CLEANUP_BATCH_SIZE") || "200", 10)));

type PhotoRef = {
  table: "appointments" | "product_sales";
  id: string;
  photo_url: string;
};

const parseBucketPath = (publicUrl: string, bucket: string): string | null => {
  try {
    const parsed = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = parsed.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(parsed.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
};

const chunk = <T>(arr: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

const fetchOldAppointmentPhotos = async (supabase: any, cutoffDate: string): Promise<PhotoRef[]> => {
  const rows: PhotoRef[] = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("appointments")
      .select("id, photo_url")
      .not("photo_url", "is", null)
      .lte("appointment_date", cutoffDate)
      .range(from, to);

    if (error) throw error;
    if (!data?.length) break;

    for (const item of data) {
      if (item.photo_url) {
        rows.push({ table: "appointments", id: item.id, photo_url: item.photo_url });
      }
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
};

const fetchOldProductSalePhotos = async (supabase: any, cutoffDate: string): Promise<PhotoRef[]> => {
  const rows: PhotoRef[] = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("product_sales")
      .select("id, photo_url")
      .not("photo_url", "is", null)
      .lte("sale_date", cutoffDate)
      .range(from, to);

    if (error) throw error;
    if (!data?.length) break;

    for (const item of data) {
      if (item.photo_url) {
        rows.push({ table: "product_sales", id: item.id, photo_url: item.photo_url });
      }
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
};

const clearPhotoUrlBatch = async (supabase: any, table: "appointments" | "product_sales", ids: string[]) => {
  if (!ids.length) return;
  const { error } = await supabase
    .from(table)
    .update({ photo_url: null })
    .in("id", ids);

  if (error) throw error;
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const retentionDays = Number.parseInt(String(body?.retention_days ?? DEFAULT_RETENTION_DAYS), 10);
    const bucket = String(body?.bucket || DEFAULT_BUCKET);
    const apply = body?.apply !== false;

    if (!retentionDays || retentionDays < 1) {
      return new Response(
        JSON.stringify({ success: false, error: "retention_days inválido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const cutoffDate = cutoff.toISOString().slice(0, 10);

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const [appointmentRefs, productSaleRefs] = await Promise.all([
      fetchOldAppointmentPhotos(supabase, cutoffDate),
      fetchOldProductSalePhotos(supabase, cutoffDate),
    ]);

    const allRefs = [...appointmentRefs, ...productSaleRefs];

    if (!allRefs.length) {
      return new Response(
        JSON.stringify({
          success: true,
          deleted_files: 0,
          cleared_rows: 0,
          retention_days: retentionDays,
          cutoff_date: cutoffDate,
          message: "Nenhuma imagem antiga encontrada para limpeza.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pathToRefs = new Map<string, PhotoRef[]>();

    for (const ref of allRefs) {
      const path = parseBucketPath(ref.photo_url, bucket);
      if (!path) continue;
      const list = pathToRefs.get(path) || [];
      list.push(ref);
      pathToRefs.set(path, list);
    }

    const uniquePaths = [...pathToRefs.keys()];

    if (!apply) {
      return new Response(
        JSON.stringify({
          success: true,
          dry_run: true,
          retention_days: retentionDays,
          cutoff_date: cutoffDate,
          candidate_rows: allRefs.length,
          candidate_files: uniquePaths.length,
          sample_paths: uniquePaths.slice(0, 20),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let deletedFiles = 0;
    const failedDeleteBatches: string[] = [];
    const deletedPaths = new Set<string>();

    for (const batch of chunk(uniquePaths, DEFAULT_BATCH_SIZE)) {
      const { error } = await supabase.storage.from(bucket).remove(batch);
      if (error) {
        failedDeleteBatches.push(error.message);
        continue;
      }
      deletedFiles += batch.length;
      for (const path of batch) deletedPaths.add(path);
    }

    const appointmentIdsToClear = new Set<string>();
    const productSaleIdsToClear = new Set<string>();

    for (const deletedPath of deletedPaths) {
      const refs = pathToRefs.get(deletedPath) || [];
      for (const ref of refs) {
        if (ref.table === "appointments") appointmentIdsToClear.add(ref.id);
        if (ref.table === "product_sales") productSaleIdsToClear.add(ref.id);
      }
    }

    const appointmentIdChunks = chunk([...appointmentIdsToClear], DEFAULT_BATCH_SIZE);
    for (const ids of appointmentIdChunks) {
      await clearPhotoUrlBatch(supabase, "appointments", ids);
    }

    const productSaleIdChunks = chunk([...productSaleIdsToClear], DEFAULT_BATCH_SIZE);
    for (const ids of productSaleIdChunks) {
      await clearPhotoUrlBatch(supabase, "product_sales", ids);
    }

    const clearedRows = appointmentIdsToClear.size + productSaleIdsToClear.size;

    return new Response(
      JSON.stringify({
        success: true,
        retention_days: retentionDays,
        cutoff_date: cutoffDate,
        candidate_rows: allRefs.length,
        candidate_files: uniquePaths.length,
        deleted_files: deletedFiles,
        cleared_rows: clearedRows,
        cleared_appointments: appointmentIdsToClear.size,
        cleared_product_sales: productSaleIdsToClear.size,
        failed_delete_batches: failedDeleteBatches,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[cleanup-appointment-photos] error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || "Erro interno na limpeza de fotos." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
