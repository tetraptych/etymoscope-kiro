import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
}

export default function ShareDialog({ isOpen, onClose, url }: ShareDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Select the text when dialog opens
      inputRef.current.select();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-background border border-border rounded-lg shadow-lg p-4 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground">
            Copy this link to share the current view:
          </p>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-secondary transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={url}
          readOnly
          className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm font-mono"
          onClick={(e) => e.currentTarget.select()}
        />
      </div>
    </div>
  );
}
