import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { WordGraphResponse, GraphNode } from "@shared/schema";
import Header from "../components/Header";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import GraphCanvas from "../components/GraphCanvas";
import GraphCanvasRadial from "../components/GraphCanvasRadial";
import WordDetailPanel from "../components/WordDetailPanel";
import AboutDialog from "../components/AboutDialog";
import ShareDialog from "../components/ShareDialog";
import Legend from "../components/Legend";
import { filterGraphByDepth } from "../lib/graphUtils";

const EXAMPLE_WORDS = ["etymology", "language"];

export default function HomePage() {
  // Initialize state from URL params
  const [searchValue, setSearchValue] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('word') || "";
  });
  const [currentWord, setCurrentWord] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('word') || "";
  });
  const [depth, setDepth] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const depthParam = params.get('depth');
    return depthParam ? parseInt(depthParam, 10) : 2;
  });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedNodeWord, setSelectedNodeWord] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('selected');
  });
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [layout, setLayout] = useState<"force" | "radial">(() => {
    const params = new URLSearchParams(window.location.search);
    const layoutParam = params.get('layout');
    return layoutParam === 'force' ? 'force' : 'radial'; // Default to radial
  });
  
  // Load recent searches from localStorage on mount
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('recentSearches');
      return saved ? JSON.parse(saved) : EXAMPLE_WORDS;
    } catch {
      return EXAMPLE_WORDS;
    }
  });

  // Save recent searches to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
    } catch {
      // Ignore localStorage errors
    }
  }, [recentSearches]);

  // Fetch graph data at max depth (3)
  const { data, isLoading, error, refetch } = useQuery<WordGraphResponse>({
    queryKey: ["/api/words", currentWord, 3],
    queryFn: async () => {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/words/${encodeURIComponent(currentWord)}?depth=3`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch word graph");
      }
      return response.json();
    },
    enabled: !!currentWord,
  });

  // Update URL when state changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (currentWord) {
      params.set('word', currentWord);
      params.set('depth', depth.toString());
      if (selectedNode) {
        params.set('selected', selectedNode.word);
      }
      // Only include layout param if it's not the default (radial)
      if (layout !== 'radial') {
        params.set('layout', layout);
      }
    }
    const newUrl = params.toString() ? `?${params.toString()}` : '/';
    window.history.replaceState({}, '', newUrl);
  }, [currentWord, depth, selectedNode, layout]);

  // Auto-select node from URL after data loads, or select root node
  useEffect(() => {
    if (data && !selectedNode) {
      if (selectedNodeWord) {
        // If there's a selected node from URL, use that
        const node = data.nodes.find(n => n.word === selectedNodeWord);
        if (node) {
          setSelectedNode(node);
          setSelectedNodeWord(null); // Clear so we don't keep trying
        }
      } else {
        // Otherwise, auto-select the root node (depth 0)
        const rootNode = data.nodes.find(n => n.depth === 0);
        if (rootNode) {
          setSelectedNode(rootNode);
        }
      }
    }
  }, [selectedNodeWord, data, selectedNode]);

  const handleSearch = () => {
    if (searchValue.trim()) {
      const word = searchValue.trim().toLowerCase();
      setCurrentWord(word);
      setSelectedNode(null);

      // Add to recent searches if not already present
      if (!recentSearches.includes(word)) {
        setRecentSearches([word, ...recentSearches.slice(0, 4)]);
      }
    }
  };

  const handleDepthChange = (newDepth: number) => {
    setDepth(newDepth);
  };

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
  };

  const handleShare = () => {
    setIsShareOpen(true);
  };

  const handleExploreWord = (word: string) => {
    setSearchValue(word);
    setCurrentWord(word);
    setSelectedNode(null);

    if (!recentSearches.includes(word)) {
      setRecentSearches([word, ...recentSearches.slice(0, 4)]);
    }
  };

  const handleSelectRecent = (word: string) => {
    setSearchValue(word);
    setCurrentWord(word);
    setSelectedNode(null);
  };

  const handleRemoveRecent = (word: string) => {
    setRecentSearches(recentSearches.filter((w) => w !== word));
  };

  const handleSuggestionClick = (word: string) => {
    setSearchValue(word);
    setCurrentWord(word);
    if (!recentSearches.includes(word)) {
      setRecentSearches([word, ...recentSearches.slice(0, 4)]);
    }
  };

  const handleRandomWord = async () => {
    const MAX_ATTEMPTS = 10;
    const MAX_NODES = 850; // Threshold for "too many nodes" - we can handle larger graphs now with sqrt scaling
    
    try {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        // Get random word
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const randomResponse = await fetch(`${apiUrl}/api/random`);
        if (!randomResponse.ok) {
          throw new Error('Failed to fetch random word');
        }
        const randomData = await randomResponse.json();
        const word = randomData.word;
        
        // Fetch the graph for this word to check size
        const graphResponse = await fetch(`${apiUrl}/api/words/${encodeURIComponent(word)}?depth=3`);
        if (!graphResponse.ok) {
          continue; // Try another word
        }
        const graphData = await graphResponse.json();
        
        // Check if graph is manageable size
        if (graphData.nodes.length <= MAX_NODES) {
          // Good size! Use this word
          setSearchValue(word);
          setCurrentWord(word);
          setSelectedNode(null);
          
          if (!recentSearches.includes(word)) {
            setRecentSearches([word, ...recentSearches.slice(0, 4)]);
          }
          return; // Success!
        }
        
        // Graph too large, try again
        console.log(`Random word "${word}" has ${graphData.nodes.length} nodes, retrying...`);
      }
      
      // If we exhausted attempts, just use the last word anyway
      console.warn('Could not find a small enough graph after max attempts');
    } catch (error) {
      console.error('Error fetching random word:', error);
    }
  };

  // Detect hub nodes based on their relatedWords count
  const hubNodeIds = useMemo(() => {
    if (!data) return new Set<string>();
    
    const HUB_THRESHOLD = 80;
    const hubs = new Set<string>();
    
    // Mark nodes with >= HUB_THRESHOLD related words as hubs
    for (const node of data.nodes) {
      if (node.depth >= 1 && node.relatedWords.length >= HUB_THRESHOLD) {
        hubs.add(node.id);
      }
    }
    
    return hubs;
  }, [data]);

  // Filter graph data by selected depth (memoized to prevent unnecessary re-renders)
  const filteredData = useMemo(() => {
    return data ? filterGraphByDepth(data.nodes, data.edges, depth) : null;
  }, [data, depth]);

  return (
    <div className="h-screen flex flex-col">
      <Header
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onSearch={handleSearch}
        onRandomWord={handleRandomWord}
        depth={depth}
        onDepthChange={handleDepthChange}
        recentSearches={recentSearches}
        onSelectRecent={handleSelectRecent}
        onRemoveRecent={handleRemoveRecent}
        onAboutClick={() => setIsAboutOpen(true)}
        onShare={handleShare}
        layout={layout}
        onLayoutToggle={() => setLayout(layout === "radial" ? "force" : "radial")}
      />

      <AboutDialog 
        isOpen={isAboutOpen} 
        onClose={() => setIsAboutOpen(false)} 
      />

      <ShareDialog
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        url={window.location.href}
      />

      <main className="flex-1 relative overflow-hidden">
        {!currentWord ? (
          <EmptyState onSuggestionClick={handleSuggestionClick} />
        ) : isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState
            error={error as Error}
            word={currentWord}
            onRetry={() => refetch()}
          />
        ) : filteredData && filteredData.nodes.length > 0 ? (
          <>
            {layout === "force" ? (
              <GraphCanvas
                nodes={filteredData.nodes}
                edges={filteredData.edges}
                hubNodeIds={hubNodeIds}
                onNodeClick={handleNodeClick}
              />
            ) : (
              <GraphCanvasRadial
                nodes={filteredData.nodes}
                edges={filteredData.edges}
                hubNodeIds={hubNodeIds}
                onNodeClick={handleNodeClick}
              />
            )}

            {selectedNode && (
              <WordDetailPanel
                word={selectedNode.word}
                definition={selectedNode.definition}
                relatedWords={selectedNode.relatedWords || []}
                onExploreWord={handleExploreWord}
                onClose={() => setSelectedNode(null)}
              />
            )}
            <Legend 
              isOpen={isLegendOpen} 
              onToggle={() => setIsLegendOpen(!isLegendOpen)} 
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <p className="text-lg font-semibold mb-2">No Results</p>
            <p className="text-muted-foreground">
              No etymology data found for "{currentWord}".
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
