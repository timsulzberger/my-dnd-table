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
  rectIntersection, // Collision detection algorithm: detects overlapping rectangles
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

// Remove the old CSS import - styling is now handled by Tailwind classes
// import './App.css';

// Define the possible positions/zones using an object for clarity and reusability
const POSITIONS = {
    DRUMMER: 'drummer',
    SWEEP: 'sweep',
    UNASSIGNED: 'unassigned',
    BENCH: 'bench', // Prefix for bench positions (e.g., 'bench-1-left') - Renamed from ROW
};

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
    preference: ``, // Added preference field, initially empty
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
  } = useSortable({
      id, // The unique ID of the sortable item
      // Data associated with the item, accessible during drag events
      data: {
          currentPositionId: currentPositionId, // Store the tile's current position ID
      }
  });

  // Tailwind classes for styling the tile
  // baseClasses: Common styles for all tiles (padding, rounded corners, cursor, flex layout, transition, solid black border)
  const baseClasses = `p-2 rounded-md select-none cursor-grab flex flex-col transition-all duration-200 ease-in-out border border-black`; // Reduced padding
  // draggingClasses: Styles applied when the tile is being dragged (opacity, background color, border consistency, shadow)
  const draggingClasses = isDragging ? 'opacity-50 bg-gray-200 border-black' : 'opacity-100 bg-white shadow-sm';

  // positionSpecificClasses: Styles that vary based on the tile's current position (margin, width, text alignment)
  // Reduced mb-2 to mb-1 for tighter vertical spacing between tiles in lists
  const positionSpecificClasses = currentPositionId === POSITIONS.UNASSIGNED ? 'mb-1 w-full max-w-[150px] mx-auto text-left' // Styles for tiles in the Unassigned column
                                : (currentPositionId === POSITIONS.DRUMMER || currentPositionId === POSITIONS.SWEEP ? 'mb-0 w-full max-w-[calc(100%-16px)] mx-auto text-center' // Styles for tiles in Drummer or Sweep (single-tile zones), adjusted calc
                                : 'mb-1 text-left w-full'); // Styles for tiles in the row grid positions, added w-full

  // Inline style object for applying transform and transition provided by useSortable
  const style = {
    transform: CSS.Transform.toString(transform), // Applies the CSS transform for positioning
    transition, // Applies the CSS transition for smooth animation
  };

  // Prevents the drag interaction from starting when interacting with the input field
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
  const tileNumber = id.split('-')[1] ? parseInt(id.split('-')[1]) + 1 : null;


  return (
    // The main div for the sortable item, connected to dnd-kit via setNodeRef
    <div
      ref={setNodeRef}
      style={style} // Apply the transform and transition styles
      {...attributes} // Apply accessibility and drag attributes
      {...listeners} // Apply drag event listeners
      className={`${baseClasses} ${draggingClasses} ${positionSpecificClasses} relative`} // Add relative positioning for absolute positioning of the tile number
    >
      {/* Container for main content, using flex-col for vertical stacking */}
      <div className="flex flex-col flex-grow"> {/* flex-grow allows this section to take up space */}
          {/* Display the formatted header */}
          <div className="font-semibold mb-2 text-gray-700">{headerText}</div>

          {/* Paddler Name Input - Moved to the top */}
          <div className="mt-1 mb-2" onMouseDown={handleInputMouseDown}> {/* Container for the input, prevents drag start, added margin-bottom */}
            <label htmlFor={`paddler-${id}`} className="block text-xs text-gray-600 mb-1">Name:</label> {/* Label changed to "Name:" */}
            <input
              id={`paddler-${id}`} // Unique ID for the input, linked to the label
              type="text"
              value={paddlerName} // Controlled input value
              onChange={(e) => onPaddlerNameChange(id, e.target.value)} // Call parent handler on change
              className="p-1 rounded border border-gray-300 text-sm text-gray-800 w-full focus:outline-none focus:ring-1 focus:ring-blue-500" // Tailwind classes for input styling and focus effect
            />
          </div>

          {/* Preference Input Field */}
          <div className="mt-1 mb-2" onMouseDown={handleInputMouseDown}> {/* Container for the input, prevents drag start, added margin-bottom */}
            <label htmlFor={`preference-${id}`} className="block text-xs text-gray-600 mb-1">Preference:</label> {/* Label for the preference field */}
            <input
              id={`preference-${id}`} // Unique ID for the input
              type="text"
              value={preference} // Controlled input value
              onChange={(e) => onPreferenceChange(id, e.target.value)} // Call parent handler on change
              className="p-1 rounded border border-gray-300 text-sm text-gray-800 w-full focus:outline-none focus:ring-1 focus:ring-blue-500" // Tailwind classes for input styling and focus effect
            />
          </div>

          {/* Removed the div displaying the original tile content */}
          {/* <div className="text-gray-800">{content}</div> */}
          {/* Removed the div displaying the original tile note */}
          {/* <div className="text-gray-600 text-sm">{note}</div> */}

      </div>

      {/* Tile Number at bottom left */}
      {tileNumber !== null && ( // Only render if tileNumber is successfully extracted
        <div className="absolute bottom-1 left-1 text-gray-400 text-[6pt] py-0.5"> {/* Absolute positioning, bottom/left offset, lighter grey text, 6pt font, vertical padding */}
          {`Tile ID ${tileNumber}`} {/* Display "Tile ID" followed by the number */}
        </div>
      )}
    </div>
  );
}

