import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Forms from "./pages/Forms";
import FormBuilder from "./pages/FormBuilder";
import FormPreview from "./pages/FormPreview";
import FormDashboard from "./pages/FormDashboard";
import PublicForm from "./pages/PublicForm";
import Submissions from "./pages/Submissions";
import WaitlistEntries from "./pages/WaitlistEntries";
import TicketDetailPage from "./pages/TicketDetail";
import TicketTracking from "./pages/TicketTracking";
import CannedResponses from "./pages/CannedResponses";
import Pricing from "./pages/Pricing";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

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
            {/* === AGENT 1: ErrorBoundary wraps all routes === */}
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
            {/* === END AGENT 1 === */}
          </WorkspaceProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
