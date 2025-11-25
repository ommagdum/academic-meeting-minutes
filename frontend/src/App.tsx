import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import CreateMeeting from "./pages/CreateMeeting";
import Dashboard from "./pages/Dashboard";
import MeetingList from "./pages/MeetingList";
import MeetingDetail from "./pages/MeetingDetail";
import SeriesList from "./pages/SeriesList";
import SeriesDetail from "./pages/SeriesDetail";
import Auth from "./pages/Auth";
import OAuthRedirect from "./pages/OAuthRedirect";
import Search from "./pages/Search";
import JoinMeeting from "./pages/JoinMeeting";

const queryClient = new QueryClient();

// Layout component that wraps all routes with AuthProvider
const Root = () => (
  <AuthProvider>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/login" element={<Auth />} />
      <Route path="/oauth2/redirect" element={<OAuthRedirect />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-meeting"
        element={
          <ProtectedRoute>
            <CreateMeeting />
          </ProtectedRoute>
        }
      />
      <Route
        path="/meetings"
        element={
          <ProtectedRoute>
            <MeetingList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/meetings/:id"
        element={
          <ProtectedRoute>
            <MeetingDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/series"
        element={
          <ProtectedRoute>
            <SeriesList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/series/:id"
        element={
          <ProtectedRoute>
            <SeriesDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/search"
        element={
          <ProtectedRoute>
            <Search />
          </ProtectedRoute>
        }
      />
      <Route path="/join-meeting" element={<JoinMeeting />} />
      <Route path="/meetings/join" element={<JoinMeeting />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </AuthProvider>
);

// Create routes with the new data router API
const router = createBrowserRouter(
  [
    {
      path: "/*",
      element: <Root />,
    },
  ],
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