// Component for a single droppable zone (can hold one tile)
function DroppableZone({ children, id, label, occupiedTileId }) {
  // useDroppable hook makes the element a droppable target
  const { setNodeRef, isOver } = useDroppable({ id }); // The unique ID of the droppable zone

  // Tailwind classes for styling the droppable zone
  // baseClasses: Common styles (padding, margin, rounded corners, flex layout, transition, dotted gray border)
  // Removed min-height to allow grid/flex to control height, adjusted padding
  const baseClasses = `p-1 m-0.5 rounded-md flex flex-col items-center justify-center transition-colors duration-200 ease-in-out border border-dotted border-gray-400`;
  // stateClasses: Styles that change based on drag state (border and background color when dragging over, or based on occupied status)
  // Updated background colors to light grey shades
  const stateClasses = isOver ? 'border-2 border-black bg-gray-200' : (occupiedTileId ? 'bg-gray-100 border-gray-300' : 'bg-gray-50 border-gray-200');

  return (
    // The main div for the droppable zone, connected to dnd-kit via setNodeRef
    <div
      ref={setNodeRef}
      className={`${baseClasses} ${stateClasses} h-full`} // Combine all Tailwind classes, added h-full
    >
      {/* Show the label if the zone is empty */}
      {!occupiedTileId && <div className="text-gray-600 text-sm">{label}</div>}
      {/* Render the children (the tile) if it's assigned to this zone */}
      {children}
    </div>
  );
}

// Component for the Unassigned column (which is a sortable list and a droppable zone)
function UnassignedColumn({ children, id, title, tileIds }) {
    // useDroppable hook makes the element a droppable target
    const { setNodeRef, isOver } = useDroppable({ id }); // The unique ID of the Unassigned column

    // Tailwind classes for styling the Unassigned column
    // baseClasses: Common styles (flex layout, padding, dotted gray border, rounded corners, min width, right margin, center alignment)
    // Reduced p-4 to p-2 for tighter padding around the tiles within the column
    const baseClasses = `flex flex-col p-2 border border-dotted border-gray-400 rounded-md min-w-[180px] mr-8 items-center`;
    // stateClasses: Styles that change based on drag state (background color when dragging over)
    const stateClasses = isOver ? 'bg-gray-200' : 'bg-gray-100';

    return (
        // The main div for the Unassigned column, connected to dnd-kit via setNodeRef
        <div
          ref={setNodeRef}
          className={`${baseClasses} ${stateClasses}`} // Combine all Tailwind classes
        >
          {/* Display the column title */}
          {/* Reduced mb-4 to mb-2 for tighter spacing below the title */}
          <h2 className="text-xl font-semibold mb-2 text-gray-800">{title}</h2>
          {/* SortableContext makes the children within this context sortable */}
          {/* items: Array of IDs of the sortable items */}
          {/* strategy: The sorting algorithm to use */}
          <SortableContext items={tileIds} strategy={verticalListSortingStrategy}>
            {/* Render the children (the sortable tiles) */}
            {children}
          </SortableContext>
        </div>
    );
}

