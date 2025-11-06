import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Results from "./pages/Results";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Compare from "./pages/Compare";
import NotFound from "./pages/NotFound";
import Trends from "./pages/Trends";
import Settings from "./pages/Settings";
import Research from "./pages/Research";
import NewStudyPlan from "./pages/NewStudyPlan";
import StudyPlanDetail from "./pages/StudyPlanDetail";
import InterviewSession from "./pages/InterviewSession";
import ObservationsBoard from "./pages/ObservationsBoard";
import PersonaBuilder from "./pages/PersonaBuilder";
import PersonaDetail from "./pages/PersonaDetail";
import StepWorkspace from "./pages/StepWorkspace";
import MindMapping from "./pages/MindMapping";
import InformationArchitecture from "./pages/InformationArchitecture";
import UserJourneyMapping from "./pages/UserJourneyMapping";
import { DashboardLayout } from "./components/DashboardLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/analyze" element={<Index />} />
          <Route path="/results" element={<Results />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Dashboard />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/compare" 
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Compare />
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/trends/:projectId" 
            element={
              <ProtectedRoute>
                <Trends />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <Settings />
          </ProtectedRoute>
            } 
          />
          <Route 
            path="/research" 
            element={
              <ProtectedRoute>
                <Research />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/research/new-study" 
            element={
              <ProtectedRoute>
                <NewStudyPlan />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/research/study/:id" 
            element={
              <ProtectedRoute>
                <StudyPlanDetail />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/research/study/:studyId/step/:stepId" 
            element={
              <ProtectedRoute>
                <StepWorkspace />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/research/interview/:id" 
            element={
              <ProtectedRoute>
                <InterviewSession />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/research/study/:studyId/observations" 
            element={
              <ProtectedRoute>
                <ObservationsBoard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/research/study/:studyId/persona/:personaId" 
            element={
              <ProtectedRoute>
                <PersonaBuilder />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/research/persona/:id" 
            element={
              <ProtectedRoute>
                <PersonaDetail />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/research/mind-mapping" 
            element={
              <ProtectedRoute>
                <MindMapping />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/research/information-architecture" 
            element={
              <ProtectedRoute>
                <InformationArchitecture />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/research/user-journey" 
            element={
              <ProtectedRoute>
                <UserJourneyMapping />
              </ProtectedRoute>
            } 
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
