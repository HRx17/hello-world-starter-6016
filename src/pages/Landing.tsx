import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FeatureCard } from "@/components/FeatureCard";
import { Testimonial } from "@/components/Testimonial";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { useAuth } from "@/hooks/useAuth";
import { 
  Sparkles, 
  BarChart3, 
  Zap, 
  Shield, 
  GitCompare, 
  FileText,
  ArrowRight,
  CheckCircle2,
  Users,
  Star,
  TrendingUp
} from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  // Redirect logged-in users to dashboard
  useEffect(() => {
    if (!isLoading && user) {
      navigate("/dashboard");
    }
  }, [user, isLoading, navigate]);

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

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Lead UX Designer",
      company: "TechFlow",
      content: "UXProbe transformed how we approach usability testing. What used to take days now takes minutes. The AI insights are incredibly accurate and actionable.",
      rating: 5,
    },
    {
      name: "Marcus Rodriguez",
      role: "Product Manager",
      company: "StartupHub",
      content: "The framework-specific recommendations saved our development team countless hours. We caught critical UX issues before launch that would have cost us users.",
      rating: 5,
    },
    {
      name: "Emily Thompson",
      role: "Frontend Developer",
      company: "DesignCo",
      content: "As a developer, I appreciate how UXProbe breaks down complex heuristics into clear, implementable fixes. The export feature makes stakeholder presentations effortless.",
      rating: 5,
    },
    {
      name: "David Kim",
      role: "CTO",
      company: "ScaleUp Inc",
      content: "We've analyzed over 50 projects with UXProbe. The comparative analysis feature helps us track UX improvements across our entire product suite. Absolutely essential tool.",
      rating: 5,
    },
    {
      name: "Lisa Patel",
      role: "UX Researcher",
      company: "Innovation Labs",
      content: "The detailed violation categorization and visual annotations make it easy to communicate issues to our design team. Best UX analysis tool I've used in 10 years.",
      rating: 5,
    },
    {
      name: "James Wilson",
      role: "Founder",
      company: "WebCraft",
      content: "UXProbe helped us increase our conversion rate by 34% by identifying and fixing critical usability issues. The ROI was immediate and substantial.",
      rating: 5,
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
    <>
      <AnimatedBackground />
      <div className="min-h-screen">
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-12">
          <nav className="flex justify-between items-center mb-16 animate-fade-in">
            <div className="flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-primary">UXProbe</span>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => navigate("/auth")} className="hover-scale">
                Sign In
              </Button>
              <Button onClick={() => navigate("/auth")} className="hover-scale">
                Get Started
              </Button>
            </div>
          </nav>

          {/* Trust Badges */}
          <div className="flex justify-center gap-8 mb-12 flex-wrap animate-fade-in animation-delay-200">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">50,000+ Users</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-medium">4.9/5 Rating</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium">200k+ Analyses</span>
            </div>
          </div>

          <div className="max-w-5xl mx-auto text-center mb-20 animate-fade-in animation-delay-400">
            <Badge variant="outline" className="mb-6 px-4 py-2 text-sm font-medium border-primary/20">
              <Sparkles className="h-4 w-4 text-primary mr-2 inline" />
              Trusted by Leading Design Teams
            </Badge>
          
          <h1 className="text-6xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent animate-fade-in animation-delay-600">
            Evaluate Your Website's
            <br />
            Usability in Seconds
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed animate-fade-in animation-delay-800">
            Get instant, AI-powered heuristic evaluations based on Nielsen's proven usability principles. 
            Identify issues, track improvements, and deliver better user experiences.
          </p>

          <div className="flex flex-wrap gap-4 justify-center mb-12 animate-fade-in animation-delay-1000">
            <Button size="lg" className="text-lg px-8 py-6 hover-scale" onClick={() => navigate("/analyze")}>
              Start Free Analysis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 py-6 hover-scale"
              onClick={() => navigate("/auth")}
            >
              Sign Up for More Features
            </Button>
          </div>

          {/* Benefits List */}
          <div className="flex flex-wrap gap-6 justify-center text-sm animate-fade-in animation-delay-1200">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-muted-foreground">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Demo Screenshot */}
        <div className="max-w-6xl mx-auto mb-24 animate-fade-in animation-delay-1400">
          <Card className="overflow-hidden border-2 shadow-2xl hover-scale">
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
                      <div className="h-3 bg-muted rounded mb-2 w-3/4 animate-pulse"></div>
                      <div className="h-3 bg-muted rounded w-1/2 animate-pulse animation-delay-200"></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="h-24 bg-red-500/10 rounded-lg border border-red-500/20 animate-fade-in animation-delay-400"></div>
                    <div className="h-24 bg-yellow-500/10 rounded-lg border border-yellow-500/20 animate-fade-in animation-delay-600"></div>
                    <div className="h-24 bg-blue-500/10 rounded-lg border border-blue-500/20 animate-fade-in animation-delay-800"></div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Social Proof Stats */}
        <div className="max-w-6xl mx-auto mb-24">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div className="animate-fade-in">
              <div className="text-4xl font-bold text-primary mb-2">50K+</div>
              <div className="text-muted-foreground">Active Users</div>
            </div>
            <div className="animate-fade-in animation-delay-200">
              <div className="text-4xl font-bold text-primary mb-2">200K+</div>
              <div className="text-muted-foreground">Analyses Run</div>
            </div>
            <div className="animate-fade-in animation-delay-400">
              <div className="text-4xl font-bold text-primary mb-2">4.9/5</div>
              <div className="text-muted-foreground">Average Rating</div>
            </div>
            <div className="animate-fade-in animation-delay-600">
              <div className="text-4xl font-bold text-primary mb-2">98%</div>
              <div className="text-muted-foreground">Satisfaction Rate</div>
            </div>
          </div>
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

        {/* Testimonials */}
        <div className="max-w-6xl mx-auto mb-24">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 px-4 py-2 text-sm font-medium border-primary/20">
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 mr-2 inline" />
              Customer Stories
            </Badge>
            <h2 className="text-4xl font-bold mb-4">Loved by Design Teams Worldwide</h2>
            <p className="text-xl text-muted-foreground">
              See what our customers have to say about UXProbe
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index} 
                className="animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <Testimonial {...testimonial} />
              </div>
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
        <div className="max-w-4xl mx-auto text-center mb-24">
          <Card className="bg-gradient-to-br from-primary via-purple-600 to-primary text-white border-0 shadow-2xl overflow-hidden relative hover-scale">
            <div className="absolute inset-0 bg-grid-white/10"></div>
            <div className="relative p-12">
              <h2 className="text-4xl font-bold mb-4">
                Ready to Improve Your UX?
              </h2>
              <p className="text-xl mb-8 opacity-90">
                Join 50,000+ designers and developers using UXProbe
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button 
                  size="lg" 
                  variant="secondary"
                  className="text-lg px-8 py-6 hover-scale"
                  onClick={() => navigate("/auth")}
                >
                  Create Free Account
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="text-lg px-8 py-6 bg-white/10 hover:bg-white/20 text-white border-white/30 hover-scale"
                  onClick={() => navigate("/analyze")}
                >
                  Try Demo
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Footer */}
        <footer className="pt-8 border-t text-center text-muted-foreground">
          <p className="mb-2">
            &copy; 2025 UXProbe. Built with AI and expertise.
          </p>
          <p className="text-sm mb-8">
            Based on Nielsen's 10 Usability Heuristics
          </p>
        </footer>
      </div>
    </div>
    </>
  );
};

export default Landing;
