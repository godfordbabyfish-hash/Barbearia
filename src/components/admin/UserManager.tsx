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
import { Plus, Key, Pencil, Trash2, RefreshCw, Copy, Eye, EyeOff, Dice5, Loader2, ChevronLeft, ChevronRight, Users, UserCheck, UserRoundX, Repeat2, CalendarCheck, PhoneOff, MessageCircleWarning, ShieldAlert, Camera, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { uploadPublicImage } from '@/utils/storage';
import { cleanCPF, formatCPF, validateCPF } from '@/utils/cpfValidation';

interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  cpf?: string | null;
  role: string;
  roles: string[];
  image_url?: string | null;
  blocked?: boolean;
  createdAt: string;
  lastSignIn: string | null;
  clientAnalytics?: {
    completedCount: number;
    completedLast90Days: number;
    lastVisit: string | null;
    daysSinceLastVisit: number | null;
    hasUpcomingAppointment: boolean;
    nextAppointment: string | null;
    phoneValid: boolean;
    whatsappFailureCount: number;
    whatsappLastError: string | null;
    whatsappLastFailureAt: string | null;
    status: 'active' | 'at_risk' | 'inactive' | 'new';
    recurring: boolean;
  };
}

type ClientFilter = 'all' | 'active' | 'recurring' | 'at_risk' | 'inactive' | 'new' | 'upcoming' | 'invalid_phone' | 'whatsapp_failed' | 'blocked';

