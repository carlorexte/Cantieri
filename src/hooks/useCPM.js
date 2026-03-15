/**
 * Hook React per utilizzare il CPM Engine nel contesto del Gantt
 * 
 * Fornisce:
 * - Calcolo automatico date basate su dipendenze
 * - Rilevamento percorso critico
 * - Propagazione cambiamenti in cascata
 * - Conversione date giorno <-> data calendario
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { CPMEngine, DependencyType, validateActivities, dayNumberToDate, dateToDayNumber } from '@/utils/cpmEngine';

function normalizeDateForCPM(inputDate) {
  if (!inputDate) return null;
  if (typeof inputDate === 'string') return inputDate;
  if (inputDate instanceof Date && !Number.isNaN(inputDate.getTime())) {
    return inputDate.toISOString().split('T')[0];
  }
  return null;
}

/**
 * Hook per gestire il calcolo CPM delle attività
 * @param {Array} attivita - Lista di attività dal database
 * @param {string} dataInizioProgetto - Data inizio progetto (YYYY-MM-DD)
 * @returns {Object} Oggetto con risultati CPM e funzioni utility
 */
export function useCPM(attivita, dataInizioProgetto) {
  const [cpmResult, setCpmResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Converte attività dal formato database a formato CPM
  const convertToCPMFormat = useCallback((rawAttivita, projectStartDate) => {
    if (!rawAttivita) return [];

    return rawAttivita.map(att => {
      // Converte predecessori dal formato database a formato CPM
      const predecessori = (att.predecessori || []).map(pred => ({
        id: pred.attivita_id || pred.id,
        tipo: pred.tipo_dipendenza || pred.tipo || 'FS',
        lag: pred.lag_giorni || pred.lag || 0
      }));

      // Converte vincoli se presenti
      let vincolo = null;
      if (att.vincolo_tipo && att.vincolo_data) {
        vincolo = {
          tipo: att.vincolo_tipo,
          data: att.vincolo_data
        };
      }

      return {
        id: att.id,
        descrizione: att.descrizione,
        durata_giorni: att.durata_giorni || 1,
        predecessori,
        vincolo,
        data_inizio_prevista: att.data_inizio,
        data_fine_prevista: att.data_fine,
        // Metadati per la UI
        colore: att.colore,
        stato: att.stato,
        percentuale_completamento: att.percentuale_completamento,
        tipo_attivita: att.tipo_attivita || 'task'
      };
    });
  }, []);

  // Esegue il calcolo CPM
  const calculateCPM = useCallback(() => {
    if (!attivita || !dataInizioProgetto) {
      setError('Dati insufficienti per il calcolo CPM');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Converte attività
      const cpmActivities = convertToCPMFormat(attivita, dataInizioProgetto);

      // Valida attività
      const validation = validateActivities(cpmActivities);
      if (!validation.valid) {
        setError(validation.errors.join(', '));
        setIsLoading(false);
        return null;
      }

      if (validation.warnings.length > 0) {
        console.warn('Warnings validazione attività:', validation.warnings);
      }

      // Crea engine e calcola
      const engine = new CPMEngine(cpmActivities);
      const result = engine.calculate();

      // Converte risultati in date reali
      const resultsWithDates = result.results.map(r => ({
        ...r,
        data_inizio_calcolata: dayNumberToDate(r.earlyStart, dataInizioProgetto),
        data_fine_calcolata: dayNumberToDate(r.earlyFinish, dataInizioProgetto),
        data_inizio_latest: dayNumberToDate(r.lateStart, dataInizioProgetto),
        data_fine_latest: dayNumberToDate(r.lateFinish, dataInizioProgetto)
      }));

      const finalResult = {
        ...result,
        results: resultsWithDates,
        projectStartDate: dataInizioProgetto,
        projectEndDate: dayNumberToDate(result.projectEnd, dataInizioProgetto),
        projectDuration: result.projectEnd
      };

      setCpmResult(finalResult);
      setIsLoading(false);
      return finalResult;

    } catch (err) {
      console.error('Errore calcolo CPM:', err);
      setError(err.message || 'Errore sconosciuto nel calcolo CPM');
      setIsLoading(false);
      return null;
    }
  }, [attivita, dataInizioProgetto, convertToCPMFormat]);

  // Esegue calcolo automatico quando cambiano i dati
  useEffect(() => {
    if (attivita && attivita.length > 0 && dataInizioProgetto) {
      calculateCPM();
    }
  }, [attivita, dataInizioProgetto, calculateCPM]);

  // Funzione per reschedulare un'attività con propagazione
  const rescheduleActivity = useCallback((activityId, newStartDate) => {
    if (!cpmResult) return null;

    const engine = new CPMEngine(
      cpmResult.results.map(r => r.activity)
    );
    
    // Ripristina risultati precedenti
    cpmResult.results.forEach(r => {
      engine.results.set(r.activity.id, { ...r });
    });

    // Converte nuova data in giorno numerico
    const normalizedNewStartDate = normalizeDateForCPM(newStartDate);
    const newDayNumber = dateToDayNumber(normalizedNewStartDate, dataInizioProgetto);
    if (!newDayNumber) {
      setError('Data non valida per reschedule');
      return null;
    }

    // Esegue reschedule con propagazione
    const rescheduleResult = engine.rescheduleActivity(activityId, newDayNumber);

    // Aggiorna stato
    const updatedResults = rescheduleResult.newResults.map(r => ({
      ...r,
      data_inizio_calcolata: dayNumberToDate(r.earlyStart, dataInizioProgetto),
      data_fine_calcolata: dayNumberToDate(r.earlyFinish, dataInizioProgetto),
      data_inizio_latest: dayNumberToDate(r.lateStart, dataInizioProgetto),
      data_fine_latest: dayNumberToDate(r.lateFinish, dataInizioProgetto)
    }));

    const updatedCpmResult = {
      ...cpmResult,
      results: updatedResults,
      criticalPath: rescheduleResult.criticalPath
    };

    setCpmResult(updatedCpmResult);
    return {
      updatedActivities: rescheduleResult.updatedActivities,
      result: updatedCpmResult
    };
  }, [cpmResult, dataInizioProgetto]);

  // Funzione per ottenere i dettagli di un'attività specifica
  const getActivityDetails = useCallback((activityId) => {
    if (!cpmResult) return null;
    return cpmResult.results.find(r => r.activity.id === activityId);
  }, [cpmResult]);

  // Funzione per ottenere le attività critiche
  const getCriticalActivities = useCallback(() => {
    if (!cpmResult) return [];
    return cpmResult.results
      .filter(r => r.isCritical)
      .map(r => r.activity);
  }, [cpmResult]);

  // Funzione per ottenere attività con float negativo (over-constrained)
  const getOverConstrainedActivities = useCallback(() => {
    if (!cpmResult) return [];
    return cpmResult.results
      .filter(r => r.isOverconstrained)
      .map(r => r.activity);
  }, [cpmResult]);

  // Memoized: mappa attività ID -> risultato CPM
  const activityMap = useMemo(() => {
    if (!cpmResult) return new Map();
    return new Map(cpmResult.results.map(r => [r.activity.id, r]));
  }, [cpmResult]);

  return {
    // Stato
    cpmResult,
    isLoading,
    error,
    
    // Funzioni
    calculateCPM,
    rescheduleActivity,
    getActivityDetails,
    getCriticalActivities,
    getOverConstrainedActivities,
    
    // Utility
    activityMap,
    projectDuration: cpmResult?.projectDuration || 0,
    projectStartDate: cpmResult?.projectStartDate,
    projectEndDate: cpmResult?.projectEndDate,
    criticalPathLength: cpmResult?.criticalPath?.length || 0
  };
}

/**
 * Hook per gestire la conversione date nel contesto Gantt
 */
export function useGanttDateConverter(projectStartDate) {
  const convertDayToDate = useCallback((dayNumber) => {
    if (!projectStartDate || !dayNumber) return null;
    return dayNumberToDate(dayNumber, projectStartDate);
  }, [projectStartDate]);

  const convertDateToDay = useCallback((dateStr) => {
    if (!projectStartDate || !dateStr) return null;
    return dateToDayNumber(dateStr, projectStartDate);
  }, [projectStartDate]);

  return {
    convertDayToDate,
    convertDateToDay
  };
}

/**
 * Hook per calcolare statistiche del progetto basate su CPM
 */
export function useProjectStats(cpmResult) {
  return useMemo(() => {
    if (!cpmResult) return null;

    const totalActivities = cpmResult.results.length;
    const criticalActivities = cpmResult.criticalPath.length;
    const overConstrained = cpmResult.results.filter(r => r.isOverconstrained).length;
    const withFloat = cpmResult.results.filter(r => r.totalFloat > 0).length;
    const avgFloat = cpmResult.results.reduce((acc, r) => acc + r.totalFloat, 0) / totalActivities;

    // Calcola salute del progetto
    let healthStatus = 'good';
    if (overConstrained > 0 || cpmResult.errors.length > 0) {
      healthStatus = 'critical';
    } else if (avgFloat < 3) {
      healthStatus = 'warning';
    }

    return {
      totalActivities,
      criticalActivities,
      criticalPercentage: Math.round((criticalActivities / totalActivities) * 100),
      overConstrained,
      withFloat,
      avgFloat: Math.round(avgFloat * 10) / 10,
      healthStatus,
      projectDuration: cpmResult.projectDuration,
      warnings: cpmResult.warnings.length,
      errors: cpmResult.errors.length
    };
  }, [cpmResult]);
}
