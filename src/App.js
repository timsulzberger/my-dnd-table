import React, { useState } from 'react';
// Import necessary hooks and components from @dnd-kit/core
import {
  DndContext, // The main context provider for drag and drop
  DragOverlay, // Component to render a visual representation of the dragged item
  useSensor, // Hook to create and manage sensors (input methods for dragging)
  useSensors, // Hook to combine multiple sensors
  PointerSensor, // Sensor that responds to pointer events (mouse, touch)
  KeyboardSensor, // Sensor that responds to keyboard events
  // Import collision detection strategies
  closestCenter, // Collision detection algorithm: finds the closest droppable center
  useDroppable, // Hook to make an element a droppable zone
} from '@dnd-kit/core';
// Import necessary hooks and utilities from @dnd-kit/sortable
import {
  SortableContext, // Context provider for sortable lists
  verticalListSortingStrategy, // Sorting strategy for vertical lists
  useSortable, // Hook to make an element sortable
  arrayMove, // Utility function to move an item within an array
} from '@dnd-kit/sortable';
// Import CSS utility for applying transforms
import { CSS } from '@dnd-kit/utilities';

// Import the new Sidebar component
import Sidebar from './Sidebar';
// Import the AppBar component
import AppBar from './AppBar';


// Remove the old CSS import - styling is now handled by Tailwind classes
// import './App.css';

// Define the possible positions/zones using an object for clarity and reusability
const POSITIONS = {
    DRUMMER: 'drummer',
    SWEEP: 'sweep',
    UNASSIGNED: 'unassigned',
    BENCH: 'bench', // Prefix for bench positions (e.g., 'bench-1-left') - Renamed from ROW
};

// Define the possible preference options
const PREFERENCE_OPTIONS = ['Null', 'Left', 'Right', 'Either', 'Sweep', 'Drummer'];


// Helper function to generate unique IDs for bench positions - Updated to use 'bench'
const generateBenchPositionId = (row, side) => `${POSITIONS.BENCH}-${row}-${side}`;

// Initial data for the tiles
// Creates an array of 22 tile objects with unique IDs and initial positions
const initialTiles = Array.from({ length: 22 }, (v, k) => {
  const tileId = `tile-${k}`; // Generates a unique ID for each tile
  let positionId; // Variable to store the initial position ID

  // Assign initial positions based on the tile index (k)
  if (k === 0) {
      positionId = POSITIONS.DRUMMER; // Assigns the first tile to the Drummer position
  } else if (k === 1) {
      // Assigns the second tile to the Sweep position
      positionId = POSITIONS.SWEEP;
  }
  else {
      // Assigns the remaining tiles to the left/right bench positions - Updated to use generateBenchPositionId
      const adjustedIndex = k - 2; // Adjusts the index to start from 0 for row calculations
      const row = Math.floor(adjustedIndex / 2) + 1; // Calculates the row number (1-based)
      const side = adjustedIndex % 2 === 0 ? 'left' : 'right'; // Determines if it's a left or right side position
      positionId = generateBenchPositionId(row, side); // Generates the specific bench position ID
  }

  return {
    id: tileId,
    // Removed original content field as it's no longer displayed
    // content: `Tile ${k + 1}`, // Content displayed on the tile
    preference: 'Null', // Added preference field, initially 'Null'
    positionId: positionId, // Stores the tile's current position ID
    paddlerName: `Person ${k + 1}`, // Default paddler name
  };
});


