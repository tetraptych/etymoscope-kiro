import { useState } from "react";

import { X } from "lucide-react";

interface WordDetailPanelProps {
  word: string;
  definition: string;
  relatedWords: string[];
  onExploreWord: (word: string) => void;
  onClose: () => void;
}

export default function WordDetailPanel({
  word,
  definition,
  relatedWords,
  onExploreWord,
  onClose,
}: WordDetailPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine which words to show
  const shouldTruncate = relatedWords.length > 30;
  const displayedWords = shouldTruncate && !isExpanded
    ? [...relatedWords.slice(0, 20), ...relatedWords.slice(-10)]
    : relatedWords;
  const hiddenCount = shouldTruncate ? relatedWords.length - 30 : 0;

  return (
    <div className="absolute right-0 top-0 bottom-0 w-96 bg-background border-l border-border shadow-lg overflow-y-auto">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-2xl font-bold">{word}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-secondary transition-colors"
            aria-label="Close panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="mb-6">
          <p className="text-sm leading-relaxed">{definition}</p>
        </div>

        <button
          onClick={() => onExploreWord(word)}
          className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium mb-6"
        >
          Explore this word
        </button>

        {relatedWords.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Related Words ({relatedWords.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {displayedWords.slice(0, shouldTruncate && !isExpanded ? 20 : displayedWords.length).map((relatedWord) => (
                <button
                  key={relatedWord}
                  onClick={() => onExploreWord(relatedWord)}
                  className="px-3 py-1 rounded-lg bg-secondary hover:bg-accent transition-colors text-sm"
                >
                  {relatedWord}
                </button>
              ))}
              
              {shouldTruncate && !isExpanded && (
                <button
                  onClick={() => setIsExpanded(true)}
                  className="px-3 py-1 rounded-lg bg-secondary hover:bg-accent transition-colors text-sm font-semibold"
                >
                  ... ({hiddenCount} more)
                </button>
              )}
              
              {shouldTruncate && !isExpanded && displayedWords.slice(20).map((relatedWord) => (
                <button
                  key={relatedWord}
                  onClick={() => onExploreWord(relatedWord)}
                  className="px-3 py-1 rounded-lg bg-secondary hover:bg-accent transition-colors text-sm"
                >
                  {relatedWord}
                </button>
              ))}
              
              {shouldTruncate && isExpanded && (
                <button
                  onClick={() => setIsExpanded(false)}
                  className="px-3 py-1 rounded-lg bg-secondary hover:bg-accent transition-colors text-sm font-semibold"
                >
                  Show less
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
