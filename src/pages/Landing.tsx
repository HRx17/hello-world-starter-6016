import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FeatureCard } from "@/components/FeatureCard";
import { 
  Sparkles, 
  BarChart3, 
  Zap, 
  Shield, 
  GitCompare, 
  FileText,
  ArrowRight,
  CheckCircle2
} from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Sparkles,
      title: "AI-Powered Analysis",
      description: "Advanced AI evaluates your website against Nielsen's 10 Usability Heuristics in seconds",
      gradient: "bg-gradient-to-br from-violet-500 to-purple-600",
    },
    {
      icon: BarChart3,
      title: "Detailed Scoring",
      description: "Get comprehensive UX scores with severity-based violation categorization",
      gradient: "bg-gradient-to-br from-blue-500 to-cyan-600",
    },
    {
      icon: Zap,
      title: "Instant Results",
      description: "Complete analysis in under 30 seconds with actionable recommendations",
      gradient: "bg-gradient-to-br from-amber-500 to-orange-600",
    },
    {
      icon: GitCompare,
      title: "Compare Projects",
      description: "Side-by-side comparison of multiple websites to track improvements",
      gradient: "bg-gradient-to-br from-green-500 to-emerald-600",
    },
    {
      icon: FileText,
      title: "Export Reports",
      description: "Generate professional PDF reports to share with your team",
      gradient: "bg-gradient-to-br from-pink-500 to-rose-600",
    },
    {
      icon: Shield,
      title: "Framework Support",
      description: "Get framework-specific recommendations for React, Vue, Angular, and more",
      gradient: "bg-gradient-to-br from-indigo-500 to-blue-600",
    },
  ];

  const benefits = [
    "Identify usability issues before your users do",
    "Save hours of manual heuristic evaluation",
    "Track UX improvements over time",
    "Share professional reports with stakeholders",
    "Get framework-specific best practices",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <nav className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-primary">UXProbe</span>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
            <Button onClick={() => navigate("/auth")}>
              Get Started
            </Button>
          </div>
        </nav>

        <div className="max-w-5xl mx-auto text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-6">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">AI-Powered UX Analysis</span>
          </div>
          
          <h1 className="text-6xl font-bold tracking-tight mb-6 bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent">
            Evaluate Your Website's
            <br />
            Usability in Seconds
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed">
            Get instant, AI-powered heuristic evaluations based on Nielsen's proven usability principles. 
            Identify issues, track improvements, and deliver better user experiences.
          </p>

          <div className="flex flex-wrap gap-4 justify-center mb-12">
            <Button size="lg" className="text-lg px-8 py-6" onClick={() => navigate("/auth")}>
              Start Free Analysis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 py-6"
              onClick={() => navigate("/analyze")}
            >
              Try Without Signup
            </Button>
          </div>

          {/* Benefits List */}
          <div className="flex flex-wrap gap-6 justify-center text-sm">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-muted-foreground">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Demo Screenshot */}
        <div className="max-w-6xl mx-auto mb-24">
          <Card className="overflow-hidden border-2 shadow-2xl">
            <div className="bg-gradient-to-br from-primary/10 via-purple-500/10 to-primary/10 p-8">
              <div className="bg-background rounded-lg shadow-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                      <span className="text-3xl font-bold text-white">87</span>
                    </div>
                    <div className="flex-1">
                      <div className="h-3 bg-muted rounded mb-2 w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="h-24 bg-red-500/10 rounded-lg border border-red-500/20"></div>
                    <div className="h-24 bg-yellow-500/10 rounded-lg border border-yellow-500/20"></div>
                    <div className="h-24 bg-blue-500/10 rounded-lg border border-blue-500/20"></div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Features Grid */}
        <div className="max-w-6xl mx-auto mb-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Everything You Need</h2>
            <p className="text-xl text-muted-foreground">
              Comprehensive UX analysis tools in one powerful platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <FeatureCard key={index} {...feature} />
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div className="max-w-4xl mx-auto mb-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground">
              Get professional UX insights in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-600 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Enter URL</h3>
              <p className="text-muted-foreground">
                Simply paste your website URL and select your framework
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-600 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">AI Analysis</h3>
              <p className="text-muted-foreground">
                Our AI evaluates your site against proven usability heuristics
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-600 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Get Insights</h3>
              <p className="text-muted-foreground">
                Receive detailed reports with actionable recommendations
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-4xl mx-auto text-center">
          <Card className="bg-gradient-to-br from-primary via-purple-600 to-primary text-white border-0 shadow-2xl">
            <div className="p-12">
              <h2 className="text-4xl font-bold mb-4">
                Ready to Improve Your UX?
              </h2>
              <p className="text-xl mb-8 opacity-90">
                Join thousands of designers and developers using UXProbe
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button 
                  size="lg" 
                  variant="secondary"
                  className="text-lg px-8 py-6"
                  onClick={() => navigate("/auth")}
                >
                  Create Free Account
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="text-lg px-8 py-6 bg-white/10 hover:bg-white/20 text-white border-white/30"
                  onClick={() => navigate("/analyze")}
                >
                  Try Demo
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Footer */}
        <footer className="mt-24 pt-8 border-t text-center text-muted-foreground">
          <p className="mb-2">
            &copy; 2025 UXProbe. Built with AI and expertise.
          </p>
          <p className="text-sm">
            Based on Nielsen's 10 Usability Heuristics
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Landing;
