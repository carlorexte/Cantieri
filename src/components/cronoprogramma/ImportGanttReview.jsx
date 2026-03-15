import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MoveHorizontal } from 'lucide-react';
import PlanningGantt from './PlanningGantt';
import { canonicalActivitiesToPlanning } from '@/utils/planningModel';

export default function ImportGanttReview({ activities, onAttivitaUpdate }) {
  if (!activities || activities.length === 0) return null;
  const planningActivities = canonicalActivitiesToPlanning(activities);

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MoveHorizontal className="w-4 h-4 text-indigo-600" />
          Review Gantt
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Badge variant="outline">Drag attivo</Badge>
          Usa questa vista solo per controllare sequenza e allineamento temporale. La correzione massiva di date e testi resta piu rapida nella tabella review.
        </div>

        <div className="rounded-lg border border-slate-200 overflow-hidden bg-white" style={{ height: '52vh', minHeight: '420px' }}>
          <PlanningGantt
            planningActivities={planningActivities}
            onAttivitaUpdate={onAttivitaUpdate}
          />
        </div>
      </CardContent>
    </Card>
  );
}
