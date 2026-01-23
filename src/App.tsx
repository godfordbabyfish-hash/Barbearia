import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Shop from "./pages/Shop";
import Auth from "./pages/Auth";
import AdminSetup from "./pages/AdminSetup";
import AdminDashboard from "./pages/AdminDashboard";
import ClienteDashboard from "./pages/ClienteDashboard";
import BarbeiroDashboard from "./pages/BarbeiroDashboard";
import FilaDaBarbearia from "./pages/FilaDaBarbearia";
import Servicos from "./pages/Servicos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin-setup" element={<AdminSetup />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/cliente" element={<ClienteDashboard />} />
              <Route path="/barbeiro" element={<BarbeiroDashboard />} />
              <Route path="/fila" element={<FilaDaBarbearia />} />
              <Route path="/servicos" element={<Servicos />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
