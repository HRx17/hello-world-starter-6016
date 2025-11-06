import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileJson, FileText, Image, Copy, Check, Package } from 'lucide-react';
import { toast } from 'sonner';
import { downloadFigmaPlugin } from '@/lib/figmaPluginExport';

interface ExportDialogProps {
  data: any;
  title: string;
  exportType: 'user_journey_map' | 'mind_map' | 'information_architecture';
  onDownloadJSON: () => void;
  onDownloadHTML?: () => void;
  onDownloadPNG?: () => void;
  disabled?: boolean;
}

export function ExportDialog({ 
  data, 
  title,
  exportType,
  onDownloadJSON, 
  onDownloadHTML,
  onDownloadPNG,
  disabled 
}: ExportDialogProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyForFigma = async () => {
    const figmaData = {
      exportType: exportType,
      data: data
    };
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(figmaData, null, 2));
      setCopied(true);
      toast.success("✓ Copied! Now open the Figma plugin and paste.");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleDownloadPlugin = () => {
    downloadFigmaPlugin();
    toast.success("✓ Plugin downloaded! Follow the README to install.");
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full" disabled={disabled}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export {title}</DialogTitle>
          <DialogDescription>
            Choose your export format
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3">
          <Button 
            onClick={handleCopyForFigma}
            className="w-full justify-start h-auto py-3 px-4 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            variant="default"
          >
            {copied ? (
              <Check className="h-4 w-4 mr-3 flex-shrink-0" />
            ) : (
              <Copy className="h-4 w-4 mr-3 flex-shrink-0" />
            )}
            <div className="text-left flex-1">
              <div className="font-semibold text-sm">
                {copied ? "✓ Copied to Clipboard!" : "Copy for Figma Plugin"}
              </div>
              <div className="text-xs opacity-90 mt-0.5">
                1-click: Paste in our Figma plugin to visualize
              </div>
            </div>
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">
                Or download
              </span>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => {
              onDownloadJSON();
              setShowDialog(false);
            }}
          >
            <FileJson className="mr-2 h-4 w-4" />
            Download as JSON
            <span className="ml-auto text-xs text-muted-foreground">Data format</span>
          </Button>

          {onDownloadHTML && (
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => {
                onDownloadHTML();
                setShowDialog(false);
              }}
            >
              <FileText className="mr-2 h-4 w-4" />
              Download as HTML
              <span className="ml-auto text-xs text-muted-foreground">Visual format</span>
            </Button>
          )}

          {onDownloadPNG && (
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => {
                onDownloadPNG();
                setShowDialog(false);
              }}
            >
              <Image className="mr-2 h-4 w-4" />
              Download as PNG
              <span className="ml-auto text-xs text-muted-foreground">Image format</span>
            </Button>
          )}

          <div className="pt-3 border-t space-y-3">
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">
                📌 First time using Figma export?
              </p>
              <p className="text-xs text-muted-foreground">
                Download our free plugin once, install it in Figma, then copy-paste data to create beautiful visualizations!
              </p>
            </div>
            
            <Button
              onClick={handleDownloadPlugin}
              variant="outline"
              className="w-full justify-start text-sm"
              size="sm"
            >
              <Package className="h-4 w-4 mr-2" />
              Download Figma Plugin (ZIP)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
