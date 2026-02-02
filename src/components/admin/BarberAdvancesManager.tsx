import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarberAdvance, BarberAdvanceStatus, createAdvance, listAdvancesAdmin, rejectAdvance } from "@/integrations/supabase/barberAdvances";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Barber {
  id: string;
  name: string;
}

const BarberAdvancesManager = () => {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<BarberAdvanceStatus | "all">("all");
  const [loading, setLoading] = useState(false);
  const [advances, setAdvances] = useState<BarberAdvance[]>([]);

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    barber_id: "",
    amount: "",
    description: "",
    effective_date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    loadBarbers();
  }, []);

  useEffect(() => {
    loadAdvances();
  }, [selectedBarberId, statusFilter]);

  const loadBarbers = async () => {
    const { data, error } = await (supabase as any)
      .from("barbers")
      .select("id, name")
      .eq("visible", true)
      .order("name");

    if (error) {
      console.error("Error loading barbers:", error);
      toast.error("Erro ao carregar barbeiros");
      return;
    }

    setBarbers(data || []);
  };

  const loadAdvances = async () => {
    console.log('📋 Carregando vales...', { selectedBarberId, statusFilter });
    setLoading(true);
    const { data, error } = await listAdvancesAdmin({
      barberId: selectedBarberId !== "all" ? selectedBarberId : undefined,
      status: statusFilter,
    });
    setLoading(false);

    if (error) {
      console.error("❌ Error loading advances:", error);
      toast.error("Erro ao carregar vales");
      return;
    }

    console.log('📊 Vales carregados:', data?.length || 0, 'vales');
    
    // Filtrar vales que foram "removidos pelo admin" para não aparecerem na lista
    const filteredData = data?.filter(advance => 
      !advance.description?.includes('[REMOVIDO PELO ADMIN]')
    ) || [];
    
    console.log('📊 Vales após filtro:', filteredData.length, 'vales (removidos os marcados como REMOVIDO PELO ADMIN)');
    setAdvances(filteredData);
  };

  const handleCreateAdvance = async () => {
    if (!createForm.barber_id) {
      toast.error("Selecione um barbeiro");
      return;
    }
    const amountNumber = Number(createForm.amount.replace(",", "."));
    if (!amountNumber || amountNumber <= 0) {
      toast.error("Informe um valor válido para o vale");
      return;
    }

    setCreating(true);
    const { error } = await createAdvance({
      barber_id: createForm.barber_id,
      amount: amountNumber,
      description: createForm.description || undefined,
      effective_date: createForm.effective_date,
    });
    setCreating(false);

    if (error) {
      console.error("Error creating advance:", error);
      toast.error("Erro ao criar vale");
      return;
    }

    toast.success("Vale criado com sucesso!");
    setCreateForm({
      barber_id: "",
      amount: "",
      description: "",
      effective_date: new Date().toISOString().split("T")[0],
    });
    loadAdvances();
  };

  const handleDeleteAdvance = async (advanceId: string) => {
    console.log('🗑️ Tentando remover vale via RPC:', advanceId);
    
    try {
      // Usar a nova função RPC que contorna o RLS de forma segura
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('delete_barber_advance_admin', { advance_id: advanceId });

      console.log('📊 Resultado RPC:', { rpcResult, rpcError });

      if (rpcError) {
        console.error("❌ Erro na função RPC:", rpcError);
        toast.error("Erro ao remover vale: " + rpcError.message);
        return;
      }

      // Verificar se a função RPC retornou sucesso
      if (rpcResult && rpcResult.success) {
        console.log('✅ Vale removido com sucesso via RPC!');
        toast.success(rpcResult.message || "Vale removido com sucesso!");
        
        // Atualizar a interface imediatamente removendo o vale da lista local
        setAdvances(prevAdvances => 
          prevAdvances.filter(adv => adv.id !== advanceId)
        );
        
        // Recarregar a lista para garantir sincronização
        console.log('🔄 Recarregando lista de vales...');
        await loadAdvances();
        console.log('✅ Lista recarregada!');
      } else {
        // A função RPC retornou erro
        const errorMessage = rpcResult?.error || "Erro desconhecido na remoção";
        console.error("❌ RPC retornou erro:", errorMessage);
        toast.error(errorMessage);
      }
      
    } catch (error: any) {
      console.error("❌ Exception ao chamar RPC:", error);
      toast.error("Erro ao remover vale: " + error.message);
    }
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const getStatusLabel = (status: BarberAdvanceStatus) => {
    switch (status) {
      case "pending":
        return "Pendente";
      case "approved":
        return "Aprovado";
      case "rejected":
        return "Rejeitado";
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Registrar Novo Vale</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Barbeiro</Label>
              <Select
                value={createForm.barber_id}
                onValueChange={(value) =>
                  setCreateForm((prev) => ({ ...prev, barber_id: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um barbeiro" />
                </SelectTrigger>
                <SelectContent>
                  {barbers.map((barber) => (
                    <SelectItem key={barber.id} value={barber.id}>
                      {barber.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor do Vale (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={createForm.amount}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, amount: e.target.value }))
                }
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Efeito</Label>
              <Input
                type="date"
                value={createForm.effective_date}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    effective_date: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Textarea
              value={createForm.description}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Ex: Adiantamento de comissão, ajuda de custo, etc."
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleCreateAdvance} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Plus className="mr-2 h-4 w-4" />
              Criar Vale
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Vales de Barbeiros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Filtrar por Barbeiro</Label>
              <Select
                value={selectedBarberId}
                onValueChange={setSelectedBarberId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {barbers.map((barber) => (
                    <SelectItem key={barber.id} value={barber.id}>
                      {barber.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="approved">Aprovados</SelectItem>
                  <SelectItem value="rejected">Rejeitados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : advances.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum vale encontrado com os filtros atuais.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-2 pr-4">Data</th>
                    <th className="py-2 pr-4">Barbeiro</th>
                    <th className="py-2 pr-4">Valor</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Descrição</th>
                    <th className="py-2 pr-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {advances.map((adv) => (
                    <tr
                      key={adv.id}
                      className="border-b border-border/60 last:border-0"
                    >
                      <td className="py-2 pr-4 align-top">
                        {new Date(adv.effective_date).toLocaleDateString(
                          "pt-BR"
                        )}
                      </td>
                      <td className="py-2 pr-4 align-top">
                        {(adv as any).barber?.name || "—"}
                      </td>
                      <td className="py-2 pr-4 align-top">
                        {formatCurrency(adv.amount)}
                      </td>
                      <td className="py-2 pr-4 align-top">
                        {getStatusLabel(adv.status)}
                      </td>
                      <td className="py-2 pr-4 align-top max-w-xs">
                        {adv.description || "—"}
                      </td>
                      <td className="py-2 pr-4 align-top">
                        {adv.status === "pending" ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                const { error } = await rejectAdvance(adv.id);
                                if (error) {
                                  toast.error("Erro ao cancelar vale");
                                } else {
                                  toast.success("Vale cancelado");
                                  loadAdvances();
                                }
                              }}
                            >
                              Cancelar
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover Vale</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja remover este vale? Esta ação é irreversível.
                                    <br /><br />
                                    <strong>Vale:</strong> {formatCurrency(adv.amount)} para {(adv as any).barber?.name}
                                    <br />
                                    <strong>Data:</strong> {new Date(adv.effective_date).toLocaleDateString("pt-BR")}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteAdvance(adv.id)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Remover
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        ) : (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover Vale</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja remover este vale? Esta ação é irreversível.
                                  <br /><br />
                                  <strong>Vale:</strong> {formatCurrency(adv.amount)} para {(adv as any).barber?.name}
                                  <br />
                                  <strong>Status:</strong> {getStatusLabel(adv.status)}
                                  <br />
                                  <strong>Data:</strong> {new Date(adv.effective_date).toLocaleDateString("pt-BR")}
                                  {adv.status === "approved" && (
                                    <>
                                      <br /><br />
                                      <strong className="text-amber-600">⚠️ Atenção:</strong> Este vale foi aprovado e pode já ter sido descontado da comissão do barbeiro.
                                    </>
                                  )}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteAdvance(adv.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BarberAdvancesManager;

