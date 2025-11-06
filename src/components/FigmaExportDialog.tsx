import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Share2, ExternalLink, Check } from 'lucide-react';
import { useFigmaToken } from '@/hooks/useFigmaToken';
import { Checkbox } from '@/components/ui/checkbox';

interface FigmaExportDialogProps {
  onExport: (token: string) => Promise<void>;
  isExporting: boolean;
  disabled?: boolean;
}

export function FigmaExportDialog({ onExport, isExporting, disabled }: FigmaExportDialogProps) {
  const { figmaToken, setFigmaToken, saveToken, clearToken, openFigmaTokenPage, hasToken } = useFigmaToken();
  const [showDialog, setShowDialog] = useState(false);
  const [rememberToken, setRememberToken] = useState(true);
  const [localToken, setLocalToken] = useState('');

  const handleExport = async () => {
    const tokenToUse = localToken || figmaToken;
    
    if (!tokenToUse) {
      return;
    }

    // Save token if remember is checked
    if (rememberToken && localToken) {
      await saveToken(localToken);
    }

    await onExport(tokenToUse);
    setShowDialog(false);
    setLocalToken('');
  };

  const handleClearToken = async () => {
    await clearToken();
    setLocalToken('');
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full" disabled={disabled}>
          <Share2 className="mr-2 h-4 w-4" />
          Export to Figma
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export to Figma</DialogTitle>
          <DialogDescription>
            {hasToken 
              ? "Your Figma token is saved. Click export to continue." 
              : "Enter your Figma access token to export your work."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {hasToken ? (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-700 dark:text-green-300">
                Figma token is saved and ready to use
              </span>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="figma-token">Figma Access Token</Label>
                <Input
                  id="figma-token"
                  type="password"
                  value={localToken}
                  onChange={(e) => setLocalToken(e.target.value)}
                  placeholder="Enter your Figma access token"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember" 
                  checked={rememberToken}
                  onCheckedChange={(checked) => setRememberToken(checked as boolean)}
                />
                <label
                  htmlFor="remember"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Remember my token for future exports
                </label>
              </div>
            </>
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={openFigmaTokenPage}
              className="flex-1"
            >
              <ExternalLink className="mr-2 h-3 w-3" />
              Get Figma Token
            </Button>
            
            {hasToken && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearToken}
                className="flex-1"
              >
                Clear Saved Token
              </Button>
            )}
          </div>

          <Button 
            onClick={handleExport}
            disabled={(!localToken && !hasToken) || isExporting}
            className="w-full"
          >
            {isExporting ? 'Exporting...' : 'Export to Figma'}
          </Button>

          <p className="text-xs text-muted-foreground">
            Your token is stored securely and only used for exports to your Figma account.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
