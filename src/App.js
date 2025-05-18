import React, { useState } from 'react';
// Import necessary hooks and components from @dnd-kit/core
import {
  DndContext, // The main context provider for drag and drop
  DragOverlay, // Component to render a visual representation of the dragged item
  useSensor, // Hook to create and manage sensors (input methods for dragging)
  useSensors, // Hook to combine multiple sensors
  PointerSensor, // Sensor that responds to pointer events (mouse, touch)
  KeyboardSensor, // Sensor that responds to keyboard events
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

// Remove the old CSS import - styling is now handled by Tailwind classes
// import './App.css';

// Define the possible positions/zones using an object for clarity and reusability
const POSITIONS = {
    DRUMMER: 'drummer',
    SWEEP: 'sweep',
    UNASSIGNED: 'unassigned',
    ROW: 'row', // Prefix for row positions (e.g., 'row-1-left')
};

// Helper function to generate unique IDs for row positions
const generateRowPositionId = (row, side) => `${POSITIONS.ROW}-${row}-${side}`;

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
      // Assigns the remaining tiles to the left/right row positions
      const adjustedIndex = k - 2; // Adjusts the index to start from 0 for row calculations
      const row = Math.floor(adjustedIndex / 2) + 1; // Calculates the row number (1-based)
      const side = adjustedIndex % 2 === 0 ? 'left' : 'right'; // Determines if it's a left or right side position
      positionId = generateRowPositionId(row, side); // Generates the specific row position ID
  }

  return {
    id: tileId,
    content: `Tile ${k + 1}`, // Content displayed on the tile
    note: `Note for tile ${k + 1}`, // Additional note for the tile
    positionId: positionId, // Stores the tile's current position ID
    paddlerName: `Person ${k + 1}`, // Default paddler name
  };
});


// Component for a single draggable tile
function SortableItem({ id, content, note, paddlerName, currentPositionId, currentIndex, onPaddlerNameChange }) {
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
  const baseClasses = `p-4 rounded-md select-none cursor-grab flex flex-col transition-all duration-200 ease-in-out border border-black`;
  // draggingClasses: Styles applied when the tile is being dragged (opacity, background color, border consistency, shadow)
  const draggingClasses = isDragging ? 'opacity-50 bg-gray-200 border-black' : 'opacity-100 bg-white shadow-sm';

  // positionSpecificClasses: Styles that vary based on the tile's current position (margin, width, text alignment)
  // Reduced mb-2 to mb-1 for tighter vertical spacing between tiles in lists
  const positionSpecificClasses = currentPositionId === POSITIONS.UNASSIGNED ? 'mb-1 w-full max-w-[150px] mx-auto text-left' // Styles for tiles in the Unassigned column
                                : (currentPositionId === POSITIONS.DRUMMER || currentPositionId === POSITIONS.SWEEP ? 'mb-0 w-full max-w-[calc(100%-32px)] mx-auto text-center' // Styles for tiles in Drummer or Sweep (single-tile zones)
                                : 'mb-1 text-left'); // Styles for tiles in the row grid positions

  // Inline style object for applying transform and transition provided by useSortable
  const style = {
    transform: CSS.Transform.toString(transform), // Applies the CSS transform for positioning
    transition, // Applies the CSS transition for smooth animation
  };

  // Prevents the drag interaction from starting when interacting with the input field
  const handleInputMouseDown = (event) => {
      event.stopPropagation(); // Stops the event from bubbling up to the draggable div
  };

  // Determines the header text displayed on the tile based on its position ID
  let headerText = currentPositionId; // Default header is the position ID

  if (currentPositionId === POSITIONS.DRUMMER) {
      headerText = 'Drummer';
  } else if (currentPositionId === POSITIONS.SWEEP) {
      headerText = 'Sweep';
  } else if (currentPositionId.startsWith(POSITIONS.ROW)) {
      // Parses row and side from the row position ID to create a user-friendly header
      const [, row, side] = currentPositionId.split('-');
      headerText = `Row ${row} ${side.charAt(0).toUpperCase() + side.slice(1)}`;
  } else if (currentPositionId === POSITIONS.UNASSIGNED) {
       // For unassigned, we can display the index within the unassigned list
       headerText = `Unassigned Index: ${currentIndex}`; // Uses the currentIndex prop passed from the parent
  }


  return (
    // The main div for the sortable item, connected to dnd-kit via setNodeRef
    <div
      ref={setNodeRef}
      style={style} // Apply the transform and transition styles
      {...attributes} // Apply accessibility and drag attributes
      {...listeners} // Apply drag event listeners
      className={`${baseClasses} ${draggingClasses} ${positionSpecificClasses}`} // Combine all Tailwind classes
    >
      {/* Display the formatted header */}
      <div className="font-semibold mb-2 text-gray-700">{headerText}</div>
      {/* Display the tile content */}
      <div className="text-gray-800">{content}</div>
      {/* Display the tile note */}
      <div className="text-gray-600 text-sm">{note}</div>
      {/* Paddler Name Input */}
      <div className="mt-2" onMouseDown={handleInputMouseDown}> {/* Container for the input, prevents drag start */}
        <label htmlFor={`paddler-${id}`} className="block text-xs text-gray-600 mb-1">Paddler Name:</label> {/* Label for the input field */}
        <input
          id={`paddler-${id}`} // Unique ID for the input, linked to the label
          type="text"
          value={paddlerName} // Controlled input value
          onChange={(e) => onPaddlerNameChange(id, e.target.value)} // Call parent handler on change
          className="p-1 rounded border border-gray-300 text-sm text-gray-800 w-full focus:outline-none focus:ring-1 focus:ring-blue-500" // Tailwind classes for input styling and focus effect
        />
      </div>
    </div>
  );
}

