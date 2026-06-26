import React from 'react';
import { useLocation } from 'wouter';
import { useListAdvertisers, useDeleteAdvertiser, getListAdvertisersQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Search, MoreHorizontal, Edit, Trash2, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function AdvertisersList() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');

  const { data: advertisers, isLoading } = useListAdvertisers({ 
    query: {
      queryKey: getListAdvertisersQueryKey({ search: search || undefined })
    }
  });

  const deleteMutation = useDeleteAdvertiser({
    mutation: {
      onSuccess: () => {
        toast.success('Anunciante excluído');
        queryClient.invalidateQueries({ queryKey: [getListAdvertisersQueryKey()[0]] });
      },
      onError: () => toast.error('Erro ao excluir anunciante')
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Anunciantes</h1>
          <p className="text-muted-foreground mt-1">Gerencie a carteira de clientes.</p>
        </div>
        <Button onClick={() => setLocation('/advertisers/new')} size="lg">
          <Plus className="w-5 h-5 mr-2" />
          Novo Anunciante
        </Button>
      </div>

      <div className="flex gap-4 items-center max-w-md">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar anunciante..." 
            className="pl-9 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-border/60 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : advertisers && advertisers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50">
                <tr>
                  <th className="px-6 py-4 font-medium">Nome Fantasia</th>
                  <th className="px-6 py-4 font-medium">CNPJ</th>
                  <th className="px-6 py-4 font-medium">Contato</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {advertisers.map((adv) => (
                  <tr key={adv.id} className="bg-card border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium">
                      {adv.tradeName}
                      {adv.legalName && <div className="text-xs text-muted-foreground font-normal">{adv.legalName}</div>}
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setLocation(`/advertisers/${adv.id}/edit`)}>
                            <Edit className="w-4 h-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-error focus:bg-error/10 focus:text-error" onClick={() => deleteMutation.mutate({ id: adv.id })}>
                            <Trash2 className="w-4 h-4 mr-2" /> Excluir
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
            <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium">Nenhum anunciante encontrado</h3>
            <Button className="mt-4" onClick={() => setLocation('/advertisers/new')} variant="outline">
              Cadastrar Anunciante
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
