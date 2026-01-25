import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { ShoppingBag, Plus, Loader2, DollarSign, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useBarberProductCommissions } from '@/hooks/useBarberProductCommissions';
import { useBarberFixedCommissions } from '@/hooks/useBarberFixedCommissions';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number | null;
}

interface ProductSale {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  commission_percentage: number;
  commission_value: number;
  sale_date: string;
  sale_time: string;
  product?: Product;
}

interface ProductSalesManagerProps {
  barberId: string;
}

export const ProductSalesManager = ({ barberId }: ProductSalesManagerProps) => {
  const { getCommissionPercentage: getIndividualCommissionPercentage } = useBarberProductCommissions(barberId);
  const { getProductCommissionPercentage: getFixedCommissionPercentage } = useBarberFixedCommissions(barberId);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<ProductSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [saleDate, setSaleDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [saleTime, setSaleTime] = useState<string>(format(new Date(), 'HH:mm'));
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    loadProducts();
    loadSales();
  }, [barberId]);

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, price, stock')
      .eq('visible', true)
      .order('name');

    if (error) {
      console.error('Error loading products:', error);
      toast.error('Erro ao carregar produtos');
    } else {
      setProducts(data || []);
    }
  };

  const loadSales = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('product_sales')
      .select(`
        id,
        product_id,
        quantity,
        unit_price,
        total_price,
        commission_percentage,
        commission_value,
        sale_date,
        sale_time,
        notes,
        product:products(id, name, price, stock)
      `)
      .eq('barber_id', barberId)
      .order('sale_date', { ascending: false })
      .order('sale_time', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error loading sales:', error);
      toast.error('Erro ao carregar vendas');
    } else {
      setSales((data as any) || []);
    }
    setLoading(false);
  };

  const handleSaveSale = async () => {
    if (!selectedProduct) {
      toast.error('Selecione um produto');
      return;
    }

    if (quantity <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }

    const product = products.find(p => p.id === selectedProduct);
    if (!product) {
      toast.error('Produto não encontrado');
      return;
    }

    // Verificar estoque
    if (product.stock !== null && product.stock < quantity) {
      toast.error(`Estoque insuficiente. Disponível: ${product.stock}`);
      return;
    }

    setSaving(true);

    try {
      const unitPrice = product.price;
      const totalPrice = unitPrice * quantity;
      // Tenta usar comissão individual, se não houver usa comissão fixa
      const individualCommission = getIndividualCommissionPercentage(barberId, selectedProduct);
      const fixedCommission = getFixedCommissionPercentage(barberId);
      const commissionPercentage = individualCommission > 0 ? individualCommission : fixedCommission;
      const commissionValue = (totalPrice * commissionPercentage) / 100;

      const { error } = await supabase
        .from('product_sales')
        .insert({
          barber_id: barberId,
          product_id: selectedProduct,
          quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
          commission_percentage: commissionPercentage,
          commission_value: commissionValue,
          sale_date: saleDate,
          sale_time: saleTime,
          notes: notes.trim() || null,
        });

      if (error) throw error;

      // Atualizar estoque do produto
      if (product.stock !== null) {
        const { error: stockError } = await supabase
          .from('products')
          .update({ stock: product.stock - quantity })
          .eq('id', selectedProduct);

        if (stockError) {
          console.error('Error updating stock:', stockError);
          // Não falhar a venda se o estoque não atualizar
        }
      }

      toast.success('Venda registrada com sucesso!');
      setDialogOpen(false);
      resetForm();
      loadSales();
      loadProducts(); // Recarregar produtos para atualizar estoque
    } catch (error: any) {
      console.error('Error saving sale:', error);
      toast.error(error.message || 'Erro ao registrar venda');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedProduct('');
    setQuantity(1);
    setSaleDate(format(new Date(), 'yyyy-MM-dd'));
    setSaleTime(format(new Date(), 'HH:mm'));
    setNotes('');
  };

  const selectedProductData = products.find(p => p.id === selectedProduct);
  const estimatedTotal = selectedProductData ? selectedProductData.price * quantity : 0;
  const estimatedCommission = selectedProductData ? (() => {
    const individualCommission = getIndividualCommissionPercentage(barberId, selectedProduct);
    const fixedCommission = getFixedCommissionPercentage(barberId);
    const commissionPercentage = individualCommission > 0 ? individualCommission : fixedCommission;
    return (estimatedTotal * commissionPercentage) / 100;
  })() : 0;
  
  const estimatedCommissionPercentage = selectedProductData ? (() => {
    const individualCommission = getIndividualCommissionPercentage(barberId, selectedProduct);
    const fixedCommission = getFixedCommissionPercentage(barberId);
    return individualCommission > 0 ? individualCommission : fixedCommission;
  })() : 0;

  return (
    <Card className="bg-card border-border w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      <CardHeader className="w-full" style={{ maxWidth: '100%' }}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Vendas de Produtos
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Registre vendas de produtos do shop e acompanhe suas comissões
            </CardDescription>
          </div>
          <Button onClick={() => setDialogOpen(true)} size="sm" className="flex-shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Nova Venda</span>
            <span className="sm:hidden">Venda</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="w-full p-3 sm:p-4 md:p-6" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Carregando vendas...</span>
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma venda registrada ainda.</p>
            <p className="text-sm mt-2">Clique em "Nova Venda" para começar.</p>
          </div>
        ) : (
          <div className="w-full overflow-hidden" style={{ maxWidth: '100%' }}>
            <div className="relative w-full overflow-hidden" style={{ maxWidth: '100%' }}>
              <table className="w-full caption-bottom text-sm" style={{ tableLayout: 'fixed', width: '100%', maxWidth: '100%' }}>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-1 sm:px-2" style={{ width: '25%' }}>Data/Hora</TableHead>
                    <TableHead className="px-1 sm:px-2" style={{ width: '25%' }}>Produto</TableHead>
                    <TableHead className="text-center px-1 sm:px-2" style={{ width: '15%' }}>Qtd</TableHead>
                    <TableHead className="text-right px-1 sm:px-2" style={{ width: '20%' }}>Total</TableHead>
                    <TableHead className="text-right px-1 sm:px-2" style={{ width: '15%' }}>Comissão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => {
                    const product = sale.product as Product | undefined;
                    return (
                      <TableRow key={sale.id}>
                        <TableCell className="px-1 sm:px-2">
                          <div className="text-xs sm:text-sm">
                            <div>{format(new Date(sale.sale_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}</div>
                            <div className="text-muted-foreground">{sale.sale_time}</div>
                          </div>
                        </TableCell>
                        <TableCell className="px-1 sm:px-2">
                          <span className="truncate block text-xs sm:text-sm" title={product?.name || 'Produto desconhecido'}>
                            {product?.name || 'Produto desconhecido'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center px-1 sm:px-2 text-xs sm:text-sm">
                          {sale.quantity}
                        </TableCell>
                        <TableCell className="text-right px-1 sm:px-2">
                          <span className="font-semibold text-xs sm:text-sm">
                            R$ {sale.total_price.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right px-1 sm:px-2">
                          <span className="font-semibold text-green-600 text-xs sm:text-sm">
                            R$ {sale.commission_value.toFixed(2)}
                          </span>
                          <div className="text-xs text-muted-foreground">
                            ({sale.commission_percentage.toFixed(1)}%)
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </table>
            </div>
          </div>
        )}

        {/* Dialog para nova venda */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md w-[95vw] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Registrar Nova Venda</DialogTitle>
              <DialogDescription>
                Selecione o produto e informe a quantidade vendida
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="product">Produto *</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger id="product" className="w-full">
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - R$ {product.price.toFixed(2)}
                        {product.stock !== null && ` (Estoque: ${product.stock})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="quantity">Quantidade *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="saleDate">Data *</Label>
                  <Input
                    id="saleDate"
                    type="date"
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="saleTime">Hora *</Label>
                  <Input
                    id="saleTime"
                    type="time"
                    value={saleTime}
                    onChange={(e) => setSaleTime(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Cliente pagou em dinheiro"
                  className="w-full"
                />
              </div>

              {selectedProductData && (
                <div className="bg-secondary/50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span className="font-semibold">R$ {estimatedTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Comissão ({estimatedCommissionPercentage.toFixed(1)}%):</span>
                    <span className="font-semibold text-green-600">R$ {estimatedCommission.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSaveSale} disabled={saving || !selectedProduct}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Registrar Venda
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
