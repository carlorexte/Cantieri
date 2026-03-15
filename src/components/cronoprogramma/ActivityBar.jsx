/**
 * ActivityBar con Drag & Drop per Gantt
 * 
 * Permette di spostare le attività con drag & drop
 * e aggiornare automaticamente le date
 */

import React from 'react';
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
  viewMode,
  timelineStart, // Nuova prop: data inizio timeline
  dayWidth = 40, // Nuova prop: pixel per giorno
  barLeft = null,
  barWidth = null
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
        left: `${left}px`,
        width: `${widthPx}px`,
        transform: CSS.Translate.toString(transform)
      }}
    >
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
        {duration}g
      </Badge>

      {/* Icona drag (solo hover) */}
      {canDrag && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <Move className="w-3 h-3 text-white" />
        </div>
      )}
    </div>
  );
}

export default ActivityBar;