// Component for a single draggable tile
function SortableItem({ id, paddlerName, preference, currentPositionId, currentIndex, onPaddlerNameChange, onPreferenceChange }) {
  // useSortable hook provides properties and methods for making the item sortable
  const {
    attributes, // HTML attributes needed for accessibility and drag/drop
    listeners, // Event listeners for drag interactions
    setNodeRef, // Ref to connect the DOM node to the dnd-kit system
    transform, // CSS transform object for positioning during drag
    transition, // CSS transition string for smooth movement
    isDragging, // Boolean indicating if the item is currently being dragged
    isOver, // Boolean indicating if the item is being hovered over
    over, // The item being hovered over
  } = useSortable({
      id, // The unique ID of the sortable item
      // Data associated with the item, accessible during drag events
      data: {
          type: 'tile',
          currentPositionId: currentPositionId, // Store the tile's current position ID
      }
  });

  // Tailwind classes for styling the tile
  // baseClasses: Common styles for all tiles (padding, rounded corners, cursor, flex layout, transition, solid black border, touch-action-none)
  // Reduced padding for tighter tiles
  // Added touch-action-none to prevent default browser touch behaviors (scrolling, zooming) during drag
  const baseClasses = `p-1 rounded-md select-none cursor-grab flex flex-col transition-all duration-200 ease-in-out border border-black touch-action-none`;
  
  // State-based classes
  const stateClasses = [
    // Dragging state
    isDragging ? 'opacity-50 bg-gray-200 border-black shadow-lg' : 'opacity-100 bg-white shadow-sm',
    // Hover state (when dragged over a valid drop target)
    isOver && over?.id !== id ? 'ring-2 ring-green-500' : '',
  ].join(' ');

  // positionSpecificClasses: Styles that vary based on the tile's current position (margin, width, text alignment)
  // Adjusted width and margin for different positions
  const positionSpecificClasses = currentPositionId === POSITIONS.UNASSIGNED ? 'mb-1 w-full max-w-[120px] mx-auto text-left text-xs' // Styles for tiles in the Unassigned column - Smaller max-w and font
                                : (currentPositionId === POSITIONS.DRUMMER || currentPositionId === POSITIONS.SWEEP ? 'mb-0 w-full max-w-[calc(100%-16px)] mx-auto text-center text-sm' // Styles for tiles in Drummer or Sweep (single-tile zones) - Slightly smaller font
                                : 'mb-1 text-left w-full text-sm'); // Styles for tiles in the row grid positions - Slightly smaller font

  // Inline style object for applying transform and transition provided by useSortable
  const style = {
    transform: CSS.Transform.toString(transform), // Applies the CSS transform for positioning
    transition, // Applies the CSS transition for smooth animation
    // Add orange shadow when dragging
    ...(isDragging && {
      boxShadow: '0 0 0 2px rgba(249, 115, 22, 0.5)', // Orange-500 with 50% opacity
    }),
  };

  // Prevents the drag interaction from starting when interacting with the input field or select dropdown
  const handleInputMouseDown = (event) => {
      event.stopPropagation(); // Stops the event from bubbling up to the draggable div
  };

  // Determines the header text displayed on the tile based on its position ID - Updated for Bench naming
  let headerText = currentPositionId; // Default header is the position ID

  if (currentPositionId === POSITIONS.DRUMMER) {
      headerText = 'Drummer';
  } else if (currentPositionId === POSITIONS.SWEEP) {
      headerText = 'Sweep';
  } else if (currentPositionId.startsWith(POSITIONS.BENCH)) { // Check for BENCH prefix
      // Parses row and side from the bench position ID to create a user-friendly header
      const [, row, side] = currentPositionId.split('-');
      headerText = `Bench ${row} - ${side.charAt(0).toUpperCase() + side.slice(1)}`; // Display "Bench X - Side"
  } else if (currentPositionId === POSITIONS.UNASSIGNED) {
       // For unassigned, we can display the index within the unassigned list
       headerText = `Unassigned Index: ${currentIndex}`; // Uses the currentIndex prop passed from the parent
  }

  // Extract the tile number from the id (e.g., "tile-0" -> 1, "tile-21" -> 22)
  // This value is kept for potential backend use but not displayed in the GUI
  // const tileNumber = id.split('-')[1] ? parseInt(id.split('-')[1]) + 1 : null;


  return (
    // The main div for the sortable item, connected to dnd-kit via setNodeRef
    <div
      ref={setNodeRef}
      style={style} // Apply the transform and transition styles
      {...attributes} // Apply accessibility and drag attributes
      {...listeners} // Apply drag event listeners
      className={`${baseClasses} ${stateClasses} ${positionSpecificClasses} relative`} // Add relative positioning for absolute positioning of the tile number
    >
      {/* Container for main content, using flex-col for vertical stacking */}
      <div className="flex flex-col flex-grow"> {/* flex-grow allows this section to take up space */}
          {/* Display the formatted header */}
          {/* Hide header for unassigned tiles */}
          {currentPositionId !== POSITIONS.UNASSIGNED && (
              <div className="font-semibold mb-1 text-gray-700 text-xs">{headerText}</div> // Smaller font for header
          )}

          {/* Paddler Name Input - Using flexbox for label and input on same line */}
          {/* Adjusted spacing and width handling */}
          <div className="mt-0.5 mb-0.5 flex items-center" onMouseDown={handleInputMouseDown}> {/* Added flex and items-center */}
            <label htmlFor={`paddler-${id}`} className="block text-xs text-gray-600 mr-1 shrink-0">Name:</label> {/* Added mr-1 for spacing, shrink-0 to prevent label shrinking */}
            <input
              id={`paddler-${id}`} // Unique ID for the input, linked to the label
              type="text"
              value={paddlerName} // Controlled input value
              onChange={(e) => onPaddlerNameChange(id, e.target.value)} // Call parent handler on change
              // Removed flex-grow, added w-auto and min-w-0 for better flex behavior, removed focus outline
              className="p-0.5 rounded border border-gray-300 text-xs text-gray-800 w-auto min-w-0 outline-none" // Removed flex-grow, added w-auto min-w-0, outline-none
            />
          </div>

          {/* Preference Dropdown - Using flexbox for label and select on same line */}
          {/* Adjusted spacing and width handling */}
          <div className="mt-0.5 mb-0.5 flex items-center" onMouseDown={handleInputMouseDown}> {/* Added flex and items-center */}
            <label htmlFor={`preference-${id}`} className="block text-xs text-gray-600 mr-1 shrink-0">Preference:</label> {/* Label for the preference field, added mr-1, shrink-0 */}
            <select
              id={`preference-${id}`} // Unique ID for the dropdown
              value={preference} // Controlled dropdown value
              onChange={(e) => onPreferenceChange(id, e.target.value)} // Call parent handler on change
              // Removed flex-grow, added w-auto and min-w-0 for better flex behavior, removed focus outline
              className="p-0.5 rounded border border-gray-300 text-xs text-gray-800 w-auto min-w-0 outline-none" // Removed flex-grow, added w-auto min-w-0, outline-none
            >
                {/* Map over the preference options to create dropdown options */}
                {PREFERENCE_OPTIONS.map(option => (
                    <option key={option} value={option}>{option}</option>
                ))}
            </select>
          </div>

          {/* Hide original content and note for unassigned tiles */}
          {currentPositionId !== POSITIONS.UNASSIGNED && (
              <>
                  <div className="text-gray-800 text-xs">{/*content*/}</div> {/* Smaller content font */}
                  <div className="text-gray-600 text-[8pt]">{/*note*/}</div> {/* Even smaller note font */}
              </>
          )}

      </div>

      {/* Removed the div that displayed the Tile ID */}
    </div>
  );
}

// Component for a single droppable zone (can hold one tile)
function DroppableZone({ children, id, label, activeDroppableId, occupiedTileId }) {
  // useDroppable hook makes the element a droppable target
  const { setNodeRef, isOver } = useDroppable({ 
    id, // The unique ID of the droppable zone
    data: {
      type: 'droppable-zone',
      accepts: ['tile'],
      occupied: !!occupiedTileId
    }
  });

  // Determine if this zone is the active drop target
  const isActiveDropTarget = activeDroppableId === id;

  // Tailwind classes for styling the droppable zone
  const baseClasses = `p-0.5 m-0.5 rounded-md flex flex-col items-center justify-center transition-all duration-200 ease-in-out border-2`;
  
  // State-based classes
  const stateClasses = [
    // Base state
    'min-h-[60px] min-w-[120px]',
    // Background color based on state
    occupiedTileId ? 'bg-white' : 'bg-gray-50',
    // Border style based on state
    occupiedTileId ? 'border-solid border-gray-200' : 'border-dashed border-gray-300',
    // Hover state (when not dragging)
    isOver && !occupiedTileId ? 'bg-gray-100' : '',
    // When this zone is the active drop target
    isActiveDropTarget ? 'border-green-500 bg-green-50 shadow-inner' : '',
  ].filter(Boolean).join(' ');

  return (
    // The main div for the droppable zone, connected to dnd-kit via setNodeRef
    <div
      ref={setNodeRef}
      className={`${baseClasses} ${stateClasses} h-full`} // Combine all Tailwind classes, added h-full
    >
      {/* Show the label if the zone is empty */}
      <div className="text-gray-600 text-xs">{label}</div>
      {children}
    </div>
  );
}

