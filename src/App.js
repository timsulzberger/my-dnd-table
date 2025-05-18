import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  // Import closestCenter collision detection
  closestCenter,
  useDroppable, // Import useDroppable
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import './App.css'; // Keep the existing CSS file

// Initial data for the tiles
// Start with 22 tiles: 1 for drummer, 20 for left/right, 1 for sweep initially
const initialTiles = Array.from({ length: 22 }, (v, k) => { // Increased length to 22 for sweep tile
  const tileId = `tile-${k}`;
  let row, col;

  // Assign the first tile (k=0) to the Drummer section
  if (k === 0) {
      row = 0; // Drummer tile is in row 0
      col = 'top'; // Column type remains 'top' internally for logic
  } else if (k === 1) {
      // Assign the second tile (k=1) to the Sweep section
      row = 0; // Sweep tile is in row 0 within its column
      col = 'bottom'; // New column type for the bottom section
  }
  else {
      // Assign the remaining tiles to the left/right columns
      const adjustedIndex = k - 2; // Adjust index for left/right columns
      row = Math.floor(adjustedIndex / 2);
      col = adjustedIndex % 2 === 0 ? 'left' : 'right';
  }

  return {
    id: tileId,
    content: `Tile ${k + 1}`,
    note: `Note for tile ${k + 1}`,
    row: row,
    col: col,
    paddlerName: k === 0 ? `Drummer` : k === 1 ? `Sweep` : `Paddler ${k + 1}`, // Initial names
  };
});

// Group tiles by column (including 'top', 'left', 'right', 'unassigned', and 'bottom')
const getColumns = (tiles) => {
  const columns = {
    unassigned: { // Column for unassigned tiles
        id: 'unassigned',
        title: 'Unassigned',
        tileIds: [],
    },
    top: { // Column for the single top tile (Drummer)
        id: 'top',
        title: 'Drummer',
        tileIds: [],
    },
    left: {
      id: 'left',
      title: 'Left', // <--- Renamed title here
      tileIds: [],
    },
    right: {
      id: 'right',
      title: 'Right', // <--- Renamed title here
      tileIds: [],
    },
     bottom: { // New column for the single bottom tile (Sweep)
        id: 'bottom',
        title: 'Sweep',
        tileIds: [],
    },
  };

  // Sort tiles by initial row for consistent starting order within their initial columns
  const sortedTiles = [...tiles].sort((a, b) => a.row - b.row);

  sortedTiles.forEach(tile => {
      // Assign tiles to their initial columns
      if (columns[tile.col]) { // Check if the column exists
          columns[tile.col].tileIds.push(tile.id);
      } else {
          // If a tile has a column that doesn't exist, put it in unassigned
          columns.unassigned.tileIds.push(tile.id);
      }
  });

  return columns;
};


// Component for a single draggable tile
function SortableItem({ id, content, note, paddlerName, currentColumnId, currentIndex, onPaddlerNameChange }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
      id,
      // Store the current column ID in the data property
      data: {
          currentColumnId: currentColumnId,
      }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    border: isDragging ? '2px dashed #000' : '1px solid #ddd',
    userSelect: 'none',
    padding: 16,
    marginBottom: 8, // Keep margin bottom for spacing in columns
    backgroundColor: isDragging ? '#263B4A' : '#456C86',
    color: 'white',
    borderRadius: 8, // Increased border radius for more rounded corners
    cursor: isDragging ? 'grabbing' : 'grab', // Add grabbing cursor
    display: 'flex', // Use flexbox for layout
    flexDirection: 'column', // Stack content vertically
    // Adjust width and margin for the top and bottom tiles
    width: (currentColumnId === 'top' || currentColumnId === 'bottom') ? 'calc(100% - 32px)' : 'auto', // Full width minus padding/margin
    margin: (currentColumnId === 'top' || currentColumnId === 'bottom') ? '16px auto' : '0 0 8px 0', // Center top/bottom tiles
    textAlign: (currentColumnId === 'top' || currentColumnId === 'bottom') ? 'center' : 'left', // Center text in top/bottom tiles
  };

  // Prevent drag when interacting with the input field
  const handleInputMouseDown = (event) => {
      event.stopPropagation();
  };

  // Determine the header text based on current position
  let headerText;
  if (currentColumnId === 'top') {
      headerText = 'Drummer';
  } else if (currentColumnId === 'bottom') {
      headerText = 'Sweep';
  }
  else if (currentColumnId === 'unassigned') {
      headerText = `Unassigned Index: ${currentIndex}`;
  }
  else {
      const rowNumber = currentIndex + 1; // Index is 0-based, rows are 1-based
      // Use the column ID directly for the side name
      const columnSide = currentColumnId === 'left' ? 'Left' : 'Right';
      headerText = `Row ${rowNumber} ${columnSide}`;
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

// Component for a droppable column
function DroppableColumn({ children, id, title, tileIds }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className="column"
      style={{
        backgroundColor: isOver ? '#e0e0e0' : 'lightgrey', // Highlight when dragging over
      }}
    >
      <h2>{title}</h2>
      {/* SortableContext is inside the DroppableColumn */}
      <SortableContext items={tileIds} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </div>
  );
}