export const UserManager = () => {
  const { user: currentUser, role: currentUserRole, session } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<ClientFilter>('all');
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
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [selectedUserCpf, setSelectedUserCpf] = useState<string>('');
  const [updatingRole, setUpdatingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [editUserData, setEditUserData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    photo_url: '',
    specialty: '',
    experience: '',
    whatsapp_phone: '',
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
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

  const loadAllClientAppointments = async () => {
    const pageSize = 1000;
    const rows: any[] = [];

    for (let from = 0; ; from += pageSize) {
      const { data, error } = await (supabase as any)
        .from('appointments')
        .select('client_id, appointment_date, appointment_time, status')
        .in('status', ['completed', 'pending', 'confirmed'])
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) throw error;
      const page = data || [];
      rows.push(...page);
      if (page.length < pageSize) break;
    }

    return rows;
  };

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
        const [{ data: barbersData }, { data: profilesData }, appointmentsData, { data: failedMessages }] = await Promise.all([
          (supabase as any).from('barbers').select('id, user_id, name, image_url, whatsapp_phone, visible'),
          (supabase as any).from('profiles').select('id, name, phone, whatsapp, cpf, photo_url, is_temp_user, created_at, blocked'),
          loadAllClientAppointments(),
          (supabase as any).from('whatsapp_notifications_queue').select('client_phone, target_phone, status, attempts, error_message, processed_at, created_at').eq('status', 'failed').or('target_type.eq.client,target_type.is.null'),
        ]);
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
          const existingUser = enriched.find((user) => user.id === p.id);
          if (existingUser) {
            existingUser.name = p.name || existingUser.name;
            existingUser.phone = p.whatsapp || p.phone || existingUser.phone;
            existingUser.cpf = p.cpf || existingUser.cpf || null;
            existingUser.image_url = p.photo_url || existingUser.image_url || null;
            existingUser.blocked = p.blocked === true;
            return;
          }

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

        const normalizePhone = (value?: string | null) => String(value || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
        const profileById = new Map((profilesData || []).map((profile: any) => [profile.id, profile]));
        const appointmentsByClient = new Map<string, any[]>();
        (appointmentsData || []).forEach((appointment: any) => {
          const list = appointmentsByClient.get(appointment.client_id) || [];
          list.push(appointment);
          appointmentsByClient.set(appointment.client_id, list);
        });
        const failuresByPhone = new Map<string, any[]>();
        (failedMessages || []).forEach((message: any) => {
          const phone = normalizePhone(message.target_phone || message.client_phone);
          if (!phone) return;
          const list = failuresByPhone.get(phone) || [];
          list.push(message);
          failuresByPhone.set(phone, list);
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        enriched.forEach((user) => {
          const isClient = user.role === 'cliente' || user.roles?.includes('cliente');
          if (!isClient) return;
          const profile: any = profileById.get(user.id);
          user.blocked = profile?.blocked === true;
          const clientAppointments = appointmentsByClient.get(user.id) || [];
          const completed = clientAppointments
            .filter((appointment) => appointment.status === 'completed')
            .sort((a, b) => String(b.appointment_date).localeCompare(String(a.appointment_date)));
          const lastVisit = completed[0]?.appointment_date || null;
          const lastVisitDate = lastVisit ? new Date(`${lastVisit}T00:00:00`) : null;
          const daysSinceLastVisit = lastVisitDate ? Math.max(0, Math.floor((today.getTime() - lastVisitDate.getTime()) / 86400000)) : null;
          const createdDate = profile?.created_at ? new Date(profile.created_at) : null;
          const daysSinceRegistration = createdDate ? Math.max(0, Math.floor((today.getTime() - createdDate.getTime()) / 86400000)) : null;
          const upcoming = clientAppointments
            .filter((appointment) => ['pending', 'confirmed'].includes(appointment.status) && new Date(`${appointment.appointment_date}T00:00:00`) >= today)
            .sort((a, b) => `${a.appointment_date} ${a.appointment_time}`.localeCompare(`${b.appointment_date} ${b.appointment_time}`));
          const completedLast90Days = completed.filter((appointment) => {
            const date = new Date(`${appointment.appointment_date}T00:00:00`);
            return (today.getTime() - date.getTime()) / 86400000 <= 90;
          }).length;
          const phoneDigits = normalizePhone(profile?.whatsapp || profile?.phone || user.phone);
          const failures = (failuresByPhone.get(phoneDigits) || [])
            .sort((a, b) => String(b.processed_at || b.created_at).localeCompare(String(a.processed_at || a.created_at)));
          const status: ClientFilter = daysSinceLastVisit === null
            ? ((daysSinceRegistration ?? 0) > 30 ? 'inactive' : 'new')
            : daysSinceLastVisit <= 20 ? 'active'
            : daysSinceLastVisit <= 30 ? 'at_risk'
            : 'inactive';

          user.clientAnalytics = {
            completedCount: completed.length,
            completedLast90Days,
            lastVisit,
            daysSinceLastVisit,
            hasUpcomingAppointment: upcoming.length > 0,
            nextAppointment: upcoming[0]?.appointment_date || null,
            phoneValid: phoneDigits.length === 10 || phoneDigits.length === 11,
            whatsappFailureCount: failures.length,
            whatsappLastError: failures[0]?.error_message || null,
            whatsappLastFailureAt: failures[0]?.processed_at || failures[0]?.created_at || null,
            status: status as 'active' | 'at_risk' | 'inactive' | 'new',
            recurring: completed.length >= 2 && completedLast90Days >= 2 && (daysSinceLastVisit ?? 999) <= 30,
          };
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
      const cleanedCpf = cleanCPF(editUserData.cpf);
      if (!editUserData.name.trim()) throw new Error('Informe o nome do usuário.');
      if (!editUserData.email.trim()) throw new Error('Informe o e-mail do usuário.');
      if (cleanedCpf) {
        const cpfValidation = validateCPF(cleanedCpf);
        if (!cpfValidation.isValid) throw new Error(cpfValidation.errorMessage || 'CPF inválido.');
      }

      const { data: detailsResult, error: detailsError } = await supabase.functions.invoke('api', {
        body: {
          action: `admin/users/${selectedUser.id}/details`,
          name: editUserData.name.trim(),
          email: editUserData.email.trim().toLowerCase(),
          phone: editUserData.phone.trim(),
          cpf: cleanedCpf || null,
          photo_url: editUserData.photo_url || null,
        },
      });
      if (detailsError) throw detailsError;
      if (!detailsResult?.success) throw new Error(detailsResult?.message || 'Não foi possível atualizar os dados pessoais.');

      // Atualizar role via API
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

      // Se for barbeiro, atualizar dados do barbeiro
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
      setEditUserData({ name: '', email: '', phone: '', cpf: '', photo_url: '', specialty: '', experience: '', whatsapp_phone: '' });
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
      email: user.email || '',
      phone: user.phone || '',
      cpf: user.cpf || '',
      photo_url: user.image_url || '',
      specialty: '',
      experience: '',
      whatsapp_phone: '',
    });
    setSelectedUserCpf(user.cpf || '');
    setIsBlocked(false);
    setBarberData(null);
    setEditPassword('');
    setGeneratedPasswordInEdit(null);
    setShowEditPassword(false);
    setRoleDialogOpen(true);

    try {
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('cpf, blocked, photo_url, phone, whatsapp')
        .eq('id', user.id)
        .maybeSingle();
      if (profile) {
        setSelectedUserCpf(profile.cpf || user.cpf || '');
        setIsBlocked(Boolean(profile.blocked));
        setEditUserData(prev => ({
          ...prev,
          cpf: profile.cpf || user.cpf || '',
          phone: profile.whatsapp || profile.phone || user.phone || '',
          photo_url: profile.photo_url || user.image_url || '',
        }));
      }
    } catch (e) {
      console.warn('Erro ao carregar bloqueio do perfil:', e);
    }

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
    return true;
  };

  const canDeleteUser = (user: User) => {
    if (user.id === currentUser?.id) return false;
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

    const analytics = user.clientAnalytics;
    if (clientFilter !== 'all') {
      const matchesClientFilter =
        (clientFilter === 'blocked' && Boolean(user.blocked)) ||
        (clientFilter === 'recurring' && analytics?.recurring) ||
        (clientFilter === 'upcoming' && analytics?.hasUpcomingAppointment) ||
        (clientFilter === 'invalid_phone' && analytics && !analytics.phoneValid) ||
        (clientFilter === 'whatsapp_failed' && (analytics?.whatsappFailureCount || 0) > 0) ||
        (['active', 'at_risk', 'inactive', 'new'].includes(clientFilter) && analytics?.status === clientFilter);
      if (!matchesClientFilter) return false;
    }

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

  const clients = users.filter((user) => user.clientAnalytics);
  const clientMetrics = {
    total: clients.length,
    active: clients.filter((user) => user.clientAnalytics?.status === 'active').length,
    recurring: clients.filter((user) => user.clientAnalytics?.recurring).length,
    atRisk: clients.filter((user) => user.clientAnalytics?.status === 'at_risk').length,
    inactive: clients.filter((user) => user.clientAnalytics?.status === 'inactive').length,
    newClients: clients.filter((user) => user.clientAnalytics?.status === 'new').length,
    upcoming: clients.filter((user) => user.clientAnalytics?.hasUpcomingAppointment).length,
    invalidPhone: clients.filter((user) => !user.clientAnalytics?.phoneValid).length,
    whatsappFailed: clients.filter((user) => (user.clientAnalytics?.whatsappFailureCount || 0) > 0).length,
  };

  const metricCards = [
    { filter: 'all' as ClientFilter, label: 'Clientes cadastrados', value: clientMetrics.total, hint: 'Base total de clientes', icon: Users, tone: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    { filter: 'active' as ClientFilter, label: 'Ativos', value: clientMetrics.active, hint: 'Visita nos últimos 20 dias', icon: UserCheck, tone: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    { filter: 'recurring' as ClientFilter, label: 'Recorrentes', value: clientMetrics.recurring, hint: '2+ visitas nos últimos 90 dias', icon: Repeat2, tone: 'text-primary bg-primary/10 border-primary/20' },
    { filter: 'at_risk' as ClientFilter, label: 'Atenção', value: clientMetrics.atRisk, hint: 'Sem visita há 21–30 dias', icon: ShieldAlert, tone: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    { filter: 'inactive' as ClientFilter, label: 'Inativos', value: clientMetrics.inactive, hint: 'Sem visita há mais de 30 dias', icon: UserRoundX, tone: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
    { filter: 'upcoming' as ClientFilter, label: 'Com retorno marcado', value: clientMetrics.upcoming, hint: 'Agendamento futuro ativo', icon: CalendarCheck, tone: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
    { filter: 'invalid_phone' as ClientFilter, label: 'Telefone inválido', value: clientMetrics.invalidPhone, hint: 'Cadastro ausente ou incompleto', icon: PhoneOff, tone: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
    { filter: 'whatsapp_failed' as ClientFilter, label: 'Falha no WhatsApp', value: clientMetrics.whatsappFailed, hint: 'Clientes com envio não entregue', icon: MessageCircleWarning, tone: 'text-red-400 bg-red-500/10 border-red-500/20' },
  ];

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  return (
    <div className="space-y-4 sm:space-y-6 w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 w-full" style={{ maxWidth: '100%' }}>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Clientes e Usuários</h2>
          <p className="mt-1 text-sm text-muted-foreground">Acompanhe recorrência, retorno e qualidade dos contatos da sua base.</p>
        </div>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {metricCards.map(({ filter, label, value, hint, icon: Icon, tone }) => (
          <button
            key={filter}
            type="button"
            onClick={() => {
              setClientFilter(clientFilter === filter && filter !== 'all' ? 'all' : filter);
              setFilterRole('cliente');
              setCurrentPage(1);
            }}
            className={`rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg ${tone} ${clientFilter === filter ? 'ring-2 ring-current' : ''}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground/80">{label}</p>
                <p className="mt-1 text-3xl font-bold text-foreground">{loading ? '—' : value}</p>
              </div>
              <Icon className="h-5 w-5" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">Visão selecionada:</span>
          <Badge variant="secondary">{metricCards.find((card) => card.filter === clientFilter)?.label || 'Todos'}</Badge>
          {clientFilter !== 'all' && (
            <Button variant="ghost" size="sm" onClick={() => { setClientFilter('all'); setCurrentPage(1); }}>Limpar</Button>
          )}
        </div>
        <Select value={clientFilter} onValueChange={(value) => { setClientFilter(value as ClientFilter); setCurrentPage(1); }}>
          <SelectTrigger className="w-full sm:w-[240px]"><SelectValue placeholder="Situação do cliente" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as situações</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="recurring">Recorrentes</SelectItem>
            <SelectItem value="at_risk">Atenção (21–30 dias)</SelectItem>
            <SelectItem value="inactive">Inativos (+30 dias)</SelectItem>
            <SelectItem value="new">Novos sem atendimento</SelectItem>
            <SelectItem value="upcoming">Com retorno marcado</SelectItem>
            <SelectItem value="invalid_phone">Telefone inválido</SelectItem>
            <SelectItem value="whatsapp_failed">Falha no WhatsApp</SelectItem>
            <SelectItem value="blocked">Bloqueados</SelectItem>
          </SelectContent>
        </Select>
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
                  <TableHead className="hidden md:table-cell w-[110px] px-1 sm:px-2">Situação</TableHead>
                  <TableHead className="hidden lg:table-cell w-[130px] px-1 sm:px-2">Última visita</TableHead>
                  <TableHead className="w-[80px] sm:w-[90px] px-1 sm:px-2">Perfil</TableHead>
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
                    <TableCell className="hidden md:table-cell px-1 sm:px-2">
                      {user.clientAnalytics ? (
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge variant={user.clientAnalytics.status === 'active' ? 'default' : user.clientAnalytics.status === 'inactive' ? 'destructive' : 'secondary'}>
                            {user.clientAnalytics.status === 'active' ? 'Ativo' : user.clientAnalytics.status === 'at_risk' ? 'Atenção' : user.clientAnalytics.status === 'inactive' ? 'Inativo' : 'Novo'}
                          </Badge>
                          {user.clientAnalytics.recurring && <Badge variant="outline">Recorrente</Badge>}
                          {(user.clientAnalytics.whatsappFailureCount > 0 || !user.clientAnalytics.phoneValid) && <MessageCircleWarning className="h-4 w-4 text-red-400" aria-label="Problema de contato" />}
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell px-1 sm:px-2 text-xs text-muted-foreground">
                      {user.clientAnalytics?.lastVisit
                        ? `${new Date(`${user.clientAnalytics.lastVisit}T12:00:00`).toLocaleDateString('pt-BR')} (${user.clientAnalytics.daysSinceLastVisit}d)`
                        : user.clientAnalytics ? 'Ainda não atendido' : '—'}
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
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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
                  {(currentUserRole === 'admin' || currentUserRole === 'gestor') && (
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
                <div className="flex items-center gap-4 rounded-lg border p-3">
                  <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-primary/40 bg-muted flex items-center justify-center shrink-0">
                    {editUserData.photo_url ? <img src={editUserData.photo_url} alt="Foto do usuário" className="h-full w-full object-cover" /> : <span className="text-2xl font-semibold text-muted-foreground">{editUserData.name.charAt(0).toUpperCase() || '?'}</span>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" disabled={uploadingAvatar} asChild>
                      <label className="cursor-pointer">
                        {uploadingAvatar ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                        Alterar foto
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploadingAvatar} onChange={async (event) => {
                          const file = event.target.files?.[0];
                          event.target.value = '';
                          if (!file || !selectedUser) return;
                          if (file.size > 5 * 1024 * 1024) { toast.error('A foto deve ter no máximo 5 MB.'); return; }
                          setUploadingAvatar(true);
                          try {
                            const url = await uploadPublicImage(file, { bucket: 'avatars', category: 'avatars', prefix: selectedUser.id });
                            setEditUserData(prev => ({ ...prev, photo_url: url }));
                            toast.success('Foto carregada. Clique em Salvar para confirmar.');
                          } catch (error: any) {
                            toast.error('Erro ao enviar foto', { description: error.message });
                          } finally { setUploadingAvatar(false); }
                        }} />
                      </label>
                    </Button>
                    {editUserData.photo_url && <Button type="button" variant="ghost" onClick={() => setEditUserData(prev => ({ ...prev, photo_url: '' }))}><X className="mr-2 h-4 w-4" /> Remover</Button>}
                  </div>
                </div>
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
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      value={editUserData.email}
                      onChange={(e) => setEditUserData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="cliente@email.com"
                      className="w-full"
                    />
                  </div>
                  <div className="w-full min-w-0">
                    <Label>Telefone / WhatsApp</Label>
                    <Input value={editUserData.phone} onChange={(e) => setEditUserData(prev => ({ ...prev, phone: e.target.value }))} placeholder="(XX) XXXXX-XXXX" className="w-full" />
                  </div>
                  <div className="w-full min-w-0">
                    <Label>CPF</Label>
                    <Input value={formatCPF(editUserData.cpf)} onChange={(e) => setEditUserData(prev => ({ ...prev, cpf: cleanCPF(e.target.value).slice(0, 11) }))} placeholder="000.000.000-00" inputMode="numeric" className="w-full" />
                  </div>
                </div>
                <div className="w-full min-w-0">
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant={isBlocked ? 'outline' : 'destructive'}
                      onClick={async () => {
                        if (!selectedUser) return;
                        try {
                          const { error } = await (supabase as any)
                            .from('profiles')
                            .update({ blocked: !isBlocked })
                            .eq('id', selectedUser.id);
                          if (error) {
                            toast.error('Erro ao atualizar bloqueio', { description: error.message });
                          } else {
                            setIsBlocked(!isBlocked);
                            toast.success(!isBlocked ? 'Cliente bloqueado' : 'Cliente desbloqueado');
                          }
                        } catch (err: any) {
                          toast.error('Erro ao atualizar bloqueio', { description: err.message });
                        }
                      }}
                      className="h-8"
                    >
                      {isBlocked ? 'Desbloquear' : 'Bloquear'}
                    </Button>
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
                {selectedUser.clientAnalytics && (
                  <div className="rounded-lg border border-border bg-secondary/20 p-3 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={selectedUser.clientAnalytics.status === 'active' ? 'default' : selectedUser.clientAnalytics.status === 'inactive' ? 'destructive' : 'secondary'}>
                        {selectedUser.clientAnalytics.status === 'active' ? 'Cliente ativo' : selectedUser.clientAnalytics.status === 'at_risk' ? 'Requer atenção' : selectedUser.clientAnalytics.status === 'inactive' ? 'Cliente inativo' : 'Cliente novo'}
                      </Badge>
                      {selectedUser.clientAnalytics.recurring && <Badge variant="outline">Recorrente</Badge>}
                      {selectedUser.clientAnalytics.hasUpcomingAppointment && <Badge variant="outline">Retorno marcado</Badge>}
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><p className="text-muted-foreground">Atendimentos</p><p className="font-semibold">{selectedUser.clientAnalytics.completedCount}</p></div>
                      <div><p className="text-muted-foreground">Últimos 90 dias</p><p className="font-semibold">{selectedUser.clientAnalytics.completedLast90Days}</p></div>
                      <div><p className="text-muted-foreground">Última visita</p><p className="font-semibold">{selectedUser.clientAnalytics.lastVisit ? new Date(`${selectedUser.clientAnalytics.lastVisit}T12:00:00`).toLocaleDateString('pt-BR') : 'Nunca'}</p></div>
                      <div><p className="text-muted-foreground">Próximo retorno</p><p className="font-semibold">{selectedUser.clientAnalytics.nextAppointment ? new Date(`${selectedUser.clientAnalytics.nextAppointment}T12:00:00`).toLocaleDateString('pt-BR') : 'Não agendado'}</p></div>
                    </div>
                    {!selectedUser.clientAnalytics.phoneValid && (
                      <div className="flex gap-2 rounded-md bg-rose-500/10 p-2 text-xs text-rose-300"><PhoneOff className="h-4 w-4 shrink-0" /> Telefone ausente ou com quantidade inválida de dígitos.</div>
                    )}
                    {selectedUser.clientAnalytics.whatsappFailureCount > 0 && (
                      <div className="rounded-md bg-red-500/10 p-2 text-xs text-red-300">
                        <div className="flex items-center gap-2 font-semibold"><MessageCircleWarning className="h-4 w-4" /> {selectedUser.clientAnalytics.whatsappFailureCount} falha(s) no WhatsApp</div>
                        <p className="mt-1 break-words">{selectedUser.clientAnalytics.whatsappLastError || 'O provedor não informou o motivo.'}</p>
                        {selectedUser.clientAnalytics.whatsappLastFailureAt && <p className="mt-1 text-muted-foreground">Última tentativa: {new Date(selectedUser.clientAnalytics.whatsappLastFailureAt).toLocaleString('pt-BR')}</p>}
                      </div>
                    )}
                  </div>
                )}
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
