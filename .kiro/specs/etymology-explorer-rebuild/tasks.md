# Implementation Plan

- [x] 1. Set up project structure and configuration
  - Create root directory structure (client/, server/, shared/)
  - Set up package.json with dependencies (React, D3, Express, TypeScript, Vite, TanStack Query, Wouter, Tailwind, Radix UI)
  - Configure TypeScript for client and server with appropriate compiler options
  - Configure Vite for client build with React plugin
  - Configure Tailwind CSS with dark mode support
  - Set up build scripts for client (Vite) and server (esbuild)
  - _Requirements: 10.5_

- [x] 2. Implement shared schema and types
  - Create shared/schema.ts with Zod schemas for WordEntry, EtymologyData, GraphNode, GraphEdge, WordGraphResponse
  - Export TypeScript types derived from Zod schemas
  - Add validation helpers for API request/response data
  - _Requirements: 10.1, 10.4_

- [x] 3. Implement server-side data loading and storage
  - Create server/storage.ts with MemStorage class implementing IStorage interface
  - Implement loadEtymologyData method to read and parse JSON file
  - Implement getWordEntry method to retrieve word data by key (case-insensitive)
  - Add error handling for missing files and malformed JSON
  - _Requirements: 10.1, 10.4_

- [x] 4. Implement graph construction algorithm with BFS
  - Create getWordGraph method in storage layer using breadth-first search
  - Build nodes array with id, word, definition, and depth properties
  - Build edges array connecting related words
  - Support non-tree graphs (multiple parents per node)
  - Normalize all word lookups to lowercase
  - _Requirements: 1.1, 1.2, 9.1, 9.2, 9.3, 9.4_

- [x] 5. Implement hub node pruning logic
  - Add hub detection in getWordGraph: identify nodes at depth ≥ 1 with ≥ 80 children
  - Remove children of hub nodes from the result set
  - Ensure edges to pruned nodes are also removed
  - _Requirements: 2.4_

- [x] 6. Create Express server with API routes
  - Create server/index.ts with Express app setup
  - Create server/routes.ts with registerRoutes function
  - Implement GET /api/words/:word endpoint with depth query parameter
  - Validate word parameter (non-empty string) and depth parameter (1-3)
  - Return 404 for words not found, 400 for invalid parameters, 500 for server errors
  - Load etymology data on server startup from data/full-data.json
  - Serve static client files in production
  - _Requirements: 1.1, 1.3, 10.1, 10.2, 10.4_

- [x] 7. Set up React application structure
  - Create client/src/main.tsx as entry point with React.StrictMode
  - Create client/src/App.tsx with providers (QueryClient, Theme, Tooltip)
  - Set up Wouter router with HomePage and NotFound routes
  - Create client/src/lib/queryClient.ts with TanStack Query configuration
  - Configure query defaults (staleTime: 5 minutes, cacheTime: 5 minutes, retry: 1)
  - _Requirements: 10.5_

- [x] 8. Implement theme management
  - Create client/src/hooks/useTheme.ts hook for theme state management
  - Implement theme toggle functionality (light/dark)
  - Persist theme preference to localStorage
  - Default to dark mode on initial load
  - Apply theme class to document root element
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 9. Create HomePage component with state management
  - Create client/src/pages/HomePage.tsx as main application page
  - Implement state for searchValue, currentWord, depth (default 2), selectedNode, recentSearches
  - Implement handleSearch function to update currentWord and add to recent searches
  - Implement handleDepthChange function to update depth state
  - Implement handleNodeClick function to update selectedNode state
  - Implement handleExploreWord function to make selected word the new root
  - Use TanStack Query to fetch graph data with query key ['/api/words', currentWord, 3]
  - _Requirements: 1.1, 1.4, 3.1, 3.2, 4.1, 4.4_

- [x] 10. Implement Header component with controls
  - Create client/src/components/Header.tsx with fixed header layout
  - Include AppTitle, SearchBar, DepthControl, and ThemeToggle components
  - Use flexbox layout with centered search bar
  - Style with Tailwind classes for consistent spacing and borders
  - _Requirements: 1.1, 3.1, 7.1_

- [x] 11. Create SearchBar component
  - Create client/src/components/SearchBar.tsx with text input and submit button
  - Implement controlled input with value and onChange props
  - Implement onSearch callback on form submit and button click
  - Add search icon using Lucide React
  - Style with Tailwind for consistent appearance
  - _Requirements: 1.1_

- [x] 12. Implement RecentSearches component
  - Create client/src/components/RecentSearches.tsx displaying list of recent searches
  - Show example words ("etymology", "language") when no search history exists
  - Implement click handler to execute search for clicked word
  - Implement remove button for each item to delete from recent searches
  - Style as horizontal chip list with dismiss buttons
  - Limit to 5 most recent searches
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 8.2_

