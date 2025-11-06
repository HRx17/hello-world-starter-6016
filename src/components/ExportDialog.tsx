import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileJson, FileText, Image } from 'lucide-react';
import { toast } from 'sonner';

interface ExportDialogProps {
  data: any;
  title: string;
  onDownloadJSON: () => void;
  onDownloadHTML?: () => void;
  onDownloadPNG?: () => void;
  disabled?: boolean;
}

export function ExportDialog({ 
  data, 
  title, 
  onDownloadJSON, 
  onDownloadHTML,
  onDownloadPNG,
  disabled 
}: ExportDialogProps) {
  const [showDialog, setShowDialog] = useState(false);

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
        
        <div className="space-y-2">
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

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              💡 <strong>Tip:</strong> Use JSON for data backup and HTML for visual sharing. You can open HTML files directly in Figma using "Import" or copy-paste the visual output.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
