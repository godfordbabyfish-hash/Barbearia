import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { ArrowLeft, Camera, Loader2, Save, Phone } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Configuracoes = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    cpf: "",
    photo_url: null as string | null,
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (role !== "cliente" && role !== "barbeiro") {
      navigate("/");
      return;
    }
    loadUserData();
  }, [user, role, navigate]);

  const loadUserData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, phone, photo_url, cpf")
        .eq("id", user.id)
        .maybeSingle();

      const cpfFromProfile = profile?.cpf || "";
      const nameFromProfile = profile?.name?.trim() || "";
      const nameFromMeta = (user as any)?.user_metadata?.name?.trim() || "";
      const fallbackName = user.email?.split("@")[0] || "Usuário";
      const nameLooksLikeCpf =
        nameFromProfile &&
        nameFromProfile.replace(/\D/g, "") === cpfFromProfile;

      let name = nameLooksLikeCpf ? (nameFromMeta || fallbackName) : (nameFromProfile || nameFromMeta || fallbackName);
      let photoUrl = profile?.photo_url || null;
      let phone = profile?.phone || "";

      if (role === "barbeiro") {
        const { data: barber } = await supabase
          .from("barbers")
          .select("id, name, image_url")
          .eq("user_id", user.id)
          .maybeSingle();

        if (barber) {
          setBarberId(barber.id);
          // Nome exibido vem do cadastro (profiles), não é editável aqui
          photoUrl = barber.image_url || photoUrl;
        }
      }

      setFormData({ name, phone, cpf: cpfFromProfile, photo_url: photoUrl });
    } catch (error: any) {
      console.error("Error loading user data:", error);
      toast.error("Erro ao carregar dados do usuário");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB.");
      return;
    }

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { cacheControl: "3600", upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      setFormData((prev) => ({ ...prev, photo_url: publicUrl }));

      if (role === "barbeiro" && barberId) {
        await supabase.from("barbers").update({ image_url: publicUrl }).eq("id", barberId);
      }

      window.dispatchEvent(new Event("profile-updated"));
    } catch (error: any) {
      console.error("Error uploading photo:", error);
      toast.error("Erro ao enviar foto: " + error.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const safeName =
        formData.name.trim() ||
        (user?.user_metadata as any)?.name?.trim() ||
        user?.email?.split("@")[0] ||
        "Usuário";

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            name: safeName,
            phone: formData.phone.trim() || null,
            photo_url: formData.photo_url,
          },
          { onConflict: "id" }
        );

      if (profileError) throw profileError;

      if (role === "barbeiro" && barberId) {
        await supabase
          .from("barbers")
          .update({ image_url: formData.photo_url })
          .eq("id", barberId);
      }

      toast.success("Dados atualizados com sucesso!");
      window.dispatchEvent(new Event("profile-updated"));
    } catch (error: any) {
      console.error("Error saving data:", error);
      toast.error("Erro ao salvar dados: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold mb-2">Configurações</h1>
          <p className="text-muted-foreground">Atualize seus dados pessoais.</p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  {formData.photo_url ? (
                    <AvatarImage src={formData.photo_url} alt={formData.name} />
                  ) : null}
                  <AvatarFallback className="bg-primary/20 text-primary text-2xl font-semibold">
                    {formData.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={handlePhotoClick}
                  disabled={uploadingPhoto}
                  className="absolute bottom-0 right-0 p-2 bg-primary rounded-full text-primary-foreground hover:bg-primary/90 transition-all shadow-lg"
                >
                  {uploadingPhoto ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Clique na câmera para alterar sua foto
              </p>
            </div>

            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input
                value={formData.name}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                O nome é definido no cadastro e só pode ser alterado pelo gestor/admin.
              </p>
            </div>

            <div className="space-y-2">
              <Label>CPF</Label>
              <Input
                value={formData.cpf}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Telefone
              </Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ""} disabled className="bg-muted" />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => navigate(-1)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default Configuracoes;
