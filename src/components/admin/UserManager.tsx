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
import { Plus, Key, Pencil, Trash2, RefreshCw, Copy, Eye, EyeOff, Dice5, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: string;
  roles: string[];
  createdAt: string;
  lastSignIn: string | null;
}

export const UserManager = () => {
  const { user: currentUser, role: currentUserRole, session } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<string>('all');
  
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
  
  // Edit role dialog
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');
  
  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadUsers = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/c4d959c1-8b88-44cd-ac6f-581bf2782e74',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserManager.tsx:90',message:'LoadUsers start',data:{hasSession:!!session,hasAccessToken:!!session?.access_token},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'I'})}).catch(()=>{});
    // #endregion
    
    setLoading(true);
    try {
      // Try GET method first (direct fetch)
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api/admin/users`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
        }
      );

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/c4d959c1-8b88-44cd-ac6f-581bf2782e74',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserManager.tsx:105',message:'LoadUsers fetch response',data:{status:response.status,statusText:response.statusText,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'I'})}).catch(()=>{});
      // #endregion

      const result = await response.json();

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/c4d959c1-8b88-44cd-ac6f-581bf2782e74',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserManager.tsx:111',message:'LoadUsers result',data:{success:result.success,usersCount:result.users?.length,errorMessage:result.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'I'})}).catch(()=>{});
      // #endregion

      if (result.success) {
        setUsers(result.users || []);
      } else {
        toast.error('Erro ao carregar usuários', {
          description: result.message || 'Erro desconhecido',
        });
      }
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/c4d959c1-8b88-44cd-ac6f-581bf2782e74',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserManager.tsx:123',message:'LoadUsers catch error',data:{errorMessage:error?.message,errorName:error?.name},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'I'})}).catch(()=>{});
      // #endregion
      
      toast.error('Erro ao carregar usuários', {
        description: error.message || 'Erro ao conectar com o servidor',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/c4d959c1-8b88-44cd-ac6f-581bf2782e74',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserManager.tsx:132',message:'UserManager useEffect',data:{hasSession:!!session,hasAccessToken:!!session?.access_token,willLoad:!!session?.access_token},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'I'})}).catch(()=>{});
    // #endregion
    
    if (session?.access_token) {
      loadUsers();
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/c4d959c1-8b88-44cd-ac6f-581bf2782e74',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserManager.tsx:137',message:'UserManager - no session token, waiting',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'I'})}).catch(()=>{});
      // #endregion
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
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api/admin/users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify(newUser),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success('Usuário criado com sucesso!', {
          description: `Senha: ${newUser.password}`,
        });
        setCreateDialogOpen(false);
        setNewUser({ email: '', password: '', name: '', phone: '', role: 'barbeiro' });
        loadUsers();
      } else {
        toast.error('Erro ao criar usuário', {
          description: result.message,
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
    if (!selectedUser || !newPassword) {
      toast.error('Digite a nova senha');
      return;
    }

    setUpdatingPassword(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api/admin/users/${selectedUser.id}/password`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ password: newPassword }),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success('Senha atualizada com sucesso!');
        setPasswordDialogOpen(false);
        setSelectedUser(null);
        setNewPassword('');
      } else {
        toast.error('Erro ao atualizar senha', {
          description: result.message,
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

  const handleUpdateRole = async () => {
    if (!selectedUser || !selectedRole) {
      toast.error('Selecione uma role');
      return;
    }

    setUpdatingRole(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api/admin/users/${selectedUser.id}/role`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ role: selectedRole }),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success('Role atualizada com sucesso!');
        setRoleDialogOpen(false);
        setSelectedUser(null);
        setSelectedRole('');
        loadUsers();
      } else {
        toast.error('Erro ao atualizar role', {
          description: result.message,
        });
      }
    } catch (error: any) {
      toast.error('Erro ao atualizar role', {
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
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api/admin/users/${selectedUser.id}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success('Usuário excluído com sucesso!');
        setDeleteDialogOpen(false);
        setSelectedUser(null);
        loadUsers();
      } else {
        toast.error('Erro ao excluir usuário', {
          description: result.message,
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

  const openPasswordDialog = (user: User) => {
    setSelectedUser(user);
    setNewPassword(generatePassword());
    setShowPassword(true);
    setPasswordDialogOpen(true);
  };

  const openRoleDialog = (user: User) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setRoleDialogOpen(true);
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
    if (filterRole === 'all') return true;
    return user.role === filterRole;
  });

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Gerenciamento de Usuários</CardTitle>
          <div className="flex gap-2">
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filtrar por role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="gestor">Gestor</SelectItem>
                <SelectItem value="barbeiro">Barbeiro</SelectItem>
                <SelectItem value="cliente">Cliente</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={loadUsers} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => {
              setNewUser({ email: '', password: generatePassword(), name: '', phone: '', role: 'barbeiro' });
              setShowNewPassword(true);
              setCreateDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name || '-'}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.phone || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {getRoleLabel(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openPasswordDialog(user)}
                        disabled={!canModifyUser(user)}
                        title="Redefinir Senha"
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openRoleDialog(user)}
                        disabled={!canModifyUser(user)}
                        title="Alterar Role"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => openDeleteDialog(user)}
                        disabled={!canDeleteUser(user)}
                        title="Excluir Usuário"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
            <DialogDescription>
              Preencha os dados do novo usuário. A senha será exibida apenas uma vez.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div>
              <Label>Role *</Label>
              <Select
                value={newUser.role}
                onValueChange={(value: any) => setNewUser({ ...newUser, role: value })}
              >
                <SelectTrigger>
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
            <div>
              <Label>Senha *</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Senha"
                    className="pr-20"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-8 top-0 h-full"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir Senha</DialogTitle>
            <DialogDescription>
              {selectedUser?.name} ({selectedUser?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nova Senha</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nova senha"
                    className="pr-20"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-8 top-0 h-full"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
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

      {/* Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Role</DialogTitle>
            <DialogDescription>
              {selectedUser?.name} ({selectedUser?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nova Role</Label>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateRole} disabled={updatingRole}>
              {updatingRole ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
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
  );
};

export default UserManager;
