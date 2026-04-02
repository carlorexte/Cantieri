/**
 * ActivityBar con Drag & Drop per Gantt
 *
 * Permette di spostare le attività con drag & drop
 * e aggiornare automaticamente le date
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Flag, Move } from 'lucide-react';

export function ActivityBar({
  activity,
  startDate,
  duration,
  isCritical,
  canDrag = true,
  canResize = true,
  viewMode,
  timelineStart, // Nuova prop: data inizio timeline
  dayWidth = 40, // Nuova prop: pixel per giorno
  barLeft = null,
  barWidth = null,
  onResizeCommit
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isBeingDragged
  } = useDraggable({
    id: `activity-${activity.id}`,
    disabled: !canDrag,
    data: {
      activity,
      type: 'activity'
    }
  });
  const resizeStateRef = useRef(null);
  const [resizePreview, setResizePreview] = useState(null);

  // Calcola larghezza
  const width = duration * dayWidth;

  // Posizionamento: usa coordinate già calcolate dal Gantt se disponibili
  let left = typeof barLeft === 'number' ? barLeft : 0;
  let widthPx = Math.max(typeof barWidth === 'number' ? barWidth : width, 4);

  if (barLeft === null && timelineStart && startDate) {
    try {
      // Converte startDate in stringa se è oggetto Date
      const startStr = startDate instanceof Date 
        ? startDate.toISOString().split('T')[0] 
        : startDate;
      
      const start = new Date(timelineStart + 'T12:00:00');
      const activityStart = new Date(startStr + 'T12:00:00');
      
      if (!isNaN(start.getTime()) && !isNaN(activityStart.getTime())) {
        const diffTime = activityStart.getTime() - start.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        left = diffDays * dayWidth;
      } else {
        left = 0;
      }
    } catch (error) {
      left = 0;
    }
  }

  useEffect(() => () => {
    resizeStateRef.current = null;
  }, []);

  function getResizeSnapshot(clientX) {
    const state = resizeStateRef.current;
    if (!state) return null;

    const rawDeltaDays = Math.round((clientX - state.startX) / dayWidth);
    if (state.edge === 'right') {
      const nextDuration = Math.max(1, state.initialDuration + rawDeltaDays);
      return {
        edge: 'right',
        deltaDays: nextDuration - state.initialDuration,
        nextDuration,
        nextLeft: state.initialLeft,
        nextWidth: nextDuration * dayWidth
      };
    }

    const clampedShift = Math.min(state.initialDuration - 1, rawDeltaDays);
    const nextDuration = Math.max(1, state.initialDuration - clampedShift);

    return {
      edge: 'left',
      deltaDays: clampedShift,
      nextDuration,
      nextLeft: state.initialLeft + (clampedShift * dayWidth),
      nextWidth: nextDuration * dayWidth
    };
  }

  const handleResizeMove = useCallback((event) => {
    const snapshot = getResizeSnapshot(event.clientX);
    if (!snapshot) return;

    setResizePreview({
      left: snapshot.nextLeft,
      width: snapshot.nextWidth,
      duration: snapshot.nextDuration
    });
  }, [dayWidth]);

  const handleResizeEnd = useCallback((event) => {
    const snapshot = getResizeSnapshot(event.clientX);
    window.removeEventListener('mousemove', handleResizeMove);
    window.removeEventListener('mouseup', handleResizeEnd);

    if (resizeStateRef.current) {
      document.body.style.userSelect = 'auto';
      document.body.style.cursor = 'default';
    }

    resizeStateRef.current = null;
    setResizePreview(null);

    if (!snapshot || !onResizeCommit) return;
    if (snapshot.deltaDays === 0 && snapshot.nextDuration === duration) return;

    onResizeCommit(activity.id, {
      edge: snapshot.edge,
      deltaDays: snapshot.deltaDays,
      durationDays: snapshot.nextDuration
    });
  }, [activity.id, duration, handleResizeMove, onResizeCommit]);

  const handleResizeStart = useCallback((edge, event) => {
    if (!canResize) return;
    event.preventDefault();
    event.stopPropagation();

    resizeStateRef.current = {
      edge,
      startX: event.clientX,
      initialLeft: left,
      initialWidth: widthPx,
      initialDuration: Math.max(1, duration)
    };

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';
    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);
  }, [canResize, duration, handleResizeEnd, handleResizeMove, left, widthPx]);

  // Colore in base allo stato
  const getStatusColor = () => {
    if (isCritical) return 'bg-red-500 border-red-700 hover:bg-red-600';
    
    switch(activity.stato) {
      case 'completata': return 'bg-green-500 border-green-700 hover:bg-green-600';
      case 'in_corso': return 'bg-blue-500 border-blue-700 hover:bg-blue-600';
      case 'in_ritardo': return 'bg-orange-500 border-orange-700 hover:bg-orange-600';
      case 'sospesa': return 'bg-slate-500 border-slate-700 hover:bg-slate-600';
      default: return 'bg-indigo-500 border-indigo-700 hover:bg-indigo-600';
    }
  };

  const effectiveLeft = resizePreview?.left ?? left;
  const effectiveWidth = resizePreview?.width ?? widthPx;
  const effectiveDuration = resizePreview?.duration ?? duration;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        absolute h-8 rounded-md border shadow-sm
        flex items-center px-2 gap-2
        ${canDrag ? 'cursor-move' : 'cursor-default'}
        select-none group
        transition-all duration-150
        ${getStatusColor()}
        ${isBeingDragged ? 'opacity-50 scale-105 shadow-xl z-50' : 'opacity-100'}
        hover:shadow-md
      `}
      style={{
        left: `${effectiveLeft}px`,
        width: `${effectiveWidth}px`,
        transform: CSS.Translate.toString(transform)
      }}
    >
      {canResize && (
        <button
          type="button"
          className="absolute left-0 top-0 h-full w-2 cursor-ew-resize rounded-l-md bg-black/10 opacity-0 transition-opacity group-hover:opacity-100"
          onMouseDown={(event) => handleResizeStart('left', event)}
          aria-label="Ridimensiona inizio attività"
        />
      )}

      {/* Icona per attività critiche */}
      {isCritical && (
        <Flag className="w-3 h-3 text-white flex-shrink-0" />
      )}
      
      {/* Testo troncato */}
      <span className="text-xs font-medium text-white truncate flex-1 min-w-0">
        {activity.descrizione}
      </span>
      
      {/* Durata */}
      <Badge variant="secondary" className="text-xs px-1 py-0 h-auto">
        {effectiveDuration}g
      </Badge>

      {/* Icona drag (solo hover) */}
      {canDrag && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <Move className="w-3 h-3 text-white" />
        </div>
      )}

      {canResize && (
        <button
          type="button"
          className="absolute right-0 top-0 h-full w-2 cursor-ew-resize rounded-r-md bg-black/10 opacity-0 transition-opacity group-hover:opacity-100"
          onMouseDown={(event) => handleResizeStart('right', event)}
          aria-label="Ridimensiona fine attività"
        />
      )}
    </div>
  );
}

export default ActivityBar;
