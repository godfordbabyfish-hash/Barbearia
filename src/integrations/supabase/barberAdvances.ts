import { supabase } from "./client";

export type BarberAdvanceStatus = "pending" | "approved" | "rejected";

export interface BarberAdvance {
  id: string;
  barber_id: string;
  amount: number;
  description: string | null;
  requested_by: string;
  status: BarberAdvanceStatus;
  effective_date: string;
  approved_at: string | null;
  approved_by: string | null;
  digital_signature: any | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBarberAdvanceInput {
  barber_id: string;
  amount: number;
  description?: string;
  effective_date?: string; // yyyy-mm-dd
}

export const createAdvance = async (input: CreateBarberAdvanceInput) => {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) {
    return { data: null, error: new Error("Usuário não autenticado") };
  }

  const { data, error } = await (supabase as any)
    .from("barber_advances")
    .insert({
      barber_id: input.barber_id,
      amount: input.amount,
      description: input.description || null,
      effective_date: input.effective_date || new Date().toISOString().split("T")[0],
      requested_by: user.id,
      status: "pending",
    })
    .select("*")
    .single();

  return { data: data as BarberAdvance | null, error };
};

export const listAdvancesAdmin = async (options?: {
  barberId?: string;
  status?: BarberAdvanceStatus | "all";
}) => {
  let query = (supabase as any)
    .from("barber_advances")
    // Selecionar apenas os campos da própria tabela; 
    // dados adicionais (nome do barbeiro, etc.) são carregados separadamente se necessário.
    .select("*")
    .order("created_at", { ascending: false });

  if (options?.barberId) {
    query = query.eq("barber_id", options.barberId);
  }
  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }
  const { data, error } = await query;
  return { data: (data as BarberAdvance[]) || [], error };
};

export const listAdvancesByBarber = async (barberId: string) => {
  const { data, error } = await (supabase as any)
    .from("barber_advances")
    .select("*")
    .eq("barber_id", barberId)
    .order("created_at", { ascending: false });

  return { data: (data as BarberAdvance[]) || [], error };
};

export const approveAdvance = async (
  advanceId: string,
  signatureMeta: Record<string, any>
) => {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) {
    return { error: new Error("Usuário não autenticado") };
  }

  // Approval time is authoritative in Postgres. Ignore any timestamp supplied
  // by callers (or the browser clock) and let the database trigger populate it.
  const { approved_at: _clientApprovedAt, ...signatureDetails } = signatureMeta;
  const digital_signature = {
    ...signatureDetails,
    approved_by: user.id,
  };

  const { error } = await (supabase as any)
    .from("barber_advances")
    .update({
      status: "approved",
      approved_by: user.id,
      digital_signature,
    })
    .eq("id", advanceId);

  return { error };
};

export const rejectAdvance = async (advanceId: string) => {
  const { error } = await (supabase as any)
    .from("barber_advances")
    .update({
      status: "rejected",
    })
    .eq("id", advanceId);

  return { error };
};

