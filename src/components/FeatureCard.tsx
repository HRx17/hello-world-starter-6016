import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient?: string;
}

export const FeatureCard = ({ icon: Icon, title, description, gradient }: FeatureCardProps) => {
  return (
    <Card className="bg-card/50 backdrop-blur border-muted hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <CardHeader>
        <div
          className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
            gradient || "bg-gradient-to-br from-primary to-primary/60"
          }`}
        >
          <Icon className="h-6 w-6 text-white" />
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-base leading-relaxed">
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  );
};