- [x] 13. Create DepthControl component
  - Create client/src/components/DepthControl.tsx with range slider input
  - Set min=1, max=3, default=2
  - Display current depth value prominently next to slider
  - Implement onChange callback to update parent state
  - Style with Tailwind and ensure accessibility (labels, ARIA attributes)
  - _Requirements: 3.1, 3.2_

- [x] 14. Create ThemeToggle component
  - Create client/src/components/ThemeToggle.tsx with toggle button
  - Use sun/moon icons from Lucide React
  - Call useTheme hook to get current theme and toggle function
  - Style as icon button with hover states
  - _Requirements: 7.1, 7.3_

- [x] 15. Implement EmptyState component
  - Create client/src/components/EmptyState.tsx for initial state before search
  - Display centered message prompting user to search
  - Show example word suggestions as clickable buttons
  - Implement onSuggestionClick callback to trigger search
  - Style with Tailwind for centered layout and visual hierarchy
  - _Requirements: 8.1, 8.2, 8.4_

- [x] 16. Create LoadingState component
  - Create client/src/components/LoadingState.tsx with loading spinner
  - Use Lucide React Loader2 icon with spin animation
  - Center in viewport with appropriate sizing
  - _Requirements: 10.3_

- [x] 17. Create ErrorState component
  - Create client/src/components/ErrorState.tsx for error display
  - Show "Word not found" message for 404 errors
  - Show generic error message for other errors
  - Include retry button that triggers new search
  - Style with Tailwind for centered layout
  - _Requirements: 1.3_

- [x] 18. Implement client-side depth filtering logic
  - Create client/src/lib/graphUtils.ts with filterGraphByDepth function
  - Filter nodes to include only those with depth <= selectedDepth
  - Filter edges to include only those where both source and target are in filtered nodes
  - Return filtered { nodes, edges } object
  - _Requirements: 3.2, 3.3, 3.4_

- [x] 19. Create GraphCanvas component with D3-force simulation
  - Create client/src/components/GraphCanvas.tsx using D3 with SVG
  - Set up SVG element with 100% width/height and viewBox
  - Initialize D3 force simulation with forceSimulation
  - Apply filtered graph data (nodes and edges) to simulation
  - _Requirements: 1.5, 2.1, 2.2, 4.5_

- [x] 20. Configure D3 forces for radial layout
  - Add forceRadial with strength 0.8, radius based on node depth (depth * 180)
  - Add forceCollide with radius 25 and strength 0.9 to prevent overlap
  - Add forceLink with distance 50 and strength 0.3 for edge connections
  - Add forceManyBody with strength -30 for gentle repulsion
  - Add forceCenter with strength 0.05 to prevent drift
  - Fix root node position at center (fx=0, fy=0)
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 21. Render graph edges with SVG paths
  - Create edges group in SVG
  - Render each edge as SVG path element with quadratic curve
  - Calculate curve control point for visual clarity
  - Apply stroke color with opacity based on depth (0.6 for depth 0-1, 0.4 for 1-2, 0.3 for 2-3)
  - Apply stroke width based on depth (2px for shallow, 1.5px for deep)
  - Update edge positions on simulation tick
  - _Requirements: 2.5, 2.6, 5.5_

- [x] 22. Render graph nodes with SVG circles and labels
  - Create nodes group in SVG
  - Render each node as SVG group with circle and text elements
  - Apply node size based on depth (16px for root, 10px for depth 1, 8px for depth 2-3)
  - Apply node color based on depth (orange for root, blue gradient for others)
  - Position text label to right of circle with offset
  - Apply font size and weight based on depth
  - Update node positions on simulation tick
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 23. Implement node interaction and hover states
  - Add click event listeners to node groups
  - Call onNodeClick callback with node data when clicked
  - Add mouseenter/mouseleave listeners for hover effects
  - Scale up node on hover (transform scale 1.2)
  - Increase stroke width on hover
  - Apply cursor pointer style to nodes
  - _Requirements: 4.1_

- [x] 24. Implement simulation lifecycle management
  - Start simulation when graph data changes
  - Stop and clean up previous simulation before starting new one
  - Limit simulation to 300 ticks maximum
  - Stop simulation when alpha < 0.01 (stable state)
  - Clean up simulation and event listeners on component unmount
  - Use useEffect hook for lifecycle management
  - _Requirements: 2.1_

