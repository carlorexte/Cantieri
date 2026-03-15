/**
 * GanttDndProvider - Fornisce il contesto Drag & Drop per il Gantt
 */

import React, { useMemo } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import { ActivityBar } from './ActivityBar';

export function GanttDndProvider({ children, onActivityDrop, onDragStateChange, draggingActivity, dayWidth = 40 }) {
  // Configura sensori per drag con mouse e tastiera
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Devi spostare di 8px per attivare il drag
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Gestisce la fine del drag
  const handleDragEnd = (event) => {
    const { active, delta } = event;

    if (onDragStateChange) {
      onDragStateChange(null);
    }
    
    if (!active || !onActivityDrop) return;
    
    const activity = active.data?.current?.activity;
    if (!activity) return;
    
    // Calcola giorni spostati
    const deltaX = delta.x;
    const deltaDays = Math.round(deltaX / dayWidth);
    
    if (deltaDays !== 0) {
      onActivityDrop(activity.id, deltaDays);
    }
  };

  const handleDragStart = (event) => {
    const activity = event?.active?.data?.current?.activity;
    if (onDragStateChange) {
      onDragStateChange(activity || null);
    }
  };

  const handleDragCancel = () => {
    if (onDragStateChange) {
      onDragStateChange(null);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      modifiers={[snapCenterToCursor]}
    >
      {children}
      
      {/* Overlay durante il drag */}
      <DragOverlay>
        {draggingActivity ? (
          <div className="w-64">
            <ActivityBar
              activity={draggingActivity}
              startDate={draggingActivity.data_inizio}
              duration={draggingActivity.durata_giorni}
              isCritical={draggingActivity._cpmDetails?.isCritical || false}
              canDrag={false}
              viewMode="day"
              timelineStart={draggingActivity.data_inizio}
              dayWidth={dayWidth}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default GanttDndProvider;
