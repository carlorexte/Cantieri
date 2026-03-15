/**
 * Utility per calcolare il Critical Path (percorso critico) di un progetto
 * Usa l'algoritmo CPM (Critical Path Method)
 */

import { parseISO, addDays, differenceInDays } from 'date-fns';

export function calcolaCriticalPath(attivita) {
  if (!attivita || attivita.length === 0) {
    return { attivitaCritiche: [], attivitaAggiornate: [] };
  }

  // 1. Crea una mappa delle attività per ID
  const attivitaMap = new Map();
  attivita.forEach(att => {
    attivitaMap.set(att.id, {
      ...att,
      earliest_start: null,
      earliest_finish: null,
      latest_start: null,
      latest_finish: null,
      slack: 0,
      is_critical: false
    });
  });

  // 2. Forward Pass - Calcola Earliest Start e Earliest Finish
  const calcolaForwardPass = () => {
    let changed = true;
    let iterations = 0;
    const maxIterations = attivita.length * 2; // Prevenzione loop infiniti

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      attivitaMap.forEach((att, id) => {
        let newEarliestStart = att.data_inizio ? parseISO(att.data_inizio) : null;

        // Se ha predecessori, calcola basandosi su di loro
        if (att.predecessori && att.predecessori.length > 0) {
          att.predecessori.forEach(pred => {
            const predAtt = attivitaMap.get(pred.attivita_id);
            if (!predAtt) return;

            let predDate;
            const lagGiorni = pred.lag_giorni || 0;

            switch (pred.tipo_dipendenza) {
              case 'FS': // Finish-to-Start (default)
                if (predAtt.earliest_finish) {
                  predDate = addDays(predAtt.earliest_finish, lagGiorni);
                }
                break;
              case 'SS': // Start-to-Start
                if (predAtt.earliest_start) {
                  predDate = addDays(predAtt.earliest_start, lagGiorni);
                }
                break;
              case 'FF': { // Finish-to-Finish
                if (predAtt.earliest_finish && att.durata_giorni) {
                  const targetFinish = addDays(predAtt.earliest_finish, lagGiorni);
                  predDate = addDays(targetFinish, -att.durata_giorni + 1);
                }
                break;
              }
              case 'SF': { // Start-to-Finish
                if (predAtt.earliest_start && att.durata_giorni) {
                  const targetFinish = addDays(predAtt.earliest_start, lagGiorni);
                  predDate = addDays(targetFinish, -att.durata_giorni + 1);
                }
                break;
              }
            }

            if (predDate && (!newEarliestStart || predDate > newEarliestStart)) {
              newEarliestStart = predDate;
            }
          });
        }

        if (newEarliestStart && (!att.earliest_start || newEarliestStart.getTime() !== att.earliest_start.getTime())) {
          att.earliest_start = newEarliestStart;
          att.earliest_finish = att.tipo_attivita === 'milestone'
            ? newEarliestStart
            : addDays(newEarliestStart, (att.durata_giorni || 1) - 1);
          changed = true;
        }
      });
    }
  };

  // 3. Trova la data di fine progetto (latest finish dell'attività con earliest_finish più tardi)
  const trovaDataFineProgetto = () => {
    let projectEnd = null;
    attivitaMap.forEach(att => {
      if (att.earliest_finish && (!projectEnd || att.earliest_finish > projectEnd)) {
        projectEnd = att.earliest_finish;
      }
    });
    return projectEnd;
  };

  // 4. Backward Pass - Calcola Latest Start e Latest Finish
  const calcolaBackwardPass = (projectEnd) => {
    // Inizializza le attività che non hanno successori
    attivitaMap.forEach(att => {
      const haSuccessori = Array.from(attivitaMap.values()).some(other =>
        other.predecessori && other.predecessori.some(p => p.attivita_id === att.id)
      );

      if (!haSuccessori) {
        att.latest_finish = projectEnd;
        att.latest_start = att.tipo_attivita === 'milestone'
          ? projectEnd
          : addDays(projectEnd, -(att.durata_giorni || 1) + 1);
      }
    });

    let changed = true;
    let iterations = 0;
    const maxIterations = attivita.length * 2;

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      attivitaMap.forEach((att, id) => {
        // Trova i successori di questa attività
        const successori = Array.from(attivitaMap.values()).filter(other =>
          other.predecessori && other.predecessori.some(p => p.attivita_id === id)
        );

        if (successori.length === 0) return; // Già inizializzata

	        /** @type {Date | null} */
	        let newLatestFinish = null;

        successori.forEach(succ => {
          if (!succ.latest_start) return;

          const pred = succ.predecessori.find(p => p.attivita_id === id);
          if (!pred) return;

          const lagGiorni = pred.lag_giorni || 0;
          let targetDate;

          switch (pred.tipo_dipendenza) {
            case 'FS':
              targetDate = addDays(succ.latest_start, -lagGiorni);
              break;
            case 'SS':
              targetDate = att.tipo_attivita === 'milestone'
                ? addDays(succ.latest_start, -lagGiorni)
                : addDays(succ.latest_start, -lagGiorni - (att.durata_giorni || 1) + 1);
              break;
            case 'FF':
              if (succ.latest_finish) {
                targetDate = addDays(succ.latest_finish, -lagGiorni);
              }
              break;
            case 'SF':
              targetDate = att.tipo_attivita === 'milestone'
                ? addDays(succ.latest_finish, -lagGiorni)
                : addDays(succ.latest_finish, -lagGiorni - (att.durata_giorni || 1) + 1);
              break;
          }

          if (targetDate && (!newLatestFinish || targetDate < newLatestFinish)) {
            newLatestFinish = targetDate;
          }
        });

        if (newLatestFinish && (!att.latest_finish || newLatestFinish.getTime() !== att.latest_finish.getTime())) {
          att.latest_finish = newLatestFinish;
          att.latest_start = att.tipo_attivita === 'milestone'
            ? newLatestFinish
            : addDays(newLatestFinish, -(att.durata_giorni || 1) + 1);
          changed = true;
        }
      });
    }
  };

  // 5. Calcola lo Slack e identifica il Critical Path
  const calcolaSlackECriticalPath = () => {
    attivitaMap.forEach(att => {
      if (att.earliest_start && att.latest_start) {
        att.slack = differenceInDays(att.latest_start, att.earliest_start);
        att.is_critical = att.slack === 0;
      }
    });
  };

  // Esegui i calcoli
  calcolaForwardPass();
  const projectEnd = trovaDataFineProgetto();

  if (!projectEnd) {
    return { attivitaCritiche: [], attivitaAggiornate: Array.from(attivitaMap.values()) };
  }

  calcolaBackwardPass(projectEnd);
  calcolaSlackECriticalPath();

  // Prepara i risultati
  const attivitaAggiornate = Array.from(attivitaMap.values()).map(att => ({
    ...att,
    is_critical_path: att.is_critical,
    slack_giorni: att.slack
  }));

  const attivitaCritiche = attivitaAggiornate.filter(att => att.is_critical);

  return {
    attivitaCritiche,
    attivitaAggiornate,
    projectEnd
  };
}

