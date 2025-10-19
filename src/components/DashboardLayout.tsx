import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Sparkles } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  onNavigate?: (path: string) => void;
}

export const DashboardLayout = ({ children, onNavigate }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <>
      <AnimatedBackground />
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar onSignOut={handleSignOut} onNavigate={onNavigate} />
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <header className="w-full border-b bg-background/50 backdrop-blur-xl sticky top-0 z-10">
              <div className="w-full px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <SidebarTrigger />
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-primary" />
                    <span className="text-xl font-bold bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent">
                      UXProbe
                    </span>
                  </div>
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
              {children}
            </main>

            {/* Footer */}
            <footer className="w-full border-t bg-background/50 backdrop-blur-xl py-6">
              <div className="w-full px-6 text-center text-sm text-muted-foreground">
                <p className="mb-1">
                  &copy; 2025 UXProbe. Built with AI and expertise.
                </p>
                <p className="text-xs">
                  Based on Nielsen's 10 Usability Heuristics
                </p>
              </div>
            </footer>
          </div>
        </div>
      </SidebarProvider>
    </>
  );
};
