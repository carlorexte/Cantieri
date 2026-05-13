/**
 * Formato canonico usato da GanttImporter e gantt-importer.js.
 * Per inserire nel database usa toProjectDbFormat().
 */
export interface GanttTask {
  id: string;
  wbs: string;
  name: string;
  /** 0 = fase principale, 1 = sottofase, 2 = attività foglia */
  level: number;
  startDate: Date;
  endDate: Date;
  duration: number;
  progress: number;
}

/**
 * Formato attività DB del progetto (tabella `attivita` su Supabase).
 * Usato da PlanningGantt e supabaseDB.attivita.
 */
export interface ProjectDbActivity {
  wbs: string;
  descrizione: string;
  tipo_attivita: 'task' | 'raggruppamento' | 'milestone';
  data_inizio: string;
  data_fine: string;
  durata_giorni: number;
  percentuale_completamento: number;
  livello: number;
  stato: 'pianificata' | 'in_corso' | 'completata';
}

/**
 * Converte un array di GanttTask nel formato DB del progetto.
 * Compatibile con supabaseDB.attivita.create e importCronoprogramma.
 */
export function toProjectDbFormat(tasks: GanttTask[]): ProjectDbActivity[] {
  return tasks.map((task) => {
    const tipo_attivita =
      task.level === 0 ? 'raggruppamento' :
      task.duration === 0 ? 'milestone' :
      'task';

    const stato: ProjectDbActivity['stato'] =
      task.progress >= 100 ? 'completata' :
      task.progress > 0 ? 'in_corso' :
      'pianificata';

    return {
      wbs: task.wbs,
      descrizione: task.name,
      tipo_attivita,
      data_inizio: task.startDate.toISOString().slice(0, 10),
      data_fine: task.endDate.toISOString().slice(0, 10),
      durata_giorni: task.duration,
      percentuale_completamento: task.progress,
      livello: task.level,
      stato,
    };
  });
}
