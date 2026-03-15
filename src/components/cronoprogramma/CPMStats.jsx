/**
 * Componente per visualizzare le statistiche del progetto basate sul CPM
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Flag, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  CalendarRange,
  AlertCircle
} from 'lucide-react';

export function CPMStats({ cpmResult }) {
  if (!cpmResult) return null;

  const stats = {
    totalActivities: cpmResult.results.length,
    criticalActivities: cpmResult.criticalPath.length,
    overConstrained: cpmResult.results.filter(r => r.isOverconstrained).length,
    withFloat: cpmResult.results.filter(r => r.totalFloat > 0).length,
    avgFloat: cpmResult.results.reduce((acc, r) => acc + r.totalFloat, 0) / cpmResult.results.length,
    errors: cpmResult.errors.length,
    warnings: cpmResult.warnings.length
  };

  const criticalPercentage = Math.round((stats.criticalActivities / stats.totalActivities) * 100);
  
  // Determina stato di salute del progetto
  let healthStatus = 'good';
  let healthColor = 'bg-green-500';
  let healthLabel = 'Buono';
  
  if (stats.overConstrained > 0 || stats.errors > 0) {
    healthStatus = 'critical';
    healthColor = 'bg-red-500';
    healthLabel = 'Critico';
  } else if (stats.avgFloat < 3) {
    healthStatus = 'warning';
    healthColor = 'bg-yellow-500';
    healthLabel = 'Attenzione';
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Durata Progetto */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50 to-indigo-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-indigo-700 flex items-center gap-2">
            <CalendarRange className="w-4 h-4" />
            Durata Progetto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-indigo-900">
            {cpmResult.projectDuration} giorni
          </div>
          <div className="text-xs text-indigo-600 mt-1">
            {cpmResult.projectStartDate} → {cpmResult.projectEndDate}
          </div>
        </CardContent>
      </Card>

      {/* Attività Critiche */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-red-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
            <Flag className="w-4 h-4" />
            Percorso Critico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold text-red-900">
              {stats.criticalActivities}
            </div>
            <div className="text-xs text-red-600">
              su {stats.totalActivities} ({criticalPercentage}%)
            </div>
          </div>
          <Progress value={criticalPercentage} className="h-2 mt-2 bg-red-200" />
        </CardContent>
      </Card>

      {/* Salute Progetto */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-emerald-700 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Salute Progetto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${healthColor}`} />
            <div className="text-2xl font-bold text-emerald-900">
              {healthLabel}
            </div>
          </div>
          <div className="text-xs text-emerald-600 mt-1">
            Float medio: {Math.round(stats.avgFloat * 10) / 10} giorni
          </div>
        </CardContent>
      </Card>

      {/* Problemi */}
      <Card className={`border-0 shadow-sm bg-gradient-to-br ${
        stats.overConstrained > 0 || stats.errors > 0
          ? 'from-amber-50 to-amber-100'
          : 'from-slate-50 to-slate-100'
      }`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {stats.overConstrained > 0 || stats.errors > 0 ? (
              <AlertTriangle className="w-4 h-4 text-amber-700" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-slate-700" />
            )}
            Problemi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <div className={`text-2xl font-bold ${
              stats.overConstrained > 0 || stats.errors > 0
                ? 'text-amber-900'
                : 'text-slate-900'
            }`}>
              {stats.overConstrained + stats.errors}
            </div>
            <div className="text-xs text-slate-600">
              totali
            </div>
          </div>
          <div className="text-xs text-slate-600 mt-1">
            {stats.overConstrained} vincoli conflittuali
          </div>
        </CardContent>
      </Card>

      {/* Errori e Warning */}
      {(stats.errors > 0 || stats.warnings > 0) && (
        <Card className="col-span-full border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Dettagli Problemi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.errors > 0 && (
              <div className="mb-3">
                <div className="text-xs font-semibold text-red-800 mb-1">Errori:</div>
                <ul className="text-xs text-red-700 space-y-1">
                  {cpmResult.errors.map((error, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-red-500">•</span>
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {stats.warnings > 0 && (
              <div>
                <div className="text-xs font-semibold text-amber-800 mb-1">Warning:</div>
                <ul className="text-xs text-amber-700 space-y-1">
                  {cpmResult.warnings.slice(0, 5).map((warning, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-500">•</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                  {stats.warnings > 5 && (
                    <li className="text-amber-600 italic">
                      + altri {stats.warnings - 5} warning
                    </li>
                  )}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Componente per visualizzare i dettagli di un'attività CPM
 */
export function ActivityCPMDetails({ activity, cpmDetails }) {
  if (!cpmDetails) return null;

  const {
    earlyStart,
    earlyFinish,
    lateStart,
    lateFinish,
    totalFloat,
    freeFloat,
    isCritical,
    isOverconstrained,
    data_inizio_calcolata,
    data_fine_calcolata
  } = cpmDetails;

  return (
    <div className="text-xs space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
      <div className="font-semibold text-slate-700 mb-2">
        {activity.descrizione}
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-slate-500">Inizio (Early)</div>
          <div className="font-medium text-slate-900">
            Giorno {earlyStart} ({data_inizio_calcolata})
          </div>
        </div>
        <div>
          <div className="text-slate-500">Fine (Early)</div>
          <div className="font-medium text-slate-900">
            Giorno {earlyFinish} ({data_fine_calcolata})
          </div>
        </div>
        <div>
          <div className="text-slate-500">Inizio (Late)</div>
          <div className="font-medium text-slate-900">
            Giorno {lateStart}
          </div>
        </div>
        <div>
          <div className="text-slate-500">Fine (Late)</div>
          <div className="font-medium text-slate-900">
            Giorno {lateFinish}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 pt-2 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 text-blue-600" />
          <span className="text-slate-600">Total Float:</span>
          <span className={`font-semibold ${
            totalFloat === 0 ? 'text-red-600' : 
            totalFloat < 3 ? 'text-amber-600' : 'text-green-600'
          }`}>
            {totalFloat} giorni
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3 h-3 text-purple-600" />
          <span className="text-slate-600">Free Float:</span>
          <span className="font-semibold text-slate-900">
            {freeFloat} giorni
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
        {isCritical && (
          <Badge className="bg-red-500 text-white">
            <Flag className="w-3 h-3 mr-1" />
            Critica
          </Badge>
        )}
        {isOverconstrained && (
          <Badge className="bg-amber-500 text-white">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Vincoli Conflittuali
          </Badge>
        )}
        {!isCritical && !isOverconstrained && (
          <Badge className="bg-green-500 text-white">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            OK
          </Badge>
        )}
      </div>
    </div>
  );
}

/**
 * Componente per visualizzare la lista delle attività critiche
 */
export function CriticalPathList({ cpmResult, onActivityClick }) {
  if (!cpmResult || !cpmResult.criticalPath?.length) return null;

  const criticalActivities = cpmResult.results
    .filter(r => r.isCritical)
    .map(r => r.activity);

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-red-800 flex items-center gap-2">
          <Flag className="w-4 h-4" />
          Percorso Critico ({criticalActivities.length} attività)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 max-h-64 overflow-auto">
          {criticalActivities.map((att, idx) => (
            <div
              key={att.id}
              className="flex items-center gap-2 text-sm p-2 hover:bg-red-100 rounded cursor-pointer transition-colors"
              onClick={() => onActivityClick?.(att)}
            >
              <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-red-900 truncate">
                  {att.descrizione}
                </div>
                <div className="text-xs text-red-600">
                  {att.durata_giorni} giorni
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
