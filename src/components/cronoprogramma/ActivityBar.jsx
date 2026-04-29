/**
 * ActivityBar con Resize per Gantt
 *
 * Le barre possono essere ridimensionate (allungate/accorciate)
 * ma NON spostate orizzontalmente. Per riordinare usare la sidebar.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Flag } from 'lucide-react';

export function ActivityBar({
  activity,
  duration,
  isCritical,
  canResize = true,
  dayWidth = 40,
  barLeft = null,
  barWidth = null,
  onResizeCommit = undefined,
  onProgressClick = undefined
}) {
  const barRef = useRef(null);
  const resizeStateRef = useRef(null);
  const [resizePreview, setResizePreview] = useState(null);

  const width = duration * dayWidth;
  let left = typeof barLeft === 'number' ? barLeft : 0;
  let widthPx = Math.max(typeof barWidth === 'number' ? barWidth : width, 4);

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

  const handleResizeEnd = useCallback(() => {
    const snapshot = getResizeSnapshot(resizeStateRef.current?.startX || 0);
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
  const pct = Math.min(100, Math.max(0, activity.percentuale_completamento || 0));

  return (
    <div
      ref={barRef}
      className={`
        absolute h-8 rounded-md border shadow-sm
        flex items-center px-2 gap-2
        cursor-default select-none group
        transition-all duration-150
        ${getStatusColor()}
        hover:shadow-md
      `}
      style={{
        left: `${effectiveLeft}px`,
        width: `${effectiveWidth}px`
      }}
      onClick={() => onProgressClick?.(activity)}
    >
      {canResize && (
        <button
          type="button"
          className="absolute left-0 top-0 h-full w-2 cursor-ew-resize rounded-l-md bg-black/10 opacity-0 transition-opacity group-hover:opacity-100"
          onMouseDown={(event) => handleResizeStart('left', event)}
          aria-label="Ridimensiona inizio attività"
        />
      )}

      {pct > 0 && (
        <div
          className="absolute inset-y-0 left-0 bg-lime-400/55 pointer-events-none rounded-l-md"
          style={{ width: `${pct}%` }}
        >
          <div className="absolute right-0 inset-y-0 w-0.5 bg-lime-300" />
        </div>
      )}

      {isCritical && (
        <Flag className="w-3 h-3 text-white flex-shrink-0" />
      )}

      <span className="text-xs font-medium text-white truncate flex-1 min-w-0">
        {activity.descrizione}
      </span>

      <Badge variant="secondary" className="text-xs px-1 py-0 h-auto shrink-0">
        {pct > 0 ? `${pct}%` : `${effectiveDuration}g`}
      </Badge>

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
