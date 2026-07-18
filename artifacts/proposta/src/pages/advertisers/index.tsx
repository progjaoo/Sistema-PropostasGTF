import React from 'react';
import { useLocation } from 'wouter';
import { useListAdvertisers, useDeleteAdvertiser, getListAdvertisersQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { feedback } from '@/lib/feedback';
import { ChevronDown, ChevronRight, Plus, Search, MoreHorizontal, Edit, Trash2, Users, Lock, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import { PageHeader } from '@/components/responsive/PageHeader';
import { useMediaQuery } from '@/hooks/use-media-query';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type AdvertiserListMode = 'client' | 'lead';

interface AdvertisersListProps {
  mode?: AdvertiserListMode;
}

const MODE_COPY: Record<AdvertiserListMode, {
  title: string;
  description: string;
  singular: string;
  singularLower: string;
  newLabel: string;
  searchPlaceholder: string;
  emptyTitle: string;
  emptyAction: string;
  newPath: string;
  editBasePath: string;
  status: 'CLIENT' | 'LEAD';
}> = {
  client: {
    title: 'Clientes',
    description: 'Gerencie a carteira de clientes.',
    singular: 'Cliente',
    singularLower: 'cliente',
    newLabel: 'Novo Cliente',
    searchPlaceholder: 'Buscar cliente...',
    emptyTitle: 'Nenhum cliente encontrado',
    emptyAction: 'Cadastrar Cliente',
    newPath: '/advertisers/new',
    editBasePath: '/advertisers',
    status: 'CLIENT',
  },
  lead: {
    title: 'Leads',
    description: 'Acompanhe oportunidades ainda não convertidas em clientes.',
    singular: 'Lead',
    singularLower: 'lead',
    newLabel: 'Novo Lead',
    searchPlaceholder: 'Buscar lead...',
    emptyTitle: 'Nenhum lead encontrado',
    emptyAction: 'Cadastrar Lead',
    newPath: '/leads/new',
    editBasePath: '/leads',
    status: 'LEAD',
  },
};

export default function AdvertisersList({ mode = 'client' }: AdvertisersListProps) {
  const [, setLocation] = useLocation();
  const copy = MODE_COPY[mode];
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [deleteTarget, setDeleteTarget] = React.useState<any | null>(null);
  const isMobile = useMediaQuery('(max-width: 767px)');

  const advertiserParams = { search: search || undefined, status: copy.status };
  const { data: advertisers, isLoading } = useListAdvertisers(advertiserParams);

  const deleteMutation = useDeleteAdvertiser({
    mutation: {
      onSuccess: () => {
        feedback.deleted(`${copy.singular} excluído`);
        queryClient.invalidateQueries({ queryKey: [getListAdvertisersQueryKey()[0]] });
      },
      onError: () => feedback.error(`Erro ao excluir ${copy.singularLower}`)
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT': return <span className="bg-neutral-100 text-neutral-600 px-2 py-1 rounded-md text-xs font-medium">Rascunho</span>;
      case 'SENT': return <span className="bg-warning/10 text-warning px-2 py-1 rounded-md text-xs font-medium">Enviada</span>;
      case 'APPROVED': return <span className="bg-success/10 text-success px-2 py-1 rounded-md text-xs font-medium">Aceita</span>;
      case 'REJECTED': return <span className="bg-error/10 text-error px-2 py-1 rounded-md text-xs font-medium">Rejeitada</span>;
      default: return null;
    }
  };

  const renderTimelineStep = (proposal: any) => {
    if (!proposal.lastTimelineStep) return null;
    return (
      <div className="mt-1 text-xs text-muted-foreground">
        Etapa: <span className="font-medium text-foreground">{proposal.lastTimelineStep.label}</span>
      </div>
    );
  };

  const renderProposals = (adv: any) => (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase text-muted-foreground">Propostas vinculadas</div>
      {adv.proposals?.length ? adv.proposals.map((proposal: any) => {
        const canEdit = proposal.viewerCanEdit === true;
        const title = proposal.clientLine1 || proposal.campTag || proposal.propType || 'Proposta';
        const programName = proposal.programName || 'Programa não informado';

        if (!canEdit) {
          return (
            <div key={proposal.id} className="w-full rounded-md border bg-card px-3 py-3 text-left sm:px-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="break-words font-medium">Programa: {programName}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Responsável: {proposal.createdByName || 'Comercial'}
                  </div>
                  {renderTimelineStep(proposal)}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {getStatusBadge(proposal.status)}
                  <span title="Proposta de outro responsável - visualização restrita">
                    <Lock className="h-4 w-4 text-muted-foreground" aria-label="Proposta de outro responsável" />
                  </span>
                </div>
              </div>
            </div>
          );
        }

        return (
          <button
            key={proposal.id}
            type="button"
            className="w-full rounded-md border bg-card px-3 py-3 text-left hover:bg-muted/40 sm:px-4"
            onClick={() => setLocation(`/proposals/${proposal.id}/edit`)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="break-words font-medium">{title}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {programName} · {proposal.createdByName || 'Comercial'}
                </div>
                {renderTimelineStep(proposal)}
              </div>
              {getStatusBadge(proposal.status)}
            </div>
            {proposal.investValue && (
              <div className="mt-2 text-sm font-semibold">{proposal.investValue}</div>
            )}
          </button>
        );
      }) : (
        <div className="text-sm text-muted-foreground">
          Nenhuma proposta vinculada para este {copy.singularLower}.
        </div>
      )}
    </div>
  );

  const renderActions = (adv: any) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="shrink-0" aria-label={`Ações de ${adv.tradeName}`}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Ações</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setLocation(`${copy.editBasePath}/${adv.id}/edit`)}>
          <Edit className="mr-2 h-4 w-4" /> Editar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-error focus:bg-error/10 focus:text-error" onClick={() => setDeleteTarget(adv)}>
          <Trash2 className="mr-2 h-4 w-4" /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={copy.title}
        description={copy.description}
        action={(
          <Button onClick={() => setLocation(copy.newPath)} size="lg" className="w-full sm:w-auto">
          <Plus className="w-5 h-5 mr-2" />
          {copy.newLabel}
          </Button>
        )}
      />

      <div className="flex w-full max-w-md items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder={copy.searchPlaceholder}
            className="pl-9 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-border/60 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : advertisers && advertisers.length > 0 && isMobile ? (
          <div className="divide-y divide-border/60">
            {advertisers.map((adv: any) => (
              <article key={adv.id} className="p-4">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setExpanded((prev) => ({ ...prev, [adv.id]: !prev[adv.id] }))}
                  >
                    <div className="flex items-start gap-2">
                      {expanded[adv.id] ? (
                        <ChevronDown className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0">
                        <h2 className="break-words font-semibold">{adv.tradeName}</h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {adv.proposals?.length || 0} proposta(s) vinculada(s)
                        </p>
                      </div>
                    </div>
                  </button>
                  <span className={`mt-1 shrink-0 rounded-md px-2 py-1 text-xs font-medium ${adv.active ? 'bg-success/10 text-success' : 'bg-neutral-100 text-neutral-600'}`}>
                    {adv.active ? 'Ativo' : 'Inativo'}
                  </span>
                  {renderActions(adv)}
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 rounded-md bg-muted/40 p-3 text-sm">
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">Contato</dt>
                    <dd className="mt-1 break-words font-medium">{adv.contactName || 'Não informado'}</dd>
                    {adv.contactPhone && <dd className="text-xs text-muted-foreground">{adv.contactPhone}</dd>}
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">CNPJ</dt>
                    <dd className="mt-1 break-words font-medium">{adv.cnpj || 'Não informado'}</dd>
                  </div>
                </dl>

                {expanded[adv.id] && <div className="mt-4 border-t pt-4">{renderProposals(adv)}</div>}
              </article>
            ))}
          </div>
        ) : advertisers && advertisers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50">
                <tr>
                  <th className="px-6 py-4 font-medium">Nome</th>
                  <th className="px-6 py-4 font-medium">CNPJ</th>
                  <th className="px-6 py-4 font-medium">Contato</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {advertisers.map((adv: any) => (
                  <React.Fragment key={adv.id}>
                    <tr className="bg-card border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 text-left"
                          onClick={() => setExpanded((prev) => ({ ...prev, [adv.id]: !prev[adv.id] }))}
                        >
                          {expanded[adv.id] ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                          <span>
                            {adv.tradeName}
                            {adv.legalName && <div className="text-xs text-muted-foreground font-normal">{adv.legalName}</div>}
                          </span>
                        </button>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {adv.cnpj || '-'}
                      </td>
                      <td className="px-6 py-4">
                        {adv.contactName || '-'}
                        {adv.contactPhone && <div className="text-xs text-muted-foreground">{adv.contactPhone}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${adv.active ? 'bg-success/10 text-success' : 'bg-neutral-100 text-neutral-600'}`}>
                          {adv.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {renderActions(adv)}
                      </td>
                    </tr>
                    {expanded[adv.id] && (
                      <tr className="bg-muted/20 border-b border-border/50">
                        <td colSpan={5} className="px-12 py-4">
                          {renderProposals(adv)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center">
            {mode === 'lead' ? (
              <UserPlus className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            ) : (
              <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            )}
            <h3 className="text-lg font-medium">{copy.emptyTitle}</h3>
            <Button className="mt-4" onClick={() => setLocation(copy.newPath)} variant="outline">
              {copy.emptyAction}
            </Button>
          </div>
        )}
      </Card>
      <ConfirmActionDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Excluir ${copy.singularLower}?`}
        description={`Tem certeza que deseja excluir ${deleteTarget?.tradeName || `este ${copy.singularLower}`}? Essa ação não poderá ser desfeita.`}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate({ id: deleteTarget.id });
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
