import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Package, X, Plus, Minus, MessageCircle, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  category: string;
  stock: number | null;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Barber {
  id: string;
  name: string;
}

interface FooterInfoConfig {
  social?: {
    whatsapp?: string;
  };
}

interface CheckoutError {
  message?: string;
  details?: string;
  hint?: string;
}

const getOptimizedStorageImageUrl = (
  imageUrl?: string | null,
  options?: { width?: number; height?: number; quality?: number; resize?: 'cover' | 'contain' }
) => {
  if (!imageUrl) return '';

  try {
    const parsed = new URL(imageUrl);
    const objectPathMarker = '/storage/v1/object/public/';
    const markerIndex = parsed.pathname.indexOf(objectPathMarker);

    if (markerIndex === -1) {
      return imageUrl;
    }

    const objectPath = parsed.pathname.slice(markerIndex + objectPathMarker.length);
    const prefix = parsed.pathname.slice(0, markerIndex);
    parsed.pathname = `${prefix}/storage/v1/render/image/public/${objectPath}`;

    parsed.searchParams.set('width', String(options?.width ?? 640));
    if (options?.height) {
      parsed.searchParams.set('height', String(options.height));
    } else {
      parsed.searchParams.delete('height');
    }
    parsed.searchParams.set('quality', String(options?.quality ?? 70));
    parsed.searchParams.set('resize', options?.resize ?? 'cover');
    return parsed.toString();
  } catch {
    return imageUrl;
  }
};

