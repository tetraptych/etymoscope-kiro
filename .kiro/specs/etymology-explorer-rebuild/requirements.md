# Requirements Document

## Introduction

This document specifies the requirements for rebuilding the Etymology Explorer web application. The application visualizes word etymology relationships as an interactive graph, allowing users to explore how words are etymologically connected. The rebuild focuses on improving graph layout quality and readability, particularly when displaying large numbers of nodes, while maintaining the successful UI/UX elements from the legacy implementation.

## Glossary

- **System**: The Etymology Explorer web application
- **User**: A person interacting with the web application through a browser
- **Graph**: A visual representation of nodes (words) and edges (relationships) displayed on the canvas
- **Node**: A visual element representing a word in the graph
- **Edge**: A visual connection line between two related words
- **Root Node**: The word that the user searched for, displayed at depth 0
- **Depth**: The number of relationship hops from the root node (0 = root, 1 = directly related, etc.)
- **Canvas**: The main visualization area where the graph is rendered
- **Side Panel**: A UI panel displaying detailed information about a selected word
- **Hub Node**: A node with a large number of children (≥80) whose children are not displayed to prevent clutter
- **Max Depth**: The maximum depth level to fetch and display (currently 3)

## Requirements

### Requirement 1: Word Search and Visualization

**User Story:** As a user, I want to search for a word and see its etymology graph, so that I can understand how it relates to other words.

#### Acceptance Criteria

1. WHEN the User enters a word in the search input and submits, THE System SHALL fetch the etymology data for that word at max depth
2. WHEN the etymology data is successfully retrieved, THE System SHALL display a graph with the searched word as the root node
3. IF the searched word does not exist in the etymology database, THEN THE System SHALL display a "word not found" message
4. WHEN the User submits a search, THE System SHALL add the searched word to the recent searches list
5. THE System SHALL display the graph using d3-force simulation with radial force constraints based on node depth

### Requirement 2: Graph Layout and Readability

**User Story:** As a user, I want the graph to be readable even with many nodes, so that I can understand the relationships without visual clutter.

#### Acceptance Criteria

1. THE System SHALL use d3-force simulation to position nodes organically without manual angle calculations
2. THE System SHALL apply radial force to constrain nodes to circular regions based on their depth from the root node
3. THE System SHALL apply collision detection to prevent node overlap
4. WHEN a node at depth ≥ 1 has 80 or more children, THE System SHALL not display those children nodes
5. THE System SHALL render edges with curved paths to improve visual clarity
6. THE System SHALL reduce edge opacity as depth increases to emphasize closer relationships

### Requirement 3: Depth Control

**User Story:** As a user, I want to control how many levels of relationships are displayed, so that I can focus on immediate connections or explore broader networks.

#### Acceptance Criteria

1. THE System SHALL provide a depth control slider with values from 1 to 3
2. WHEN the User changes the depth value, THE System SHALL filter the displayed nodes and edges to show only those within the selected depth
3. THE System SHALL fetch etymology data at max depth (3) regardless of the current depth setting
4. THE System SHALL apply client-side filtering when the User adjusts the depth control

### Requirement 4: Node Interaction and Details

**User Story:** As a user, I want to click on nodes to see detailed information, so that I can learn more about specific words.

#### Acceptance Criteria

1. WHEN the User clicks a node, THE System SHALL display the word's definition in the side panel
2. WHEN the User clicks a node, THE System SHALL display the list of related words in the side panel
3. WHEN the User clicks a different node while the side panel is open, THE System SHALL update the panel content with the new node's information
4. THE System SHALL provide an "Explore this word" action in the side panel that makes the selected word the new root node
5. THE System SHALL keep node positions fixed (non-draggable by users)

### Requirement 11: Interactive Hover Highlighting

**User Story:** As a user, I want to see which nodes are connected when I hover over a node, so that I can understand the immediate relationships without clicking.

#### Acceptance Criteria