function App() {
  const [tiles, setTiles] = useState(initialTiles);
  const [columns, setColumns] = useState(getColumns(initialTiles));
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

    // Dropped outside a droppable area
    if (!over) {
      console.log("Dropped outside any droppable area.");
      return;
    }

    // ** Corrected logic to get source and destination column IDs **
    // Source column ID is stored in the active draggable item's data
    const sourceColumnId = active.data.current?.currentColumnId;

    // Destination column ID:
    // If dropped over a SortableItem, get the column ID from that item's data.
    // If dropped over the DroppableColumn container, get the container's ID (which is the column ID).
    const destinationColumnId = over.data.current?.currentColumnId || over.id;


    console.log("Source Column ID (from data):", sourceColumnId);
    console.log("Destination Column ID (from over data or over.id):", destinationColumnId);


    // Ensure both source and destination are valid columns (check if they exist in our columns state)
    if (!sourceColumnId || !destinationColumnId || !columns[sourceColumnId] || !columns[destinationColumnId]) {
        console.error("Invalid drag operation: Could not determine valid source or destination column.");
        console.log("Columns state:", columns); // Log the columns state as well
        return;
    }

    console.log("Valid source and destination columns identified:", sourceColumnId, "->", destinationColumnId);

    const sourceColumn = columns[sourceColumnId];
    const destinationColumn = columns[destinationColumnId];

    const sourceTileIds = Array.from(sourceColumn.tileIds);
    const destinationTileIds = Array.from(destinationColumn.tileIds);

    const activeTileIndexInSource = sourceTileIds.indexOf(active.id);
    // Determine the index in the destination column
    let newIndexInDestination;

    // ** Logic to handle dropping ONTO another tile **
    const droppedOverAnotherTile = over.data.current?.currentColumnId === destinationColumnId && over.id !== destinationColumnId;

    if (droppedOverAnotherTile) {
        console.log(`Dropped over tile: ${over.id}. Moving original tile to Unassigned.`);

        const originalTileId = over.id;
        const originalTileSourceColumnId = over.data.current?.currentColumnId; // Should be the same as destinationColumnId

        // Ensure the original tile is not the one being dragged
        if (originalTileId === active.id) {
             console.warn("Dropped tile onto itself. No change.");
             return;
        }

        const originalTileSourceColumn = columns[originalTileSourceColumnId];
        const originalTileSourceTileIds = Array.from(originalTileSourceColumn.tileIds);
        const originalTileIndexInSource = originalTileSourceTileIds.indexOf(originalTileId);

        // Remove the original tile from its current column
        originalTileSourceTileIds.splice(originalTileIndexInSource, 1);

        // Add the original tile to the Unassigned column
        const unassignedColumn = columns['unassigned'];
        const unassignedTileIds = Array.from(unassignedColumn.tileIds);
        unassignedTileIds.push(originalTileId); // Add to the end of unassigned

        const newOriginalTileSourceColumn = {
            ...originalTileSourceColumn,
            tileIds: originalTileSourceTileIds,
        };

        const newUnassignedColumn = {
            ...unassignedColumn,
            tileIds: unassignedTileIds,
        };

        // Update columns state with the changes for the original tile
        setColumns(prevColumns => ({
            ...prevColumns,
            [newOriginalTileSourceColumn.id]: newOriginalTileSourceColumn,
            [newUnassignedColumn.id]: newUnassignedColumn,
        }));

        // Update the original tile's column and row in the tiles state
        setTiles(prevTiles =>
            prevTiles.map(tile => {
                if (tile.id === originalTileId) {
                    return { ...tile, col: 'unassigned', row: unassignedTileIds.length - 1 }; // Set new column and row
                }
                 // Update rows for tiles in the original tile's source column
                 if (tile.col === newOriginalTileSourceColumn.id) {
                    const newIndex = newOriginalTileSourceColumn.tileIds.indexOf(tile.id);
                    return { ...tile, row: newIndex };
                 }
                return tile;
            })
        );

        // Now, proceed with placing the dragged tile in the original tile's spot
        newIndexInDestination = destinationTileIds.indexOf(over.id); // Index where the original tile was

         // If moving within the same column, and dropping below the original position,
         // the index needs to account for the item being removed from its original spot
          if (sourceColumnId === destinationColumnId && newIndexInDestination > activeTileIndexInSource) {
              newIndexInDestination--;
          }
         console.log("Placing dragged tile at original tile's index:", newIndexInDestination);


    } else if (over.data.current?.currentColumnId === destinationColumnId) {
         // If dropped over a sortable item in the destination column (but not handling the "drop onto" logic here)
         // This case is for inserting between items
         newIndexInDestination = destinationTileIds.indexOf(over.id);
         // If moving within the same column, and dropping below the original position,
         // the index needs to account for the item being removed from its original spot
          if (sourceColumnId === destinationColumnId && newIndexInDestination > activeTileIndexInSource) {
              newIndexInDestination--;
          }
         console.log("Dropped over a sortable item (inserting). New index:", newIndexInDestination);

    } else if (over.id === destinationColumnId) {
        // If dropped directly over the droppable column container (e.g., empty column or at the end)
        newIndexInDestination = destinationTileIds.length; // Add to the end
        console.log("Dropped over the column container. New index (end):", newIndexInDestination);
    } else {
        // This case should ideally be covered by the !over check or the column validation,
        // but as a fallback, log and return if destination index can't be determined
         console.error("Could not determine a valid destination index.");
         console.log("Over object when destination index could not be determined:", over);
         return;
    }


    // Prevent dropping more than one item into the 'top' or 'bottom' column
    if ((destinationColumnId === 'top' || destinationColumnId === 'bottom') && destinationTileIds.length > 0 && sourceColumnId !== 'top' && sourceColumnId !== 'bottom') {
        console.warn(`Cannot drop more than one item in the ${columns[destinationColumnId].title} position.`);
        return; // Prevent the drop
    }


    // Moving within the same column (after potentially moving the original tile)
    if (sourceColumnId === destinationColumnId) {
      console.log("Moving within the same column.");
      const newTileIds = arrayMove(sourceTileIds, activeTileIndexInSource, newIndexInDestination);

      const newColumn = {
        ...sourceColumn,
        tileIds: newTileIds,
      };

      setColumns({
        ...columns,
        [newColumn.id]: newColumn,
      });

       // Update tile row based on new index within the column
       // Note: For simplicity, we are using the index within the column as the 'row'
       // This might not map directly to a fixed 1-10 row number across both columns
       setTiles(prevTiles =>
           prevTiles.map(tile => {
               if (tile.col === newColumn.id) {
                   const newIndex = newColumn.tileIds.indexOf(tile.id);
                   return { ...tile, row: newIndex };
               }
               return tile;
           })
       );


    } else {
      // Moving between columns (after potentially moving the original tile)
      console.log("Moving between columns.");
      // Need to re-get sourceTileIds as it might have been modified if the original tile was in the source column
      const currentSourceTileIds = Array.from(columns[sourceColumnId].tileIds);
      const currentDestinationTileIds = Array.from(columns[destinationColumnId].tileIds);

      const currentActiveTileIndexInSource = currentSourceTileIds.indexOf(active.id);


      const [movedTileId] = currentSourceTileIds.splice(currentActiveTileIndexInSource, 1);
      currentDestinationTileIds.splice(newIndexInDestination, 0, movedTileId);

      const newStartColumn = {
        ...columns[sourceColumnId], // Use current state
        tileIds: currentSourceTileIds,
      };

      const newEndColumn = {
        ...columns[destinationColumnId], // Use current state
        tileIds: currentDestinationTileIds,
      };

      // Update columns state
      setColumns(prevColumns => ({
        ...prevColumns,
        [newStartColumn.id]: newStartColumn,
        [newEndColumn.id]: newEndColumn,
      }));


      // Then update tiles state based on the new column structure
      setTiles(prevTiles => {
          const updatedTiles = prevTiles.map(tile => {
              // Update the moved tile's column and row
              if (tile.id === active.id) {
                  return { ...tile, col: newEndColumn.id, row: newIndexInDestination };
              }
              return tile;
          });

          // Re-calculate rows for tiles in the source column based on the new order
          const tilesInSource = updatedTiles.filter(tile => tile.col === newStartColumn.id)
              .sort((a, b) => newStartColumn.tileIds.indexOf(a.id) - newStartColumn.tileIds.indexOf(b.id)); // Sort by new tileIds order

          // Re-calculate rows for tiles in the destination column based on the new order
          const tilesInDestination = updatedTiles.filter(tile => tile.col === newEndColumn.id)
               .sort((a, b) => newEndColumn.tileIds.indexOf(a.id) - newEndColumn.tileIds.indexOf(b.id)); // Sort by new tileIds order

           // Re-calculate rows for tiles in the unassigned column
           const unassignedColumn = columns['unassigned']; // Get the latest unassigned column state
           const tilesInUnassigned = updatedTiles.filter(tile => tile.col === 'unassigned')
                .sort((a, b) => unassignedColumn.tileIds.indexOf(a.id) - unassignedColumn.tileIds.indexOf(b.id));

            // Re-calculate rows for tiles in the bottom column
            const bottomColumn = columns['bottom']; // Get the latest bottom column state
            const tilesInBottom = updatedTiles.filter(tile => tile.col === 'bottom')
                 .sort((a, b) => bottomColumn.tileIds.indexOf(a.id) - bottomColumn.tileIds.indexOf(b.id));


          // Merge the updated tiles back
          const finalTiles = updatedTiles.map(tile => {
              const sourceMatch = tilesInSource.find(t => t.id === tile.id);
              if (sourceMatch) {
                  return { ...tile, row: tilesInSource.indexOf(sourceMatch) };
              }
               const destMatch = tilesInDestination.find(t => t.id === tile.id);
               if (destMatch) {
                   return { ...tile, row: tilesInDestination.indexOf(destMatch) };
               }
               const unassignedMatch = tilesInUnassigned.find(t => t.id === tile.id);
               if (unassignedMatch) {
                   return { ...tile, row: tilesInUnassigned.indexOf(unassignedMatch) };
               }
                const bottomMatch = tilesInBottom.find(t => t.id === tile.id);
                if (bottomMatch) {
                    return { ...tile, row: tilesInBottom.indexOf(bottomMatch) };
                }
              return tile; // Tile not in any affected column
          });

          return finalTiles;
      });
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
          <div className="unassigned-container">
              <DroppableColumn
                  key="unassigned"
                  id="unassigned"
                  title="Unassigned"
                  tileIds={columns.unassigned.tileIds}
              >
                  {columns.unassigned.tileIds.map((tileId, index) => {
                       const tile = getTileById(tileId);
                       if (!tile) return null;
                       return (
                           <SortableItem
                               key={tileId}
                               id={tileId}
                               content={tile.content}
                               note={tile.note}
                               paddlerName={tile.paddlerName}
                               currentColumnId="unassigned"
                               currentIndex={index}
                               onPaddlerNameChange={handlePaddlerNameChange}
                           />
                       );
                   })}
              </DroppableColumn>
          </div>

          {/* Container for the top (Drummer) and main (Left/Right) columns */}
          <div className="main-content-container">
              {/* Container for the top tile */}
              <div className="top-container">
                  {/* Droppable area for the top tile */}
                  <DroppableColumn
                      key="top" // Use 'top' as the key and ID
                      id="top"
                      title="Drummer" // <--- Renamed title here
                      tileIds={columns.top.tileIds} // Pass tileIds for the top column
                  >
                       {/* Render the single top tile if it exists */}
                       {columns.top.tileIds.map((tileId, index) => {
                           const tile = getTileById(tileId);
                           if (!tile) return null;
                           return (
                               <SortableItem
                                   key={tileId}
                                   id={tileId}
                                   content={tile.content}
                                   note={tile.note}
                                   paddlerName={tile.paddlerName}
                                   currentColumnId="top" // Pass the column ID ('top') directly
                                   currentIndex={index} // Should be 0 for the top tile
                                   onPaddlerNameChange={handlePaddlerNameChange}
                               />
                           );
                       })}
                  </DroppableColumn>
              </div>

              {/* Existing container for the two columns */}
              <div className="container">
                {Object.values(columns).filter(column => column.id !== 'top' && column.id !== 'unassigned' && column.id !== 'bottom').map(column => ( // Filter out 'top', 'unassigned', and 'bottom'
                  // Use the new DroppableColumn component
                  <DroppableColumn
                    key={column.id}
                    id={column.id} // Pass column id as droppableId
                    title={column.title}
                    tileIds={column.tileIds} // Pass tileIds to SortableContext within DroppableColumn
                  >
                     {/* Render SortableItems as children of DroppableColumn */}
                     {column.tileIds.map((tileId, index) => {
                        const tile = getTileById(tileId);
                        if (!tile) return null;

                        return (
                          <SortableItem
                            key={tileId}
                            id={tileId}
                            content={tile.content}
                            note={tile.note}
                            paddlerName={tile.paddlerName} // Pass paddlerName
                            currentColumnId={column.id} // Pass the column ID to the item
                            currentIndex={index} // Pass current index within the column
                            onPaddlerNameChange={handlePaddlerNameChange} // Pass the handler
                          />
                        );
                      })}
                  </DroppableColumn>
                ))}
              </div>

              {/* New container for the bottom tile */}
              <div className="bottom-container">
                  {/* Droppable area for the bottom tile */}
                  <DroppableColumn
                      key="bottom" // Use 'bottom' as the key and ID
                      id="bottom"
                      title="Sweep" // <--- Renamed title here
                      tileIds={columns.bottom.tileIds} // Pass tileIds for the bottom column
                  >
                       {/* Render the single bottom tile if it exists */}
                       {columns.bottom.tileIds.map((tileId, index) => {
                           const tile = getTileById(tileId);
                           if (!tile) return null;
                           return (
                               <SortableItem
                                   key={tileId}
                                   id={tileId}
                                   content={tile.content}
                                   note={tile.note}
                                   paddlerName={tile.paddlerName}
                                   currentColumnId="bottom" // Pass the column ID ('bottom') directly
                                   currentIndex={index} // Should be 0 for the bottom tile
                                   onPaddlerNameChange={handlePaddlerNameChange}
                               />
                           );
                       })}
                  </DroppableColumn>
              </div>
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
                 {activeTile.col === 'top' ? 'Drummer' : activeTile.col === 'bottom' ? 'Sweep' : activeTile.col === 'unassigned' ? `Unassigned Index: ${activeTile.row}` : `Row ${activeTile.row + 1} ${activeTile.col === 'left' ? 'Left' : 'Right'}`}
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
