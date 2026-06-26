import React from 'react';
import { useLocation } from 'wouter';
import { useGetDashboardStats, useGetRecentProposals } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Plus, CheckCircle, Clock, XCircle, Archive, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: recent, isLoading: recentLoading } = useGetRecentProposals();

  const statCards = [
    { title: 'Total', value: stats?.total || 0, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100' },
    { title: 'Rascunhos', value: stats?.draft || 0, icon: Clock, color: 'text-neutral-500', bg: 'bg-neutral-100' },
    { title: 'Enviadas', value: stats?.sent || 0, icon: ArrowRight, color: 'text-warning', bg: 'bg-warning/10' },
    { title: 'Aprovadas', value: stats?.approved || 0, icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
    { title: 'Rejeitadas', value: stats?.rejected || 0, icon: XCircle, color: 'text-error', bg: 'bg-error/10' },
    { title: 'Arquivadas', value: stats?.archived || 0, icon: Archive, color: 'text-neutral-600', bg: 'bg-neutral-200' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Visão geral do sistema de propostas.</p>
        </div>
        <Button onClick={() => setLocation('/proposals/new')} size="lg" className="shadow-sm">
          <Plus className="w-5 h-5 mr-2" />
          Nova Proposta
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="border-border/60 shadow-sm">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <div className={`w-10 h-10 rounded-full ${stat.bg} ${stat.color} flex items-center justify-center mb-3`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
              <h3 className="text-2xl font-bold mt-1">{statsLoading ? '-' : stat.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm border-border/60">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Propostas Recentes</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setLocation('/proposals')}>
            Ver todas <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardHeader>
        <CardContent>
          {recentLoading ? (
            <div className="py-8 text-center text-muted-foreground">Carregando...</div>
          ) : recent && recent.length > 0 ? (
            <div className="space-y-4 mt-4">
              {recent.map((prop) => (
                <div key={prop.id} className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setLocation(`/proposals/${prop.id}/edit`)}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-medium">{prop.clientLine1 || 'Sem cliente'}</h4>
                      <p className="text-sm text-muted-foreground">
                        {prop.propType} • {format(new Date(prop.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm font-medium px-3 py-1 rounded-full bg-muted">
                    {prop.status}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              Nenhuma proposta recente.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
