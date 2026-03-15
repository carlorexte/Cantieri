/**
 * CPM Engine - Critical Path Method Calculator
 * 
 * Motore per il calcolo automatico delle date in un diagramma di Gantt
 * basandosi sulle dipendenze tra attività.
 * 
 * @version 1.0.0
 * @author Base44 Development Team
 */

// ============================================================================
// COSTANTI E TIPI
// ============================================================================

/**
 * Tipi di dipendenza tra attività
 */
/**
 * @typedef {'FS' | 'SS' | 'FF' | 'SF'} DependencyTypeValue
 */
/** @type {{ FS: DependencyTypeValue, SS: DependencyTypeValue, FF: DependencyTypeValue, SF: DependencyTypeValue }} */
export const DependencyType = {
  /** Finish-to-Start: B inizia dopo che A è finita */
  FS: 'FS',
  /** Start-to-Start: B inizia dopo che A è iniziata */
  SS: 'SS',
  /** Finish-to-Finish: B finisce dopo che A è finita */
  FF: 'FF',
  /** Start-to-Finish: B finisce dopo che A è iniziata (raro) */
  SF: 'SF'
};

/**
 * Tipi di vincolo temporale
 */
/**
 * @typedef {'asap' | 'alap' | 'snet' | 'snlt' | 'fnet' | 'fnlt' | 'mso' | 'mfo'} ConstraintTypeValue
 */
export const ConstraintType = {
  /** As Soon As Possible - il prima possibile (default) */
  ASAP: 'asap',
  /** As Late As Possible - il più tardi possibile */
  ALAP: 'alap',
  /** Start No Earlier Than - inizio non prima di */
  SNET: 'snet',
  /** Start No Later Than - inizio non oltre il */
  SNLT: 'snlt',
  /** Finish No Earlier Than - fine non prima di */
  FNET: 'fnet',
  /** Finish No Later Than - fine non oltre il */
  FNLT: 'fnlt',
  /** Must Start On - deve iniziare il */
  MSO: 'mso',
  /** Must Finish On - deve finire il */
  MFO: 'mfo'
};

/**
 * Struttura di un'attività
 * @typedef {Object} Activity
 * @property {string} id - Identificativo univoco
 * @property {string} descrizione - Descrizione attività
 * @property {number} durata_giorni - Durata in giorni
 * @property {Predecessor[]} predecessori - Lista di predecessori
 * @property {Constraint} vincolo - Vincolo temporale (opzionale)
 * @property {string} [data_inizio_prevista] - Data inizio (se già definita)
 * @property {string} [data_fine_prevista] - Data fine (se già definita)
 */

/**
 * Struttura di un predecessore
 * @typedef {Object} Predecessor
 * @property {string} id - ID attività predecessore
 * @property {DependencyTypeValue} tipo - Tipo di dipendenza
 * @property {number} lag - Lag in giorni (positivo) o lead (negativo)
 */

/**
 * Struttura di un vincolo
 * @typedef {Object} Constraint
 * @property {ConstraintTypeValue} tipo - Tipo di vincolo
 * @property {string} data - Data del vincolo (YYYY-MM-DD)
 */

/**
 * Risultato del calcolo CPM per un'attività
 * @typedef {Object} CPMResult
 * @property {Activity} activity - Attività originale
 * @property {number} earlyStart - Inizio più presto possibile (giorno 1-based)
 * @property {number} earlyFinish - Fine più presto possibile
 * @property {number} lateStart - Inizio più tardi possibile senza ritardare il progetto
 * @property {number} lateFinish - Fine più tardi possibile
 * @property {number} totalFloat - Margine totale (LateStart - EarlyStart)
 * @property {number} freeFloat - Margine libero (min ES successori - EF corrente)
 * @property {boolean} isCritical - true se sul percorso critico (float = 0)
 * @property {boolean} isOverconstrained - true se vincoli creano conflitti
 */

// ============================================================================
// CLASSI PRINCIPALI
// ============================================================================

