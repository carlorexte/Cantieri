import React, { useMemo } from 'react';
import PrimusGantt from './PrimusGantt';
import { planningActivitiesToGantt } from '@/utils/planningModel';

export default function PlanningGantt({
  planningActivities,
  sals = [],
  cantiere = null,
  onAddAttivita = () => {},
  onEditAttivita = () => {},
  onAttivitaUpdate,
  onProgressUpdate = undefined,
  isSectionFullView = false,
  onToggleSectionFullView = () => {}
}) {
  const ganttActivities = useMemo(
    () => planningActivitiesToGantt(planningActivities || []),
    [planningActivities]
  );

  return (
    <PrimusGantt
      attivita={ganttActivities}
      sals={sals}
      cantiere={cantiere}
      onAddAttivita={onAddAttivita}
      onEditAttivita={onEditAttivita}
      onAttivitaUpdate={onAttivitaUpdate}
      onProgressUpdate={onProgressUpdate}
      isSectionFullView={isSectionFullView}
      onToggleSectionFullView={onToggleSectionFullView}
    />
  );
}
