interface LegendProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function Legend({ isOpen, onToggle }: LegendProps) {
  return (
    <div className="fixed bottom-4 left-4 z-50">
      {isOpen && (
        <div className="mb-2 bg-background border border-border rounded-lg shadow-lg p-4 w-64">
          <h3 className="font-semibold mb-3 text-sm">Graph Legend</h3>
          
          <div className="space-y-3 text-xs">
            {/* Node Colors */}
            <div>
              <div className="font-medium mb-2 text-muted-foreground">Node Colors</div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16">
                    <circle cx="8" cy="8" r="6" fill="hsl(45 100% 55%)" stroke="hsl(var(--background))" strokeWidth="2" />
                  </svg>
                  <span>Root word (searched)</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg width="16" height="16">
                    <circle cx="8" cy="8" r="6" fill="hsl(210 95% 45%)" stroke="hsl(var(--background))" strokeWidth="2" />
                  </svg>
                  <span>Direct descendants</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg width="16" height="16">
                    <circle cx="8" cy="8" r="6" fill="hsl(210 80% 65%)" stroke="hsl(var(--background))" strokeWidth="2" />
                  </svg>
                  <span>2nd generation</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg width="16" height="16">
                    <circle cx="8" cy="8" r="6" fill="hsl(var(--background))" stroke="hsl(210 65% 78%)" strokeWidth="2" />
                  </svg>
                  <span>3rd generation</span>
                </div>
              </div>
            </div>

            {/* Hub Nodes */}
            <div>
              <div className="font-medium mb-2 text-muted-foreground">Special Nodes</div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16">
                    <path d="M 8,2 L 14,8 L 8,14 L 2,8 Z" fill="hsl(30 90% 55%)" stroke="hsl(var(--background))" strokeWidth="2" />
                  </svg>
                  <span>Hub (descendants hidden)</span>
                </div>
              </div>
            </div>

            {/* Interactions */}
            <div>
              <div className="font-medium mb-2 text-muted-foreground">Interactions</div>
              <div className="space-y-1">
                <div>• Click node to view details</div>
                <div>• Hover to highlight path</div>
                <div>• Scroll to zoom</div>
                <div>• Drag to pan</div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <button
        onClick={onToggle}
        className="bg-background border border-border rounded-lg px-3 py-2 text-sm font-medium hover:bg-secondary transition-colors shadow-lg"
        aria-label={isOpen ? "Close legend" : "Open legend"}
      >
        {isOpen ? "Hide Legend" : "Show Legend"}
      </button>
    </div>
  );
}