export class CPMEngine {
  /**
   * @param {Activity[]} activities - Lista di attività da elaborare
   */
  constructor(activities) {
    this.activities = activities || [];
    this.results = new Map(); // Map<id, CPMResult>
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Esegue il calcolo CPM completo
   * @returns {{ results: CPMResult[], criticalPath: string[], projectStart: number, projectEnd: number, errors: string[], warnings: string[] }}
   */
  calculate() {
    this.errors = [];
    this.warnings = [];
    this.results.clear();

    if (this.activities.length === 0) {
      return {
        results: [],
        criticalPath: [],
        projectStart: 0,
        projectEnd: 0,
        errors: [],
        warnings: ['Nessuna attività da elaborare']
      };
    }

    // Step 1: Rileva cicli nelle dipendenze
    const cycles = this.detectCycles();
    if (cycles.length > 0) {
      this.errors.push(`Rilevati ${cycles.length} cicli nelle dipendenze. Impossibile calcolare le date.`);
      return this._buildErrorResult();
    }

    // Step 2: Forward Pass (calcola date early start/finish)
    this._forwardPass();

    // Step 3: Backward Pass (calcola date late start/finish)
    this._backwardPass();

    // Step 4: Calcola float e identifica percorso critico
    this._calculateFloats();

    // Step 5: Applica vincoli (se presenti)
    this._applyConstraints();

    // Step 6: Rileva conflitti
    this._detectConflicts();

    return this._buildResult();
  }

  /**
   * Forward Pass: calcola le date più presto possibili (Early Start/Finish)
   * Usa l'algoritmo di visita topologica
   */
  _forwardPass() {
    const visited = new Set();
    const visiting = new Set();

    const calculateEarlyStart = (activityId) => {
      if (visited.has(activityId)) {
        return this.results.get(activityId);
      }

      if (visiting.has(activityId)) {
        // Ciclo rilevato durante il calcolo
        this.errors.push(`Ciclo rilevato coinvolgente l'attività ${activityId}`);
        return null;
      }

      visiting.add(activityId);

      const activity = this.activities.find(a => a.id === activityId);
      if (!activity) {
        visiting.delete(activityId);
        return null;
      }

      let earlyStart = 1; // Default: inizia dal giorno 1

      // Processa tutti i predecessori
      if (activity.predecessori && activity.predecessori.length > 0) {
        for (const pred of activity.predecessori) {
          const predResult = calculateEarlyStart(pred.id);
          if (!predResult) continue;

          const predActivity = this.activities.find(a => a.id === pred.id);
          if (!predActivity) continue;

          const lag = pred.lag || 0;
          let candidateStart = 1;

          switch (pred.tipo) {
            case DependencyType.FS:
              // B inizia dopo che A finisce + lag
              candidateStart = predResult.earlyFinish + lag + 1;
              break;
            case DependencyType.SS:
              // B inizia dopo che A inizia + lag
              candidateStart = predResult.earlyStart + lag;
              break;
            case DependencyType.FF:
              // B finisce dopo che A finisce + lag
              // Quindi: B.inizio = A.fine + lag - B.durata + 1
              candidateStart = predResult.earlyFinish + lag - activity.durata_giorni + 1;
              break;
            case DependencyType.SF:
              // B finisce dopo che A inizia + lag
              // Quindi: B.inizio = A.inizio + lag - B.durata + 1
              candidateStart = predResult.earlyStart + lag - activity.durata_giorni + 1;
              break;
            default:
              candidateStart = predResult.earlyFinish + 1;
          }

          if (candidateStart > earlyStart) {
            earlyStart = candidateStart;
          }
        }
      }

      // Assicurati che la durata sia almeno 1
      const durata = Math.max(1, activity.durata_giorni || 1);
      const earlyFinish = earlyStart + durata - 1;

      const result = {
        activity,
        earlyStart,
        earlyFinish,
        lateStart: 0, // Sarà calcolato nel backward pass
        lateFinish: 0,
        totalFloat: 0,
        freeFloat: 0,
        isCritical: false,
        isOverconstrained: false
      };

      this.results.set(activityId, result);
      visiting.delete(activityId);
      visited.add(activityId);

      return result;
    };

    // Calcola per tutte le attività
    for (const activity of this.activities) {
      calculateEarlyStart(activity.id);
    }
  }

  /**
   * Backward Pass: calcola le date più tardi possibili (Late Start/Finish)
   * senza ritardare il progetto
   */
  _backwardPass() {
    // Trova la data di fine progetto (massimo early finish)
    let projectEnd = 0;
    for (const result of this.results.values()) {
      if (result.earlyFinish > projectEnd) {
        projectEnd = result.earlyFinish;
      }
    }

    // Costruisci grafo inverso (successori)
    const successors = new Map();
    for (const activity of this.activities) {
      successors.set(activity.id, []);
    }

    for (const activity of this.activities) {
      if (activity.predecessori) {
        for (const pred of activity.predecessori) {
          const succList = successors.get(pred.id) || [];
          succList.push({
            id: activity.id,
            tipo: pred.tipo,
            lag: pred.lag || 0
          });
          successors.set(pred.id, succList);
        }
      }
    }

    const visited = new Set();

    const calculateLateFinish = (activityId) => {
      if (visited.has(activityId)) {
        return this.results.get(activityId);
      }

      visited.add(activityId);

      const activity = this.activities.find(a => a.id === activityId);
      if (!activity) return null;

      const result = this.results.get(activityId);
      if (!result) return null;

      // Default: fine progetto
      let lateFinish = projectEnd;

      const succList = successors.get(activityId) || [];

      // Processa tutti i successori
      for (const succ of succList) {
        const succResult = calculateLateFinish(succ.id);
        if (!succResult) continue;

        const succActivity = this.activities.find(a => a.id === succ.id);
        if (!succActivity) continue;

        let candidateFinish = projectEnd;

        switch (succ.tipo) {
          case DependencyType.FS:
            // Questo attività deve finire prima che il successore inizi - lag
            candidateFinish = succResult.lateStart - succ.lag - 1;
            break;
          case DependencyType.SS:
            // Questo attività deve iniziare prima che il successore inizi - lag
            // Quindi: lateFinish = lateStart + durata - 1
            candidateFinish = succResult.lateStart - succ.lag + activity.durata_giorni - 1;
            break;
          case DependencyType.FF:
            // Questo attività deve finire prima che il successore finisca - lag
            candidateFinish = succResult.lateFinish - succ.lag - 1;
            break;
          case DependencyType.SF:
            // Questo attività deve finire prima che il successore inizi - lag
            candidateFinish = succResult.lateStart - succ.lag - 1;
            break;
          default:
            candidateFinish = succResult.lateStart - 1;
        }

        if (candidateFinish < lateFinish) {
          lateFinish = candidateFinish;
        }
      }

      const lateStart = lateFinish - activity.durata_giorni + 1;

      result.lateStart = lateStart;
      result.lateFinish = lateFinish;

      return result;
    };

    // Calcola per tutte le attività
    for (const activity of this.activities) {
      calculateLateFinish(activity.id);
    }
  }

  /**
   * Calcola i float (margini) per ogni attività
   */
  _calculateFloats() {
    for (const [activityId, result] of this.results) {
      // Total Float: quanto può ritardare senza ritardare il progetto
      result.totalFloat = result.lateStart - result.earlyStart;

      // Free Float: quanto può ritardare senza ritardare i successori
      const activity = this.activities.find(a => a.id === activityId);
      let freeFloat = result.totalFloat; // Default: total float

      if (activity?.predecessori) {
        // Per ogni successore, calcola il minimo ES - EF corrente
        // (implementazione semplificata)
      }

      result.freeFloat = Math.max(0, freeFloat);

      // Identifica se è sul percorso critico
      result.isCritical = result.totalFloat <= 0;
    }
  }

  /**
   * Applica i vincoli temporali alle attività
   */
  _applyConstraints() {
    for (const [activityId, result] of this.results) {
      const activity = this.activities.find(a => a.id === activityId);
      if (!activity?.vincolo) continue;

      const constraint = activity.vincolo;
      const constraintDay = this._dateToDayNumber(constraint.data);

      if (!constraintDay) continue;

      switch (constraint.tipo) {
        case ConstraintType.SNET:
          // Start No Earlier Than
          if (result.earlyStart < constraintDay) {
            const diff = constraintDay - result.earlyStart;
            result.earlyStart = constraintDay;
            result.earlyFinish += diff;
            result.totalFloat -= diff;
          }
          break;

        case ConstraintType.SNLT:
          // Start No Later Than
          if (result.lateStart > constraintDay) {
            result.lateStart = constraintDay;
            result.lateFinish = constraintDay + activity.durata_giorni - 1;
          }
          break;

        case ConstraintType.FNET:
          // Finish No Earlier Than
          if (result.earlyFinish < constraintDay) {
            const diff = constraintDay - result.earlyFinish;
            result.earlyFinish = constraintDay;
            result.earlyStart += diff;
            result.totalFloat -= diff;
          }
          break;

        case ConstraintType.FNLT:
          // Finish No Later Than
          if (result.lateFinish > constraintDay) {
            result.lateFinish = constraintDay;
            result.lateStart = constraintDay - activity.durata_giorni + 1;
          }
          break;

        case ConstraintType.MSO:
          // Must Start On
          result.earlyStart = constraintDay;
          result.earlyFinish = constraintDay + activity.durata_giorni - 1;
          result.lateStart = constraintDay;
          result.lateFinish = result.earlyFinish;
          result.totalFloat = 0;
          break;

        case ConstraintType.MFO:
          // Must Finish On
          result.earlyFinish = constraintDay;
          result.earlyStart = constraintDay - activity.durata_giorni + 1;
          result.lateFinish = constraintDay;
          result.lateStart = result.earlyStart;
          result.totalFloat = 0;
          break;

        case ConstraintType.ALAP:
          // As Late As Possible: usa le date late come schedule
          result.earlyStart = result.lateStart;
          result.earlyFinish = result.lateFinish;
          break;

        case ConstraintType.ASAP:
        default:
          // Nessun cambiamento, usa early dates
          break;
      }

      // Controlla se il vincolo crea over-constraint
      if (result.totalFloat < 0) {
        result.isOverconstrained = true;
        this.warnings.push(
          `Attività "${activity.descrizione}": vincolo crea conflitto (float negativo: ${result.totalFloat})`
        );
      }
    }
  }

  /**
   * Rileva conflitti tra date calcolate e date previste
   */
  _detectConflicts() {
    for (const [activityId, result] of this.results) {
      const activity = this.activities.find(a => a.id === activityId);
      if (!activity) continue;

      // Controlla se date previste confliggono con calcoli
      if (activity.data_inizio_prevista) {
        const plannedStart = this._dateToDayNumber(activity.data_inizio_prevista);
        if (plannedStart && Math.abs(plannedStart - result.earlyStart) > 5) {
          this.warnings.push(
            `Attività "${activity.descrizione}": data prevista (${activity.data_inizio_prevista}) differisce significativamente da quella calcolata (giorno ${result.earlyStart})`
          );
        }
      }
    }
  }

  /**
   * Rileva cicli nel grafo delle dipendenze usando DFS
   * @returns {Array<Array<string>>} Lista di cicli trovati
   */
  detectCycles() {
    const cycles = [];
    const visited = new Set();
    const recStack = new Set();
    const path = [];

    const dfs = (activityId) => {
      if (recStack.has(activityId)) {
        // Ciclo trovato
        const cycleStart = path.indexOf(activityId);
        const cycle = path.slice(cycleStart).concat([activityId]);
        cycles.push(cycle);
        return true;
      }

      if (visited.has(activityId)) {
        return false;
      }

      visited.add(activityId);
      recStack.add(activityId);
      path.push(activityId);

      const activity = this.activities.find(a => a.id === activityId);
      if (activity?.predecessori) {
        for (const pred of activity.predecessori) {
          dfs(pred.id);
        }
      }

      path.pop();
      recStack.delete(activityId);
      return false;
    };

    for (const activity of this.activities) {
      if (!visited.has(activity.id)) {
        dfs(activity.id);
      }
    }

    return cycles;
  }

  /**
   * Converte una data YYYY-MM-DD in numero di giorno (1-based)
   * rispetto a una data di riferimento
   */
  _dateToDayNumber(dateStr) {
    if (!dateStr) return null;
    // Implementazione semplificata: assume che le date siano già relative
    // In produzione, servirebbe una data di riferimento del progetto
    const date = new Date(dateStr + 'T12:00:00');
    if (isNaN(date.getTime())) return null;
    
    // Per ora, return null - sarà implementato con data inizio progetto
    return null;
  }

  /**
   * Costruisce il risultato in caso di errore
   */
  _buildErrorResult() {
    return {
      results: [],
      criticalPath: [],
      projectStart: 0,
      projectEnd: 0,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  /**
   * Costruisce il risultato finale
   */
  _buildResult() {
    const resultsArray = Array.from(this.results.values());
    
    // Trova inizio e fine progetto
    let projectStart = Infinity;
    let projectEnd = 0;
    
    for (const result of resultsArray) {
      if (result.earlyStart < projectStart) projectStart = result.earlyStart;
      if (result.earlyFinish > projectEnd) projectEnd = result.earlyFinish;
    }

    if (projectStart === Infinity) projectStart = 0;

    // Estrai percorso critico
    const criticalPath = resultsArray
      .filter(r => r.isCritical)
      .map(r => r.activity.id);

    return {
      results: resultsArray,
      criticalPath,
      projectStart,
      projectEnd,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  /**
   * Aggiorna la data di un'attività e propaga i cambiamenti
   * @param {string} activityId - ID attività da aggiornare
   * @param {number} newEarlyStart - Nuova data di inizio (giorno)
   * @returns {{ updatedActivities: string[], newResults: CPMResult[], criticalPath: string[] }}
   */
  rescheduleActivity(activityId, newEarlyStart) {
    const activity = this.activities.find(a => a.id === activityId);
    if (!activity) {
      throw new Error(`Attività ${activityId} non trovata`);
    }

    // Aggiorna data inizio
    const oldResult = this.results.get(activityId);
    if (!oldResult) {
      throw new Error(`Risultato per attività ${activityId} non trovato`);
    }

    const diff = newEarlyStart - oldResult.earlyStart;
    oldResult.earlyStart = newEarlyStart;
    oldResult.earlyFinish += diff;

    // Propaga ai successori
    const affected = new Set([activityId]);
    const queue = [activityId];

    // Costruisci grafo successori
    const successors = new Map();
    for (const act of this.activities) {
      successors.set(act.id, []);
    }
    for (const act of this.activities) {
      if (act.predecessori) {
        for (const pred of act.predecessori) {
          successors.get(pred.id).push(act.id);
        }
      }
    }

    // BFS per propagare cambiamenti
    while (queue.length > 0) {
      const currentId = queue.shift();
      const currentResult = this.results.get(currentId);

      const succIds = successors.get(currentId) || [];
      for (const succId of succIds) {
        const succActivity = this.activities.find(a => a.id === succId);
        const succResult = this.results.get(succId);

        if (!succActivity || !succResult) continue;

        // Trova la dipendenza specifica
        const dep = succActivity.predecessori.find(p => p.id === currentId);
        if (!dep) continue;

        // Calcola nuova data basata sulla dipendenza
        let newSuccStart = 1;
        switch (dep.tipo) {
          case DependencyType.FS:
            newSuccStart = currentResult.earlyFinish + (dep.lag || 0) + 1;
            break;
          case DependencyType.SS:
            newSuccStart = currentResult.earlyStart + (dep.lag || 0);
            break;
          case DependencyType.FF:
            newSuccStart = currentResult.earlyFinish + (dep.lag || 0) - succActivity.durata_giorni + 1;
            break;
          case DependencyType.SF:
            newSuccStart = currentResult.earlyStart + (dep.lag || 0) - succActivity.durata_giorni + 1;
            break;
        }

        // Aggiorna se necessario
        if (newSuccStart > succResult.earlyStart) {
          const succDiff = newSuccStart - succResult.earlyStart;
          succResult.earlyStart = newSuccStart;
          succResult.earlyFinish += succDiff;
          succResult.totalFloat -= succDiff;
          
          if (succResult.totalFloat < 0) {
            succResult.isOverconstrained = true;
          }

          affected.add(succId);
          queue.push(succId);
        }
      }
    }

    // Ricalcola percorso critico
    this._calculateFloats();
    const newCriticalPath = Array.from(this.results.values())
      .filter(r => r.isCritical)
      .map(r => r.activity.id);

    return {
      updatedActivities: Array.from(affected),
      newResults: Array.from(this.results.values()),
      criticalPath: newCriticalPath
    };
  }

  /**
   * Ottiene le date calcolate per un'attività specifica
   * @param {string} activityId - ID attività
   * @returns {CPMResult|null}
   */
  getResult(activityId) {
    return this.results.get(activityId) || null;
  }

  /**
   * Ottiene tutte le attività del percorso critico
   * @returns {Activity[]}
   */
  getCriticalActivities() {
    return this.activities.filter(a => {
      const result = this.results.get(a.id);
      return result?.isCritical;
    });
  }

  /**
   * Esporta i risultati come oggetto JSON
   * @returns {Object}
   */
  exportResults() {
    return {
      projectDuration: this._buildResult().projectEnd,
      criticalPathLength: this._buildResult().criticalPath.length,
      activities: Array.from(this.results.values()).map(r => ({
        id: r.activity.id,
        descrizione: r.activity.descrizione,
        durata: r.activity.durata_giorni,
        earlyStart: r.earlyStart,
        earlyFinish: r.earlyFinish,
        lateStart: r.lateStart,
        lateFinish: r.lateFinish,
        totalFloat: r.totalFloat,
        freeFloat: r.freeFloat,
        isCritical: r.isCritical,
        isOverconstrained: r.isOverconstrained
      })),
      errors: this.errors,
      warnings: this.warnings
    };
  }
}

// ============================================================================
// FUNZIONI UTILITY
// ============================================================================

/**
 * Crea un predecessore valido
 * @param {string} id - ID attività predecessore
 * @param {DependencyTypeValue} tipo - Tipo di dipendenza
 * @param {number} lag - Lag in giorni
 * @returns {Predecessor}
 */
export function createPredecessor(id, tipo = DependencyType.FS, lag = 0) {
  return { id, tipo, lag };
}

/**
 * Crea un vincolo valido
 * @param {ConstraintTypeValue} tipo - Tipo di vincolo
 * @param {string} data - Data del vincolo
 * @returns {Constraint}
 */
export function createConstraint(tipo, data) {
  return { tipo, data };
}

/**
 * Valida una lista di attività
 * @param {Activity[]} activities - Attività da validare
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateActivities(activities) {
  const errors = [];
  const warnings = [];

  if (!activities || activities.length === 0) {
    errors.push('Nessuna attività fornita');
    return { valid: false, errors, warnings };
  }

  const idSet = new Set();
  for (const activity of activities) {
    // Controlla ID duplicati
    if (idSet.has(activity.id)) {
      errors.push(`ID duplicato: ${activity.id}`);
    }
    idSet.add(activity.id);

    // Controlla durata valida
    if (!activity.durata_giorni || activity.durata_giorni <= 0) {
      errors.push(`Attività ${activity.id}: durata non valida`);
    }

    // Controlla predecessori esistenti
    if (activity.predecessori) {
      for (const pred of activity.predecessori) {
        if (!activities.find(a => a.id === pred.id)) {
          errors.push(`Attività ${activity.id}: predecessore ${pred.id} non esiste`);
        }
        if (pred.id === activity.id) {
          errors.push(`Attività ${activity.id}: non può essere predecessore di se stessa`);
        }
      }
    }

    // Warning per durate sospette
    if (activity.durata_giorni > 365) {
      warnings.push(`Attività ${activity.id}: durata molto lunga (${activity.durata_giorni} giorni)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Converte un giorno numerico in data YYYY-MM-DD
 * @param {number} dayNumber - Giorno (1-based)
 * @param {string} projectStartDate - Data inizio progetto (YYYY-MM-DD)
 * @returns {string} Data calcolata (YYYY-MM-DD)
 */
export function dayNumberToDate(dayNumber, projectStartDate) {
  if (!projectStartDate || dayNumber < 1) return null;
  
  const startDate = new Date(projectStartDate + 'T12:00:00');
  if (isNaN(startDate.getTime())) return null;
  
  const resultDate = new Date(startDate);
  resultDate.setDate(resultDate.getDate() + dayNumber - 1);
  
  const year = resultDate.getFullYear();
  const month = String(resultDate.getMonth() + 1).padStart(2, '0');
  const day = String(resultDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Converte una data YYYY-MM-DD in giorno numerico
 * @param {string} dateStr - Data (YYYY-MM-DD)
 * @param {string} projectStartDate - Data inizio progetto (YYYY-MM-DD)
 * @returns {number|null} Giorno (1-based)
 */
export function dateToDayNumber(dateStr, projectStartDate) {
  if (!dateStr || !projectStartDate) return null;
  
  const date = new Date(dateStr + 'T12:00:00');
  const startDate = new Date(projectStartDate + 'T12:00:00');
  
  if (isNaN(date.getTime()) || isNaN(startDate.getTime())) return null;
  
  const diffTime = date.getTime() - startDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  
  return Math.max(1, diffDays);
}
