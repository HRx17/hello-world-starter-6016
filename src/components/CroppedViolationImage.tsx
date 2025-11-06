import { useEffect, useRef, useState } from "react";
import { BoundingBox } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface CroppedViolationImageProps {
  screenshot: string;
  boundingBox: BoundingBox;
  severity: "high" | "medium" | "low";
  title: string;
}

export const CroppedViolationImage = ({
  screenshot,
  boundingBox,
  severity,
  title,
}: CroppedViolationImageProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsLoading(true);
    setError(false);

    const img = new Image();
    // Try without crossOrigin first for better compatibility
    // img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        console.log("Screenshot loaded successfully", { screenshot, boundingBox });
        const { x, y, width, height } = boundingBox;
        
        // Convert percentages to pixels
        const imgWidth = img.naturalWidth;
        const imgHeight = img.naturalHeight;
        
        console.log("Image dimensions:", { imgWidth, imgHeight, boundingBox });
        
        const pixelX = (x / 100) * imgWidth;
        const pixelY = (y / 100) * imgHeight;
        const pixelWidth = (width / 100) * imgWidth;
        const pixelHeight = (height / 100) * imgHeight;

        // Add padding around the cropped area (20% on each side)
        const padding = 0.2;
        const paddedX = Math.max(0, pixelX - pixelWidth * padding);
        const paddedY = Math.max(0, pixelY - pixelHeight * padding);
        const paddedWidth = Math.min(
          imgWidth - paddedX,
          pixelWidth * (1 + padding * 2)
        );
        const paddedHeight = Math.min(
          imgHeight - paddedY,
          pixelHeight * (1 + padding * 2)
        );

        // Set canvas size to cropped dimensions (max 400px wide)
        const maxWidth = 400;
        const scale = Math.min(1, maxWidth / paddedWidth);
        canvas.width = paddedWidth * scale;
        canvas.height = paddedHeight * scale;

        // Draw cropped and scaled image
        ctx.drawImage(
          img,
          paddedX,
          paddedY,
          paddedWidth,
          paddedHeight,
          0,
          0,
          canvas.width,
          canvas.height
        );

        // Draw highlight box
        const highlightX = (pixelX - paddedX) * scale;
        const highlightY = (pixelY - paddedY) * scale;
        const highlightWidth = pixelWidth * scale;
        const highlightHeight = pixelHeight * scale;

        // Severity colors
        const severityColors = {
          high: "#ef4444",
          medium: "#f59e0b",
          low: "#3b82f6",
        };
        const color = severityColors[severity];

        // Semi-transparent fill
        ctx.fillStyle = color + "20";
        ctx.fillRect(highlightX, highlightY, highlightWidth, highlightHeight);

        // Border
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(highlightX, highlightY, highlightWidth, highlightHeight);

        console.log("Screenshot cropped and rendered successfully");
        setIsLoading(false);
      } catch (err) {
        console.error("Error cropping image:", err);
        setError(true);
        setIsLoading(false);
      }
    };

    img.onerror = (e) => {
      console.error("Failed to load screenshot:", screenshot, e);
      setError(true);
      setIsLoading(false);
    };

    img.src = screenshot;
  }, [screenshot, boundingBox, severity]);

  if (error) {
    // Show a placeholder when image fails to load
    return (
      <Card className="overflow-hidden bg-muted/30 border-yellow-500/50">
        <div className="p-2 bg-muted/50">
          <p className="text-xs text-muted-foreground font-medium">Violation Location</p>
        </div>
        <div className="p-4 text-center text-sm text-muted-foreground">
          <p>Unable to load screenshot preview</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden bg-muted/30">
      <div className="p-2 bg-muted/50">
        <p className="text-xs text-muted-foreground font-medium">📍 Violation Location</p>
      </div>
      <div className="relative bg-white">
        {isLoading && (
          <div className="p-4">
            <Skeleton className="w-full h-32" />
          </div>
        )}
        <canvas
          ref={canvasRef}
          className={`w-full h-auto ${isLoading ? "hidden" : "block"}`}
          aria-label={`Cropped screenshot showing: ${title}`}
        />
      </div>
    </Card>
  );
};
