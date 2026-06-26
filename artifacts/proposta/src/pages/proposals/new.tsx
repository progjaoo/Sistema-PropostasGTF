import React from 'react';
import { useLocation } from 'wouter';
import { 
  useListProposalCategories, 
  useListProposalTemplates, 
  useCreateProposal, 
  useUseProposalTemplate 
} from '@workspace/api-client-react';
import { toast } from 'sonner';
import { FileText, ArrowLeft, ChevronRight, FilePlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

export default function ProposalNew() {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);

  const { data: categories, isLoading: catLoading } = useListProposalCategories();
  const { data: templates, isLoading: tempLoading } = useListProposalTemplates({
    query: {
      enabled: !!selectedCategory,
      queryKey: ['listProposalTemplates', { categoryId: selectedCategory || '' }]
    }
  });

  const createMutation = useCreateProposal();
  const useTemplateMutation = useUseProposalTemplate();

  const handleCreateBlank = async () => {
    try {
      const prop = await createMutation.mutateAsync({
        data: {
          propType: 'Proposta Comercial',
          propMonth: String(new Date().getMonth() + 1).padStart(2, '0'),
          propYear: String(new Date().getFullYear())
        }
      });
      toast.success('Rascunho criado!');
      setLocation(`/proposals/${prop.id}/edit`);
    } catch (e) {
      toast.error('Erro ao criar proposta');
    }
  };

  const handleUseTemplate = async (templateId: string) => {
    try {
      const prop = await useTemplateMutation.mutateAsync({ id: templateId });
      toast.success('Proposta criada a partir do template!');
      setLocation(`/proposals/${prop.id}/edit`);
    } catch (e) {
      toast.error('Erro ao usar template');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation('/proposals')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nova Proposta</h1>
          <p className="text-muted-foreground mt-1">Escolha uma categoria para começar.</p>
        </div>
      </div>

      {catLoading ? (
        <div className="py-12 text-center text-muted-foreground">Carregando categorias...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories?.map((cat) => (
            <Card 
              key={cat.id} 
              className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
              onClick={() => setSelectedCategory(cat.id)}
            >
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">
                  {cat.icon || '📄'}
                </div>
                <h3 className="text-lg font-bold">{cat.name}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {cat.description || 'Templates para esta categoria'}
                </p>
                <div className="mt-4 px-3 py-1 bg-muted rounded-full text-xs font-medium text-muted-foreground">
                  {cat.templateCount || 0} templates
                </div>
              </CardContent>
            </Card>
          ))}

          <Card 
            className="cursor-pointer border-dashed hover:border-primary/50 hover:bg-primary/5 transition-all group"
            onClick={handleCreateBlank}
          >
            <CardContent className="p-6 flex flex-col items-center text-center h-full justify-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <FilePlus className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">Em branco</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Comece do zero sem um template
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Sheet open={!!selectedCategory} onOpenChange={(o) => !o && setSelectedCategory(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Escolha um Template</SheetTitle>
            <SheetDescription>
              Selecione o modelo que melhor se adapta à sua proposta.
            </SheetDescription>
          </SheetHeader>

          {tempLoading ? (
            <div className="py-8 text-center text-muted-foreground">Carregando templates...</div>
          ) : templates && templates.length > 0 ? (
            <div className="space-y-4">
              {templates.map(temp => (
                <div 
                  key={temp.id} 
                  className="p-4 border rounded-xl hover:border-primary/50 transition-colors cursor-pointer group"
                  onClick={() => handleUseTemplate(temp.id)}
                >
                  <h4 className="font-bold text-base flex items-center justify-between">
                    {temp.name}
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </h4>
                  {temp.description && (
                    <p className="text-sm text-muted-foreground mt-1">{temp.description}</p>
                  )}
                  {temp.products && temp.products.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {temp.products.slice(0, 3).map(p => (
                        <span key={p.id} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                          {p.title}
                        </span>
                      ))}
                      {temp.products.length > 3 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                          +{temp.products.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum template nesta categoria.</p>
              <Button variant="link" onClick={handleCreateBlank} className="mt-2">
                Criar proposta em branco
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
