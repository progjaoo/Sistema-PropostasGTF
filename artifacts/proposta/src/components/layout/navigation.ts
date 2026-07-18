import {
  BellRing,
  Building2,
  FileCog,
  FileText,
  Layers,
  Package,
  Radio,
  UserCircle,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type NavigationItem = {
  icon: LucideIcon;
  label: string;
  href: string;
  roles?: Array<'ADMIN' | 'COMERCIAL'>;
  badge?: number;
};

export const mainNavigation: NavigationItem[] = [
  { icon: Radio, label: 'Dashboard', href: '/dashboard', roles: ['ADMIN'] },
  { icon: FileText, label: 'Propostas', href: '/proposals', roles: ['COMERCIAL', 'ADMIN'] },
  { icon: BellRing, label: 'Avisos de Recaptura', href: '/recall-reminders', roles: ['COMERCIAL', 'ADMIN'] },
  { icon: Users, label: 'Clientes', href: '/advertisers', roles: ['COMERCIAL', 'ADMIN'] },
  { icon: UserPlus, label: 'Leads', href: '/leads', roles: ['COMERCIAL', 'ADMIN'] },
  { icon: Layers, label: 'Programas', href: '/programs', roles: ['COMERCIAL'] },
];

export const adminNavigation: NavigationItem[] = [
  { icon: UserCircle, label: 'Usuários', href: '/admin/users' },
  { icon: Building2, label: 'Empresas', href: '/admin/station' },
  { icon: Package, label: 'Produtos', href: '/admin/product-templates' },
  { icon: Layers, label: 'Programas', href: '/admin/proposal-categories' },
  { icon: FileCog, label: 'Tipos de Proposta', href: '/admin/proposal-types' },
];

export function isNavigationItemActive(location: string, href: string) {
  return location === href || location.startsWith(`${href}/`);
}