// Component for the Unassigned column (which is a sortable list and a droppable zone)
function UnassignedColumn({ children, id, title, tileIds, selectedFilterPreferences = [], onFilterChange = () => {}, activeDroppableId }) {
    const [isFilterActive, setIsFilterActive] = useState(false);
    
    const toggleFilter = () => {
        const newState = !isFilterActive;
        setIsFilterActive(newState);
        if (!newState) {
            // When turning filter off, clear all filters
            onFilterChange([]);
        }
    };
    // useDroppable hook makes the element a droppable target
    const { setNodeRef, isOver } = useDroppable({
        id: id,
        data: { 
            type: 'column',
            accepts: ['tile']
        },
    });

    // Determine if this column is the active drop target
    const isActiveDropTarget = activeDroppableId === id;

    // Tailwind classes for styling the Unassigned column
    const baseClasses = `flex flex-col p-4 border-2 rounded-lg min-h-[400px] max-h-[90vh] overflow-y-auto transition-colors duration-200 ease-in-out`;
    
    // State-based classes
    const stateClasses = [
        // Base border style
        tileIds.length > 0 ? 'border-solid border-gray-200' : 'border-dashed border-gray-300',
        // Background color based on state
        isActiveDropTarget ? 'bg-green-50 border-green-500' : isOver ? 'bg-gray-50' : 'bg-white',
    ].filter(Boolean).join(' ');

    return (
        <div ref={setNodeRef} className={`${baseClasses} ${stateClasses}`}>
            <div className="mb-2 w-full">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <button 
                        onClick={toggleFilter}
                        className="text-gray-600 hover:text-gray-800 transition-colors p-1"
                        aria-label={isFilterActive ? 'Hide filter' : 'Show filter'}
                        title={isFilterActive ? 'Hide filter' : 'Show filter'}
                    >
                        <span className="material-icons" style={{ fontSize: '20px' }}>
                            {isFilterActive ? 'filter_list' : 'filter_list_off'}
                        </span>
                    </button>
                </div>
                {isFilterActive && (
                    <div className="w-full flex items-center gap-1 mb-2">
                        <select
                            multiple
                            value={selectedFilterPreferences}
                            onChange={(e) => {
                                const selectedValues = Array.from(e.target.selectedOptions, option => option.value);
                                onFilterChange(selectedValues);
                            }}
                            className="flex-1 text-xs p-0.5 border rounded"
                            style={{ fontSize: '8px' }}
                            aria-label="Filter options"
                        >
                            <option value="">Show All</option>
                            <option value="Left">Left</option>
                            <option value="Right">Right</option>
                            <option value="Either">Either</option>
                            <option value="Sweep">Sweep</option>
                            <option value="Drummer">Drummer</option>
                        </select>
                    </div>
                )}
            </div>

            <div className="flex-grow flex flex-col items-center justify-center h-full">
                <SortableContext items={tileIds} strategy={verticalListSortingStrategy}>
                    {children}
                </SortableContext>
            </div>
        </div>
    );
}




