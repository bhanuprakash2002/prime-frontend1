import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense } from "react";

import Index from "./pages/Index";
import Landing from "./pages/Landing";
import Meeting from "./pages/Meeting";
import Auth from "./pages/Auth";
import Rooms from "./pages/Rooms";
import Join from "./pages/Join";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// ----------------------------------------------------
// 🔐 Protected Route Wrapper
// ----------------------------------------------------
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const user = localStorage.getItem("prime_user");

  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  return children;
};

// ----------------------------------------------------
// 🌐 App Component
// ----------------------------------------------------
const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />

        <BrowserRouter>
          <Suspense
            fallback={
              <div className="flex min-h-screen items-center justify-center text-lg text-muted-foreground">
                Loading...
              </div>
            }
          >
            <Routes>
              {/* Redirect logic happens inside Index.tsx */}
              <Route path="/" element={<Index />} />

              <Route path="/landing" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />

              <Route
                path="/rooms"
                element={
                  <ProtectedRoute>
                    <Rooms />
                  </ProtectedRoute>
                }
              />

              {/* Meeting route is public - anyone with room ID can join */}
              <Route path="/meeting/:roomId" element={<Meeting />} />

              {/* Public join route for shared links */}
              <Route path="/join/:roomId" element={<Join />} />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
