import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  closestCenter, // Using closestCenter collision detection
  useDroppable, // Import useDroppable
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove, // Re-import arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import './App.css'; // Keep the existing CSS file

// Define the possible positions/zones
const POSITIONS = {
    DRUMMER: 'drummer',
    SWEEP: 'sweep',
    UNASSIGNED: 'unassigned',
    ROW: 'row', // Prefix for row positions
};

// Generate IDs for row positions (e.g., 'row-1-left', 'row-1-right')
const generateRowPositionId = (row, side) => `${POSITIONS.ROW}-${row}-${side}`;

// Initial data for the tiles
// Start with 22 tiles: 1 for drummer, 20 for left/right, 1 for sweep initially
const initialTiles = Array.from({ length: 22 }, (v, k) => {
  const tileId = `tile-${k}`;
  let positionId; // Use positionId instead of col/row directly in initial data

  // Assign the first tile (k=0) to the Drummer section
  if (k === 0) {
      positionId = POSITIONS.DRUMMER;
  } else if (k === 1) {
      // Assign the second tile (k=1) to the Sweep section
      positionId = POSITIONS.SWEEP;
  }
  else {
      // Assign the remaining tiles to the left/right row positions
      const adjustedIndex = k - 2; // Adjust index for left/right positions
      const row = Math.floor(adjustedIndex / 2) + 1; // Rows are 1-based
      const side = adjustedIndex % 2 === 0 ? 'left' : 'right';
      positionId = generateRowPositionId(row, side);
  }

  return {
    id: tileId,
    content: `Tile ${k + 1}`,
    note: `Note for tile ${k + 1}`,
    positionId: positionId, // Store the tile's current position ID
    paddlerName: `Person ${k + 1}`, // Changed default name here
  };
});


// Component for a single draggable tile
function SortableItem({ id, content, note, paddlerName, currentPositionId, currentIndex, onPaddlerNameChange }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
      id,
      // Store the current position ID in the data property
      data: {
          currentPositionId: currentPositionId,
      }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    border: isDragging ? '2px dashed #000' : '1px solid #ddd',
    userSelect: 'none',
    padding: 16,
    // Conditional margin bottom: 8px for unassigned, 0 for single zones, 8px for grid zones
    marginBottom: currentPositionId === POSITIONS.UNASSIGNED ? 8 : (currentPositionId === POSITIONS.DRUMMER || currentPositionId === POSITIONS.SWEEP ? 0 : 8),
    backgroundColor: isDragging ? '#263B4A' : '#456C86',
    color: 'white',
    borderRadius: 8, // Increased border radius for more rounded corners
    cursor: isDragging ? 'grabbing' : 'grab', // Add grabbing cursor
    display: 'flex', // Use flexbox for layout
    flexDirection: 'column', // Stack content vertically
    // Adjust width and margin for the single-tile positions and unassigned
    width: (currentPositionId === POSITIONS.DRUMMER || currentPositionId === POSITIONS.SWEEP) ? 'calc(100% - 32px)' // Full width minus padding/margin for single zones
           : (currentPositionId === POSITIONS.UNASSIGNED ? '150px' // Fixed width for unassigned tiles
              : 'auto'), // Auto width for grid zones
    margin: (currentPositionId === POSITIONS.DRUMMER || currentPositionId === POSITIONS.SWEEP) ? '16px auto' // Center single tiles
            : (currentPositionId === POSITIONS.UNASSIGNED ? '0 auto 8px auto' // Center unassigned tiles and add bottom margin
               : '8px'), // Margin for grid zones
    textAlign: (currentPositionId === POSITIONS.DRUMMER || currentPositionId === POSITIONS.SWEEP) ? 'center' : 'left', // Center text in single tiles
    // Remove height 100% which caused stretching in unassigned
    height: (currentPositionId === POSITIONS.DRUMMER || currentPositionId === POSITIONS.SWEEP) ? 'auto' : 'auto', // Set height to auto
  };

  // Prevent drag when interacting with the input field
  const handleInputMouseDown = (event) => {
      event.stopPropagation();
  };

  // Determine the header text based on current position ID
  let headerText = currentPositionId; // Default to the ID

  if (currentPositionId === POSITIONS.DRUMMER) {
      headerText = 'Drummer';
  } else if (currentPositionId === POSITIONS.SWEEP) {
      headerText = 'Sweep';
  } else if (currentPositionId.startsWith(POSITIONS.ROW)) {
      // Parse row and side from the ID
      const [, row, side] = currentPositionId.split('-');
      headerText = `Row ${row} ${side.charAt(0).toUpperCase() + side.slice(1)}`;
  } else if (currentPositionId === POSITIONS.UNASSIGNED) {
       // For unassigned, we can display the index within the unassigned list
       headerText = `Unassigned Index: ${currentIndex}`; // Use currentIndex prop
  }


  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="tile" // Keep existing class for basic styling
    >
      {/* Display the formatted header */}
      {/* Show header for all positions, including unassigned */}
      <div className="tile-header" style={{ fontWeight: 'bold', marginBottom: '8px' }}>{headerText}</div>
      <div className="tile-content">{content}</div>
      <div className="tile-note">{note}</div>
      {/* Paddler Name Input */}
      <div className="paddler-name-container" onMouseDown={handleInputMouseDown}>
        <label htmlFor={`paddler-${id}`} style={{ fontSize: '0.9em', color: '#eee', marginBottom: '4px' }}>Paddler Name:</label>
        <input
          id={`paddler-${id}`}
          type="text"
          value={paddlerName}
          onChange={(e) => onPaddlerNameChange(id, e.target.value)}
          style={{
            padding: '4px',
            borderRadius: '2px',
            border: '1px solid #ccc',
            fontSize: '1em',
            color: '#333',
            width: 'calc(100% - 10px)', // Adjust input width
          }}
        />
      </div>
    </div>
  );
}

