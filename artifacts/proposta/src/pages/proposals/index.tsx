import React from 'react';
import { useLocation } from 'wouter';
import { useListProposals, useDeleteProposal, getListProposalsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { 
  FileText, Plus, Search, Filter, MoreHorizontal, 
  Edit, Copy, Trash2 
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ProposalsList() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<string>('all');
  const [page, setPage] = React.useState(1);
  const [rejectTarget, setRejectTarget] = React.useState<any | null>(null);

  const proposalParams = { page, limit: 10, search: search || undefined, status: status !== 'all' ? status : undefined };
  const { data, isLoading } = useListProposals(proposalParams);

  const deleteMutation = useDeleteProposal({
    mutation: {
      onSuccess: () => {
        toast.success('Proposta marcada como rejeitada');
        queryClient.invalidateQueries({ queryKey: [getListProposalsQueryKey()[0]] });
      },
      onError: () => toast.error('Erro ao rejeitar proposta')
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT': return <span className="bg-neutral-100 text-neutral-600 px-2 py-1 rounded-md text-xs font-medium">Rascunho</span>;
      case 'SENT': return <span className="bg-warning/10 text-warning px-2 py-1 rounded-md text-xs font-medium">Enviada</span>;
      case 'APPROVED': return <span className="bg-success/10 text-success px-2 py-1 rounded-md text-xs font-medium">Aprovada</span>;
      case 'REJECTED': return <span className="bg-error/10 text-error px-2 py-1 rounded-md text-xs font-medium">Rejeitada</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Propostas</h1>
          <p className="text-muted-foreground mt-1">Gerencie suas propostas comerciais.</p>
        </div>
        <Button onClick={() => setLocation('/proposals/new')} size="lg">
          <Plus className="w-5 h-5 mr-2" />
          Nova Proposta
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por anunciante, campanha ou tipo..." 
            className="pl-9 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Todos os Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="DRAFT">Rascunhos</SelectItem>
            <SelectItem value="SENT">Enviadas</SelectItem>
            <SelectItem value="APPROVED">Aprovadas</SelectItem>
            <SelectItem value="REJECTED">Rejeitadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border/60 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : data?.data && data.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50">
                <tr>
                  <th className="px-6 py-4 font-medium">Cliente / Campanha</th>
                  <th className="px-6 py-4 font-medium">Criado em</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((prop) => (
                  <tr key={prop.id} className="bg-card border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground">
                        {prop.clientLine1 || prop.advertiserName || 'Sem cliente'}
                      </div>
                      <div className="text-muted-foreground truncate max-w-[200px] mt-0.5">
                        {prop.campTag || prop.propType}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                      {format(new Date(prop.createdAt), "dd MMM, yyyy", { locale: ptBR })}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(prop.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setLocation(`/proposals/${prop.id}/edit`)}>
                            <Edit className="w-4 h-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-error focus:bg-error/10 focus:text-error" onClick={() => setRejectTarget(prop)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Rejeitar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium">Nenhuma proposta encontrada</h3>
            <p className="text-muted-foreground mt-1">Crie sua primeira proposta comercial.</p>
            <Button className="mt-4" onClick={() => setLocation('/proposals/new')}>
              <Plus className="w-4 h-4 mr-2" /> Nova Proposta
            </Button>
          </div>
        )}
      </Card>
      <ConfirmActionDialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        title="Rejeitar proposta?"
        description="Esta ação mudará o status da proposta para Rejeitada e manterá o histórico operacional."
        onConfirm={() => {
          if (!rejectTarget) return;
          deleteMutation.mutate({ id: rejectTarget.id });
          setRejectTarget(null);
        }}
      />
      
      {/* Pagination controls can go here */}
    </div>
  );
}
