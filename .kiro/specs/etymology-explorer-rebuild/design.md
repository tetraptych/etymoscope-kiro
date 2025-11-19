# Design Document

## Overview

The Etymology Explorer is a single-page web application that visualizes word etymology relationships as an interactive force-directed graph. The application uses d3-force for organic node positioning with radial constraints, ensuring that nodes naturally cluster by depth while avoiding the complexity and brittleness of manual layout calculations. The architecture follows a client-server model with a React/TypeScript frontend and Express backend, sharing type definitions and schemas.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              React Application                         │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │ │
│  │  │   Search &   │  │  D3-Force    │  │    Side     │ │ │
│  │  │   Controls   │  │  Graph SVG   │  │    Panel    │ │ │
│  │  └──────────────┘  └──────────────┘  └─────────────┘ │ │
│  │         │                  │                  │        │ │
│  │         └──────────────────┴──────────────────┘        │ │
│  │                      │                                  │ │
│  │              React Query (API Client)                  │ │
│  └────────────────────────┬───────────────────────────────┘ │
└───────────────────────────┼─────────────────────────────────┘
                            │ HTTP/JSON
┌───────────────────────────┼─────────────────────────────────┐
│                           │                                  │
│  ┌────────────────────────▼───────────────────────────────┐ │
│  │              Express Server                            │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │ │
│  │  │   Routes     │  │   Storage    │  │   JSON      │ │ │
│  │  │   Handler    │──│   Layer      │──│   Data      │ │ │
│  │  └──────────────┘  └──────────────┘  └─────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
│                         Node.js                              │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- D3-force for graph simulation and layout
- D3-selection for SVG manipulation
- TanStack Query (React Query) for data fetching and caching
- Wouter for lightweight routing
- Tailwind CSS for styling
- Radix UI for accessible UI components
- Vite for build tooling

**Backend:**
- Node.js with Express
- TypeScript
- In-memory storage for etymology data

**Shared:**
- Zod for runtime type validation and schema definitions
- Shared TypeScript types

## Components and Interfaces

### Frontend Component Structure

```
App
├── Router
│   ├── HomePage
│   │   ├── Header
│   │   │   ├── AppTitle
│   │   │   ├── SearchBar
│   │   │   ├── DepthControl
│   │   │   └── ThemeToggle
│   │   ├── MainContent
│   │   │   ├── EmptyState (conditional)
│   │   │   ├── LoadingState (conditional)
│   │   │   ├── ErrorState (conditional)
│   │   │   └── GraphView (conditional)
│   │   │       ├── GraphCanvas (D3 SVG)
│   │   │       └── WordDetailPanel
│   │   └── RecentSearches (in SearchBar)
│   └── NotFound
└── Providers
    ├── QueryClientProvider
    ├── TooltipProvider
    └── ThemeProvider
```

### Component Responsibilities

#### App
- Root component providing global context providers
- Manages theme state
- Renders router

#### HomePage
- Main application page
- Manages search state (current word, depth)
- Manages selected node state
- Manages recent searches state
- Coordinates data fetching via React Query
- Handles search submission and depth changes

#### Header
- Fixed header bar spanning full width
- Contains all primary controls
- Responsive layout

#### SearchBar
- Text input for word search
- Submit button
- Recent searches dropdown/list
- Handles search submission

#### DepthControl
- Slider input (1-3)
- Visual display of current depth value
- Triggers depth filter updates

#### ThemeToggle
- Button to switch between light/dark themes
- Persists preference to localStorage

#### GraphCanvas
- Pure D3-force implementation using SVG
- Manages force simulation lifecycle
- Renders nodes, edges, and labels
- Handles node click events
- Applies depth-based filtering
- Implements hub node pruning (≥80 children)

#### WordDetailPanel
- Displays selected word information
- Shows definition and related words
- Provides "Explore this word" action
- Always visible when a node is selected

#### EmptyState
- Shown when no search has been performed
- Displays search prompt
- Shows example words as clickable suggestions

### Key Interfaces and Types