// The main App component
function App() {
  // Custom collision detection strategy
  const customCollisionDetection = (args) => {
    // Get all droppable containers
    const containers = args.droppableContainers || [];
    const pointer = args.pointer || { x: 0, y: 0 };
    let isOverUnassigned = false;
    
    // Check for collisions with any droppable container
    const collisions = containers.map(container => {
      try {
        if (!container?.rect) return null;
        
        const rect = container.rect.current || container.rect;
        const containerRect = {
          left: rect.left || 0,
          top: rect.top || 0,
          right: (rect.left || 0) + (rect.width || 0),
          bottom: (rect.top || 0) + (rect.height || 0)
        };
        
        // For the Unassigned column, use a more lenient collision detection
        const isUnassignedColumn = container.id === POSITIONS.UNASSIGNED;
        
        // Check if pointer is within container bounds with optional padding
        let isWithinBounds = false;
        
        if (isUnassignedColumn) {
          // For Unassigned column, use the full width with some padding
          const padding = 40; // Increased padding for better hit area
          isWithinBounds = 
            pointer.x >= (containerRect.left - padding) && 
            pointer.x <= (containerRect.right + padding) &&
            pointer.y >= (containerRect.top - padding) &&
            pointer.y <= (containerRect.bottom + padding);
          
          if (isWithinBounds) {
            isOverUnassigned = true;
          }
        } else {
          // For other containers, use exact bounds
          isWithinBounds = 
            pointer.x >= containerRect.left && 
            pointer.x <= containerRect.right &&
            pointer.y >= containerRect.top &&
            pointer.y <= containerRect.bottom;
        }
        
        if (isWithinBounds) {
          // Calculate relative position (0-1)
          const relativeY = (pointer.y - containerRect.top) / (containerRect.bottom - containerRect.top);
          
          // Determine drop position (top, middle, bottom)
          let position = 'middle';
          if (relativeY < 0.33) position = 'top';
          else if (relativeY > 0.66) position = 'bottom';
          
          // Store in container's data
          container.data = container.data || { current: {} };
          container.data.current = {
            ...container.data.current,
            dropPosition: { position, relativeY },
            isUnassignedColumn // Store if this is the unassigned column
          };
          
          return [container];
        }
        return null;
      } catch (error) {
        console.error('Error in collision detection for container:', container, error);
        return null;
      }
    }).filter(Boolean);
    
    // Update the active droppable ID based on collision detection
    if (isOverUnassigned) {
      setActiveDroppableId(POSITIONS.UNASSIGNED);
    }
    
    // Return first collision or fall back to closestCenter
    return collisions.flat().length > 0 ? collisions.flat() : closestCenter(args);
  };
  // State to hold the array of all tiles
  const [tiles, setTiles] = useState(initialTiles);
  // State to hold the structure of columns/positions and the IDs of tiles within them
  const [columns, setColumns] = useState({});
  // State to manage the expanded/collapsed state of the sidebar
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false); // Initially collapsed
  // State to hold the current section name for the AppBar
  // eslint-disable-next-line no-unused-vars
  const [currentSection, setCurrentSection] = useState('Boat Layout'); // Default section name - setCurrentSection is currently unused, but kept for future navigation features
  // State to hold the selected filter preferences for the unassigned column (array for multi-select)
  const [selectedFilterPreferences, setSelectedFilterPreferences] = useState([]); // Initialize with an empty array


  // Effect hook to populate the columns state based on the initialTiles data
  // Runs only once on component mount (empty dependency array [])
  useState(() => {
      // Define the initial structure of columns/positions
      const initialColumns = {
          [POSITIONS.UNASSIGNED]: { id: POSITIONS.UNASSIGNED, title: 'Unassigned', tileIds: [] },
          [POSITIONS.DRUMMER]: { id: POSITIONS.DRUMMER, title: 'Drummer', tileIds: [] },
          [POSITIONS.SWEEP]: { id: POSITIONS.SWEEP, title: 'Sweep', tileIds: [] },
          // Dynamically generate entries for each bench position (e.g., 'bench-1-left', 'bench-1-right') - Updated to use generateBenchPositionId
          ...Array.from({ length: 10 }).reduce((acc, _, rowIndex) => {
              acc[generateBenchPositionId(rowIndex + 1, 'left')] = { id: generateBenchPositionId(rowIndex + 1, 'left'), title: `Bench ${rowIndex + 1} Left`, tileIds: [] }; // Updated title
              acc[generateBenchPositionId(rowIndex + 1, 'right')] = { id: generateBenchPositionId(rowIndex + 1, 'right'), title: `Bench ${rowIndex + 1} Right`, tileIds: [] }; // Updated title
              return acc;
          }, {}),
      };

      // Distribute initial tiles into the correct positionIds within the initialColumns structure
      initialTiles.forEach(tile => {
          if (initialColumns[tile.positionId]) { // Check if the tile's initial position ID exists as a column
              initialColumns[tile.positionId].tileIds.push(tile.id); // Add the tile ID to the corresponding column's tileIds array
          } else {
              // If a tile has an invalid or unknown positionId, place it in the Unassigned column
              initialColumns[POSITIONS.UNASSIGNED].tileIds.push(tile.id);
          }
      });

      setColumns(initialColumns); // Set the initial columns state
  }, []); // Empty dependency array ensures this runs only once on mount


  // State to track the ID of the item currently being dragged (for the DragOverlay)
  const [activeId, setActiveId] = useState(null);

  // Configure sensors for activating drag (PointerSensor for mouse/touch, KeyboardSensor for keyboard)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Drag starts after the pointer moves 8px (increased from 5 for better touch handling)
      },
    }),
    useSensor(KeyboardSensor, {}) // Enables keyboard dragging
  );

  // State to track which droppable is being hovered over
  const [activeDroppableId, setActiveDroppableId] = useState(null);

  // Helper function to find a tile object by its ID
  const getTileById = (id) => tiles.find(tile => tile.id === id);

  // Handler for changes to the Paddler Name input field
  const handlePaddlerNameChange = (tileId, newName) => {
    // Updates the tiles state by mapping over the existing tiles
    setTiles(prevTiles =>
      prevTiles.map(tile =>
        // If the tile ID matches, update its paddlerName; otherwise, return the tile unchanged
        tile.id === tileId ? { ...tile, paddlerName: newName } : tile
      )
    );
  };

  // Handler for changes to the Preference input field (now a dropdown)
  const handlePreferenceChange = (tileId, newPreference) => {
      setTiles(prevTiles =>
          prevTiles.map(tile =>
              tile.id === tileId ? { ...tile, preference: newPreference } : tile
          )
      );
  };

  // Handler for when a drag operation starts
  const onDragStart = (event) => {
    setActiveId(event.active.id); // Set the activeId to the ID of the dragged item
  };

  // Handler for when a drag operation ends
  const onDragEnd = (result) => {
    const { active, over } = result; // Destructure active (dragged item) and over (item/container being hovered over)

    setActiveId(null); // Clear the activeId as the drag has ended
    setActiveDroppableId(null); // Clear the active droppable ID

    // Log the active and over objects for debugging purposes
    console.log("Drag ended. Active:", active);
    console.log("Drag ended. Over:", over);

    // Dropped outside a droppable area or over the same item
    if (!over || active.id === over.id) {
      console.log(!over ? "Dropped outside any droppable area." : "Dropped onto the same item.");
      return; // Exit the function as no state change is needed
    }

    const draggedTileId = active.id; // Get the ID of the dragged tile
    const sourcePositionId = active.data.current?.currentPositionId; // Get the original position ID from the active item's data
    const overId = over.id; // Get the ID of the element being dragged over

    console.log("Dragged Tile ID:", draggedTileId);
    console.log("Source Position ID:", sourcePositionId);
    console.log("Over ID:", overId); // Log the overId for debugging

    // --- Debugging specific to Drummer/Sweep to Unassigned ---
    console.log(`--- Drag from ${sourcePositionId} to ${overId} ---`);
    console.log(`Is overId a known column? ${!!columns[overId]}`);
    console.log(`Is overId a tile in Unassigned? ${!!tiles.find(tile => tile.id === overId && tile.positionId === POSITIONS.UNASSIGNED)}`);
    // --- End Debugging specific to Drummer/Sweep to Unassigned ---

    // Find the tile that was dragged
    const draggedTile = tiles.find(tile => tile.id === draggedTileId);
    if (!draggedTile) {
        console.error("Dragged tile not found.");
        return; // Exit if the dragged tile cannot be found (shouldn't happen in normal operation)
    }

    // Find the tile being hovered over (if the overId is a tile ID)
    const overTile = tiles.find(tile => tile.id === overId);

    // Determine the actual destination column ID
    let destinationColumnId = null;
    let droppedOverTileInUnassigned = null; // To store the tile being dropped over in unassigned
    let dropPosition = over.data.current?.dropPosition; // Get the drop position data

    if (columns[overId]) {
        // Scenario 1: The item is dropped directly onto a droppable zone (e.g., 'drummer', 'bench-1-left', or the 'unassigned' container itself)
        destinationColumnId = overId;
        console.log(`Drop scenario 1: Dropped onto zone ID '${overId}'. Destination is '${destinationColumnId}'.`);
        
        // If this is the Unassigned column, use the drop position
        if (destinationColumnId === POSITIONS.UNASSIGNED) {
            console.log(`Drop position: ${dropPosition?.position || 'unknown'}`);
            // Adjust the drop position based on where in the container it was dropped
            if (dropPosition?.position === 'top') {
                console.log('Dropping at top of list');
            } else if (dropPosition?.position === 'bottom') {
                console.log('Dropping at bottom of list');
            } else {
                console.log('Dropping in middle of list');
            }
        }
    } else if (overTile) {
        // Scenario 2: The item is dropped onto another tile.
        // The destination column is the positionId of the tile being dropped on.
        destinationColumnId = overTile.positionId;
        console.log(`Drop scenario 2: Dropped onto tile '${overTile.id}' which is in position '${overTile.positionId}'. Destination is '${destinationColumnId}'.`);
        if (destinationColumnId === POSITIONS.UNASSIGNED) {
            droppedOverTileInUnassigned = overTile; // This is for sorting within the Unassigned column
        }
    } else {
        // Scenario 3: The drop target is neither a recognized zone ID nor a tile ID.
        console.error(`Invalid drop target: overId '${overId}' is not a known zone or tile.`);
        return; // Exit if the drop target is invalid
    }

    // If we couldn't determine a valid destination column or source column, or if the destination isn't a valid column key, log an error and return.
    if (!destinationColumnId || !columns[destinationColumnId] || !columns[sourcePositionId]) {
         console.error("Invalid drag operation: Could not determine valid source or final destination position, or destination is not a valid column key.");
         console.log("Source Position ID:", sourcePositionId);
         console.log("Determined Destination Column ID:", destinationColumnId);
         console.log("Is destinationColumnId a key in columns?", !!columns[destinationColumnId]);
         console.log("Columns state:", columns);
         return;
    }

    const destinationColumn = columns[destinationColumnId]; // Get the destination column object
    const destinationTileIds = Array.from(destinationColumn.tileIds); // Get the current tile IDs in the destination column


    // ** Logic for dropping onto a single-tile zone (Drummer, Sweep, or Bench Position) ** - Updated comment
    // These zones should only hold one tile at a time (except Unassigned)
    const isSingleTileDestination = destinationColumnId !== POSITIONS.UNASSIGNED;

    if (isSingleTileDestination) {
        // Check if the destination zone is already occupied
        if (destinationTileIds.length > 0) {
            console.log(`Destination ${destinationColumnId} is occupied. Moving original tile to Unassigned.`);

            const originalTileId = destinationTileIds[0]; // Get the ID of the tile currently in the destination

            // Calculate the next state for columns and tiles
            const nextColumns = { ...columns };
            const nextTiles = [...tiles];

            // Remove dragged tile from source column
            nextColumns[sourcePositionId] = {
                ...columns[sourcePositionId],
                tileIds: columns[sourcePositionId].tileIds.filter(id => id !== draggedTileId),
            };

            // Add original tile to unassigned column (at the end)
            nextColumns[POSITIONS.UNASSIGNED] = {
                ...columns[POSITIONS.UNASSIGNED],
                tileIds: [...columns[POSITIONS.UNASSIGNED].tileIds, originalTileId],
            };

            // Place dragged tile in destination column (it's a single-tile zone, so replace content)
            nextColumns[destinationColumnId] = {
                ...columns[destinationColumnId],
                tileIds: [draggedTileId], // Destination now contains only the dragged tile
            };

            // Update the positionId for the dragged tile in the nextTiles state
            const draggedTile = nextTiles.find(tile => tile.id === draggedTileId);
            if (draggedTile) {
                draggedTile.positionId = destinationColumnId; // Set the new position ID
            }

            // Update the positionId for the original tile that was moved to Unassigned
            const originalTile = nextTiles.find(tile => tile.id === originalTileId);
            if (originalTile) {
                originalTile.positionId = POSITIONS.UNASSIGNED; // Set the new position ID
            }

            // Update state with the new columns and tiles data
            setColumns(nextColumns);
            setTiles(nextTiles);


        } else {
             // Destination is a single-tile zone and is empty
             console.log(`Destination ${destinationColumnId} is empty. Placing dragged tile.`);

             // Calculate the next state for columns and tiles
             const nextColumns = { ...columns };
             const nextTiles = [...tiles];

             // Remove dragged tile from source column
             nextColumns[sourcePositionId] = {
                 ...columns[sourcePositionId],
                 tileIds: columns[sourcePositionId].tileIds.filter(id => id !== draggedTileId),
             };

             // Place dragged tile in destination column (it's empty, so just add it)
             nextColumns[destinationColumnId] = {
                 ...columns[destinationColumnId],
                 tileIds: [draggedTileId], // Destination now contains only the dragged tile
             };

             // Update the positionId for the dragged tile
             const draggedTile = nextTiles.find(tile => tile.id === draggedTileId);
             if (draggedTile) {
                 draggedTile.positionId = destinationColumnId; // Set the new position ID
             }

             // Update state with the new columns and tiles data
             setColumns(nextColumns);
             setTiles(nextTiles);
        }


    } else {
        // ** Logic for dropping into the Unassigned column (which is a sortable list) **
        // This block handles drags that started from the Unassigned column OR were redirected to Unassigned
        console.log("Dropped into Unassigned column.");

        // Get the current tile IDs for the unassigned column
        const currentUnassignedTileIds = Array.from(columns[POSITIONS.UNASSIGNED]?.tileIds || []);

        // Determine the drop index within the unassigned list
        let dropIndexInUnassigned = currentUnassignedTileIds.length; // Default to end if dropped on container

        if (droppedOverTileInUnassigned) {
             // Dropped over a specific tile within the unassigned list
             dropIndexInUnassigned = currentUnassignedTileIds.indexOf(droppedOverTileInUnassigned.id);
             // Adjust index if moving within unassigned and dropping below original position
             if (sourcePositionId === POSITIONS.UNASSIGNED && currentUnassignedTileIds.indexOf(draggedTileId) !== -1 && dropIndexInUnassigned > currentUnassignedTileIds.indexOf(draggedTileId)) {
                 dropIndexInUnassigned--;
             }
        } else if (overId === POSITIONS.UNASSIGNED) { // Explicitly check if dropped on the Unassigned container
             // Dropped directly onto the Unassigned column container
             dropIndexInUnassigned = currentUnassignedTileIds.length; // Add to the end
        } else {
            // This case should ideally not be reached with the updated logic,
            // but as a fallback, log an error and return.
            console.error("Could not determine valid drop index in Unassigned column.");
            return;
        }


         // Calculate the next state for columns and tiles
         const nextColumns = { ...columns };
         const nextTiles = [...tiles]; // Create a copy of tiles

         // Remove dragged tile from source column (if it's not already unassigned)
         // This check is important for when a tile is moved from another column TO unassigned
         if (sourcePositionId !== POSITIONS.UNASSIGNED) {
             nextColumns[sourcePositionId] = {
                 ...columns[sourcePositionId],
                 tileIds: columns[sourcePositionId].tileIds.filter(id => id !== draggedTileId),
             };

              // Update rows for tiles remaining in the source column after the drag
              const tilesInSource = nextTiles.filter(tile => tile.positionId === sourcePositionId)
                  .sort((a, b) => nextColumns[sourcePositionId].tileIds.indexOf(a.id) - nextColumns[sourcePositionId].tileIds.indexOf(b.id));

              tilesInSource.forEach((tile, index) => {
                  const tileToUpdate = nextTiles.find(t => t.id === tile.id);
                  if(tileToUpdate) tileToUpdate.row = index;
              });
         }


         // Handle adding or moving within the unassigned list
         let newUnassignedTileIds;
         if (sourcePositionId !== POSITIONS.UNASSIGNED) {
             // Adding a tile from another column to Unassigned
             newUnassignedTileIds = Array.from(currentUnassignedTileIds);
             newUnassignedTileIds.splice(dropIndexInUnassigned, 0, draggedTileId); // Insert at the determined index
             
             // Update the positionId for the dragged tile
             const draggedTile = nextTiles.find(tile => tile.id === draggedTileId);
             if (draggedTile) {
                 draggedTile.positionId = POSITIONS.UNASSIGNED;
             }
         } else {
             // Moving within the unassigned column itself
             const oldIndex = currentUnassignedTileIds.indexOf(draggedTileId);
             if (oldIndex !== -1) {
                  newUnassignedTileIds = arrayMove(
                      currentUnassignedTileIds,
                      oldIndex,
                      dropIndexInUnassigned // Move to the determined index
                  );
             } else {
                 // Should not happen if source is unassigned, but as a fallback
                 newUnassignedTileIds = Array.from(currentUnassignedTileIds);
                 
                 // Still update the positionId to be safe
                 const draggedTile = nextTiles.find(tile => tile.id === draggedTileId);
                 if (draggedTile) {
                     draggedTile.positionId = POSITIONS.UNASSIGNED;
                 }
             }
         }

         // Update the Unassigned column's tileIds with the new ordered list
         nextColumns[POSITIONS.UNASSIGNED] = {
             ...columns[POSITIONS.UNASSIGNED],
             tileIds: newUnassignedTileIds,
         };

         // Update the row property for all tiles in the unassigned column based on the new order
          const tilesInUnassigned = nextTiles.filter(tile => tile.positionId === POSITIONS.UNASSIGNED)
               .sort((a, b) => nextColumns[POSITIONS.UNASSIGNED].tileIds.indexOf(a.id) - nextColumns[POSITIONS.UNASSIGNED].tileIds.indexOf(b.id));

           tilesInUnassigned.forEach((tile, index) => {
               const tileToUpdate = nextTiles.find(t => t.id === tile.id);
               if(tileToUpdate) tileToUpdate.row = index;
           });


       // Update state with the new columns and tiles data
       setColumns(nextColumns);
       setTiles(nextTiles);
    }
  };

   // Handler for when a drag operation is cancelled
   const onDragCancel = () => {
    setActiveId(null); // Clear active dragged item if drag is cancelled
   };

   // Handler for the "Unassign All" button click
   const handleUnassignAll = () => {
        console.log("Unassign All button clicked.");

        // Create copies of the current state
        const nextColumns = { ...columns };
        const nextTiles = [...tiles];

        // Get the current tile IDs in the Unassigned column
        const currentUnassignedTileIds = Array.from(nextColumns[POSITIONS.UNASSIGNED]?.tileIds || []);

        // Iterate through all columns (except Unassigned) and move their tiles to Unassigned
        for (const columnId in nextColumns) {
            if (columnId !== POSITIONS.UNASSIGNED) {
                const column = nextColumns[columnId];
                // Move all tile IDs from the current column to the Unassigned column
                currentUnassignedTileIds.push(...column.tileIds);
                // Clear the tile IDs from the current column
                column.tileIds = [];

                // Update the positionId for the tiles that were moved in the nextTiles state
                // Note: This loop was incorrectly using column.tileIds after clearing it.
                // We need to iterate through the tiles array to find and update the positionId.
                nextTiles.forEach(tile => {
                    if (tile.positionId === columnId) { // Check if the tile was in the column being cleared
                        tile.positionId = POSITIONS.UNASSIGNED; // Set the new position ID
                    }
                });
            }
        }

         // Update the Unassigned column's tileIds with the combined list
         nextColumns[POSITIONS.UNASSIGNED] = {
             ...nextColumns[POSITIONS.UNASSIGNED],
             tileIds: currentUnassignedTileIds,
         };

         // Update the row property for all tiles in the unassigned column based on the new order
          const tilesInUnassigned = nextTiles.filter(tile => tile.positionId === POSITIONS.UNASSIGNED)
               .sort((a, b) => nextColumns[POSITIONS.UNASSIGNED].tileIds.indexOf(a.id) - nextColumns[POSITIONS.UNASSIGNED].tileIds.indexOf(b.id));

           tilesInUnassigned.forEach((tile, index) => {
               const tileToUpdate = nextTiles.find(t => t.id === tile.id);
               if(tileToUpdate) tileToUpdate.row = index;
           });


        // Update the state with the new columns and tiles data
        setColumns(nextColumns);
        setTiles(nextTiles);

        console.log("All tiles moved to Unassigned.");
    };

    // Handler to toggle the sidebar expanded state
    const toggleSidebar = () => {
        setIsSidebarExpanded(!isSidebarExpanded);
    };

    // Handler for the Share icon click (placeholder)
    const handleShareClick = () => {
        console.log("Share icon clicked!");
        // Implement your share functionality here later
        alert("Share feature coming soon!"); // Simple alert for now
    };


  // Find the active tile data for the DragOverlay
  const activeTile = activeId ? getTileById(activeId) : null;

  // Filter the unassigned tile IDs based on the selected filter preferences
  const filteredUnassignedTileIds = columns[POSITIONS.UNASSIGNED]?.tileIds.filter(tileId => {
      const tile = getTileById(tileId);
      // If no filter preferences are selected, or "Show All" is selected, show all unassigned tiles
      if (selectedFilterPreferences.length === 0 || selectedFilterPreferences.includes("")) {
          return true;
      }
      // Otherwise, check if the tile's preference is included in the selected filter preferences
      // Convert both to lowercase for case-insensitive comparison
      return tile && tile.preference && selectedFilterPreferences.some(
          pref => tile.preference.toLowerCase() === pref.toLowerCase()
      );
  }) || [];


  return (
    // DndContext provides the drag and drop context to the application
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
      onDragOver={({ over }) => {
        setActiveDroppableId(over?.id || null);
      }}
      autoScroll={{
        interval: 5,
        acceleration: 10,
        intervalStep: 1,
        enabled: true,
      }}
    >
      {/* AppBar component - Fixed at the top */}
      <AppBar
        appName="Dragonboaty" // Replace with your app name
        sectionName={currentSection} // Pass the current section name state
        onShareClick={handleShareClick} // Pass the share click handler
      />

      {/* Main content area below the AppBar */}
      {/* flex min-h-screen: Ensures this area takes at least the full viewport height below the AppBar */}
      {/* mt-16: Adds top margin to push content down, matching AppBar height */}
      <div className="flex min-h-screen mt-16"> {/* flex: enables flexbox, min-h-screen: minimum height, mt-16: margin top */}
          {/* Sidebar component - Positioning is now relative to this flex container */}
          {/* Pass necessary props to the Sidebar */}
          <Sidebar
              isExpanded={isSidebarExpanded} // Pass the expanded state
              toggleSidebar={toggleSidebar} // Pass the toggle function
              handleUnassignAll={handleUnassignAll} // Pass the unassign all function
          />

          {/* Container for the Unassigned column and the main content */}
          {/* This div now holds the Unassigned column and the rest of the layout */}
          {/* Added flex-grow to ensure it takes the remaining space */}
          {/* Reduced p-8 to p-4 and space-x-8 to space-x-4 for tighter layout */}
          <div className="flex flex-grow p-4 space-x-4 items-start"> {/* flex: enables flexbox, flex-grow: allows it to take remaining space, p-4: padding, space-x-4: horizontal space, items-start: align items to top */}
              {/* Container for the Unassigned column */}
              {/* Unassigned column uses the UnassignedColumn component */}
              <UnassignedColumn
                  key={POSITIONS.UNASSIGNED} // Unique key for React list rendering
                  id={POSITIONS.UNASSIGNED} // ID for dnd-kit droppable zone
                  title="Unassigned" // Title displayed at the top of the column
                  tileIds={filteredUnassignedTileIds} // Pass the FILTERED array of tile IDs
                  selectedFilterPreferences={selectedFilterPreferences} // Pass the selected filter preferences
                  onFilterChange={setSelectedFilterPreferences} // Connect to state setter
                  activeDroppableId={activeDroppableId} // Pass the active droppable ID for visual feedback
              >
                  {/* Map over the FILTERED tile IDs in the Unassigned column to render SortableItems */}
                  {filteredUnassignedTileIds.map((tileId, index) => {
                       const tile = getTileById(tileId); // Get the full tile data by ID
                       if (!tile) return null; // Return null if tile data is not found (shouldn't happen)
                       return (
                           // Render a SortableItem for each tile
                           <SortableItem
                               key={tileId} // Unique key for React list rendering
                               id={tileId} // ID for dnd-kit sortable item
                               // Removed content prop
                               preference={tile.preference} // Pass preference prop
                               paddlerName={tile.paddlerName} // Pass paddler name
                               currentPositionId={POSITIONS.UNASSIGNED} // Pass the current position ID
                               currentIndex={index} // Pass index for sorting and header
                               onPaddlerNameChange={handlePaddlerNameChange} // Pass the handler for name changes
                               onPreferenceChange={handlePreferenceChange} // Pass the handler for preference changes
                           />
                       );
                   })}
              </UnassignedColumn>

              {/* New container to group Boat 1 elements */}
              {/* Added border and padding for visual grouping */}
              <div className="boat-container border border-gray-300 rounded-md p-4 flex flex-col space-y-4 flex-grow max-w-lg bg-gray-800"> {/* Added border, rounded corners, padding, and flex-col for vertical stacking */}
                  {/* Label for Boat 1 */}
                  <h3 className="text-lg font-semibold text-white text-center mb-2">Boat 1</h3> {/* Added text-center and mb-2 */}

                  {/* Container for the drummer, main grid, and sweep - uses Tailwind flexbox for vertical stacking */}
                  {/* Added max-w-lg to make this section narrower */}
                  {/* Added flex-grow to ensure it takes available vertical space */}
                  {/* Added justify-start to align contents to the top */}
                  {/* Added h-full to make this container fill the height */}
                  {/* Reduced space-y-8 to space-y-4 for tighter vertical spacing */}
                  <div className="main-content-container flex flex-col space-y-4 flex-grow justify-start h-full"> {/* flex: enables flexbox, flex-col: stacks children vertically, space-y-4: vertical space between children, flex-grow: allows the container to grow, justify-start: aligns contents to the top, h-full: sets height to 100% of parent */}
                      {/* Drummer Droppable Zone */}
                      <DroppableZone
                          key={POSITIONS.DRUMMER} // Unique key
                          id={POSITIONS.DRUMMER} // ID for dnd-kit droppable zone
                          label="Drummer" // Label displayed when empty
                          occupiedTileId={columns[POSITIONS.DRUMMER]?.tileIds[0]} // Pass the ID of the tile currently in this single-tile zone
                          activeDroppableId={activeDroppableId}
                      >
                           {/* Render the tile if it's in the Drummer position */}
                           {columns[POSITIONS.DRUMMER]?.tileIds.map(tileId => {
                               const tile = getTileById(tileId);
                               if (!tile) return null;
                               return (
                                   // Render a SortableItem for the Drummer tile
                                   <SortableItem
                                       key={tileId}
                                       id={tileId}
                                       // Removed content prop
                                       preference={tile.preference} // Pass preference prop
                                       paddlerName={tile.paddlerName} // Pass paddler name
                                       currentPositionId={POSITIONS.DRUMMER} // Pass the current position ID
                                       onPaddlerNameChange={handlePaddlerNameChange}
                                       onPreferenceChange={handlePreferenceChange} // Pass the handler for preference changes
                                   />
                               );
                           })}
                      </DroppableZone>

                      {/* Main Grid Container for Left/Right Rows - uses Tailwind CSS Grid */}
                      {/* Added grid-rows-10 to explicitly define row count and ensure consistent height */}
                      {/* Added flex-grow to ensure the grid takes available vertical space */}
                      {/* Reduced gap-4 to gap-2 for tighter grid spacing */}
                      <div className="main-grid-container grid grid-cols-2 grid-rows-10 gap-2 flex-grow"> {/* grid: enables grid layout, grid-cols-2: two equal columns, grid-rows-10: 10 rows of equal height, gap-2: space between grid items, flex-grow: allows the grid to grow */}
                        {/* Loop through rows (1 to 10) and render Left/Right Droppable Zones */}
                        {Array.from({ length: 10 }).map((_, rowIndex) => {
                            const leftPositionId = generateBenchPositionId(rowIndex + 1, 'left');
                            const rightPositionId = generateBenchPositionId(rowIndex + 1, 'right');
                            return (
                            <React.Fragment key={rowIndex}> {/* Use Fragment to group the left and right zones for each row without adding extra DOM nodes */}
                                {/* Left Bench Droppable Zone - Updated ID and Label */}
                                <DroppableZone
                                    key={leftPositionId} // Updated key
                                    id={leftPositionId} // Updated ID
                                    label={`Bench ${rowIndex + 1} Left`} // Updated Label
                                    occupiedTileId={columns[leftPositionId]?.tileIds[0]} // Updated occupiedTileId check
                                    activeDroppableId={activeDroppableId}
                                >
                                    {/* Render the tile if it's in this left bench position - Updated positionId check */}
                                    {columns[leftPositionId]?.tileIds.map(tileId => {
                                        const tile = getTileById(tileId);
                                        if (!tile) return null;
                                        return (
                                            // Render a SortableItem for the tile in this zone - Updated currentPositionId
                                            <SortableItem
                                                key={tileId}
                                                id={tileId}
                                                // Removed content prop
                                                preference={tile.preference} // Pass preference prop
                                                paddlerName={tile.paddlerName} // Pass paddler name
                                                currentPositionId={leftPositionId} // Updated currentPositionId
                                                onPaddlerNameChange={handlePaddlerNameChange}
                                                onPreferenceChange={handlePreferenceChange} // Pass the handler for preference changes
                                            />
                                        );
                                    })}
                                </DroppableZone>
                                {/* Right Bench Droppable Zone - Updated ID and Label */}
                                <DroppableZone
                                    key={rightPositionId} // Updated key
                                    id={rightPositionId} // Updated ID
                                    label={`Bench ${rowIndex + 1} Right`} // Updated Label
                                    occupiedTileId={columns[rightPositionId]?.tileIds[0]} // Updated occupiedTileId check
                                    activeDroppableId={activeDroppableId}
                                >
                                    {/* Render the tile if it's in this right bench position - Updated positionId check */}
                                    {columns[rightPositionId]?.tileIds.map(tileId => {
                                        const tile = getTileById(tileId);
                                        if (!tile) return null;
                                        return (
                                            // Render a SortableItem for the tile in this zone - Updated currentPositionId
                                            <SortableItem
                                                key={tileId}
                                                id={tileId}
                                                // Removed content prop
                                                preference={tile.preference} // Pass preference prop
                                                paddlerName={tile.paddlerName} // Pass paddler name
                                                currentPositionId={rightPositionId} // Updated currentPositionId
                                                onPaddlerNameChange={handlePaddlerNameChange}
                                                onPreferenceChange={handlePreferenceChange} // Pass the handler for preference changes
                                            />
                                        );
                                    })}
                                </DroppableZone>
                            </React.Fragment>
                        );
                        })}
                      </div>

                      {/* Sweep Droppable Zone */}
                      <DroppableZone
                          key={POSITIONS.SWEEP} // Unique key
                          id={POSITIONS.SWEEP} // ID for dnd-kit droppable zone
                          label="Sweep" // Label
                          occupiedTileId={columns[POSITIONS.SWEEP]?.tileIds[0]} // Pass the ID of the tile currently in this single-tile zone
                          activeDroppableId={activeDroppableId}
                      >
                           {/* Render the tile if it's in the Sweep position */}
                           {columns[POSITIONS.SWEEP]?.tileIds.map(tileId => {
                               const tile = getTileById(tileId);
                               if (!tile) return null;
                               return (
                                   // Render a SortableItem for the Sweep tile
                                   <SortableItem
                                       key={tileId}
                                       id={tileId}
                                       // Removed content prop
                                       preference={tile.preference} // Pass preference prop
                                       paddlerName={tile.paddlerName} // Pass paddler name
                                       currentPositionId={POSITIONS.SWEEP} // Pass the current position ID
                                       onPaddlerNameChange={handlePaddlerNameChange}
                                       onPreferenceChange={handlePreferenceChange} // Pass the handler for preference changes
                                   />
                               );
                           })}
                      </DroppableZone>
                  </div>
              </div> {/* End Boat 1 container */}
          </div>
      </div>


      {/* DragOverlay to show a preview of the item being dragged */}
      {/* Renders a visual copy of the dragged item following the cursor */}
      <DragOverlay>
        {/* Conditional rendering: only render if there is an active dragged item and its data is found */}
        {activeId && activeTile ? (
          <div
            // Apply similar conditional styling for the overlay based on the tile's *original* position
            // Adjusted width and font size based on original position
            className={`p-1 rounded-md shadow-md bg-white text-gray-800 select-none cursor-grabbing border border-black ${activeTile.positionId === POSITIONS.UNASSIGNED ? 'w-[120px] text-xs' : 'w-[200px] text-sm'}`}
          >
            {/* Display position based on the tile's position *before* the drag started */}
             {activeTile.positionId !== POSITIONS.UNASSIGNED && (
                 <div className="font-semibold mb-1 text-gray-700 text-xs"> {/* Smaller font for header */}
                     {activeTile.positionId === POSITIONS.DRUMMER ? 'Drummer'
                      : activeTile.positionId === POSITIONS.SWEEP ? 'Sweep'
                      : activeTile.positionId.startsWith(POSITIONS.BENCH) ? `Bench ${activeTile.positionId.split('-')[1]} - ${activeTile.positionId.split('-')[2].charAt(0).toUpperCase() + activeTile.positionId.split('-')[2].slice(1)}` // Updated display for Bench
                      : activeTile.positionId} {/* Fallback display if position ID is not recognized */}
                 </div>
             )}

             {/* Paddler Name in Overlay (read-only) - Using flexbox for label and input on same line */}
             {/* Adjusted spacing and width handling for overlay */}
             <div className="mt-0.5 mb-0.5 flex items-center"> {/* Added flex and items-center */}
                <div className="text-xs text-gray-600 mr-1 shrink-0">Name:</div> {/* Added mr-1 for spacing, shrink-0 */}
                <div className="text-xs text-gray-800 w-auto min-w-0">{activeTile.paddlerName}</div> {/* Display the paddler name, added w-auto min-w-0 */}
             </div>
             {/* Preference in Overlay (read-only) - Using flexbox for label and input on same line */}
             {/* Adjusted spacing and width handling for overlay */}
             <div className="mt-0.5 mb-0.5 flex items-center"> {/* Added flex and items-center */}
                <div className="text-xs text-gray-600 mr-1 shrink-0">Preference:</div> {/* Label for the preference field, added mr-1, shrink-0 */}
                {/* Display the preference value from the tile data */}
                <div className="text-xs text-gray-800 w-auto min-w-0">{activeTile.preference}</div> {/* Display the preference, added w-auto min-w-0 */}
             </div>

             {/* Hide original content and note for unassigned tiles in overlay */}
             {activeTile.positionId !== POSITIONS.UNASSIGNED && (
                 <>
                     <div className="text-gray-800 text-xs">{/*activeTile.content*/}</div> {/* Smaller content font */}
                     <div className="text-gray-600 text-[8pt]">{/*activeTile.note*/}</div> {/* Even smaller note font */}
                 </>
             )}

          </div>
        ) : null} {/* Render nothing if no item is being dragged */}
      </DragOverlay>
    </DndContext>
  );
}

export default App;
