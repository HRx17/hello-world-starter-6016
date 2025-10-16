import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

interface TestimonialProps {
  name: string;
  role: string;
  company: string;
  content: string;
  rating: number;
  avatar?: string;
}

export const Testimonial = ({ name, role, company, content, rating }: TestimonialProps) => {
  return (
    <Card className="bg-card/50 backdrop-blur border-muted hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <CardContent className="p-6">
        {/* Rating Stars */}
        <div className="flex gap-1 mb-4">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`h-4 w-4 ${
                i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
              }`}
            />
          ))}
        </div>

        {/* Testimonial Content */}
        <p className="text-muted-foreground mb-6 leading-relaxed italic">
          "{content}"
        </p>

        {/* Author Info */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold">
            {name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <div className="font-semibold">{name}</div>
            <div className="text-sm text-muted-foreground">
              {role} at {company}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
