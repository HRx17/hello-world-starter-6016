import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ScreenshotViewerProps {
  screenshot: string;
  websiteName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ScreenshotViewer = ({
  screenshot,
  websiteName,
  isOpen,
  onClose,
}: ScreenshotViewerProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle>Page Screenshot - {websiteName}</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="overflow-auto p-6 bg-muted/20">
          <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
            <img
              src={screenshot}
              alt={`Screenshot of ${websiteName}`}
              className="w-full h-auto"
            />
          </div>
          <p className="text-sm text-muted-foreground text-center mt-4">
            Full page screenshot captured at time of analysis
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
