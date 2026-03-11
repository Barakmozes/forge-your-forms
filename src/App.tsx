import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "@/i18n";

// === AGENT 4 — Lazy-loaded route components for code splitting ===
const Auth = lazy(() => import("./pages/Auth"));
const Index = lazy(() => import("./pages/Index"));
const Forms = lazy(() => import("./pages/Forms"));
const FormBuilder = lazy(() => import("./pages/FormBuilder"));
const FormPreview = lazy(() => import("./pages/FormPreview"));
const FormDashboard = lazy(() => import("./pages/FormDashboard"));
const PublicForm = lazy(() => import("./pages/PublicForm"));
const Submissions = lazy(() => import("./pages/Submissions"));
const WaitlistEntries = lazy(() => import("./pages/WaitlistEntries"));
const TicketDetailPage = lazy(() => import("./pages/TicketDetail"));
const TicketTracking = lazy(() => import("./pages/TicketTracking"));
const CannedResponses = lazy(() => import("./pages/CannedResponses"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));
// === END AGENT 4 ===

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// === AGENT 4 ROUTES — Homepage dispatch: landing (anon) vs dashboard (auth) ===
function HomepageRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  if (user) return <Forms />;
  return <Index />;
}
// === END AGENT 4 ROUTES ===

const AppRoutes = () => (
  <Routes>
    <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
    {/* === AGENT 4 ROUTES — "/" shows landing or dashboard based on auth === */}
    <Route path="/" element={<HomepageRoute />} />
    {/* === END AGENT 4 ROUTES === */}
    {/* === AGENT 4 ROUTES — Public pricing page === */}
    <Route path="/pricing" element={<Pricing />} />
    {/* === END AGENT 4 ROUTES === */}
    <Route path="/forms/:id" element={<ProtectedRoute><FormDashboard /></ProtectedRoute>} />
    <Route path="/forms/:id/edit" element={<ProtectedRoute><FormBuilder /></ProtectedRoute>} />
    <Route path="/forms/:id/preview" element={<ProtectedRoute><FormPreview /></ProtectedRoute>} />
    <Route path="/forms/:id/entries" element={<ProtectedRoute><WaitlistEntries /></ProtectedRoute>} />
    <Route path="/forms/:id/tickets/:ticketId" element={<ProtectedRoute><TicketDetailPage /></ProtectedRoute>} />
    <Route path="/f/:id" element={<PublicForm />} />
    <Route path="/track/:formId" element={<TicketTracking />} />
    {/* === AGENT 1 ROUTES === */}
    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    {/* === END AGENT 1 ROUTES === */}
    <Route path="/canned-responses" element={<ProtectedRoute><CannedResponses /></ProtectedRoute>} />
    <Route path="/submissions" element={<ProtectedRoute><Submissions /></ProtectedRoute>} />
    <Route path="/forms/:id/submissions" element={<ProtectedRoute><Submissions /></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <WorkspaceProvider>
            <LanguageProvider>
            {/* === AGENT 1: ErrorBoundary wraps all routes === */}
            <ErrorBoundary>
              {/* === AGENT 4 — Suspense for lazy-loaded routes === */}
              <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>}>
                <AppRoutes />
              </Suspense>
              {/* === END AGENT 4 === */}
            </ErrorBoundary>
            {/* === END AGENT 1 === */}
            </LanguageProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
