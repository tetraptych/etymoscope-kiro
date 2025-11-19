import { AlertCircle } from "lucide-react";

interface ErrorStateProps {
  error: Error;
  word: string;
  onRetry: () => void;
}

export default function ErrorState({ error, word, onRetry }: ErrorStateProps) {
  const isNotFound = error.message.includes("not found") || error.message.includes("404");

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <AlertCircle className="h-16 w-16 mb-4 text-muted-foreground" />
      <h2 className="text-xl font-semibold mb-2">
        {isNotFound ? "Word Not Found" : "Error Loading Graph"}
      </h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        {isNotFound
          ? `The word "${word}" is not in the etymology database. Try checking your spelling or searching for a different word.`
          : "An error occurred while loading the etymology graph. Please try again."}
      </p>
      <button
        onClick={onRetry}
        className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
      >
        Try Again
      </button>
    </div>
  );
}