// Component for a single droppable zone (can hold one tile)
function DroppableZone({ children, id, label, occupiedTileId }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`droppable-zone ${id} ${isOver ? 'is-over' : ''}`} // Add classes for styling
      style={{
        border: `1px dashed ${isOver ? '#000' : '#ccc'}`, // Highlight when dragging over
        backgroundColor: isOver ? '#e0e0e0' : (occupiedTileId ? 'lightcoral' : 'lightgreen'), // Indicate occupied/empty
        padding: '8px',
        margin: '4px', // Space between zones
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100px', // Minimum height for empty zones
        borderRadius: 4,
      }}
    >
      {!occupiedTileId && <div style={{ color: '#555' }}>{label}</div>} {/* Show label if empty */}
      {children} {/* Render the tile if it's assigned to this zone */}
    </div>
  );
}

// Component for the Unassigned column (uses SortableContext)
function UnassignedColumn({ children, id, title, tileIds }) {
    const { setNodeRef, isOver } = useDroppable({ id }); // Still a droppable area

    return (
        <div
          ref={setNodeRef}
          className="unassigned-column" // Specific class for styling
          style={{
              backgroundColor: isOver ? '#e0e0e0' : 'lightgrey', // Highlight when dragging over
              display: 'flex',
              flexDirection: 'column',
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              minWidth: '150px',
              marginRight: '20px',
              alignItems: 'center', // Center items horizontally in unassigned
          }}
        >
          <h2>{title}</h2>
          <SortableContext items={tileIds} strategy={verticalListSortingStrategy}>
            {children} {/* Render the sortable items */}
          </SortableContext>
        </div>
    );
}