const Shop = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  
  // Checkout Dialog State
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [selectedBarberId, setSelectedBarberId] = useState<string>("");
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) {
      toast({
        title: "Supabase não configurado",
        description: "Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY para carregar a loja.",
        variant: "destructive",
      });
      return;
    }
    loadProducts();
    loadBarbers();
    loadWhatsappNumber();
  }, [supabaseAnonKey, supabaseUrl, toast]);

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('visible', true)
      .order('order_index');

    if (error) {
      console.error('Error loading products:', error);
    } else {
      setProducts(data || []);
    }
  };

  const loadBarbers = async () => {
    const { data, error } = await supabase
      .from('barbers')
      .select('id, name')
      .eq('visible', true)
      .order('name');

    if (error) {
      console.error('Error loading barbers:', error);
    } else {
      setBarbers(data || []);
    }
  };

  const loadWhatsappNumber = async () => {
    const { data, error } = await supabase
      .from('site_config')
      .select('config_value')
      .eq('config_key', 'footer_info')
      .maybeSingle();

    if (data && !error) {
      const footerInfo = data.config_value as FooterInfoConfig;
      if (footerInfo?.social?.whatsapp) {
        // Clean up the number
        const number = footerInfo.social.whatsapp.replace(/\D/g, '');
        setWhatsappNumber(number);
      }
    }
  };

  const categories = ["Todos", ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = selectedCategory === "Todos" 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
    toast({
      title: "Produto adicionado!",
      description: `${product.name} foi adicionado ao carrinho.`,
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.product.id === productId) {
          const newQuantity = item.quantity + delta;
          return newQuantity <= 0 ? null : { ...item, quantity: newQuantity };
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  const getTotalItems = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => sum + (Number(item.product.price) * item.quantity), 0);
  };

  const handleProductImageClick = (product: Product) => {
    setSelectedProduct(product);
    setProductModalOpen(true);
  };

  const handleCheckoutWhatsApp = () => {
    if (cart.length === 0) {
      toast({
        title: "Carrinho vazio",
        description: "Adicione produtos ao carrinho antes de finalizar.",
        variant: "destructive",
      });
      return;
    }

    if (!whatsappNumber) {
      toast({
        title: "Número não configurado",
        description: "O número de WhatsApp da barbearia não está configurado.",
        variant: "destructive",
      });
      return;
    }

    setCheckoutDialogOpen(true);
  };

  const confirmCheckout = async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      toast({
        title: "Supabase não configurado",
        description: "Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY para concluir a compra.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedBarberId) {
      toast({
        title: "Selecione um barbeiro",
        description: "Por favor, informe qual barbeiro está realizando a venda.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingCheckout(true);

    try {
      // 1. Get Fixed Commission Rate
      const { data: fixedCommissionData } = await supabase
        .from('barber_fixed_commissions')
        .select('product_commission_percentage')
        .eq('barber_id', selectedBarberId)
        .maybeSingle();

      const fixedCommissionPercentage = fixedCommissionData?.product_commission_percentage || 0;

      // 2. Get Individual Product Commissions
      const { data: individualCommissions } = await supabase
        .from('barber_product_commissions')
        .select('product_id, commission_percentage')
        .eq('barber_id', selectedBarberId);

      // 3. Create Pending Sales records
      const salesToInsert = cart.map(item => {
        const unitPrice = Number(item.product.price);
        const totalPrice = unitPrice * item.quantity;
        
        // Determine commission percentage: Individual > Fixed
        const individualCommission = individualCommissions?.find(
          c => c.product_id === item.product.id
        )?.commission_percentage;

        const commissionPercentage = individualCommission !== undefined && individualCommission > 0
          ? individualCommission
          : fixedCommissionPercentage;

        const commissionValue = (totalPrice * commissionPercentage) / 100;

        return {
          barber_id: selectedBarberId,
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
          commission_percentage: commissionPercentage,
          commission_value: commissionValue,
          status: 'pending', // Pending confirmation by barber
          sale_date: new Date().toISOString().split('T')[0],
          sale_time: new Date().toLocaleTimeString(),
          client_id: user?.id || null,
        };
      });

      const { error } = await supabase
        .from('product_sales')
        .insert(salesToInsert);

      if (error) throw error;

      // 3. Build WhatsApp Message
      const barberName = barbers.find(b => b.id === selectedBarberId)?.name || "Barbeiro";
      
      let message = "🛒 *Novo Pedido - Barbearia*\n\n";
      message += `*Vendedor:* ${barberName}\n\n`;
      message += "*Produtos:*\n";
      
      cart.forEach(item => {
        const subtotal = Number(item.product.price) * item.quantity;
        message += `• ${item.product.name} (${item.quantity}x) - R$ ${subtotal.toFixed(2).replace('.', ',')}\n`;
      });

      message += `\n*Total: R$ ${getTotalPrice().toFixed(2).replace('.', ',')}*\n\n`;
      message += "Gostaria de confirmar este pedido!";

      // 4. Open WhatsApp
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');

      // 5. Clear cart and close
      setCart([]);
      setCartOpen(false);
      setCheckoutDialogOpen(false);
      setSelectedBarberId("");
      
      toast({
        title: "Pedido enviado!",
        description: "O pedido foi registrado e a mensagem enviada.",
      });

    } catch (error: unknown) {
      const checkoutError = error as CheckoutError;
      console.error('Error processing checkout:', error);
      console.error('Error details:', checkoutError?.message, checkoutError?.details, checkoutError?.hint);
      toast({
        title: "Erro ao processar",
        description: `Erro: ${checkoutError?.message || "Ocorreu um erro ao registrar o pedido."}`,
        variant: "destructive",
      });
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 bg-gradient-dark">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-6">
            <Package className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">Produtos Profissionais</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="text-[hsl(var(--section-title-primary))]">Nossa </span>
            <span className="text-[hsl(var(--section-title-accent))]">Loja</span>
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-8">
            Produtos premium selecionados para cuidar do seu estilo com excelência
          </p>
        </div>
      </section>

      {/* Fixed Floating Cart */}
      <div className="fixed top-20 md:top-24 right-4 z-40">
        <Sheet open={cartOpen} onOpenChange={setCartOpen}>
          <SheetTrigger asChild>
            <div className="relative">
              <Button 
                className={`relative bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 rounded-full p-4 ${
                  getTotalItems() > 0 ? 'animate-bounce' : ''
                }`}
                size="lg"
              >
                <ShoppingCart className="w-6 h-6" />
                {getTotalItems() > 0 && (
                  <>
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-pulse">
                      {getTotalItems()}
                    </div>
                    {/* Pulse ring effect */}
                    <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20"></div>
                  </>
                )}
              </Button>
              
              {/* Mini cart summary */}
              {getTotalItems() > 0 && (
                <div className="absolute top-full right-0 mt-2 bg-card border border-border rounded-lg shadow-lg p-3 min-w-[200px] animate-in slide-in-from-top-2">
                  <div className="text-sm font-medium text-foreground mb-1">
                    {getTotalItems()} {getTotalItems() === 1 ? 'item' : 'itens'}
                  </div>
                  <div className="text-lg font-bold text-primary">
                    R$ {getTotalPrice().toFixed(2).replace('.', ',')}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Clique para ver detalhes
                  </div>
                </div>
              )}
            </div>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-lg">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Seu Carrinho
              </SheetTitle>
            </SheetHeader>
            
            <div className="flex-1 overflow-y-auto py-4">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mb-4 opacity-50" />
                  <p>Seu carrinho está vazio</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex gap-4 p-4 bg-card rounded-lg border border-border">
                      <div className="w-20 h-20 rounded-md overflow-hidden flex-shrink-0">
                        <img 
                          src={
                            getOptimizedStorageImageUrl(item.product.image_url, {
                              width: 160,
                              height: 160,
                              quality: 60,
                              resize: 'cover',
                            }) || "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=500&h=500&fit=crop"
                          }
                          alt={item.product.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground truncate">{item.product.name}</h4>
                        <p className="text-primary font-bold">
                          R$ {Number(item.product.price).toFixed(2).replace('.', ',')}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.product.id, -1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.product.id, 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 ml-auto text-destructive hover:text-destructive"
                            onClick={() => removeFromCart(item.product.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <SheetFooter className="border-t border-border pt-4 mt-4">
                <div className="w-full space-y-4">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-primary">
                      R$ {getTotalPrice().toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={handleCheckoutWhatsApp}
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Finalizar via WhatsApp
                  </Button>
                </div>
              </SheetFooter>
            )}
          </SheetContent>
        </Sheet>
      </div>

      {/* Category Filter */}
      <section className="py-8 px-4 border-b border-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap gap-3 justify-center">
            {categories.map((category) => (
              <Button
                key={category}
                onClick={() => setSelectedCategory(category)}
                variant={selectedCategory === category ? "default" : "outline"}
                className={selectedCategory === category ? "shadow-gold" : ""}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map((product) => (
              <Card 
                key={product.id}
                className="group bg-card border-border hover:border-primary/50 transition-all duration-300 overflow-hidden hover:shadow-gold"
              >
                <div 
                  className="relative h-64 overflow-hidden cursor-pointer"
                  onClick={() => handleProductImageClick(product)}
                >
                  <img 
                    src={
                      getOptimizedStorageImageUrl(product.image_url, {
                        width: 640,
                        height: 640,
                        quality: 70,
                        resize: 'cover',
                      }) || "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=500&h=500&fit=crop"
                    }
                    alt={product.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent"></div>
                  
                  {/* Hover overlay with eye icon */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="bg-primary/90 rounded-full p-3">
                      <Eye className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  
                  {(product.stock ?? 0) <= 0 && (
                    <div className="absolute top-4 right-4">
                      <Badge variant="destructive">Esgotado</Badge>
                    </div>
                  )}
                  
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-5 h-5 text-primary" />
                      <Badge variant="secondary" className="text-xs">
                        {product.category}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-4">{product.name}</h3>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-3xl font-bold text-primary">
                        R$ {Number(product.price).toFixed(2)}
                      </span>
                    </div>
                    <Button
                      onClick={() => addToCart(product)}
                      disabled={(product.stock ?? 0) <= 0}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-gold transition-all duration-300 hover:scale-105"
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      {(product.stock ?? 0) > 0 ? 'Adicionar' : 'Indisponível'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Product Details Modal */}
      <Dialog open={productModalOpen} onOpenChange={setProductModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-primary">
                  {selectedProduct.name}
                </DialogTitle>
                <DialogDescription>
                  Detalhes do produto selecionado
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Product Image */}
                <div className="relative h-80 w-full overflow-hidden rounded-lg">
                  <img 
                    src={
                      getOptimizedStorageImageUrl(selectedProduct.image_url, {
                        width: 1200,
                        quality: 80,
                        resize: 'contain',
                      }) || "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=500&h=500&fit=crop"
                    }
                    alt={selectedProduct.name}
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                  {(selectedProduct.stock ?? 0) <= 0 && (
                    <div className="absolute top-4 right-4">
                      <Badge variant="destructive">Esgotado</Badge>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    <Badge variant="secondary">
                      {selectedProduct.category}
                    </Badge>
                    {selectedProduct.stock !== null && (
                      <Badge variant="outline">
                        Estoque: {selectedProduct.stock}
                      </Badge>
                    )}
                  </div>

                  <div className="text-4xl font-bold text-primary">
                    R$ {Number(selectedProduct.price).toFixed(2)}
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold mb-2 text-foreground">Descrição</h4>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {selectedProduct.description}
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={() => {
                        addToCart(selectedProduct);
                        setProductModalOpen(false);
                      }}
                      disabled={(selectedProduct.stock ?? 0) <= 0}
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-gold transition-all duration-300"
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      {(selectedProduct.stock ?? 0) > 0 ? 'Adicionar ao Carrinho' : 'Indisponível'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setProductModalOpen(false)}
                      className="px-6"
                    >
                      Fechar
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog - Select Barber */}
      <Dialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Finalizar Pedido</DialogTitle>
            <DialogDescription>
              Selecione o vendedor para prosseguir com o pedido.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="barber-select">Quem está realizando a venda?</Label>
              <Select value={selectedBarberId} onValueChange={setSelectedBarberId}>
                <SelectTrigger id="barber-select">
                  <SelectValue placeholder="Selecione o barbeiro" />
                </SelectTrigger>
                <SelectContent>
                  {barbers.map((barber) => (
                    <SelectItem key={barber.id} value={barber.id}>
                      {barber.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Selecione o barbeiro responsável pela venda para que ele receba a comissão.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCheckoutDialogOpen(false)}
              disabled={isProcessingCheckout}
            >
              Cancelar
            </Button>
            <Button 
              onClick={confirmCheckout}
              disabled={!selectedBarberId || isProcessingCheckout}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessingCheckout ? (
                <>Enviando...</>
              ) : (
                <>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Confirmar e Enviar WhatsApp
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Shop;
