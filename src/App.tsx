import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import Auth from "./pages/Auth";
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

const AppRoutes = () => (
  <Routes>
    <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
    <Route path="/" element={<ProtectedRoute><Forms /></ProtectedRoute>} />
    <Route path="/forms/:id" element={<ProtectedRoute><FormDashboard /></ProtectedRoute>} />
    <Route path="/forms/:id/edit" element={<ProtectedRoute><FormBuilder /></ProtectedRoute>} />
    <Route path="/forms/:id/preview" element={<ProtectedRoute><FormPreview /></ProtectedRoute>} />
    <Route path="/forms/:id/entries" element={<ProtectedRoute><WaitlistEntries /></ProtectedRoute>} />
    <Route path="/forms/:id/tickets/:ticketId" element={<ProtectedRoute><TicketDetailPage /></ProtectedRoute>} />
    <Route path="/f/:id" element={<PublicForm />} />
    <Route path="/track/:formId" element={<TicketTracking />} />
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
            <AppRoutes />
          </WorkspaceProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
