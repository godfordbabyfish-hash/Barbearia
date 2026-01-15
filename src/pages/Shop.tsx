import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Package, X, Plus, Minus, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";

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

const Shop = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState<string>("");

  useEffect(() => {
    loadProducts();
    loadWhatsappNumber();
  }, []);

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

  const loadWhatsappNumber = async () => {
    const { data, error } = await supabase
      .from('site_config')
      .select('config_value')
      .eq('config_key', 'footer_info')
      .maybeSingle();

    if (data && !error) {
      const footerInfo = data.config_value as any;
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

    // Build the message
    let message = "🛒 *Novo Pedido - Barbearia*\n\n";
    message += "*Produtos:*\n";
    
    cart.forEach(item => {
      const subtotal = Number(item.product.price) * item.quantity;
      message += `• ${item.product.name} (${item.quantity}x) - R$ ${subtotal.toFixed(2).replace('.', ',')}\n`;
    });

    message += `\n*Total: R$ ${getTotalPrice().toFixed(2).replace('.', ',')}*\n\n`;
    message += "Gostaria de confirmar este pedido!";

    // Open WhatsApp
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    // Clear cart after sending
    setCart([]);
    setCartOpen(false);
    
    toast({
      title: "Pedido enviado!",
      description: "Complete o envio da mensagem no WhatsApp.",
    });
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
          
          {/* Cart Button */}
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger asChild>
              <Button 
                className="inline-flex items-center gap-2 bg-primary/20 border border-primary hover:bg-primary/30"
                variant="outline"
              >
                <ShoppingCart className="w-5 h-5 text-primary" />
                <span className="text-primary font-semibold">
                  {getTotalItems()} {getTotalItems() === 1 ? 'item' : 'itens'} no carrinho
                </span>
              </Button>
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
                            src={item.product.image_url || "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=500&h=500&fit=crop"}
                            alt={item.product.name}
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
      </section>

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
                <div className="relative h-64 overflow-hidden">
                  <img 
                    src={product.image_url || "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=500&h=500&fit=crop"}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent"></div>
                  
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
                  <h3 className="text-xl font-bold mb-2">{product.name}</h3>
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                    {product.description}
                  </p>
                  
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

      <Footer />
    </div>
  );
};

export default Shop;