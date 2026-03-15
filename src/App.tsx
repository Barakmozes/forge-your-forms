import { lazy, Suspense, useRef, useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAuthHashError } from "@/hooks/useAuthHashError";
// === AGENT 8: Onboarding Check ===
import { useOnboarding } from "@/hooks/useOnboarding";
// === END AGENT 8 ===
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
// === AGENT 11: Template pages ===
const Templates = lazy(() => import("./pages/Templates"));
const TemplateDetail = lazy(() => import("./pages/TemplateDetail"));
// === END AGENT 11 ===
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
// === END AGENT 4 ===

// === AGENT 13: At-Risk Dashboard ===
const AtRiskDashboard = lazy(() => import("./components/predictions/AtRiskDashboard"));
// === END AGENT 13 ===

// === AGENT 15: Workflow pages ===
const Workflows = lazy(() => import("./pages/Workflows"));
const WorkflowBuilder = lazy(() => import("./pages/WorkflowBuilder"));
// === END AGENT 15 ===

// === AGENT 6 — Billing pages ===
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));
const CheckoutCancel = lazy(() => import("./pages/CheckoutCancel"));
// === END AGENT 6 ===

// === AGENT 19: GDPR & Privacy pages ===
const Privacy = lazy(() => import("./pages/Privacy"));
const DataExport = lazy(() => import("./pages/DataExport"));
const AccountDeletion = lazy(() => import("./pages/AccountDeletion"));
// === END AGENT 19 ===

// === AGENT 8 — Onboarding wizard ===
const OnboardingWizard = lazy(() => import("./components/onboarding/OnboardingWizard"));
// === END AGENT 8 ===

function AuthHashErrorHandler() {
  useAuthHashError();
  return null;
}

function PostVerificationRedirect() {
  const { user, lastEvent } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (
      lastEvent === "SIGNED_IN" &&
      user &&
      location.pathname === "/auth" &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      navigate("/", { replace: true });
    }
  }, [lastEvent, user, location.pathname, navigate]);

  return null;
}

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
  // === AGENT 8: Onboarding Check ===
  const { isOnboarded, isLoading: onboardingLoading } = useOnboarding();
  // === END AGENT 8 ===
  if (loading || onboardingLoading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  // === AGENT 8: Redirect to onboarding if not completed ===
  if (user && !isOnboarded) return <Navigate to="/onboarding" replace />;
  // === END AGENT 8 ===
  if (user) return <Forms />;
  return <Index />;
}
// === END AGENT 4 ROUTES ===

const AppRoutes = () => (
  <Routes>
    <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
    <Route path="/auth/reset-password" element={<ResetPassword />} />
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
    {/* === AGENT 8 ROUTES === */}
    <Route path="/onboarding" element={<ProtectedRoute><OnboardingWizard /></ProtectedRoute>} />
    {/* === END AGENT 8 === */}
    {/* === AGENT 6 ROUTES === */}
    <Route path="/billing" element={<Navigate to="/settings?tab=billing" replace />} />
    <Route path="/checkout/success" element={<ProtectedRoute><CheckoutSuccess /></ProtectedRoute>} />
    <Route path="/checkout/cancel" element={<CheckoutCancel />} />
    {/* === END AGENT 6 === */}
    <Route path="/canned-responses" element={<ProtectedRoute><CannedResponses /></ProtectedRoute>} />
    <Route path="/submissions" element={<ProtectedRoute><Submissions /></ProtectedRoute>} />
    <Route path="/forms/:id/submissions" element={<ProtectedRoute><Submissions /></ProtectedRoute>} />
    {/* === AGENT 11 ROUTES === */}
    <Route path="/templates" element={<Templates />} />
    <Route path="/templates/:slug" element={<TemplateDetail />} />
    {/* === END AGENT 11 === */}
    {/* === AGENT 13: At-Risk Dashboard === */}
    <Route path="/at-risk" element={<ProtectedRoute><AtRiskDashboard /></ProtectedRoute>} />
    {/* === END AGENT 13 === */}
    {/* === AGENT 15 ROUTES === */}
    <Route path="/workflows" element={<ProtectedRoute><Workflows /></ProtectedRoute>} />
    <Route path="/workflows/new" element={<ProtectedRoute><WorkflowBuilder /></ProtectedRoute>} />
    <Route path="/workflows/:id/edit" element={<ProtectedRoute><WorkflowBuilder /></ProtectedRoute>} />
    {/* === END AGENT 15 === */}
    {/* === AGENT 19: GDPR & Privacy routes === */}
    <Route path="/privacy" element={<Privacy />} />
    <Route path="/data-export" element={<ProtectedRoute><DataExport /></ProtectedRoute>} />
    <Route path="/delete-account" element={<ProtectedRoute><AccountDeletion /></ProtectedRoute>} />
    {/* === END AGENT 19 === */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  // === AGENT 16: ThemeProvider for dark mode (next-themes) ===
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  {/* === END AGENT 16 === */}
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AuthHashErrorHandler />
          <PostVerificationRedirect />
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
  </ThemeProvider>
);

export default App;