// Custom collision detection strategy that combines rectIntersection and closestCenter
const customCollisionDetection = (args) => {
    // First, use rectIntersection for precise detection over droppable areas
    const rectCollisions = rectIntersection(args);

    // If rectIntersection finds collisions, return them
    if (rectCollisions.length > 0) {
        return rectCollisions;
    }

    // If no rectIntersection collisions, fall back to closestCenter
    return closestCenter(args);
};


// The main App component
function App() {
  // State to hold the array of all tiles
  const [tiles, setTiles] = useState(initialTiles);
  // State to hold the structure of columns/positions and the IDs of tiles within them
  const [columns, setColumns] = useState({});
  // State to manage the expanded/collapsed state of the sidebar
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false); // Initially collapsed

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
        distance: 5, // Drag starts after the pointer moves 5px
      },
    }),
    useSensor(KeyboardSensor, {}) // Enables keyboard dragging
  );

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

  // Handler for changes to the Preference input field
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

    // Dropped outside a droppable area or over the same item
    if (!over || active.id === over.id) {
      console.log(!over ? "Dropped outside any droppable area." : "Dropped onto the same item.");
      return; // Exit the function as no state change is needed
    }

    const draggedTileId = active.id; // Get the ID of the dragged tile
    const sourcePositionId = active.data.current?.currentPositionId; // Get the original position ID from the active item's data
    const overId = over.id; // Get the ID of the element being dragged over


    // Find the tile that was dragged
    const draggedTile = tiles.find(tile => tile.id === draggedTileId);
    if (!draggedTile) {
        console.error("Dragged tile not found.");
        return; // Exit if the dragged tile cannot be found (shouldn't happen in normal operation)
    }

    // Find the tile being hovered over (if the overId is a tile ID)
    const overTile = tiles.find(tile => tile.id === overId);
    // Check if the element being hovered over is a tile and if that tile is in the Unassigned column
    const isOverTileInUnassigned = overTile && overTile.positionId === POSITIONS.UNASSIGNED;


    // Determine the actual destination column ID and if dropped over a tile in Unassigned
    let destinationColumnId = null;
    let droppedOverTileInUnassigned = null; // To store the tile being dropped over in unassigned

    // ** Revised logic for determining destinationColumnId with combined collision detection **
    // Prioritize checking if the overId is the Unassigned column itself or a known column/zone ID
    if (overId === POSITIONS.UNASSIGNED) {
        destinationColumnId = POSITIONS.UNASSIGNED;
    } else if (columns[overId]) {
        destinationColumnId = overId;
    } else if (isOverTileInUnassigned) {
         // If dropped over a tile that is *already* in the Unassigned column (fallback)
        destinationColumnId = POSITIONS.UNASSIGNED;
        droppedOverTileInUnassigned = overTile; // Store the tile being dropped over
    } else {
         // If the overId is a tile but not in the Unassigned column, it's an invalid drop target
         console.error(`Invalid drop target: overId is a tile (${overId}) not in Unassigned.`);
         return; // Exit if the drop is invalid
    }


    // If we couldn't determine a valid destination column after the special handling, return
    if (!destinationColumnId || !columns[sourcePositionId]) {
         console.error("Invalid drag operation: Could not determine valid source or final destination position.");
         console.log("Columns state:", columns);
         return;
    }

    const destinationColumn = columns[destinationColumnId]; // Get the destination column object
    const destinationTileIds = Array.from(destinationColumn.tileIds); // Get the current tile IDs in the destination column


    // ** Logic for dropping onto a single-tile zone (Drummer, Sweep, or Bench Position) **
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
        console.log("Dropped into Unassigned column.");

        // Get the current tile IDs for the unassigned column
        const currentUnassignedTileIds = Array.from(columns[POSITIONS.UNASSIGNED]?.tileIds || []);

        // Determine the drop index within the unassigned list
        let dropIndexInUnassigned = currentUnassignedTileIds.length; // Default to end if dropped on container

        // If dropped over a specific tile within the unassigned list, determine the index
        if (droppedOverTileInUnassigned) {
             dropIndexInUnassigned = currentUnassignedTileIds.indexOf(droppedOverTileInUnassigned.id);
             // Adjust index if moving within unassigned and dropping below original position
             if (sourcePositionId === POSITIONS.UNASSIGNED && currentUnassignedTileIds.indexOf(draggedTileId) !== -1 && dropIndexInUnassigned > currentUnassignedTileIds.indexOf(draggedTileId)) {
                 dropIndexInUnassigned--;
             }
        } else if (overId === POSITIONS.UNASSIGNED) { // Explicitly check if dropped on the Unassigned container
             // Dropped directly onto the Unassigned column container, add to the end
             dropIndexInUnassigned = currentUnassignedTileIds.length;
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
             }
         }

         // Update the Unassigned column's tileIds with the new ordered list
         nextColumns[POSITIONS.UNASSIGNED] = {
             ...columns[POSITIONS.UNASSIGNED],
             tileIds: newUnassignedTileIds,
         };

         // Update the positionId for the dragged tile in the nextTiles state
         const draggedTileToUpdate = nextTiles.find(tile => tile.id === draggedTileId);
         if (draggedTileToUpdate) {
             draggedTileToUpdate.positionId = POSITIONS.UNASSIGNED; // Set the new position ID
             // Update the row property for sortable lists based on the new index within Unassigned
             draggedTileToUpdate.row = newUnassignedTileIds.indexOf(draggedTileId);
         }

         // Update rows for all tiles in the unassigned column based on the new order
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


       // Update state with the new columns and tiles data
       setColumns(nextColumns);
       setTiles(nextTiles);

       console.log("All tiles moved to Unassigned.");
   };

   // Handler to toggle the sidebar expanded state
   const toggleSidebar = () => {
       setIsSidebarExpanded(!isSidebarExpanded);
   };


  // Find the active tile data for the DragOverlay
  const activeTile = activeId ? getTileById(activeId) : null;

  // Determine the left margin for the main content based on sidebar state
  // w-16 (64px) when collapsed, w-64 (256px) when expanded
  const mainContentMarginLeft = isSidebarExpanded ? 'ml-64' : 'ml-16';


  return (
    // DndContext provides the drag and drop context to the application
    <DndContext
      sensors={sensors} // Pass the configured sensors
      // Use the custom collision detection strategy
      collisionDetection={customCollisionDetection}
      onDragStart={onDragStart} // Call onDragStart when a drag begins
      onDragEnd={onDragEnd} // Call onDragEnd when a drag ends
      onDragCancel={onDragCancel} // Call onDragCancel when a drag is cancelled
    >
      {/* Main layout container using Tailwind flexbox for side-by-side layout */}
      {/* Added a parent flex container to hold the sidebar and the main content */}
      {/* Added items-start to align items to the top */}
      <div className="flex min-h-screen items-start"> {/* flex: enables flexbox, min-h-screen: minimum height of the viewport, items-start: aligns items to the top */}

          {/* Render the Sidebar component, passing necessary props */}
          <Sidebar
              isExpanded={isSidebarExpanded} // Pass the expanded state
              toggleSidebar={toggleSidebar} // Pass the toggle function
              handleUnassignAll={handleUnassignAll} // Pass the unassign all function
          />

          {/* Container for the Unassigned column and the main content */}
          {/* This div now holds the Unassigned column and the rest of the layout */}
          {/* Added flex-grow to ensure it takes the remaining space */}
          {/* Added conditional left margin based on sidebar state */}
          {/* Added pl-4 for left padding */}
          <div className={`flex flex-grow p-8 space-x-8 ${mainContentMarginLeft} pl-4`}> {/* flex: enables flexbox, flex-grow: allows it to take remaining space, p-8: padding, space-x-8: horizontal space between children, conditional left margin, pl-4: left padding */}
              {/* Container for the Unassigned column */}
              {/* Unassigned column uses the UnassignedColumn component */}
              <UnassignedColumn
                  key={POSITIONS.UNASSIGNED} // Unique key for React list rendering
                  id={POSITIONS.UNASSIGNED} // ID for dnd-kit droppable zone
                  title="Unassigned" // Title displayed at the top of the column
                  tileIds={columns[POSITIONS.UNASSIGNED]?.tileIds || []} // Pass the array of tile IDs in this column (use optional chaining for safety)
              >
                  {/* Map over the tile IDs in the Unassigned column to render SortableItems */}
                  {columns[POSITIONS.UNASSIGNED]?.tileIds.map((tileId, index) => {
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

              {/* Container for the drummer, main grid, and sweep - uses Tailwind flexbox for vertical stacking */}
              {/* Added max-w-lg to make this section narrower */}
              {/* Added flex-grow to ensure it takes available vertical space */}
              <div className="main-content-container flex flex-col space-y-8 flex-grow max-w-lg"> {/* flex: enables flexbox, flex-col: stacks children vertically, space-y-8: vertical space between children, flex-grow: allows the container to grow, max-w-lg: sets a maximum width */}
                  {/* Drummer Droppable Zone */}
                  <DroppableZone
                      key={POSITIONS.DRUMMER} // Unique key
                      id={POSITIONS.DRUMMER} // ID for dnd-kit droppable zone
                      label="Drummer" // Label displayed when empty
                      occupiedTileId={columns[POSITIONS.DRUMMER]?.tileIds[0]} // Pass the ID of the tile currently in this single-tile zone
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
                  <div className="main-grid-container grid grid-cols-2 grid-rows-10 gap-4 flex-grow"> {/* grid: enables grid layout, grid-cols-2: two equal columns, grid-rows-10: 10 rows of equal height, gap-4: space between grid items, flex-grow: allows the grid to grow */}
                    {/* Loop through rows (1 to 10) and render Left/Right Droppable Zones */}
                    {Array.from({ length: 10 }).map((_, rowIndex) => (
                        <React.Fragment key={rowIndex}> {/* Use Fragment to group the left and right zones for each row without adding extra DOM nodes */}
                            {/* Left Bench Droppable Zone - Updated ID and Label */}
                            <DroppableZone
                                key={generateBenchPositionId(rowIndex + 1, 'left')} // Updated key
                                id={generateBenchPositionId(rowIndex + 1, 'left')} // Updated ID
                                label={`Bench ${rowIndex + 1} Left`} // Updated Label
                                occupiedTileId={columns[generateBenchPositionId(rowIndex + 1, 'left')]?.tileIds[0]} // Updated occupiedTileId check
                            >
                                {/* Render the tile if it's in this left bench position - Updated positionId check */}
                                {columns[generateBenchPositionId(rowIndex + 1, 'left')]?.tileIds.map(tileId => {
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
                                            currentPositionId={generateBenchPositionId(rowIndex + 1, 'left')} // Updated currentPositionId
                                            onPaddlerNameChange={handlePaddlerNameChange}
                                            onPreferenceChange={handlePreferenceChange} // Pass the handler for preference changes
                                        />
                                    );
                                })}
                            </DroppableZone>
                            {/* Right Bench Droppable Zone - Updated ID and Label */}
                            <DroppableZone
                                key={generateBenchPositionId(rowIndex + 1, 'right')} // Updated key
                                id={generateBenchPositionId(rowIndex + 1, 'right')} // Updated ID
                                label={`Bench ${rowIndex + 1} Right`} // Updated Label
                                occupiedTileId={columns[generateBenchPositionId(rowIndex + 1, 'right')]?.tileIds[0]} // Updated occupiedTileId check
                            >
                                {/* Render the tile if it's in this right bench position - Updated positionId check */}
                                {columns[generateBenchPositionId(rowIndex + 1, 'right')]?.tileIds.map(tileId => {
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
                                            currentPositionId={generateBenchPositionId(rowIndex + 1, 'right')} // Updated currentPositionId
                                            onPaddlerNameChange={handlePaddlerNameChange}
                                            onPreferenceChange={handlePreferenceChange} // Pass the handler for preference changes
                                        />
                                    );
                                })}
                            </DroppableZone>
                        </React.Fragment>
                    ))}
                  </div>

                  {/* Sweep Droppable Zone */}
                  <DroppableZone
                      key={POSITIONS.SWEEP} // Unique key
                      id={POSITIONS.SWEEP} // ID for dnd-kit droppable zone
                      label="Sweep" // Label
                      occupiedTileId={columns[POSITIONS.SWEEP]?.tileIds[0]} // Pass the ID of the tile currently in this single-tile zone
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
          </div>
      </div>


      {/* DragOverlay to show a preview of the item being dragged */}
      {/* Renders a visual copy of the dragged item following the cursor */}
      <DragOverlay>
        {/* Conditional rendering: only render if there is an active dragged item and its data is found */}
        {activeId && activeTile ? (
          <div
            className="p-4 rounded-md shadow-md bg-white text-gray-800 select-none cursor-grabbing w-[200px] border border-black" // Tailwind classes for overlay styling (padding, rounded corners, shadow, background, text color, no text selection, grabbing cursor, fixed width, solid black border)
          >
            {/* Display position based on the tile's position *before* the drag started */}
             <div className="font-semibold mb-2 text-gray-700">
                 {activeTile.positionId === POSITIONS.DRUMMER ? 'Drummer'
                  : activeTile.positionId === POSITIONS.SWEEP ? 'Sweep'
                  : activeTile.positionId === POSITIONS.UNASSIGNED ? `Unassigned Index: ${columns[POSITIONS.UNASSIGNED]?.tileIds.indexOf(activeTile.id)}` // Display current index in unassigned
                  : activeTile.positionId.startsWith(POSITIONS.BENCH) ? `Bench ${activeTile.positionId.split('-')[1]} - ${activeTile.positionId.split('-')[2].charAt(0).toUpperCase() + activeTile.positionId.split('-')[2].slice(1)}` // Updated display for Bench
                  : activeTile.positionId} {/* Fallback display if position ID is not recognized */}
             </div>
             {/* Paddler Name in Overlay (read-only) - Moved to the top */}
             <div className="mt-1 mb-2"> {/* Container for the input, added margin-bottom */}
                <div className="text-xs text-gray-600 mb-1">Name:</div> {/* Label changed to "Name:" */}
                <div>{activeTile.paddlerName}</div> {/* Display the paddler name */}
             </div>
             {/* Preference in Overlay (read-only) */}
             <div className="mt-1 mb-2"> {/* Container for the input, added margin-bottom */}
                <div className="text-xs text-gray-600 mb-1">Preference:</div> {/* Label for the preference field */}
                <div>{activeTile.preference}</div> {/* Display the preference */}
             </div>
            {/* Removed the div displaying the original tile content in the overlay */}
            {/* <div className="text-gray-800">{content}</div> */}
            {/* Removed the div displaying the original tile note in the overlay */}
            {/* <div className="text-gray-600 text-sm">{note}</div> */}

          </div>
        ) : null} {/* Render nothing if no item is being dragged */}
      </DragOverlay>
    </DndContext>
  );
}

// Ensure this export statement is the very last line in the file.
export default App;