```typescript
// Shared schema types
interface WordEntry {
  definition: string;
  relatedWords: string[];
}

interface EtymologyData {
  [word: string]: WordEntry;
}

interface GraphNode {
  id: string;
  word: string;
  definition: string;
  depth: number;
}

interface GraphEdge {
  from: string;
  to: string;
}

interface WordGraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Frontend-specific types
interface D3Node extends GraphNode {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface D3Link {
  source: D3Node | string;
  target: D3Node | string;
}

interface ForceSimulationConfig {
  centerForce: number;
  radialStrength: number;
  collisionRadius: number;
  linkDistance: number;
  linkStrength: number;
  chargeStrength: number;
}
```

## Data Models

### Etymology Data Structure

The application loads etymology data from a JSON file with the following structure:

```json
{
  "word1": {
    "definition": "Definition of word1",
    "relatedWords": ["word2", "word3"]
  },
  "word2": {
    "definition": "Definition of word2",
    "relatedWords": ["word1", "word4"]
  }
}
```

**Characteristics:**
- Keys are lowercase word strings
- Each word has a definition and array of related words
- Relationships are bidirectional (if A relates to B, B should relate to A)
- No explicit relationship types (all are "related to")

### Graph Construction Algorithm

The backend constructs a graph from the etymology data using breadth-first search (BFS):

1. Start with the root word at depth 0
2. Add root word to queue and visited set
3. While queue is not empty:
   - Dequeue current word and current depth
   - If current depth > max depth, skip
   - For each related word:
     - If not visited and exists in data:
       - Add to visited set
       - Create node with depth = current depth + 1
       - Create edge from current word to related word
       - Add to queue with incremented depth
4. Return nodes and edges

**Hub Node Pruning:**
After graph construction, the backend identifies hub nodes (nodes at depth ≥ 1 with ≥ 80 children) and removes their children from the result set. This prevents overwhelming the visualization with highly connected words.

### Client-Side Depth Filtering

The client receives the full graph at max depth (3) and filters nodes/edges based on the selected depth:

1. Filter nodes: keep only nodes where `node.depth <= selectedDepth`
2. Filter edges: keep only edges where both source and target nodes are in the filtered node set
3. Pass filtered data to D3 force simulation

## Graph Visualization Design

### D3-Force Configuration

The graph uses d3-force simulation with the following forces:

**1. Radial Force**
- Pulls nodes toward circular regions based on depth
- Radius calculation: `depth * radiusStep` where radiusStep ≈ 150-200px
- Strength: 0.8 (strong constraint to maintain depth layers)
- Root node (depth 0) fixed at center (fx=0, fy=0)

**2. Collision Force**
- Prevents node overlap
- Radius: node visual radius + padding (≈ 20-30px)
- Strength: 0.9 (strong to ensure readability)

**3. Link Force**
- Maintains edge connections
- Distance: varies by depth (closer for shallow, farther for deep)
- Strength: 0.3 (weak to allow radial force to dominate)

**4. Many-Body Force (Charge)**
- Provides gentle repulsion between nodes
- Strength: -30 (weak negative charge)
- Helps distribute nodes evenly around circles

**5. Center Force**
- Keeps entire graph centered in viewport
- Strength: 0.05 (very weak, just prevents drift)

### Visual Styling

**Nodes:**
- Root node (depth 0): 
  - Size: 16px diameter
  - Color: Orange/amber (hsl(30 90% 55%))
  - Font weight: 600
- Depth 1 nodes:
  - Size: 10px diameter
  - Color: Blue (hsl(210 85% 60%))
  - Font weight: 400
- Depth 2 nodes:
  - Size: 8px diameter
  - Color: Lighter blue (hsl(210 75% 70%))
  - Font weight: 400
- Depth 3 nodes:
  - Size: 8px diameter
  - Color: Even lighter blue (hsl(210 60% 65%))
  - Font weight: 400

**Edges:**
- Stroke color: Gray with opacity based on depth
  - Depth 0-1: opacity 0.6
  - Depth 1-2: opacity 0.4
  - Depth 2-3: opacity 0.3
