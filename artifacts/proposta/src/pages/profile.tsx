import React from 'react';
import { Save, UserCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth';
import { formatPhoneBR, normalizeEmailInput } from '@/lib/masks';

type ProfileForm = {
  name: string;
  jobTitle: string;
  contactPhone: string;
  contactEmail: string;
  avatarBase64: string;
};

const emptyProfile: ProfileForm = {
  name: '',
  jobTitle: '',
  contactPhone: '',
  contactEmail: '',
  avatarBase64: '',
};

export default function ProfileSettings() {
  const { accessToken, user, setAuth } = useAuthStore();
  const [form, setForm] = React.useState<ProfileForm>(emptyProfile);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let active = true;

    fetch('/api/profile', {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || 'Erro ao carregar perfil');
        return payload;
      })
      .then((payload) => {
        if (!active) return;
        setForm({
          name: payload.name || '',
          jobTitle: payload.jobTitle || '',
          contactPhone: formatPhoneBR(payload.contactPhone || ''),
          contactEmail: payload.contactEmail || '',
          avatarBase64: payload.avatarBase64 || '',
        });
      })
      .catch((error) => toast.error(error.message || 'Erro ao carregar perfil'))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [accessToken]);

  const updateField = (field: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      updateField('avatarBase64', String(reader.result || ''));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.jobTitle.trim() || !form.contactPhone.trim()) {
      toast.error('Preencha nome, cargo e telefone de contato');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          name: form.name,
          jobTitle: form.jobTitle,
          contactPhone: form.contactPhone,
          contactEmail: form.contactEmail,
          avatarBase64: form.avatarBase64 || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Erro ao salvar perfil');

      if (accessToken && user) {
        setAuth({ ...user, ...payload } as any, accessToken);
      }
      setForm({
        name: payload.name || '',
        jobTitle: payload.jobTitle || '',
        contactPhone: formatPhoneBR(payload.contactPhone || ''),
        contactEmail: payload.contactEmail || '',
        avatarBase64: payload.avatarBase64 || '',
      });
      toast.success('Perfil atualizado');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Carregando perfil...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-muted-foreground">Atualize os dados comerciais exibidos nas propostas.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <section className="rounded-lg border bg-card p-5 h-fit space-y-4">
          <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary">
            {form.avatarBase64 ? (
              <img src={form.avatarBase64} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <UserCircle className="h-16 w-16" />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="avatar">Foto do perfil</Label>
            <Input id="avatar" type="file" accept="image/*" onChange={handleAvatarUpload} />
          </div>
          {form.avatarBase64 && (
            <Button type="button" variant="outline" className="w-full" onClick={() => updateField('avatarBase64', '')}>
              Remover foto
            </Button>
          )}
        </section>

        <section className="rounded-lg border bg-card p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome de exibição</Label>
              <Input id="name" value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Carlos Silva" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Cargo / Função</Label>
              <Input id="jobTitle" value={form.jobTitle} onChange={(event) => updateField('jobTitle', event.target.value)} placeholder="Executivo de Contas" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Telefone de contato</Label>
              <Input id="contactPhone" inputMode="tel" value={form.contactPhone} onChange={(event) => updateField('contactPhone', formatPhoneBR(event.target.value))} placeholder="(31) 99999-9999" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">E-mail de contato</Label>
              <Input id="contactEmail" type="email" value={form.contactEmail} onChange={(event) => updateField('contactEmail', normalizeEmailInput(event.target.value))} placeholder="comercial@empresa.com.br" />
            </div>
            <div className="space-y-2">
              <Label>E-mail de login</Label>
              <Input value={user?.email || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Perfil de acesso</Label>
              <Input value={user?.role || ''} disabled />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              <Save className={`mr-2 h-4 w-4 ${saving ? 'animate-pulse' : ''}`} />
              {saving ? 'Salvando...' : 'Salvar perfil'}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
