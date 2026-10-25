'use client';
import { CriarUsuario } from './CriarUsuario';

import * as React from 'react';
import { useAuth } from '@/context/AuthContext';
import { buscarJson } from '@/lib/http/transporte';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Search,
  User,
  MoreHorizontal,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Trash2,
  CheckCircle,
  Eye,
  LockKeyhole,
  LockKeyholeOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { UserDetailModal } from './UserDetailModal';
import { PlanBadge } from '@/components/subscription/PlanBadge';
import { AdminUserListItem, AdminUserListResponse } from '@/types/subscription';

type SortColumn = 'created_at' | 'first_name' | 'email';
type EstadoDaOrdenacao = 'ascending' | 'descending' | 'none';

function IconeDaOrdenacao({ estado }: { estado: EstadoDaOrdenacao }) {
  const Icone =
    estado === 'ascending'
      ? ArrowUp
      : estado === 'descending'
        ? ArrowDown
        : ArrowUpDown;
  return (
    <Icone
      aria-hidden="true"
      className={estado === 'none' ? 'text-muted-foreground' : 'text-primary'}
    />
  );
}

const PAGE_SIZE = 10;

function extractApiError(payload: unknown) {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'error' in payload &&
    typeof payload.error === 'string'
  ) {
    return payload.error;
  }

  return undefined;
}