- Stroke width: 2px for depth 0-1, 1.5px for deeper
- Curved paths using SVG quadratic curves for visual clarity
- Hover states:
  - Highlighted edges (connected to hovered node): Stroke width 4.2px, opacity increased by 0.28
  - Dimmed edges (not connected): Opacity reduced to 35% of base opacity
  - Smooth transitions: 150ms ease for opacity and stroke-width changes

**Labels:**
- Always visible
- Positioned to the right of nodes (offset by node radius + 4px)
- Font size: 13px for root, 11px for others
- Color: Theme-dependent (white for dark mode, dark gray for light mode)
- Text shadow for readability over edges

**Interactive States:**
- Hover: 
  - Hovered node: Glow effect with box shadow (0 0 8px rgba(255,255,255,0.28))
  - Hovered node label: Font weight 600, opacity 1.0
  - Connected neighbors: Highlighted with same glow effect, font weight 600
  - Non-connected nodes: Dimmed to opacity 0.3
  - Non-connected labels: Dimmed to opacity 0.25
- Selected: Bold stroke, highlighted color
- Transitions: All opacity and stroke-width changes use 150ms ease transitions

### SVG Structure

```xml
<svg width="100%" height="100%">
  <defs>
    <!-- Gradients, filters if needed -->
  </defs>
  
  <g class="edges">
    <path class="edge" d="..." />
    <!-- More edges -->
  </g>
  
  <g class="nodes">
    <g class="node" transform="translate(x, y)">
      <circle r="8" />
      <text x="12" y="4">word</text>
    </g>
    <!-- More nodes -->
  </g>
</svg>
```

## API Design

### Endpoints

#### GET /api/words/:word

Fetches the etymology graph for a given word.

**Parameters:**
- `word` (path): The word to search for (case-insensitive)
- `depth` (query, optional): Depth to fetch (default: 3, max: 3)

**Response (200 OK):**
```json
{
  "nodes": [
    {
      "id": "etymology",
      "word": "etymology",
      "definition": "The study of word origins",
      "depth": 0
    },
    {
      "id": "etymon",
      "word": "etymon",
      "definition": "The original form of a word",
      "depth": 1
    }
  ],
  "edges": [
    {
      "from": "etymology",
      "to": "etymon"
    }
  ]
}
```

**Response (404 Not Found):**
```json
{
  "error": "Word 'xyz' not found in the etymology database."
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Invalid depth parameter. Must be a number between 1 and 3."
}
```

## State Management

### Application State

The application uses React hooks and React Query for state management:

**Local Component State (useState):**
- `searchValue`: Current text in search input
- `currentWord`: The word being visualized (root node)
- `depth`: Selected depth level (1-3)
- `selectedNode`: Currently selected node for detail panel
- `hoveredId`: ID of currently hovered node (null when not hovering)
- `recentSearches`: Array of recently searched words
- `theme`: Current theme ('light' | 'dark')

**Server State (React Query):**
- Query key: `['/api/words', currentWord, 3]` (always fetch max depth)
- Cached for 5 minutes
- Stale time: 5 minutes (etymology data rarely changes)
- Retry: 1 time on failure

**Derived State:**
- Filtered nodes/edges based on selected depth (computed in render)
- Hub node detection (computed in backend)

### State Flow

1. User enters word and submits search
2. `currentWord` state updates
3. React Query triggers API call with new word
4. Loading state displayed
5. On success: Graph data cached and rendered
6. User adjusts depth slider
7. `depth` state updates
8. Graph re-renders with filtered data (no API call)
9. User hovers over node
10. `hoveredId` state updates
11. Graph highlights hovered node, neighbors, and connected edges; dims others
12. User moves mouse away
13. `hoveredId` clears to null
14. Graph restores normal appearance
15. User clicks node
16. `selectedNode` state updates
17. Side panel updates with node details

## Error Handling

### Frontend Error Handling

**Network Errors:**
- Display error message in main content area
- Provide retry button
- Log error to console

**Word Not Found:**
- Display "Word not found" message
- Suggest checking spelling
- Keep previous graph visible if available