function App() {
  const [tiles, setTiles] = useState(initialTiles);
  // We'll still use columns to group tile IDs by their current position ID
  const [columns, setColumns] = useState({}); // Initialize as empty, populate in useEffect or initial setup

  // Populate columns state based on initialTiles
  useState(() => {
      const initialColumns = {
          [POSITIONS.UNASSIGNED]: { id: POSITIONS.UNASSIGNED, title: 'Unassigned', tileIds: [] },
          [POSITIONS.DRUMMER]: { id: POSITIONS.DRUMMER, title: 'Drummer', tileIds: [] },
          [POSITIONS.SWEEP]: { id: POSITIONS.SWEEP, title: 'Sweep', tileIds: [] },
          // Add entries for each row position (e.g., 'row-1-left', 'row-1-right')
          ...Array.from({ length: 10 }).reduce((acc, _, rowIndex) => {
              acc[generateRowPositionId(rowIndex + 1, 'left')] = { id: generateRowPositionId(rowIndex + 1, 'left'), title: `Row ${rowIndex + 1} Left`, tileIds: [] };
              acc[generateRowPositionId(rowIndex + 1, 'right')] = { id: generateRowPositionId(rowIndex + 1, 'right'), title: `Row ${rowIndex + 1} Right`, tileIds: [] };
              return acc;
          }, {}),
      };

      // Distribute initial tiles into the correct positionIds
      initialTiles.forEach(tile => {
          if (initialColumns[tile.positionId]) { // Check if the column/position exists
              initialColumns[tile.positionId].tileIds.push(tile.id);
          } else {
              // If a tile has an invalid positionId, put it in unassigned
              initialColumns[POSITIONS.UNASSIGNED].tileIds.push(tile.id);
          }
      });

      setColumns(initialColumns);
  }, []); // Run only once on mount


  const [activeId, setActiveId] = useState(null); // State to track active dragged item for DragOverlay

  // Sensors to activate drag (pointer and keyboard)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Start dragging after 5px movement
      },
    }),
    useSensor(KeyboardSensor, {})
  );

  // Get tile data by ID (helper function)
  const getTileById = (id) => tiles.find(tile => tile.id === id);

  // Handle Paddler Name input changes
  const handlePaddlerNameChange = (tileId, newName) => {
    setTiles(prevTiles =>
      prevTiles.map(tile =>
        tile.id === tileId ? { ...tile, paddlerName: newName } : tile
      )
    );
  };


  const onDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const onDragEnd = (result) => {
    const { active, over } = result;

    setActiveId(null); // Clear active dragged item

    // Log the active and over objects for debugging
    console.log("Drag ended. Active:", active);
    console.log("Drag ended. Over:", over);

    // Dropped outside a droppable area or over the same item
    if (!over || active.id === over.id) {
      console.log(!over ? "Dropped outside any droppable area." : "Dropped onto the same item.");
      return;
    }

    const draggedTileId = active.id;
    const sourcePositionId = active.data.current?.currentPositionId;
    const overId = over.id; // Get the ID of the element being dragged over

    console.log("Dragged Tile ID:", draggedTileId);
    console.log("Source Position ID:", sourcePositionId);
    console.log("Over ID:", overId); // Log the overId


    // Determine the actual destination column ID
    let destinationColumnId = null;
    let droppedOverTileInUnassigned = null; // To store the tile being dropped over in unassigned

    // Check if the overId is a known column/zone ID
    if (columns[overId]) {
        destinationColumnId = overId;
    } else {
        // If not a column ID, check if it's a tile within the Unassigned column
        const tileInUnassigned = tiles.find(tile => tile.id === overId && tile.positionId === POSITIONS.UNASSIGNED);
        if (tileInUnassigned) {
            destinationColumnId = POSITIONS.UNASSIGNED;
            droppedOverTileInUnassigned = tileInUnassigned;
        }
    }

    // ** Special handling for dropping a tile back onto its single-tile source zone **
    // If the determined destination is the same as the source, and the source is a single-tile zone,
    // and the dragged tile is still in that source's tileIds (meaning it wasn't successfully moved out),
    // we treat the intended destination as Unassigned.
    if (destinationColumnId === sourcePositionId && sourcePositionId !== POSITIONS.UNASSIGNED && columns[sourcePositionId]?.tileIds.includes(draggedTileId)) {
        console.log(`Dropped back onto source single-tile zone (${sourcePositionId}). Treating destination as Unassigned.`);
        destinationColumnId = POSITIONS.UNASSIGNED;
        // In this specific case, the drop is onto the container, so add to the end of unassigned
        droppedOverTileInUnassigned = null; // Ensure this is null as we are not dropping over a specific tile
    }


    // If we couldn't determine a valid destination column after the special handling, return
    if (!destinationColumnId || !columns[sourcePositionId]) {
         console.error("Invalid drag operation: Could not determine valid source or final destination position.");
         console.log("Columns state:", columns);
         return;
    }

    const destinationColumn = columns[destinationColumnId];
    const destinationTileIds = Array.from(destinationColumn.tileIds); // Use the determined destinationColumnId


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

            // Add original tile to unassigned column
            nextColumns[POSITIONS.UNASSIGNED] = {
                ...columns[POSITIONS.UNASSIGNED],
                tileIds: [...columns[POSITIONS.UNASSIGNED].tileIds, originalTileId],
            };

            // Place dragged tile in destination column
            nextColumns[destinationColumnId] = {
                ...columns[destinationColumnId],
                tileIds: [draggedTileId], // Destination now contains only the dragged tile
            };

            // Update the positionId for the dragged tile
            const draggedTile = nextTiles.find(tile => tile.id === draggedTileId);
            if (draggedTile) {
                draggedTile.positionId = destinationColumnId;
            }

            // Update the positionId for the original tile
            const originalTile = nextTiles.find(tile => tile.id === originalTileId);
            if (originalTile) {
                originalTile.positionId = POSITIONS.UNASSIGNED;
            }

            // Update state
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

             // Place dragged tile in destination column
             nextColumns[destinationColumnId] = {
                 ...columns[destinationColumnId],
                 tileIds: [draggedTileId], // Destination now contains only the dragged tile
             };

             // Update the positionId for the dragged tile
             const draggedTile = nextTiles.find(tile => tile.id === draggedTileId);
             if (draggedTile) {
                 draggedTile.positionId = destinationColumnId;
             }

             // Update state
             setColumns(nextColumns);
             setTiles(nextTiles);
        }


    } else {
        // ** Logic for dropping into the Unassigned column (which is a sortable list) **
        console.log("Dropped into Unassigned column.");

        // Get the current tile IDs for the unassigned column
        const currentUnassignedTileIds = Array.from(columns[POSITIONS.UNASSIGNED]?.tileIds || []);

        // Determine the drop index within the unassigned list
        let dropIndexInUnassigned = currentUnassignedTileIds.length; // Default to end

        if (droppedOverTileInUnassigned) {
             // Dropped over a specific tile within the unassigned list
             dropIndexInUnassigned = currentUnassignedTileIds.indexOf(droppedOverTileInUnassigned.id);
             // Adjust index if moving within unassigned and dropping below original position
             if (sourcePositionId === POSITIONS.UNASSIGNED && currentUnassignedTileIds.indexOf(draggedTileId) !== -1 && dropIndexInUnassigned > currentUnassignedTileIds.indexOf(draggedTileId)) {
                 dropIndexInUnassigned--;
             }
        } else if (destinationColumnId === POSITIONS.UNASSIGNED) {
             // Dropped directly onto the Unassigned column container (or redirected here by special handling)
             dropIndexInUnassigned = currentUnassignedTileIds.length; // Add to the end
        } else {
            // This case should ideally not be reached with the updated destinationColumnId logic,
            // but as a fallback, log an error and return.
            console.error("Could not determine valid drop index in Unassigned column.");
            return;
        }


         // Calculate the next state for columns and tiles
         const nextColumns = { ...columns };
         const nextTiles = [...tiles]; // Create a copy of tiles

         // Remove dragged tile from source column (if it's not already unassigned)
         if (sourcePositionId !== POSITIONS.UNASSIGNED) {
             nextColumns[sourcePositionId] = {
                 ...columns[sourcePositionId],
                 tileIds: columns[sourcePositionId].tileIds.filter(id => id !== draggedTileId),
             };

              // Update rows for tiles in the source column
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
             // Adding a tile from another column
             newUnassignedTileIds = Array.from(currentUnassignedTileIds);
             newUnassignedTileIds.splice(dropIndexInUnassigned, 0, draggedTileId);
         } else {
             // Moving within the unassigned column
             const oldIndex = currentUnassignedTileIds.indexOf(draggedTileId);
             if (oldIndex !== -1) {
                  newUnassignedTileIds = arrayMove(
                      currentUnassignedTileIds,
                      oldIndex,
                      dropIndexInUnassigned
                  );
             } else {
                 // Should not happen if source is unassigned, but as a fallback
                 newUnassignedTileIds = Array.from(currentUnassignedTileIds);
             }
         }


         nextColumns[POSITIONS.UNASSIGNED] = {
             ...columns[POSITIONS.UNASSIGNED],
             tileIds: newUnassignedTileIds,
         };

         // Update the positionId for the dragged tile in the nextTiles state
         const draggedTile = nextTiles.find(tile => tile.id === draggedTileId);
         if (draggedTile) {
             draggedTile.positionId = POSITIONS.UNASSIGNED;
             // Update the row property for sortable lists based on the new index
             draggedTile.row = newUnassignedTileIds.indexOf(draggedTileId);
         }

         // Update rows for all tiles in the unassigned column based on the new order
          const tilesInUnassigned = nextTiles.filter(tile => tile.positionId === POSITIONS.UNASSIGNED)
               .sort((a, b) => nextColumns[POSITIONS.UNASSIGNED].tileIds.indexOf(a.id) - nextColumns[POSITIONS.UNASSIGNED].tileIds.indexOf(b.id));

           tilesInUnassigned.forEach((tile, index) => {
               const tileToUpdate = nextTiles.find(t => t.id === tile.id);
               if(tileToUpdate) tileToUpdate.row = index;
           });


         // Update state
         setColumns(nextColumns);
         setTiles(nextTiles);
    }
  };

   const onDragCancel = () => {
    setActiveId(null); // Clear active dragged item if drag is cancelled
  };


  // Find the active tile data for the DragOverlay
  const activeTile = activeId ? getTileById(activeId) : null;


  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter} // Using closestCenter for more tolerance
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      {/* Main layout container */}
      <div className="app-layout">
          {/* Container for the Unassigned column */}
          {/* Unassigned column uses the UnassignedColumn component */}
          <UnassignedColumn
              key={POSITIONS.UNASSIGNED}
              id={POSITIONS.UNASSIGNED}
              title="Unassigned"
              tileIds={columns[POSITIONS.UNASSIGNED]?.tileIds || []} // Use optional chaining and default to empty array
          >
              {columns[POSITIONS.UNASSIGNED]?.tileIds.map((tileId, index) => {
                   const tile = getTileById(tileId);
                   if (!tile) return null;
                   return (
                       <SortableItem
                           key={tileId}
                           id={tileId}
                           content={tile.content}
                           note={tile.note}
                           paddlerName={tile.paddlerName}
                           currentPositionId={POSITIONS.UNASSIGNED} // Pass the position ID
                           currentIndex={index} // Pass index for sorting and header
                           onPaddlerNameChange={handlePaddlerNameChange}
                       />
                   );
               })}
          </UnassignedColumn>

          {/* Container for the drummer, main grid, and sweep */}
          <div className="main-content-container">
              {/* Drummer Droppable Zone */}
              <DroppableZone
                  key={POSITIONS.DRUMMER}
                  id={POSITIONS.DRUMMER}
                  label="Drummer"
                  occupiedTileId={columns[POSITIONS.DRUMMER]?.tileIds[0]} // Pass the ID of the tile in this zone
              >
                   {/* Render the tile if it's in the Drummer position */}
                   {columns[POSITIONS.DRUMMER]?.tileIds.map(tileId => {
                       const tile = getTileById(tileId);
                       if (!tile) return null;
                       return (
                           <SortableItem
                               key={tileId}
                               id={tileId}
                               content={tile.content}
                               note={tile.note}
                               paddlerName={tile.paddlerName}
                               currentPositionId={POSITIONS.DRUMMER} // Pass the position ID
                               onPaddlerNameChange={handlePaddlerNameChange}
                           />
                       );
                   })}
              </DroppableZone>

              {/* Main Grid Container for Left/Right Rows */}
              <div className="main-grid-container">
                {/* Loop through rows and render Left/Right Droppable Zones */}
                {Array.from({ length: 10 }).map((_, rowIndex) => (
                    <React.Fragment key={rowIndex}> {/* Use Fragment for grouping */}
                        {/* Left Row Droppable Zone */}
                        <DroppableZone
                            key={generateRowPositionId(rowIndex + 1, 'left')}
                            id={generateRowPositionId(rowIndex + 1, 'left')}
                            label={`Row ${rowIndex + 1} Left`}
                            occupiedTileId={columns[generateRowPositionId(rowIndex + 1, 'left')]?.tileIds[0]}
                        >
                            {columns[generateRowPositionId(rowIndex + 1, 'left')]?.tileIds.map(tileId => {
                                const tile = getTileById(tileId);
                                if (!tile) return null;
                                return (
                                    <SortableItem
                                        key={tileId}
                                        id={tileId}
                                        content={tile.content}
                                        note={tile.note}
                                        paddlerName={tile.paddlerName}
                                        currentPositionId={generateRowPositionId(rowIndex + 1, 'left')}
                                        onPaddlerNameChange={handlePaddlerNameChange}
                                    />
                                );
                            })}
                        </DroppableZone>
                        {/* Right Row Droppable Zone */}
                        <DroppableZone
                            key={generateRowPositionId(rowIndex + 1, 'right')}
                            id={generateRowPositionId(rowIndex + 1, 'right')}
                            label={`Row ${rowIndex + 1} Right`}
                            occupiedTileId={columns[generateRowPositionId(rowIndex + 1, 'right')]?.tileIds[0]}
                        >
                            {columns[generateRowPositionId(rowIndex + 1, 'right')]?.tileIds.map(tileId => {
                                const tile = getTileById(tileId);
                                if (!tile) return null;
                                return (
                                    <SortableItem
                                        key={tileId}
                                        id={tileId}
                                        content={tile.content}
                                        note={tile.note}
                                        paddlerName={tile.paddlerName}
                                        currentPositionId={generateRowPositionId(rowIndex + 1, 'right')}
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
                  key={POSITIONS.SWEEP}
                  id={POSITIONS.SWEEP}
                  label="Sweep"
                  occupiedTileId={columns[POSITIONS.SWEEP]?.tileIds[0]} // Pass the ID of the tile in this zone
              >
                   {/* Render the tile if it's in the Sweep position */}
                   {columns[POSITIONS.SWEEP]?.tileIds.map(tileId => {
                       const tile = getTileById(tileId);
                       if (!tile) return null;
                       return (
                           <SortableItem
                               key={tileId}
                               id={tileId}
                               content={tile.content}
                               note={tile.note}
                               paddlerName={tile.paddlerName}
                               currentPositionId={POSITIONS.SWEEP} // Pass the position ID
                               onPaddlerNameChange={handlePaddlerNameChange}
                           />
                       );
                   })}
              </DroppableZone>
          </div>
      </div>


      {/* DragOverlay to show a preview of the item being dragged */}
      <DragOverlay>
        {activeId && activeTile ? (
          <div
            className="tile" // Use the same tile styling for the overlay
             style={{
                userSelect: 'none',
                padding: 16,
                margin: '0 0 8px 0',
                backgroundColor: '#263B4A', // Darker background for drag preview
                color: 'white',
                borderRadius: 8, // Apply rounded corners to the overlay as well
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)', // Add a shadow
                cursor: 'grabbing',
                // Transform is handled by DragOverlay
                width: '200px', // Give the overlay a fixed width if needed
             }}
          >
            {/* Display position based on the tile's position *before* the drag started */}
             <div className="tile-header" style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                 {activeTile.positionId === POSITIONS.DRUMMER ? 'Drummer'
                  : activeTile.positionId === POSITIONS.SWEEP ? 'Sweep'
                  : activeTile.positionId === POSITIONS.UNASSIGNED ? `Unassigned Index: ${columns[POSITIONS.UNASSIGNED]?.tileIds.indexOf(activeTile.id)}` // Display current index in unassigned
                  : activeTile.positionId.startsWith(POSITIONS.ROW) ? `Row ${activeTile.positionId.split('-')[1]} ${activeTile.positionId.split('-')[2].charAt(0).toUpperCase() + activeTile.positionId.split('-')[2].slice(1)}`
                  : activeTile.positionId} {/* Fallback display */}
             </div>
            <div className="tile-content">{activeTile.content}</div>
            <div className="tile-note">{activeTile.note}</div>
             {/* Paddler Name in Overlay (read-only) */}
             <div className="paddler-name-container">
                <div style={{ fontSize: '0.9em', color: '#eee', marginBottom: '4px' }}>Paddler Name:</div>
                <div>{activeTile.paddlerName}</div> {/* Display the name */}
             </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default App;