/**
 * Calcola le nuove date per le attività dipendenti quando un'attività viene spostata
 */
export function ricalcolaDateDipendenti(attivitaModificata, tutteLeAttivita) {
  const attivitaMap = new Map();
  tutteLeAttivita.forEach(att => attivitaMap.set(att.id, { ...att }));

  // Aggiorna l'attività modificata
  attivitaMap.set(attivitaModificata.id, attivitaModificata);

  const attivitaDaAggiornare = [];

  // Trova ricorsivamente tutte le attività che dipendono da questa
  const trovaDipendenti = (attId, visited = new Set()) => {
    if (visited.has(attId)) return; // Prevenzione cicli
    visited.add(attId);

    attivitaMap.forEach((att, id) => {
      if (att.predecessori && att.predecessori.some(p => p.attivita_id === attId)) {
        attivitaDaAggiornare.push(att);
        trovaDipendenti(id, visited);
      }
    });
  };

  trovaDipendenti(attivitaModificata.id);

  // Ricalcola le date per ogni dipendente
  const updates = [];

  attivitaDaAggiornare.forEach(att => {
	    /** @type {Date | null} */
	    let nuovaDataInizio = null;

    att.predecessori.forEach(pred => {
      const predAtt = attivitaMap.get(pred.attivita_id);
      if (!predAtt) return;

      const lagGiorni = pred.lag_giorni || 0;
      let calcData;

      switch (pred.tipo_dipendenza) {
        case 'FS': {
          calcData = addDays(parseISO(predAtt.data_fine), lagGiorni);
          break;
        }
        case 'SS': {
          calcData = addDays(parseISO(predAtt.data_inizio), lagGiorni);
          break;
        }
        case 'FF': {
          const targetFinish = addDays(parseISO(predAtt.data_fine), lagGiorni);
          calcData = addDays(targetFinish, -(att.durata_giorni || 1) + 1);
          break;
        }
        case 'SF': {
          const targetFinish2 = addDays(parseISO(predAtt.data_inizio), lagGiorni);
          calcData = addDays(targetFinish2, -(att.durata_giorni || 1) + 1);
          break;
        }
      }

      if (calcData && (!nuovaDataInizio || calcData > nuovaDataInizio)) {
        nuovaDataInizio = calcData;
      }
    });

    if (nuovaDataInizio) {
      const nuovaDataFine = att.tipo_attivita === 'milestone'
        ? nuovaDataInizio
        : addDays(nuovaDataInizio, (att.durata_giorni || 1) - 1);

      updates.push({
        id: att.id,
        data_inizio: nuovaDataInizio.toISOString().split('T')[0],
        data_fine: nuovaDataFine.toISOString().split('T')[0]
      });

      // Aggiorna nella mappa per i calcoli successivi
      attivitaMap.set(att.id, {
        ...att,
        data_inizio: nuovaDataInizio.toISOString().split('T')[0],
        data_fine: nuovaDataFine.toISOString().split('T')[0]
      });
    }
  });

  return updates;
}
