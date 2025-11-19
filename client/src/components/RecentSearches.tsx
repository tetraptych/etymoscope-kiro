import { X } from "lucide-react";

interface RecentSearchesProps {
  searches: string[];
  onSelect: (word: string) => void;
  onRemove: (word: string) => void;
}

export default function RecentSearches({
  searches,
  onSelect,
  onRemove,
}: RecentSearchesProps) {
  if (searches.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-sm text-muted-foreground flex-shrink-0">Recent:</span>
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        {searches.slice(0, 5).map((word) => (
          <div
            key={word}
            className="flex items-center gap-1 px-3 py-1 rounded-full bg-secondary hover:bg-accent transition-colors flex-shrink-0"
          >
            <button
              onClick={() => onSelect(word)}
              className="text-sm font-medium"
            >
              {word}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(word);
              }}
              className="ml-1"
              aria-label={`Remove ${word}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
