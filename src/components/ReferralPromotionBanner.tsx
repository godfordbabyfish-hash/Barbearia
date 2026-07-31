import { useEffect, useState } from "react";
import { Copy, Gift, MessageCircle, Sparkles, TicketCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type ReferralProgramConfig = {
  enabled?: boolean;
  discount_percent?: number;
  credit_base_amount?: number;
};

export default function ReferralPromotionBanner() {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [discountPercent, setDiscountPercent] = useState(50);
  const [creditAmount, setCreditAmount] = useState(12.5);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!user) return;

    let active = true;
    const loadCampaign = async () => {
      const [profileResult, configResult] = await Promise.all([
        supabase.from("profiles").select("referral_code").eq("id", user.id).maybeSingle(),
        supabase.from("site_config").select("config_value").eq("config_key", "referral_program").maybeSingle(),
      ]);
      if (!active) return;
      const config = (configResult.data?.config_value || {}) as ReferralProgramConfig;
      setReferralCode(profileResult.data?.referral_code || null);
      setDiscountPercent(Number(config.discount_percent) || 50);
      setCreditAmount(Number(((Number(config.credit_base_amount) || 25) * (Number(config.discount_percent) || 50) / 100).toFixed(2)));
      // Falha fechada: sem configuração válida ou campanha desligada, não divulga.
      setEnabled(
        !profileResult.error &&
        !configResult.error &&
        config.enabled === true
      );
    };

    void loadCampaign();
    const channel = supabase
      .channel(`referral-promotion-config-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_config", filter: "config_key=eq.referral_program" },
        () => { void loadCampaign(); },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [user]);

  if (!enabled || !referralCode) return null;

  const referralLink = `${window.location.origin}/indicacao/${referralCode}`;
  const message = `Indique e Ganhe na Barbearia Raimundos! Cadastre-se pelo meu link: ${referralLink}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(referralLink);
    toast.success("Link de indicação copiado!");
  };

  const shareOnWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/20 via-card to-card p-5 text-left shadow-lg sm:p-6">
      <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative space-y-5">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-primary p-3 text-primary-foreground shadow-md">
            <Gift className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                Indique e Ganhe
              </span>
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-xl font-bold sm:text-2xl">Ganhe crédito para o seu próximo atendimento!</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Convide um amigo pelo seu link. Quando ele concluir o primeiro atendimento pago de pelo menos R$ 25,00, você recebe um crédito de <strong className="text-foreground">até R$ {creditAmount.toFixed(2)}</strong> ({discountPercent}%) para usar em qualquer serviço.
            </p>
          </div>
        </div>

        <div className="grid gap-2 text-sm sm:grid-cols-3">
          <div className="flex items-center gap-2 rounded-lg bg-background/60 p-3"><Users className="h-4 w-4 text-primary" />Envie seu link</div>
          <div className="flex items-center gap-2 rounded-lg bg-background/60 p-3"><TicketCheck className="h-4 w-4 text-primary" />Amigo é atendido</div>
          <div className="flex items-center gap-2 rounded-lg bg-background/60 p-3"><Gift className="h-4 w-4 text-primary" />Cupom liberado</div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={shareOnWhatsApp} className="flex-1">
            <MessageCircle className="mr-2 h-4 w-4" /> Compartilhar no WhatsApp
          </Button>
          <Button onClick={copyLink} variant="outline" className="flex-1 bg-background/60">
            <Copy className="mr-2 h-4 w-4" /> Copiar meu link
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          O cupom é liberado após a conclusão do atendimento do amigo e aplicado presencialmente pelo barbeiro.
        </p>
      </div>
    </div>
  );
}
