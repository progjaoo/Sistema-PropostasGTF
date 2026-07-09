import { useEffect } from 'react';
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { useAuthStore } from "@/store/auth";

import { AppLayout } from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import ProfileSettings from "@/pages/profile";

import ProposalsList from "@/pages/proposals/index";
import ProposalNew from "@/pages/proposals/new";
import ProposalEdit from "@/pages/proposals/edit";

import AdvertisersList from "@/pages/advertisers/index";
import AdvertiserNew from "@/pages/advertisers/new";
import AdvertiserEdit from "@/pages/advertisers/edit";

import AdminUsers from "@/pages/admin/users";
import AdminStation from "@/pages/admin/station";
import AdminProductTemplates from "@/pages/admin/product-templates";
import AdminProposalCategories from "@/pages/admin/proposal-categories";
import AdminProposalTypes from "@/pages/admin/proposal-types";

const queryClient = new QueryClient();

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
  useEffect(() => {
    // Configure the API client to use the Zustand token
    setAuthTokenGetter(() => useAuthStore.getState().accessToken);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Switch>
            <Route path="/login" component={Login} />
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
            <ProtectedRoute path="/proposals" component={ProposalsList} />
            <ProtectedRoute path="/proposals/new" component={ProposalNew} />
            <ProtectedRoute path="/proposals/:id/edit" component={ProposalEdit} />
            
            {/* Advertisers */}
            <ProtectedRoute path="/advertisers" component={AdvertisersList} />
            <ProtectedRoute path="/advertisers/new" component={AdvertiserNew} />
            <ProtectedRoute path="/advertisers/:id/edit" component={AdvertiserEdit} />

            {/* Admin */}
            <ProtectedRoute path="/admin/users" component={AdminUsers} adminOnly />
            <ProtectedRoute path="/admin/station" component={AdminStation} adminOnly />
            <ProtectedRoute path="/admin/product-templates" component={AdminProductTemplates} adminOnly />
            <ProtectedRoute path="/admin/proposal-categories" component={AdminProposalCategories} adminOnly />
            <ProtectedRoute path="/admin/proposal-types" component={AdminProposalTypes} adminOnly />

            <Route component={NotFound} />
          </Switch>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
