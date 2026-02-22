import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Key, Pencil, Trash2, RefreshCw, Copy, Eye, EyeOff, Dice5, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  cpf?: string | null;
  role: string;
  roles: string[];
  image_url?: string | null;
  createdAt: string;
  lastSignIn: string | null;
}

export const UserManager = () => {
  const { user: currentUser, role: currentUserRole, session } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  
  // Create user dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: 'barbeiro' as 'barbeiro' | 'gestor' | 'admin',
  });
  const [showNewPassword, setShowNewPassword] = useState(true);
  
  // Edit password dialog
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  
  // Edit user dialog (role + barber info)
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [editUserData, setEditUserData] = useState({
    name: '',
    phone: '',
    specialty: '',
    experience: '',
    whatsapp_phone: '',
  });
  const [barberData, setBarberData] = useState<any>(null);
  const [loadingBarberData, setLoadingBarberData] = useState(false);
  
  // Password management in edit dialog
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [updatingPasswordInEdit, setUpdatingPasswordInEdit] = useState(false);
  const [generatedPasswordInEdit, setGeneratedPasswordInEdit] = useState<string | null>(null);
  
  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // User details dialog
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Use supabase.functions.invoke to avoid CORS issues
      const { data, error } = await supabase.functions.invoke('api', {
        body: { action: 'admin/users' },
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        const usersList = data.users || [];
        const { data: barbersData } = await (supabase as any)
          .from('barbers')
          .select('id, user_id, name, image_url, whatsapp_phone, visible');
        const { data: profilesData } = await (supabase as any)
          .from('profiles')
          .select('id, name, phone, whatsapp, cpf, photo_url, is_temp_user');
        const usersMap = new Map<string, User>();
        usersList.forEach((u: User) => {
          usersMap.set(u.id, u);
        });
        const enriched: User[] = [];
        usersMap.forEach((u) => enriched.push(u));
        (barbersData || []).forEach((b: any) => {
          if (!b?.user_id) return;
          const existing = usersMap.get(b.user_id);
          if (existing) {
            const roles = Array.isArray(existing.roles) ? existing.roles : [];
            if (!roles.includes('barbeiro')) roles.push('barbeiro');
            existing.roles = roles;
          } else {
            enriched.push({
              id: b.user_id,
              email: '',
              name: b.name || '',
              phone: b.whatsapp_phone || '',
              role: 'barbeiro',
              roles: ['barbeiro'],
              image_url: b.image_url || null,
              createdAt: '',
              lastSignIn: null,
            });
          }
        });

        // Garantir que todos os perfis apareçam, mesmo que não venham da função admin/users
        (profilesData || []).forEach((p: any) => {
          if (usersMap.has(p.id)) return;

          const isTempUser = p.is_temp_user === true;
          const rawCpf = p.cpf ? String(p.cpf) : '';

          // Ignorar usuários locais/temporários sem CPF
          if (isTempUser && !rawCpf) return;

          const phone = p.phone || p.whatsapp || '';
          const emailFromCpf = rawCpf ? `${rawCpf}@cliente.com` : '';
          const fallbackEmail = `${p.id}@cliente.local`;
          const email = emailFromCpf || fallbackEmail;

          enriched.push({
            id: p.id,
            email,
            name: p.name || 'Cliente',
            phone,
            cpf: rawCpf || null,
            role: 'cliente',
            roles: ['cliente'],
            image_url: p.photo_url || null,
            createdAt: '',
            lastSignIn: null,
          });
        });

        setUsers(enriched);
        setCurrentPage(1);
      } else {
        toast.error('Erro ao carregar usuários', {
          description: data?.message || 'Erro desconhecido',
        });
      }
    } catch (error: any) {
      toast.error('Erro ao carregar usuários', {
        description: error.message || 'Erro ao conectar com o servidor',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.access_token) {
      loadUsers();
    }
  }, [session?.access_token]);

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.name) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setCreating(true);
    
    try {
      // Use supabase.functions.invoke to avoid CORS issues
      const { data, error } = await supabase.functions.invoke('api', {
        body: {
          action: 'admin/users',
          ...newUser,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast.success('Usuário criado com sucesso!', {
          description: `Senha: ${newUser.password}`,
        });
        setCreateDialogOpen(false);
        setNewUser({ email: '', password: '', name: '', phone: '', role: 'barbeiro' });
        loadUsers();
      } else {
        toast.error('Erro ao criar usuário', {
          description: data?.message || 'Erro desconhecido',
        });
      }
    } catch (error: any) {
      toast.error('Erro ao criar usuário', {
        description: error.message,
      });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!selectedUser) {
      toast.error('Usuário não selecionado');
      return;
    }

    // Se não houver senha digitada, gerar uma automaticamente
    const passwordToUse = newPassword || generatePassword();

    setUpdatingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke('api', {
        body: {
          action: `admin/users/${selectedUser.id}/password`,
          password: passwordToUse,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        // Mostrar a senha gerada/definida
        setGeneratedPassword(passwordToUse);
        setNewPassword(passwordToUse);
        toast.success('Senha atualizada com sucesso!', {
          description: `Nova senha: ${passwordToUse}`,
          duration: 10000,
        });
      } else {
        toast.error('Erro ao atualizar senha', {
          description: data?.message || 'Erro desconhecido',
        });
      }
    } catch (error: any) {
      toast.error('Erro ao atualizar senha', {
        description: error.message,
      });
    } finally {
      setUpdatingPassword(false);
    }
  };

  const openPasswordDialog = (user: User) => {
    setSelectedUser(user);
    setNewPassword('');
    setGeneratedPassword(null);
    setPasswordDialogOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser || !selectedRole) {
      toast.error('Selecione uma role');
      return;
    }

    setUpdatingRole(true);
    try {
      // 1. Atualizar role via API
      const { data, error } = await supabase.functions.invoke('api', {
        body: {
          action: `admin/users/${selectedUser.id}/role`,
          role: selectedRole,
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        toast.error('Erro ao atualizar role', {
          description: data?.message || 'Erro desconhecido',
        });
        return;
      }

      // 2. Atualizar perfil (nome e telefone)
      if (editUserData.name || editUserData.phone) {
        await (supabase as any)
          .from('profiles')
          .update({
            name: editUserData.name,
            phone: editUserData.phone,
          })
          .eq('id', selectedUser.id);
      }

      // 3. Se for barbeiro, atualizar dados do barbeiro
      if (selectedRole === 'barbeiro' || barberData) {
        // Verificar se o barbeiro existe
        const { data: existingBarber } = await (supabase as any)
          .from('barbers')
          .select('id')
          .eq('user_id', selectedUser.id)
          .maybeSingle();

        if (existingBarber) {
          // Atualizar barbeiro existente
          await (supabase as any)
            .from('barbers')
            .update({
              name: editUserData.name,
              specialty: editUserData.specialty || 'Cortes em geral',
              experience: editUserData.experience?.trim() || null, // Permite vazio/null (opcional)
              whatsapp_phone: editUserData.whatsapp_phone || null,
            })
            .eq('user_id', selectedUser.id);
        } else if (selectedRole === 'barbeiro') {
          // Criar novo barbeiro se mudou para role barbeiro
          await (supabase as any)
            .from('barbers')
            .insert({
              name: editUserData.name || selectedUser.name,
              user_id: selectedUser.id,
              specialty: editUserData.specialty || 'Cortes em geral',
              experience: editUserData.experience?.trim() || null, // Permite vazio/null (opcional)
              whatsapp_phone: editUserData.whatsapp_phone || null,
              rating: 5.0,
              visible: true,
              order_index: 999,
            });
        }
      }

      toast.success('Usuário atualizado com sucesso!');
      setRoleDialogOpen(false);
      setSelectedUser(null);
      setSelectedRole('');
      setEditUserData({ name: '', phone: '', specialty: '', experience: '', whatsapp_phone: '' });
      setBarberData(null);
      loadUsers();
    } catch (error: any) {
      toast.error('Erro ao atualizar usuário', {
        description: error.message,
      });
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('api', {
        body: {
          action: `admin/users/${selectedUser.id}`,
          _method: 'DELETE',
        },
        headers: {
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
          'Content-Type': 'application/json',
        },
        // Use POST and instruct the function via _method to perform DELETE,
        // improving compatibility across environments.
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast.success('Usuário excluído com sucesso!');
        setDeleteDialogOpen(false);
        setSelectedUser(null);
        loadUsers();
      } else {
        toast.error('Erro ao excluir usuário', {
          description: data?.message || 'Erro desconhecido',
        });
      }
    } catch (error: any) {
      toast.error('Erro ao excluir usuário', {
        description: error.message,
      });
    } finally {
      setDeleting(false);
    }
  };


  const openRoleDialog = async (user: User) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setEditUserData({
      name: user.name || '',
      phone: user.phone || '',
      specialty: '',
      experience: '',
      whatsapp_phone: '',
    });
    setBarberData(null);
    setEditPassword('');
    setGeneratedPasswordInEdit(null);
    setShowEditPassword(false);
    setRoleDialogOpen(true);

    // Se for barbeiro, carregar dados do barbeiro
    if (user.role === 'barbeiro' || user.roles?.includes('barbeiro')) {
      setLoadingBarberData(true);
      try {
        const { data: barber, error } = await (supabase as any)
          .from('barbers')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!error && barber) {
          setBarberData(barber);
          setEditUserData(prev => ({
            ...prev,
            name: barber.name || user.name || '',
            specialty: barber.specialty || '',
            experience: barber.experience || '',
            whatsapp_phone: barber.whatsapp_phone || '',
          }));
        }
      } catch (err) {
        console.error('Error loading barber data:', err);
      } finally {
        setLoadingBarberData(false);
      }
    }
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const canModifyUser = (user: User) => {
    // Admin can modify anyone except themselves for deletion
    if (currentUserRole === 'admin') return true;
    // Gestor cannot modify admins
    if (currentUserRole === 'gestor' && user.role === 'admin') return false;
    return true;
  };

  const canDeleteUser = (user: User) => {
    // Cannot delete self
    if (user.id === currentUser?.id) return false;
    // Gestor cannot delete admins
    if (currentUserRole === 'gestor' && user.role === 'admin') return false;
    return true;
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'gestor': return 'default';
      case 'barbeiro': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'gestor': return 'Gestor';
      case 'barbeiro': return 'Barbeiro';
      case 'cliente': return 'Cliente';
      default: return role;
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesRole = filterRole === 'all' 
      ? true 
      : user.role === filterRole || (Array.isArray(user.roles) && user.roles.includes(filterRole));
    
    if (!matchesRole) return false;

    if (!searchTerm.trim()) return true;

    const term = searchTerm.toLowerCase();
    const numericTerm = term.replace(/\D/g, '');
    const name = (user.name || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    const phone = (user.phone || '').toLowerCase();
    const cpf = (user.cpf || '').toLowerCase();
    const cpfDigits = (user.cpf || '').replace(/\D/g, '');

    if (!term) return true;

    const matchesText =
      name.includes(term) ||
      email.includes(term) ||
      phone.includes(term) ||
      cpf.includes(term);

    if (matchesText) return true;

    if (!numericTerm) return false;

    return cpfDigits.includes(numericTerm);
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  return (
    <div className="space-y-4 sm:space-y-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 w-full" style={{ maxWidth: '100%' }}>
        <h2 className="text-xl sm:text-2xl font-bold">Gerenciamento de Usuários</h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto justify-end">
          <div className="flex flex-1 sm:flex-none gap-2">
            <Input
              placeholder="Pesquisar por nome, e-mail ou telefone"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 sm:h-10 text-sm"
            />
            <Select
              value={filterRole}
              onValueChange={(value) => {
                setFilterRole(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[120px] sm:w-[130px] text-sm">
                <SelectValue placeholder="Filtrar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="gestor">Gestor</SelectItem>
                <SelectItem value="barbeiro">Barbeiro</SelectItem>
                <SelectItem value="cliente">Cliente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="icon"
              onClick={loadUsers}
              disabled={loading}
              className="flex-shrink-0 h-9 w-9 sm:h-10 sm:w-10"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              onClick={() => {
                setNewUser({ email: '', password: generatePassword(), name: '', phone: '', role: 'barbeiro' });
                setShowNewPassword(true);
                setCreateDialogOpen(true);
              }}
              className="flex-shrink-0 whitespace-nowrap text-sm h-9 sm:h-10"
            >
              <Plus className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Novo Usuário</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </div>
        </div>
      </div>
    <Card className="bg-card border-border shadow-lg w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      <CardContent className="p-2 sm:p-3 md:p-4 lg:p-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="w-full overflow-hidden" style={{ maxWidth: '100%' }}>
            <table className="w-full caption-bottom text-sm" style={{ tableLayout: 'fixed', width: '100%', maxWidth: '100%' }}>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] sm:w-[60px] px-1 sm:px-2">Foto</TableHead>
                  <TableHead className="px-1 sm:px-2">Nome</TableHead>
                  <TableHead className="w-[80px] sm:w-[90px] px-1 sm:px-2">Role</TableHead>
                  <TableHead className="text-right w-[110px] sm:w-[130px] px-1 sm:px-2">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-secondary/50">
                    <TableCell className="w-[50px] sm:w-[60px] px-1 sm:px-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setDetailsDialogOpen(true);
                        }}
                        className="hover:opacity-80 transition-opacity cursor-pointer"
                      >
                        {user.image_url ? (
                          <img
                            src={user.image_url}
                            alt={user.name || 'User'}
                            className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full object-cover border-2 border-primary/50 shadow-md"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-secondary border-2 border-primary/30 flex items-center justify-center">
                            <span className="text-xs font-semibold text-primary">
                              {(user.name || user.email || '?').charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="px-1 sm:px-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setDetailsDialogOpen(true);
                        }}
                        className="text-left hover:text-primary transition-colors font-medium cursor-pointer truncate block w-full"
                        title={user.name || '-'}
                      >
                        {user.name || '-'}
                      </button>
                    </TableCell>
                    <TableCell className="w-[80px] sm:w-[90px] px-1 sm:px-2">
                      <Badge variant={getRoleBadgeVariant(user.role)} className="whitespace-nowrap text-xs px-1.5 py-0.5">
                        {getRoleLabel(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right w-[110px] sm:w-[130px] px-1 sm:px-2">
                      <div className="flex justify-end gap-0.5 sm:gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openPasswordDialog(user)}
                          disabled={!canModifyUser(user)}
                          title="Redefinir Senha"
                          className="flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9"
                        >
                          <Key className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openRoleDialog(user)}
                          disabled={!canModifyUser(user)}
                          title="Editar Usuário"
                          className="flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9"
                        >
                          <Pencil className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => openDeleteDialog(user)}
                          disabled={!canDeleteUser(user)}
                          title="Excluir Usuário"
                          className="flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9"
                        >
                          <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </table>
          </div>
        )}
      </CardContent>
      <div className="border-t px-3 py-3 sm:px-4 sm:py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs sm:text-sm text-muted-foreground">
        <div>
          {filteredUsers.length > 0 ? (
            <>
              Mostrando{' '}
              <span className="font-semibold">
                {startIndex + 1} - {Math.min(endIndex, filteredUsers.length)}
              </span>{' '}
              de <span className="font-semibold">{filteredUsers.length}</span> usuários
            </>
          ) : (
            'Nenhum usuário para exibir'
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={safeCurrentPage <= 1}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span>
            Página <span className="font-semibold">{safeCurrentPage}</span> de{' '}
            <span className="font-semibold">{totalPages}</span>
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={safeCurrentPage >= totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md overflow-hidden">
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
            <DialogDescription>
              Preencha os dados do novo usuário. A senha será exibida apenas uma vez.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 w-full">
            <div className="w-full min-w-0">
              <Label>Nome *</Label>
              <Input
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="Nome completo"
                className="w-full"
              />
            </div>
            <div className="w-full min-w-0">
              <Label>Email *</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="email@exemplo.com"
                className="w-full"
              />
            </div>
            <div className="w-full min-w-0">
              <Label>Telefone</Label>
              <Input
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                placeholder="(11) 99999-9999"
                className="w-full"
              />
            </div>
            <div className="w-full min-w-0">
              <Label>Role *</Label>
              <Select
                value={newUser.role}
                onValueChange={(value: any) => setNewUser({ ...newUser, role: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="barbeiro">Barbeiro</SelectItem>
                  <SelectItem value="gestor">Gestor</SelectItem>
                  {currentUserRole === 'admin' && (
                    <SelectItem value="admin">Admin</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full min-w-0">
              <Label>Senha *</Label>
              <div className="flex gap-2 w-full">
                <div className="relative flex-1 min-w-0">
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Senha"
                    className="pr-20 w-full"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-8 top-0 h-full flex-shrink-0"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full flex-shrink-0"
                    onClick={() => copyToClipboard(newUser.password)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNewUser({ ...newUser, password: generatePassword() })}
                  title="Gerar senha aleatória"
                  className="flex-shrink-0"
                >
                  <Dice5 className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                ⚠️ Anote a senha! Não será possível visualizá-la depois.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateUser} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Criar Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md overflow-hidden">
          <DialogHeader>
            <DialogTitle>Redefinir Senha</DialogTitle>
            <DialogDescription className="break-words">
              {selectedUser?.name} ({selectedUser?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 w-full">
            <div className="w-full min-w-0">
              <Label>Nova Senha</Label>
              <div className="flex gap-2 w-full">
                <div className="relative flex-1 min-w-0">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nova senha"
                    className="pr-20 w-full"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-8 top-0 h-full flex-shrink-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full flex-shrink-0"
                    onClick={() => copyToClipboard(newPassword)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNewPassword(generatePassword())}
                  title="Gerar senha aleatória"
                  className="flex-shrink-0"
                >
                  <Dice5 className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                ⚠️ O usuário precisará usar esta nova senha no próximo login.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdatePassword} disabled={updatingPassword}>
              {updatingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Redefinir Senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog (Role + Info) */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="sm:max-w-lg max-w-[95vw] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription className="break-words">
              {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          {loadingBarberData ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Carregando dados...</span>
            </div>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 w-full">
              {/* Informações Básicas */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground">Informações Básicas</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="w-full min-w-0">
                    <Label>Nome</Label>
                    <Input
                      value={editUserData.name}
                      onChange={(e) => setEditUserData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nome completo"
                      className="w-full"
                    />
                  </div>
                  <div className="w-full min-w-0">
                    <Label>Telefone</Label>
                    <Input
                      value={editUserData.phone}
                      onChange={(e) => setEditUserData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="(XX) XXXXX-XXXX"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Role */}
              <div>
                <Label>Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cliente">Cliente</SelectItem>
                    <SelectItem value="barbeiro">Barbeiro</SelectItem>
                    <SelectItem value="gestor">Gestor</SelectItem>
                    {currentUserRole === 'admin' && (
                      <SelectItem value="admin">Admin</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Senha - especialmente importante para barbeiros */}
              {(selectedRole === 'barbeiro' || selectedUser?.role === 'barbeiro') && (
                <div className="space-y-3 border-t pt-4">
                  <h4 className="font-semibold text-sm text-muted-foreground">Senha do Barbeiro</h4>
                  {generatedPasswordInEdit ? (
                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <Label className="text-green-400 font-semibold mb-2 block">Senha Gerada/Atualizada</Label>
                      <div className="flex gap-2 items-center">
                        <div className="relative flex-1 min-w-0">
                          <Input
                            type={showEditPassword ? 'text' : 'password'}
                            value={generatedPasswordInEdit}
                            readOnly
                            className="pr-20 w-full bg-secondary font-mono text-lg"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-8 top-0 h-full flex-shrink-0"
                            onClick={() => setShowEditPassword(!showEditPassword)}
                          >
                            {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full flex-shrink-0"
                            onClick={() => copyToClipboard(generatedPasswordInEdit)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-green-400/80 mt-2">
                        ✅ Copie e compartilhe esta senha com o barbeiro. Ela não será exibida novamente.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => {
                          setGeneratedPasswordInEdit(null);
                          setEditPassword('');
                        }}
                      >
                        Gerar Nova Senha
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Nova Senha</Label>
                      <div className="flex gap-2 w-full">
                        <div className="relative flex-1 min-w-0">
                          <Input
                            type={showEditPassword ? 'text' : 'password'}
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            placeholder="Deixe em branco para gerar automaticamente"
                            className="pr-20 w-full"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-8 top-0 h-full flex-shrink-0"
                            onClick={() => setShowEditPassword(!showEditPassword)}
                          >
                            {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full flex-shrink-0"
                            onClick={() => copyToClipboard(editPassword)}
                            disabled={!editPassword}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const newPass = generatePassword();
                            setEditPassword(newPass);
                            setShowEditPassword(true);
                          }}
                          title="Gerar senha aleatória"
                          className="flex-shrink-0"
                        >
                          <Dice5 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {editPassword ? '⚠️ A senha será atualizada ao salvar. Anote antes de salvar!' : '💡 Deixe em branco para gerar uma senha aleatória automaticamente ao salvar.'}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={async () => {
                          if (!selectedUser) return;
                          const passwordToUse = editPassword || generatePassword();
                          setUpdatingPasswordInEdit(true);
                          try {
                            const { data, error } = await supabase.functions.invoke('api', {
                              body: {
                                action: `admin/users/${selectedUser.id}/password`,
                                password: passwordToUse,
                              },
                            });

                            if (error) throw error;

                            if (data?.success) {
                              setGeneratedPasswordInEdit(passwordToUse);
                              setEditPassword(passwordToUse);
                              setShowEditPassword(true);
                              toast.success('Senha atualizada com sucesso!', {
                                description: `Nova senha: ${passwordToUse}`,
                                duration: 10000,
                              });
                            } else {
                              toast.error('Erro ao atualizar senha', {
                                description: data?.message || 'Erro desconhecido',
                              });
                            }
                          } catch (error: any) {
                            toast.error('Erro ao atualizar senha', {
                              description: error.message,
                            });
                          } finally {
                            setUpdatingPasswordInEdit(false);
                          }
                        }}
                        disabled={updatingPasswordInEdit}
                      >
                        {updatingPasswordInEdit ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Atualizando...
                          </>
                        ) : (
                          <>
                            <Key className="mr-2 h-4 w-4" />
                            {editPassword ? 'Atualizar Senha' : 'Gerar e Atualizar Senha'}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Informações do Barbeiro (só aparece se for barbeiro) */}
              {(selectedRole === 'barbeiro' || barberData) && (
                <div className="space-y-3 border-t pt-4">
                  <h4 className="font-semibold text-sm text-muted-foreground">Informações do Barbeiro</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="w-full min-w-0">
                      <Label>Especialidade</Label>
                      <Input
                        value={editUserData.specialty}
                        onChange={(e) => setEditUserData(prev => ({ ...prev, specialty: e.target.value }))}
                        placeholder="Ex: Cortes modernos"
                        className="w-full"
                      />
                    </div>
                    <div className="w-full min-w-0">
                      <Label>Experiência</Label>
                      <Input
                        value={editUserData.experience}
                        onChange={(e) => setEditUserData(prev => ({ ...prev, experience: e.target.value }))}
                        placeholder="Ex: 5 anos"
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="w-full min-w-0">
                    <Label>WhatsApp Pessoal</Label>
                    <Input
                      value={editUserData.whatsapp_phone}
                      onChange={(e) => setEditUserData(prev => ({ ...prev, whatsapp_phone: e.target.value }))}
                      placeholder="Ex: 5511999999999"
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Para receber notificações de novos agendamentos
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateRole} disabled={updatingRole || loadingBarberData}>
              {updatingRole ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="sm:max-w-md max-w-[95vw] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Detalhes do Usuário</DialogTitle>
            <DialogDescription>
              Informações completas do usuário
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4 w-full min-w-0">
              <div className="flex items-center gap-4 w-full min-w-0">
                {selectedUser.image_url ? (
                  <img
                    src={selectedUser.image_url}
                    alt={selectedUser.name || 'User'}
                    className="w-16 h-16 rounded-full object-cover border-2 border-primary/50 shadow-md flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-secondary border-2 border-primary/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-semibold text-primary">
                      {(selectedUser.name || selectedUser.email || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold truncate">{selectedUser.name || '-'}</h3>
                  <Badge variant={getRoleBadgeVariant(selectedUser.role)} className="whitespace-nowrap">
                    {getRoleLabel(selectedUser.role)}
                  </Badge>
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t border-border w-full min-w-0">
                <div className="w-full min-w-0">
                  <Label className="text-sm text-muted-foreground">Email</Label>
                  <div className="flex items-center gap-2 mt-1 w-full min-w-0">
                    <p className="text-sm font-medium break-all flex-1 min-w-0">{selectedUser.email || '-'}</p>
                    {selectedUser.email && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedUser.email);
                          toast.success('Email copiado!');
                        }}
                        title="Copiar email"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="w-full min-w-0">
                  <Label className="text-sm text-muted-foreground">Telefone</Label>
                  <div className="flex items-center gap-2 mt-1 w-full min-w-0">
                    <p className="text-sm font-medium break-all flex-1 min-w-0">{selectedUser.phone || '-'}</p>
                    {selectedUser.phone && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedUser.phone);
                          toast.success('Telefone copiado!');
                        }}
                        title="Copiar telefone"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="w-full min-w-0">
                  <Label className="text-sm text-muted-foreground">ID</Label>
                  <div className="flex items-center gap-2 mt-1 w-full min-w-0">
                    <p className="text-xs font-mono text-muted-foreground break-all flex-1 min-w-0">{selectedUser.id}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedUser.id);
                        toast.success('ID copiado!');
                      }}
                      title="Copiar ID"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Fechar
            </Button>
            {selectedUser && (
              <Button onClick={() => {
                setDetailsDialogOpen(false);
                openRoleDialog(selectedUser);
              }}>
                Editar Usuário
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{selectedUser?.name}</strong> ({selectedUser?.email})?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
    </div>
  );
};

export default UserManager;
