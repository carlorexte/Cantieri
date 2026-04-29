/**
 * GanttDndProvider - Wrapper per il Gantt
 * 
 * Non gestisce più drag delle barre (ora solo resize).
 * Il riordinamento righe avviene tramite drag nativo HTML5 nella sidebar.
 */

import React from 'react';

export function GanttDndProvider({ children }) {
  return (
    <div className="gantt-dnd-context">
      {children}
    </div>
  );
}

export default GanttDndProvider;