// Component for a single droppable zone (can hold one tile)
function DroppableZone({ children, id, label, occupiedTileId }) {
  // useDroppable hook makes the element a droppable target
  const { setNodeRef, isOver } = useDroppable({ id }); // The unique ID of the droppable zone

  // Tailwind classes for styling the droppable zone
  // baseClasses: Common styles (padding, margin, rounded corners, flex layout, min height, transition, dotted gray border)
  // Reduced m-1 to m-0.5 for tighter spacing around droppable zones
  const baseClasses = `p-2 m-0.5 rounded-md flex flex-col items-center justify-center min-h-[100px] transition-colors duration-200 ease-in-out border border-dotted border-gray-400`;
  // stateClasses: Styles that change based on drag state (border and background color when dragging over, or based on occupied status)
  const stateClasses = isOver ? 'border-2 border-black bg-gray-200' : (occupiedTileId ? 'bg-red-100 border-red-300' : 'bg-green-100 border-green-300');

  return (
    // The main div for the droppable zone, connected to dnd-kit via setNodeRef
    <div
      ref={setNodeRef}
      className={`${baseClasses} ${stateClasses}`} // Combine all Tailwind classes
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
          <h2 className="text-xl font-semibold mb-4 text-gray-800">{title}</h2>
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
          // Dynamically generate entries for each row position (e.g., 'row-1-left', 'row-1-right')
          ...Array.from({ length: 10 }).reduce((acc, _, rowIndex) => {
              acc[generateRowPositionId(rowIndex + 1, 'left')] = { id: generateRowPositionId(rowIndex + 1, 'left'), title: `Row ${rowIndex + 1} Left`, tileIds: [] };
              acc[generateRowPositionId(rowIndex + 1, 'right')] = { id: generateRowPositionId(rowIndex + 1, 'right'), title: `Row ${rowIndex + 1} Right`, tileIds: [] };
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

  // Handler for when a drag operation starts
  const onDragStart = (event) => {
    setActiveId(event.active.id); // Set the activeId to the ID of the dragged item
  };

  // Handler for when a drag operation ends
  const onDragEnd = (result) => {
    const { active, over } = result; // Destructure active (dragged item) and over (item/container being hovered over)

    setActiveId(null); // Clear the activeId as the drag has ended

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

    // ** Prioritized handling for dragging from a single-tile zone to Unassigned **
    // If the drag started from a single-tile zone (not Unassigned)
    // AND the overId is the Unassigned column ID OR the overId is a tile within the Unassigned column,
    // we explicitly set the destination to Unassigned and handle sorting within Unassigned.
    if (sourcePositionId !== POSITIONS.UNASSIGNED && (overId === POSITIONS.UNASSIGNED || isOverTileInUnassigned)) {
        console.log(`Detected drop into Unassigned from single-tile zone (${sourcePositionId}). Setting destination to Unassigned.`);
        destinationColumnId = POSITIONS.UNASSIGNED;
        // If dropped over a tile in Unassigned, store that tile
        if (isOverTileInUnassigned) {
            droppedOverTileInUnassigned = overTile;
        }
    } else if (columns[overId]) {
        // If the overId is a known column/zone ID (Drummer, Sweep, or a Row position)
        destinationColumnId = overId;
    } else {
         // If the overId is not a column ID, check if it's a tile within the Unassigned column (fallback)
        const tileInUnassigned = tiles.find(tile => tile.id === overId && tile.positionId === POSITIONS.UNASSIGNED);
        if (tileInUnassigned) {
            destinationColumnId = POSITIONS.UNASSIGNED;
            droppedOverTileInUnassigned = tileInUnassigned;
        } else {
             // If the overId is a tile but not in the Unassigned column, it's an invalid drop target
             console.error(`Invalid drop target: overId is a tile (${overId}) not in Unassigned.`);
             return; // Exit if the drop is invalid
        }
    }


    // If we couldn't determine a valid destination column (shouldn't happen if source is valid), return
    if (!destinationColumnId || !columns[sourcePositionId]) {
         console.error("Invalid drag operation: Could not determine valid source or final destination position.");
         console.log("Columns state:", columns);
         return;
    }

    const destinationColumn = columns[destinationColumnId]; // Get the destination column object
    const destinationTileIds = Array.from(destinationColumn.tileIds); // Get the current tile IDs in the destination column


    // ** Logic for dropping onto a single-tile zone (Drummer, Sweep, or Row Position) **
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


       // Update the state with the new columns and tiles data
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


  return (
    // DndContext provides the drag and drop context to the application
    <DndContext
      sensors={sensors} // Pass the configured sensors
      collisionDetection={closestCenter} // Use the closestCenter collision detection algorithm
      onDragStart={onDragStart} // Call onDragStart when a drag begins
      onDragEnd={onDragEnd} // Call onDragEnd when a drag ends
      onDragCancel={onDragCancel} // Call onDragCancel when a drag is cancelled
    >
      {/* Main layout container using Tailwind flexbox for side-by-side layout */}
      {/* Added a parent flex container to hold the sidebar and the main content */}
      <div className="flex min-h-screen"> {/* flex: enables flexbox, min-h-screen: minimum height of the viewport */}
          {/* Left Sidebar Menu - uses conditional classes for width and transition */}
          <div className={`bg-gray-100 p-4 flex flex-col space-y-4 transition-all duration-300 ease-in-out ${isSidebarExpanded ? 'w-64' : 'w-16 items-center'}`}> {/* Conditional width (w-64 expanded, w-16 collapsed), background, padding, flex column layout, vertical space, transition */}
              {/* Toggle Button for Sidebar */}
              {/* Using a simple button for now, could be an icon */}
              <button
                  onClick={toggleSidebar} // Attach the toggle handler
                  className="mb-4 p-2 rounded bg-blue-500 hover:bg-blue-700 text-white font-bold" // Styling for the toggle button
              >
                  {isSidebarExpanded ? 'Collapse' : 'Expand'} {/* Button text changes based on state */}
              </button>

              {/* Sidebar Content */}
              {/* Unassign All Button - conditionally show text based on expanded state */}
              <button
                  onClick={handleUnassignAll} // Attach the click handler
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center justify-center" // Tailwind classes for button styling, added flex for centering
              >
                  {/* You might add an icon here */}
                  {isSidebarExpanded ? 'Unassign All' : 'Unassign'} {/* Button text changes based on state */}
              </button>
              {/* Add other sidebar items here if needed */}
              {/* Example of another item, text hidden when collapsed */}
              {isSidebarExpanded && (
                  <div className="text-gray-700 mt-4">Other Menu Item</div>
              )}
          </div>

          {/* Container for the Unassigned column and the main content */}
          {/* This div now holds the Unassigned column and the rest of the layout */}
          {/* Added flex-grow to ensure it takes the remaining space */}
          <div className="flex flex-grow p-8 space-x-8"> {/* flex: enables flexbox, flex-grow: allows it to take remaining space, p-8: padding, space-x-8: horizontal space between children */}
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
                               content={tile.content} // Pass tile content
                               note={tile.note} // Pass tile note
                               paddlerName={tile.paddlerName} // Pass paddler name
                               currentPositionId={POSITIONS.UNASSIGNED} // Pass the current position ID
                               currentIndex={index} // Pass index for sorting and header
                               onPaddlerNameChange={handlePaddlerNameChange} // Pass the handler for name changes
                           />
                       );
                   })}
              </UnassignedColumn>

              {/* Container for the drummer, main grid, and sweep - uses Tailwind flexbox for vertical stacking */}
              <div className="main-content-container flex flex-col space-y-8 flex-grow"> {/* flex: enables flexbox, flex-col: stacks children vertically, space-y-8: vertical space between children, flex-grow: allows the container to grow */}
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
                                   content={tile.content}
                                   note={tile.note}
                                   paddlerName={tile.paddlerName}
                                   currentPositionId={POSITIONS.DRUMMER} // Pass the current position ID
                                   onPaddlerNameChange={handlePaddlerNameChange}
                               />
                           );
                       })}
                  </DroppableZone>

                  {/* Main Grid Container for Left/Right Rows - uses Tailwind CSS Grid */}
                  <div className="main-grid-container grid grid-cols-2 gap-4 flex-grow"> {/* grid: enables grid layout, grid-cols-2: two equal columns, gap-4: space between grid items, flex-grow: allows the grid to grow */}
                    {/* Loop through rows (1 to 10) and render Left/Right Droppable Zones */}
                    {Array.from({ length: 10 }).map((_, rowIndex) => (
                        <React.Fragment key={rowIndex}> {/* Use Fragment to group the left and right zones for each row without adding extra DOM nodes */}
                            {/* Left Row Droppable Zone */}
                            <DroppableZone
                                key={generateRowPositionId(rowIndex + 1, 'left')} // Unique key for the left zone
                                id={generateRowPositionId(rowIndex + 1, 'left')} // ID for dnd-kit droppable zone
                                label={`Row ${rowIndex + 1} Left`} // Label
                                occupiedTileId={columns[generateRowPositionId(rowIndex + 1, 'left')]?.tileIds[0]} // ID of the tile in this zone
                            >
                                {/* Render the tile if it's in this left row position */}
                                {columns[generateRowPositionId(rowIndex + 1, 'left')]?.tileIds.map(tileId => {
                                    const tile = getTileById(tileId);
                                    if (!tile) return null;
                                    return (
                                        // Render a SortableItem for the tile in this zone
                                        <SortableItem
                                            key={tileId}
                                            id={tileId}
                                            content={tile.content}
                                            note={tile.note}
                                            paddlerName={tile.paddlerName}
                                            currentPositionId={generateRowPositionId(rowIndex + 1, 'left')} // Pass the current position ID
                                            onPaddlerNameChange={handlePaddlerNameChange}
                                        />
                                    );
                                })}
                            </DroppableZone>
                            {/* Right Row Droppable Zone */}
                            <DroppableZone
                                key={generateRowPositionId(rowIndex + 1, 'right')} // Unique key for the right zone
                                id={generateRowPositionId(rowIndex + 1, 'right')} // ID for dnd-kit droppable zone
                                label={`Row ${rowIndex + 1} Right`} // Label
                                occupiedTileId={columns[generateRowPositionId(rowIndex + 1, 'right')]?.tileIds[0]} // ID of the tile in this zone
                            >
                                {/* Render the tile if it's in this right row position */}
                                {columns[generateRowPositionId(rowIndex + 1, 'right')]?.tileIds.map(tileId => {
                                    const tile = getTileById(tileId);
                                    if (!tile) return null;
                                    return (
                                        // Render a SortableItem for the tile in this zone
                                        <SortableItem
                                            key={tileId}
                                            id={tileId}
                                            content={tile.content}
                                            note={tile.note}
                                            paddlerName={tile.paddlerName}
                                            currentPositionId={generateRowPositionId(rowIndex + 1, 'right')} // Pass the current position ID
                                            onPaddlerNameChange={handlePaddlerNameChange}
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
                      occupiedTileId={columns[POSITIONS.SWEEP]?.tileIds[0]} // ID of the tile in this zone
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
                                   content={tile.content}
                                   note={tile.note}
                                   paddlerName={tile.paddlerName}
                                   currentPositionId={POSITIONS.SWEEP} // Pass the current position ID
                                   onPaddlerNameChange={handlePaddlerNameChange}
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
                  : activeTile.positionId.startsWith(POSITIONS.ROW) ? `Row ${activeTile.positionId.split('-')[1]} ${activeTile.positionId.split('-')[2].charAt(0).toUpperCase() + activeTile.positionId.split('-')[2].slice(1)}`
                  : activeTile.positionId} {/* Fallback display if position ID is not recognized */}
             </div>
            <div className="text-gray-800">{activeTile.content}</div> {/* Display tile content */}
            <div className="text-gray-600 text-sm">{activeTile.note}</div> {/* Display tile note */}
             {/* Paddler Name in Overlay (read-only) */}
             <div className="mt-2">
                <div className="text-xs text-gray-600 mb-1">Paddler Name:</div> {/* Label */}
                <div>{activeTile.paddlerName}</div> {/* Display the paddler name */}
             </div>
          </div>
        ) : null} {/* Render nothing if no item is being dragged */}
      </DragOverlay>
    </DndContext>
  );
}

export default App; // Export the App component for use in index.js
