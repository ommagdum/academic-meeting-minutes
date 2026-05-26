import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import CreateMeeting from "./pages/CreateMeeting";
import Dashboard from "./pages/Dashboard";
import MeetingList from "./pages/MeetingList";
import MeetingDetail from "./pages/MeetingDetail";
import SeriesList from "./pages/SeriesList";
import SeriesDetail from "./pages/SeriesDetail";
import CreateSeries from "./pages/CreateSeries";
import Auth from "./pages/Auth";
import OAuthRedirect from "./pages/OAuthRedirect";
import Search from "./pages/Search";
import JoinMeeting from "./pages/JoinMeeting";
import Profile from "./pages/Profile";
import Tasks from "./pages/Tasks";
import CheckEmailPage from "./pages/CheckEmailPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

const queryClient = new QueryClient();

/* ── Helper: wrap a page in ProtectedRoute + AppLayout ─── */
const AppPage = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

const Root = () => (
  <ThemeProvider>
    <AuthProvider>
      <Routes>
        {/* ── Public routes ─────────────────────────── */}
        <Route path="/"                element={<Index />} />
        <Route path="/auth"            element={<Auth />} />
        <Route path="/login"           element={<Auth />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password"  element={<ResetPasswordPage />} />
        <Route path="/oauth2/redirect" element={<OAuthRedirect />} />
        <Route path="/check-email"     element={<CheckEmailPage />} />
        <Route path="/verify-email"    element={<VerifyEmailPage />} />
        <Route path="/join-meeting"    element={<JoinMeeting />} />
        <Route path="/meetings/join"   element={<JoinMeeting />} />

        {/* ── Protected routes (wrapped in AppLayout) ── */}
        <Route path="/dashboard"    element={<AppPage><Dashboard /></AppPage>} />
        <Route path="/create-meeting" element={<AppPage><CreateMeeting /></AppPage>} />
        <Route path="/meetings"     element={<AppPage><MeetingList /></AppPage>} />
        <Route path="/meetings/:id" element={<AppPage><MeetingDetail /></AppPage>} />
        <Route path="/create-series" element={<AppPage><CreateSeries /></AppPage>} />
        <Route path="/series"       element={<AppPage><SeriesList /></AppPage>} />
        <Route path="/series/:id"   element={<AppPage><SeriesDetail /></AppPage>} />
        <Route path="/tasks"       element={<AppPage><Tasks /></AppPage>} />
        <Route path="/profile"      element={<AppPage><Profile /></AppPage>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  </ThemeProvider>
);

const router = createBrowserRouter(
  [{ path: "/*", element: <Root /> }],
  {
    future: {
      // @ts-expect-error - These flags are valid but TypeScript types don't include them yet
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  }
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RouterProvider router={router} />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
