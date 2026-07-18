import React, { Suspense } from 'react';
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { TooltipProvider } from "@/components/ui/tooltip";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { useAuthStore } from "@/store/auth";
import { installAuthenticatedFetch } from "@/lib/auth-fetch";

import { AppLayout } from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";

const Dashboard = React.lazy(() => import('@/pages/dashboard'));
const ProfileSettings = React.lazy(() => import('@/pages/profile'));
const ProposalNew = React.lazy(() => import('@/pages/proposals/new'));
const ProposalEdit = React.lazy(() => import('@/pages/proposals/edit'));
const ProposalProgress = React.lazy(() => import('@/pages/proposals/progress'));
const RecallRemindersPage = React.lazy(() => import('@/pages/recall-reminders'));
const AdvertisersList = React.lazy(() => import('@/pages/advertisers/index'));
const AdvertiserNew = React.lazy(() => import('@/pages/advertisers/new'));
const AdvertiserEdit = React.lazy(() => import('@/pages/advertisers/edit'));
const AdminUsers = React.lazy(() => import('@/pages/admin/users'));
const AdminStation = React.lazy(() => import('@/pages/admin/station'));
const AdminProductTemplates = React.lazy(() => import('@/pages/admin/product-templates'));
const AdminProposalCategories = React.lazy(() => import('@/pages/admin/proposal-categories'));
const AdminProposalTypes = React.lazy(() => import('@/pages/admin/proposal-types'));

const queryClient = new QueryClient();

setAuthTokenGetter(() => useAuthStore.getState().accessToken);
installAuthenticatedFetch();

function LeadsList() {
  return <AdvertisersList mode="lead" />;
}

function LeadNew() {
  return <AdvertiserNew mode="lead" />;
}

function LeadEdit({ params }: { params: { id: string } }) {
  return <AdvertiserEdit params={params} mode="lead" />;
}

function ProtectedRoute({ component: Component, adminOnly = false, ...rest }: any) {
  return (
    <Route {...rest}>
      {params => {
        const user = useAuthStore.getState().user;
        if (adminOnly && user?.role !== 'ADMIN') {
          window.location.href = '/proposals';
          return null;
        }
        return (
          <AppLayout>
            <Component params={params} />
          </AppLayout>
        );
      }}
    </Route>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Suspense fallback={<div className="flex min-h-dvh items-center justify-center p-6 text-sm text-muted-foreground">Carregando página...</div>}>
          <Switch>
            <Route path="/login" component={Login} />
            <Route path="/forgot-password" component={ForgotPassword} />
            <Route path="/reset-password" component={ResetPassword} />
            <Route path="/">
              {() => {
                const user = useAuthStore.getState().user;
                window.location.href = user?.role === 'ADMIN' ? '/dashboard' : '/proposals';
                return null;
              }}
            </Route>
            
            <ProtectedRoute path="/dashboard" component={Dashboard} adminOnly />
            <ProtectedRoute path="/profile" component={ProfileSettings} />
            <ProtectedRoute path="/programs" component={AdminProposalCategories} />
            
            {/* Proposals */}
            <ProtectedRoute path="/proposals" component={ProposalProgress} />
            <Route path="/proposal-progress">
              {() => {
                window.location.href = '/proposals';
                return null;
              }}
            </Route>
            <ProtectedRoute path="/recall-reminders" component={RecallRemindersPage} />
            <ProtectedRoute path="/proposals/new" component={ProposalNew} />
            <ProtectedRoute path="/proposals/:id/edit" component={ProposalEdit} />
            
            {/* Advertisers */}
            <ProtectedRoute path="/advertisers" component={AdvertisersList} />
            <ProtectedRoute path="/advertisers/new" component={AdvertiserNew} />
            <ProtectedRoute path="/advertisers/:id/edit" component={AdvertiserEdit} />

            {/* Leads */}
            <ProtectedRoute path="/leads" component={LeadsList} />
            <ProtectedRoute path="/leads/new" component={LeadNew} />
            <ProtectedRoute path="/leads/:id/edit" component={LeadEdit} />

            {/* Admin */}
            <ProtectedRoute path="/admin/users" component={AdminUsers} adminOnly />
            <ProtectedRoute path="/admin/station" component={AdminStation} adminOnly />
            <ProtectedRoute path="/admin/product-templates" component={AdminProductTemplates} adminOnly />
            <ProtectedRoute path="/admin/proposal-categories" component={AdminProposalCategories} adminOnly />
            <ProtectedRoute path="/admin/proposal-types" component={AdminProposalTypes} adminOnly />

            <Route component={NotFound} />
          </Switch>
          </Suspense>
        </WouterRouter>
        <ToastContainer
          position="bottom-right"
          autoClose={3500}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnHover
          draggable
          theme="colored"
        />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