export function UserManagementContent() {
  const { db, session } = useAuth();
  const [acessoAlvo, setAcessoAlvo] = React.useState<AdminUserListItem | null>(
    null
  );
  const [alterandoAcesso, setAlterandoAcesso] = React.useState(false);
  const [users, setUsers] = React.useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [page, setPage] = React.useState(0);
  const [totalUsers, setTotalUsers] = React.useState(0);
  const [sort, setSort] = React.useState<{
    column: SortColumn;
    ascending: boolean;
  }>({
    column: 'created_at',
    ascending: false,
  });

  const [selectedUser, setSelectedUser] =
    React.useState<AdminUserListItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false);
  const [userToDelete, setUserToDelete] =
    React.useState<AdminUserListItem | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = React.useState(false);

  // `signal` cancela a busca anterior (tarefa 58): com o debounce, uma
  // resposta antiga e lenta podia chegar depois da nova e sobrescrevê-la.
  const fetchUsers = React.useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);

      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(PAGE_SIZE),
          sortColumn: sort.column,
          ascending: String(sort.ascending),
        });

        if (searchTerm.trim()) {
          params.set('search', searchTerm.trim());
        }

        const resposta = await buscarJson(
          `/api/admin/users?${params.toString()}`,
          { signal }
        );
        if (signal?.aborted) return;
        const payload = resposta.corpo as
          AdminUserListResponse | { error?: string } | null;

        if (!resposta.ok || !payload || !('users' in payload)) {
          throw new Error(
            resposta.ok
              ? extractApiError(payload) || 'Falha ao carregar os usuários.'
              : resposta.falha.message
          );
        }

        setUsers(payload.users);
        setTotalUsers(payload.total);
      } catch (error) {
        toast.error('Erro ao carregar usuários.', {
          description:
            error instanceof Error ? error.message : 'Erro desconhecido.',
        });
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [page, searchTerm, sort]
  );

  React.useEffect(() => {
    const controle = new AbortController();
    const debounce = setTimeout(() => {
      void fetchUsers(controle.signal);
    }, 300);
    return () => {
      clearTimeout(debounce);
      controle.abort();
    };
  }, [fetchUsers]);

  const alterarAcesso = async () => {
    if (!acessoAlvo || alterandoAcesso) return;
    setAlterandoAcesso(true);
    try {
      const resposta = await buscarJson(
        `/api/admin/users/${acessoAlvo.id}/bloqueio`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ blocked: !acessoAlvo.blockedAt }),
        }
      );
      if (!resposta.ok) throw new Error(resposta.falha.message);
      toast.success(
        acessoAlvo.blockedAt
          ? 'Acesso restabelecido. A pessoa já pode entrar novamente.'
          : 'Conta bloqueada e sessões anteriores encerradas.'
      );
      setAcessoAlvo(null);
      await fetchUsers();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível alterar o acesso.'
      );
    } finally {
      setAlterandoAcesso(false);
    }
  };

  const handleSort = (column: SortColumn) => {
    setSort((prev) => ({
      column,
      ascending: prev.column === column ? !prev.ascending : true,
    }));
  };

  // Estado da ordenação para o leitor de tela (`aria-sort`) e para o ícone
  // (tarefa 61): antes o mesmo ícone neutro aparecia em qualquer estado.
  const ordenacaoDe = (column: SortColumn): EstadoDaOrdenacao =>
    sort.column !== column
      ? 'none'
      : sort.ascending
        ? 'ascending'
        : 'descending';

  const handleToggleOnboarding = async (user: AdminUserListItem) => {
    const newStatus = !user.onboardingCompleted;
    const { error } = await db
      .from('profiles')
      .update({ onboarding_completed: newStatus })
      .eq('id', user.id);

    if (error) {
      toast.error('Erro ao atualizar status do onboarding.', {
        description: error.message,
      });
      return;
    }

    toast.success(
      `Onboarding de ${user.firstName || 'usuário'} foi ${newStatus ? 'marcado como completo' : 'redefinido'}.`
    );
    await fetchUsers();
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    // Exclusão da conta inteira pelas regras da LGPD (mesmo serviço da
    // exclusão feita pela própria pessoa; registros fiscais permanecem).
    try {
      const resposta = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const corpo = (await resposta.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!resposta.ok) {
        toast.error('Não foi possível excluir a conta.', {
          description: corpo?.error ?? `HTTP ${resposta.status}`,
        });
      } else {
        toast.success(
          `Conta de ${userToDelete.firstName || 'usuário'} excluída.`
        );
        await fetchUsers();
      }
    } catch (falha: unknown) {
      console.error('Falha ao excluir a conta:', falha);
      toast.error('Sem conexão com o servidor. Tente novamente.');
    }

    setIsDeleteAlertOpen(false);
  };

  const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE));

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-end">
            <CriarUsuario
              aoCriar={() => {
                void fetchUsers();
              }}
            />
          </div>
          <CardTitle as="h2">Gerenciamento de Usuários</CardTitle>
          <CardDescription>
            Total de {totalUsers} usuários. Visualizando página {page + 1} de{' '}
            {totalPages}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4 w-full md:w-1/3">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              aria-label="Buscar usuários por nome ou email"
              placeholder="Buscar por nome ou email..."
              className="w-full pl-9"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPage(0);
              }}
            />
          </div>
          <div className="min-w-0">
            <Table
              scrollLabel="Tabela de usuários"
              caption="Usuários cadastrados; os cabeçalhos com botão ordenam a lista"
            >
              <TableHeader>
                <TableRow>
                  <TableHead aria-sort={ordenacaoDe('first_name')}>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('first_name')}
                    >
                      Usuário
                      <IconeDaOrdenacao estado={ordenacaoDe('first_name')} />
                    </Button>
                  </TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead
                    className="text-right"
                    aria-sort={ordenacaoDe('created_at')}
                  >
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('created_at')}
                    >
                      Data de cadastro
                      <IconeDaOrdenacao estado={ordenacaoDe('created_at')} />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: PAGE_SIZE }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Skeleton className="h-10 w-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-10 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto h-6 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto h-8 w-8" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : users.length > 0 ? (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex min-w-[200px] items-center gap-3">
                          <Avatar>
                            <AvatarImage src={user.avatarUrl || undefined} />
                            <AvatarFallback>
                              {user.firstName?.charAt(0) || (
                                <User className="h-4 w-4" aria-hidden="true" />
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground">
                              {user.firstName || 'Usuário'}{' '}
                              {user.lastName || ''}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.plan.key ? (
                          <div className="space-y-1">
                            <PlanBadge planKey={user.plan.key} />
                            <p className="text-xs text-muted-foreground capitalize">
                              {user.plan.billingInterval === 'annual'
                                ? 'Anual'
                                : 'Mensal'}
                            </p>
                          </div>
                        ) : (
                          <Badge variant="outline">Sem assinatura</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {user.blockedAt && (
                            <Badge variant="destructive">Bloqueado</Badge>
                          )}
                          {user.onboardingCompleted ? (
                            <Badge variant="success">Completo</Badge>
                          ) : (
                            <Badge variant="secondary">Pendente</Badge>
                          )}
                          <Badge variant="outline" className="capitalize">
                            {user.role}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <time dateTime={user.createdAt}>
                          {format(new Date(user.createdAt), 'dd/MM/yyyy', {
                            locale: ptBR,
                          })}
                        </time>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Ações para ${user.email}`}
                            >
                              <MoreHorizontal
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={() => {
                                setSelectedUser(user);
                                setIsDetailModalOpen(true);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" /> Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => handleToggleOnboarding(user)}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              {user.onboardingCompleted
                                ? 'Redefinir Onboarding'
                                : 'Completar Onboarding'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={user.id === session?.user.id}
                              onSelect={() => setAcessoAlvo(user)}
                            >
                              {user.blockedAt ? (
                                <LockKeyholeOpen className="mr-2 h-4 w-4" />
                              ) : (
                                <LockKeyhole className="mr-2 h-4 w-4" />
                              )}
                              {user.blockedAt
                                ? 'Desbloquear'
                                : user.id === session?.user.id
                                  ? 'Bloquear (sua conta protegida)'
                                  : 'Bloquear'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() => {
                                setUserToDelete(user);
                                setIsDeleteAlertOpen(true);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Deletar Perfil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhum usuário encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPage((currentPage) => Math.max(0, currentPage - 1))
              }
              disabled={page === 0}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((currentPage) => currentPage + 1)}
              disabled={page >= totalPages - 1}
            >
              Próximo
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          open={isDetailModalOpen}
          onOpenChange={setIsDetailModalOpen}
          onSubscriptionUpdated={() => fetchUsers()}
        />
      )}

      <AlertDialog
        open={Boolean(acessoAlvo)}
        onOpenChange={(open) => {
          if (!open && !alterandoAcesso) setAcessoAlvo(null);
        }}
      >
        <AlertDialogContent aria-busy={alterandoAcesso}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {acessoAlvo?.blockedAt ? 'Desbloquear conta?' : 'Bloquear conta?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="break-words">
              {acessoAlvo?.email}.{' '}
              {acessoAlvo?.blockedAt
                ? 'A pessoa poderá entrar novamente com sua senha. As sessões encerradas continuarão inválidas.'
                : 'A pessoa perderá o acesso e suas sessões anteriores serão encerradas. Seus dados e sua assinatura serão preservados. O bloqueio não cancela cobranças. Você poderá desbloquear depois.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={alterandoAcesso}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={alterandoAcesso}
              onClick={(event) => {
                event.preventDefault();
                void alterarAcesso();
              }}
            >
              {alterandoAcesso
                ? 'Salvando…'
                : acessoAlvo?.blockedAt
                  ? 'Desbloquear'
                  : 'Bloquear'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja excluir a conta de{' '}
              <span className="font-bold">
                {userToDelete?.firstName || 'usuário'}
              </span>
              ? Todos os dados pessoais e de saúde dela serão apagados; só os
              registros fiscais permanecem, como exige a lei. Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive-hover"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