- [x] 25. Create WordDetailPanel component
  - Create client/src/components/WordDetailPanel.tsx as side panel
  - Display selected word as heading
  - Display word definition in readable prose style
  - Display list of related words as clickable items
  - Implement "Explore this word" button that calls onExploreWord callback
  - Style as fixed-width panel (320px) on right side of screen
  - Add subtle shadow and backdrop blur for depth
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 26. Implement conditional rendering in HomePage
  - Show EmptyState when currentWord is empty
  - Show LoadingState when query isLoading is true
  - Show ErrorState when query has error
  - Show GraphCanvas and WordDetailPanel when data is available
  - Hide WordDetailPanel when no node is selected
  - _Requirements: 8.1, 8.3, 10.3_

- [x] 27. Add theme-aware styling to graph visualization
  - Apply theme-dependent colors to node labels (white for dark, dark gray for light)
  - Apply theme-dependent background color to SVG
  - Add text shadow to labels for readability over edges
  - Update colors when theme changes
  - _Requirements: 7.5_

- [x] 28. Copy etymology data files to new project
  - Copy data/sample-etymology.json from legacy folder
  - Copy data/full-data.json from legacy folder (if exists)
  - Ensure data files are in correct location for server to load
  - _Requirements: 10.1_

- [x] 29. Set up development and build scripts
  - Add dev script to run server with tsx in development mode
  - Add build script to compile client with Vite and server with esbuild
  - Add start script to run production server
  - Add check script to run TypeScript type checking
  - Test that all scripts work correctly
  - _Requirements: 10.5_

- [x] 30. Create index.html entry point
  - Create client/index.html with root div element
  - Include Vite script tag for main.tsx
  - Add meta tags for viewport and charset
  - Set appropriate title
  - _Requirements: 10.5_

- [x] 31. Manual testing and iteration
  - Test search functionality with various words
  - Test depth control at all levels
  - Test node clicking and side panel updates
  - Test "Explore this word" functionality
  - Test recent searches persistence
  - Test theme toggle
  - Test with small, medium, and large graphs
  - Verify hub node pruning works correctly
  - Check for node overlap issues
  - Verify graph layout quality at different depths
  - Test error states (word not found, network errors)
  - Iterate on force simulation parameters if layout needs improvement
  - _Requirements: All_

- [x] 32. Implement hover state management in GraphCanvas
  - Add hoveredId state using useState<string | null>(null) in GraphCanvas component
  - Build adjacency map using useMemo to track which nodes are connected to each other
  - Map through edges to populate adjacency map with bidirectional connections
  - Pass hoveredId and setHoveredId to node rendering logic
  - _Requirements: 11.1, 11.2_

- [x] 33. Add hover event handlers to nodes
  - Add onMouseEnter handler to node elements that calls setHoveredId(node.id)
  - Add onMouseLeave handler to node elements that calls setHoveredId(null)
  - Ensure handlers are attached to the interactive node group element
  - _Requirements: 11.1, 11.8_

- [x] 34. Implement node highlight and dim logic
  - Create useEffect that runs when hoveredId changes
  - When hoveredId is null, set all nodes to normal state (highlight: false, dim: false)
  - When hoveredId is set, create focusSet containing hoveredId and all neighbor IDs from adjacency map
  - Update node data to set highlight: true for nodes in focusSet
  - Update node data to set dim: true for nodes not in focusSet
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 35. Apply visual styling for highlighted and dimmed nodes
  - When node.data.highlight is true, apply box shadow glow effect: "0 0 8px rgba(255,255,255,0.28)"
  - When node.data.highlight is true, set label font weight to 600
  - When node.data.dim is true, set node opacity to 0.3
  - When node.data.dim is true, set label opacity to 0.25
  - When neither highlight nor dim, use normal opacity (0.9 for nodes, 1.0 for labels)
  - Add CSS transition for opacity changes: "opacity 0.15s ease"
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.9_

- [x] 36. Implement edge highlight and dim logic
  - In the same useEffect for hoveredId, update edge data based on hover state
  - When hoveredId is null, set all edges to normal state (highlight: false, dim: false)
  - When hoveredId is set, mark edge as highlight: true if edge.source === hoveredId OR edge.target === hoveredId
  - Also mark edge as highlight: true if both source and target are in focusSet
  - Mark edge as dim: true if it doesn't meet highlight criteria
  - _Requirements: 11.5, 11.6, 11.7_

- [x] 37. Apply visual styling for highlighted and dimmed edges (subtle effects)
  - When edge.data.highlight is true, increase opacity by 0.15 from base opacity (more subtle than before)
  - When edge.data.dim is true, reduce opacity to 60% of base opacity (less extreme than before)
  - When neither highlight nor dim, use base opacity
  - Do NOT change stroke width (keep it constant for subtlety)
  - Add CSS transition for opacity: "opacity 0.15s ease"
  - _Requirements: 11.5, 11.6, 11.7, 11.9_