1. WHEN the User hovers over a node, THE System SHALL highlight that node with a glow effect
2. WHEN the User hovers over a node, THE System SHALL highlight all directly connected neighbor nodes
3. WHEN the User hovers over a node, THE System SHALL dim all nodes that are not the hovered node or its neighbors to 30% opacity
4. WHEN the User hovers over a node, THE System SHALL dim node labels that are not highlighted to 25% opacity
5. WHEN the User hovers over a node, THE System SHALL subtly highlight edges connected to the hovered node by increasing opacity by 0.15
6. WHEN the User hovers over a node, THE System SHALL subtly highlight edges between highlighted nodes by increasing opacity by 0.15
7. WHEN the User hovers over a node, THE System SHALL subtly dim edges not connected to the hovered node by reducing opacity to 60% of base opacity
8. WHEN the User moves the mouse away from a node, THE System SHALL restore all nodes and edges to their normal appearance
9. THE System SHALL apply smooth transitions of 150 milliseconds to opacity changes during hover interactions

### Requirement 5: Visual Hierarchy

**User Story:** As a user, I want to easily distinguish between depth levels, so that I can understand how far each word is from my search term.

#### Acceptance Criteria

1. THE System SHALL visually differentiate nodes by depth using color gradients
2. THE System SHALL render the root node larger than other nodes
3. THE System SHALL render node labels as always visible text
4. THE System SHALL use the same visual styling approach as the legacy implementation for depth differentiation
5. THE System SHALL render edges with decreasing visual weight as depth increases

### Requirement 6: Recent Searches

**User Story:** As a user, I want to access my recent searches quickly, so that I can revisit words I've explored before.

#### Acceptance Criteria

1. THE System SHALL maintain a list of recently searched words
2. THE System SHALL display recent searches in the search interface
3. WHEN the User clicks a recent search item, THE System SHALL execute a search for that word
4. THE System SHALL allow the User to remove individual items from the recent searches list
5. WHEN the application loads with no search history, THE System SHALL display example words as initial recent searches

### Requirement 7: Theme Support

**User Story:** As a user, I want to switch between dark and light themes, so that I can use the application comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE System SHALL provide a theme toggle control in the header
2. THE System SHALL default to dark mode on initial load
3. WHEN the User toggles the theme, THE System SHALL update all UI elements to match the selected theme
4. THE System SHALL persist the User's theme preference across sessions
5. THE System SHALL apply theme-appropriate colors to graph nodes, edges, and labels

### Requirement 8: Initial Application State

**User Story:** As a user, I want clear guidance when I first open the application, so that I know how to begin exploring.

#### Acceptance Criteria

1. WHEN the application loads without a search query, THE System SHALL display an empty state with a search prompt
2. THE System SHALL display example words in the recent searches area that users can click to begin exploring
3. THE System SHALL not display the graph canvas or side panel until a search is performed
4. WHEN the User clicks an example word, THE System SHALL execute a search for that word

### Requirement 9: Non-Tree Graph Support

**User Story:** As a user, I want to see all relationships between words, so that I can understand complex interconnections.

#### Acceptance Criteria

1. THE System SHALL support graph structures where nodes can have multiple parent connections
2. THE System SHALL render all edges between related words within the displayed depth
3. THE System SHALL not assume a strict tree hierarchy when calculating layout or rendering
4. WHEN multiple edges connect to the same node, THE System SHALL render all connections visibly

### Requirement 10: Performance and Data Loading

**User Story:** As a user, I want the application to load quickly and respond smoothly, so that I can explore without delays.

#### Acceptance Criteria

1. THE System SHALL load etymology data from a JSON file on server startup
2. WHEN the User submits a search, THE System SHALL respond within 2 seconds under normal conditions
3. THE System SHALL display a loading indicator while fetching etymology data
4. THE System SHALL handle missing or malformed data gracefully without crashing
5. THE System SHALL use the same monorepo structure with client, server, and shared folders as the legacy implementation