**Invalid Input:**
- Validate search input (non-empty, reasonable length)
- Show inline validation message
- Prevent submission of invalid input

**Simulation Errors:**
- Catch D3 simulation errors
- Fall back to static layout if simulation fails
- Log error details

### Backend Error Handling

**Data Loading Errors:**
- Log error on server startup
- Return empty results until data is loaded
- Provide clear error message in logs

**Invalid Requests:**
- Validate word parameter (non-empty string)
- Validate depth parameter (1-3)
- Return 400 with descriptive error message

**Missing Data:**
- Return 404 when word not found
- Include helpful error message

**Server Errors:**
- Catch unexpected errors
- Return 500 with generic message
- Log full error details server-side

## Testing Strategy

### Manual Testing Focus

Given the requirement for no automated tests, the testing strategy focuses on manual verification:

**Core Functionality:**
- Search for various words and verify graph displays correctly
- Test depth control at all levels (1, 2, 3)
- Click nodes and verify side panel updates
- Test "Explore this word" functionality
- Verify recent searches list updates and persists

**Graph Layout:**
- Test with small graphs (< 20 nodes)
- Test with medium graphs (20-50 nodes)
- Test with large graphs (> 50 nodes)
- Verify hub node pruning works (search for highly connected words)
- Check that nodes don't overlap excessively
- Verify depth layers are visually distinct

**Edge Cases:**
- Search for non-existent words
- Search for words with no related words
- Search for words with many related words (hubs)
- Rapid depth changes
- Rapid word searches
- Empty search input

**UI/UX:**
- Theme toggle works correctly
- All interactive elements respond to clicks
- Hover states work as expected
- Responsive layout at different screen sizes
- Side panel displays correctly

**Performance:**
- Graph renders smoothly with 100+ nodes
- Depth changes are instant (client-side filtering)
- Search results load within 2 seconds
- No memory leaks during extended use

## Performance Considerations

### Optimization Strategies

**1. Data Fetching:**
- Fetch max depth once, filter client-side
- Cache results with React Query (5 min)
- Debounce search input (300ms)

**2. Graph Rendering:**
- Use D3's efficient SVG manipulation
- Limit simulation iterations (300 ticks max)
- Use requestAnimationFrame for smooth updates
- Stop simulation when stable (alpha < 0.01)

**3. Hub Node Pruning:**
- Server-side pruning before sending data
- Reduces payload size and rendering complexity
- Threshold: 80 children for depth ≥ 1 nodes

**4. DOM Optimization:**
- Minimize React re-renders with useMemo/useCallback
- Use CSS transforms for node positioning (GPU-accelerated)
- Batch DOM updates during simulation

**5. Memory Management:**
- Clean up D3 simulation on component unmount
- Remove event listeners properly
- Clear old graph data when new search performed

### Scalability Limits

**Expected Performance:**
- Smooth rendering up to 200 nodes
- Acceptable performance up to 500 nodes
- May struggle beyond 500 nodes (rare with depth 3 + hub pruning)

**Mitigation for Large Graphs:**
- Hub node pruning reduces node count significantly
- Max depth of 3 limits exponential growth
- Future: Could implement virtual rendering or clustering

## Deployment Considerations

### Build Process

1. TypeScript compilation for both client and server
2. Vite builds client bundle with code splitting
3. esbuild bundles server code
4. Output to `dist/` directory

### Environment Variables

- `NODE_ENV`: 'development' | 'production'
- `PORT`: Server port (default: 5000)
- Data file path: Configurable in server code

### File Structure

```
dist/
├── client/           # Vite build output
│   ├── index.html
│   ├── assets/
│   └── ...
└── server/
    └── index.js      # Bundled server
```

### Production Checklist

- [ ] Etymology data file included in deployment
- [ ] Environment variables configured
- [ ] Static files served correctly
- [ ] API routes accessible
- [ ] Error logging configured
- [ ] CORS configured if needed
- [ ] Compression enabled (gzip)
- [ ] Cache headers set appropriately
