import { Info, Share2, GitBranch, Network } from "lucide-react";
import SearchBar from "./SearchBar";
import DepthControl from "./DepthControl";
import ThemeToggle from "./ThemeToggle";
import RecentSearches from "./RecentSearches";

interface HeaderProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  onRandomWord: () => void;
  depth: number;
  onDepthChange: (depth: number) => void;
  recentSearches: string[];
  onSelectRecent: (word: string) => void;
  onRemoveRecent: (word: string) => void;
  onAboutClick: () => void;
  onShare: () => void;
  layout: "force" | "radial";
  onLayoutToggle: () => void;
}

export default function Header({
  searchValue,
  onSearchChange,
  onSearch,
  onRandomWord,
  depth,
  onDepthChange,
  recentSearches,
  onSelectRecent,
  onRemoveRecent,
  onAboutClick,
  onShare,
  layout,
  onLayoutToggle,
}: HeaderProps) {
  return (
    <header className="border-b border-border bg-background">
      <div className="px-6 pt-8 pb-4">
        <div className="flex items-start justify-between gap-8 max-w-7xl mx-auto">
          <h1 
            className="text-2xl font-bold whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity pt-2"
            onClick={() => window.location.href = '/'}
          >
            Etymoscope
          </h1>

          <div className="flex-[3] flex flex-col items-center gap-3">
            <SearchBar
              value={searchValue}
              onChange={onSearchChange}
              onSearch={onSearch}
              onRandom={onRandomWord}
            />
            
            {recentSearches.length > 0 && (
              <div className="w-full max-w-2xl">
                <RecentSearches
                  searches={recentSearches}
                  onSelect={onSelectRecent}
                  onRemove={onRemoveRecent}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-3">
            <DepthControl value={depth} onChange={onDepthChange} />
            <div className="flex items-center gap-2">
              <button
                onClick={onAboutClick}
                className="p-2 rounded-md hover:bg-secondary transition-colors"
                aria-label="About"
                title="About"
              >
                <Info className="h-5 w-5" />
              </button>
              <button
                onClick={onLayoutToggle}
                className="p-2 rounded-md hover:bg-secondary transition-colors"
                aria-label={layout === "radial" ? "Switch to force layout" : "Switch to radial layout"}
                title={layout === "radial" ? "Switch to force layout" : "Switch to radial layout"}
              >
                {layout === "radial" ? <Network className="h-5 w-5" /> : <GitBranch className="h-5 w-5" />}
              </button>
              <button
                onClick={onShare}
                className="p-2 rounded-md hover:bg-secondary transition-colors"
                aria-label="Share"
                title="Share"
              >
                <Share2 className="h-5 w-5" />
              </button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
