import { BookOpen } from "lucide-react";

interface EmptyStateProps {
  onSuggestionClick: (word: string) => void;
}

const EXAMPLE_WORDS = ["language", "science", "dialect", "oxygen", "maharajah"];

export default function EmptyState({ onSuggestionClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <BookOpen className="h-20 w-20 mb-6 text-muted-foreground" />
      <h2 className="text-2xl font-semibold mb-2">Etymology Visualizer</h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        Search a word to explore its etymology and discover how it relates to other words
      </p>
      <div className="flex flex-wrap gap-2 justify-center items-center">
        <span className="text-sm text-muted-foreground">Try:</span>
        {EXAMPLE_WORDS.map((word) => (
          <button
            key={word}
            onClick={() => onSuggestionClick(word)}
            className="px-4 py-2 rounded-lg bg-secondary hover:bg-accent transition-colors text-sm font-medium"
          >
            {word}
          </button>
        ))}
      </div>
    </div>
  );
}
