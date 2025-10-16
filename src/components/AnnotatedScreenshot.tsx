import { useEffect, useRef } from "react";
import { Violation } from "@/lib/types";

interface AnnotatedScreenshotProps {
  screenshot: string;
  violations: Violation[];
  websiteName: string;
}

export const AnnotatedScreenshot = ({
  screenshot,
  violations,
  websiteName,
}: AnnotatedScreenshotProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      // Draw the original screenshot
      ctx.drawImage(img, 0, 0);

      // Draw annotations for each violation with bounding box
      violations.forEach((violation, index) => {
        if (!violation.boundingBox) return;

        const { x, y, width, height } = violation.boundingBox;
        
        // Convert percentages to pixels
        const pixelX = (x / 100) * canvas.width;
        const pixelY = (y / 100) * canvas.height;
        const pixelWidth = (width / 100) * canvas.width;
        const pixelHeight = (height / 100) * canvas.height;

        // Set color based on severity
        const severityColors = {
          high: "#ef4444",
          medium: "#f59e0b",
          low: "#3b82f6",
        };
        const color = severityColors[violation.severity];

        // Draw semi-transparent rectangle
        ctx.fillStyle = color + "20"; // 20 is hex for ~12% opacity
        ctx.fillRect(pixelX, pixelY, pixelWidth, pixelHeight);

        // Draw border
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.strokeRect(pixelX, pixelY, pixelWidth, pixelHeight);

        // Draw number badge
        const badgeSize = 32;
        const badgeX = pixelX + pixelWidth - badgeSize / 2;
        const badgeY = pixelY - badgeSize / 2;

        // Badge circle
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, badgeSize / 2, 0, Math.PI * 2);
        ctx.fill();

        // Badge number
        ctx.fillStyle = "white";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText((index + 1).toString(), badgeX, badgeY);
      });
    };

    img.src = screenshot;
  }, [screenshot, violations]);

  return (
    <div className="space-y-4">
      <div className="bg-muted/30 rounded-lg overflow-hidden border">
        <div className="p-3 bg-muted/50 border-b">
          <h3 className="text-sm font-medium">Annotated Screenshot - Violations Highlighted</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Each numbered box shows where a violation was detected
          </p>
        </div>
        <div className="p-4 bg-white">
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="w-full h-auto rounded shadow-lg"
            />
            <img
              ref={imgRef}
              src={screenshot}
              alt={`Annotated screenshot of ${websiteName}`}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-muted/20 rounded-lg p-4 border">
        <h4 className="text-sm font-medium mb-3">Violation Legend</h4>
        <div className="space-y-2">
          {violations
            .filter((v) => v.boundingBox)
            .map((violation, index) => (
              <div key={index} className="flex items-start gap-3 text-sm">
                <div
                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                    violation.severity === "high"
                      ? "bg-destructive"
                      : violation.severity === "medium"
                      ? "bg-yellow-600"
                      : "bg-blue-600"
                  }`}
                >
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{violation.title}</p>
                  <p className="text-xs text-muted-foreground">{violation.location}</p>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
