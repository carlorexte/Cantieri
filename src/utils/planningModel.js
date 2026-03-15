function toIsoDate(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  return null;
}

function durationFromDates(startDate, endDate, fallback = 1) {
  const start = toIsoDate(startDate);
  const end = toIsoDate(endDate);
  if (!start || !end) return Math.max(1, Number(fallback) || 1);

  const startValue = new Date(`${start}T12:00:00`);
  const endValue = new Date(`${end}T12:00:00`);
  if (Number.isNaN(startValue.getTime()) || Number.isNaN(endValue.getTime()) || endValue < startValue) {
    return Math.max(1, Number(fallback) || 1);
  }

  return Math.round((endValue.getTime() - startValue.getTime()) / 86400000) + 1;
}

export function normalizePlanningDependency(dependency) {
  if (!dependency) return null;

  const activityId = dependency.activity_id || dependency.attivita_id || dependency.id || null;
  if (!activityId) return null;

  return {
    activity_id: activityId,
    type: dependency.type || dependency.tipo || dependency.tipo_dipendenza || 'FS',
    lag_days: Number(dependency.lag_days ?? dependency.lag_giorni ?? dependency.lag ?? 0) || 0
  };
}

export function createPlanningActivity(raw = {}, source = 'unknown') {
  const startDate = toIsoDate(
    raw.start_date ?? raw.data_inizio ?? raw.data_inizio_prevista ?? raw.startDate ?? null
  );
  const endDate = toIsoDate(
    raw.end_date ?? raw.data_fine ?? raw.data_fine_prevista ?? raw.endDate ?? null
  );
  const type = raw.type || raw.tipo_attivita || 'task';
  const explicitDuration = Number(
    raw.duration_days ?? raw.durata_giorni ?? raw.duration ?? (type === 'milestone' ? 1 : 0)
  );
  const normalizedDependencies = Array.isArray(raw.predecessors || raw.predecessori)
    ? (raw.predecessors || raw.predecessori).map(normalizePlanningDependency).filter(Boolean)
    : [];

  return {
    id: raw.id || raw.external_id || raw.wbs || null,
    external_id: raw.external_id || raw.id || '',
    source,
    wbs: raw.wbs || raw.wbs_code || '',
    parent_id: raw.parent_id || raw.wbs_parent || null,
    level: Number(raw.level ?? raw.livello ?? 0) || 0,
    type,
    description: String(raw.description || raw.descrizione || '').trim(),
    start_date: startDate,
    end_date: endDate,
    duration_days: type === 'milestone'
      ? 1
      : durationFromDates(startDate, endDate, explicitDuration || 1),
    predecessors: normalizedDependencies,
    progress: Number(raw.progress ?? raw.percentuale_completamento ?? 0) || 0,
    amount: Number(raw.amount ?? raw.importo_previsto ?? 0) || 0,
    color: raw.color || raw.colore || '#3b82f6',
    status: raw.status || raw.stato || 'pianificata',
    note: raw.note || '',
    constraint_type: raw.constraint_type || raw.vincolo_tipo || null,
    constraint_date: toIsoDate(raw.constraint_date || raw.vincolo_data || null),
    baseline_start_date: toIsoDate(raw.baseline_start_date || raw.baseline?.data_inizio || null),
    baseline_end_date: toIsoDate(raw.baseline_end_date || raw.baseline?.data_fine || null),
    metadata: raw.metadata || {}
  };
}

export function planningActivityToCanonical(activity) {
  return {
    id: activity.id,
    external_id: activity.external_id,
    wbs: activity.wbs,
    description: activity.description,
    start_date: activity.start_date,
    end_date: activity.end_date,
    duration_days: activity.duration_days,
    progress: activity.progress,
    predecessors: activity.predecessors,
    amount: activity.amount,
    level: activity.level,
    type: activity.type,
    color: activity.color,
    status: activity.status,
    note: activity.note,
    parent_id: activity.parent_id,
    source: activity.source,
    source_confidence: 0,
    source_trace: {
      parser: activity.source,
      original_id: activity.external_id || activity.id || null
    }
  };
}

export function planningActivityToDb(activity) {
  return {
    id: activity.id,
    wbs: activity.wbs,
    wbs_code: activity.wbs,
    livello: activity.level,
    parent_id: activity.parent_id,
    descrizione: activity.description,
    tipo_attivita: activity.type,
    data_inizio: activity.start_date,
    data_fine: activity.end_date,
    durata_giorni: activity.duration_days,
    predecessori: activity.predecessors.map((dependency) => ({
      attivita_id: dependency.activity_id,
      tipo_dipendenza: dependency.type,
      lag_giorni: dependency.lag_days
    })),
    percentuale_completamento: activity.progress,
    importo_previsto: activity.amount,
    colore: activity.color,
    stato: activity.status,
    note: activity.note,
    vincolo_tipo: activity.constraint_type,
    vincolo_data: activity.constraint_date,
    baseline_start_date: activity.baseline_start_date,
    baseline_end_date: activity.baseline_end_date
  };
}

export function planningActivityToGantt(activity) {
  return {
    id: activity.id,
    wbs: activity.wbs,
    descrizione: activity.description,
    tipo_attivita: activity.type,
    data_inizio: activity.start_date,
    data_fine: activity.end_date,
    durata_giorni: activity.duration_days,
    predecessori: activity.predecessors.map((dependency) => ({
      attivita_id: dependency.activity_id,
      tipo_dipendenza: dependency.type,
      lag_giorni: dependency.lag_days
    })),
    percentuale_completamento: activity.progress,
    importo_previsto: activity.amount,
    colore: activity.color,
    stato: activity.status,
    livello: activity.level,
    parent_id: activity.parent_id,
    note: activity.note,
    vincolo_tipo: activity.constraint_type,
    vincolo_data: activity.constraint_date,
    baseline_start_date: activity.baseline_start_date,
    baseline_end_date: activity.baseline_end_date
  };
}

export function dbActivityToPlanning(activity) {
  return createPlanningActivity(activity, 'db');
}

export function canonicalActivityToPlanning(activity) {
  return createPlanningActivity(activity, activity?.source_trace?.parser || 'import');
}

export function canonicalActivitiesToPlanning(activities = []) {
  return activities.map(canonicalActivityToPlanning);
}

export function dbActivitiesToPlanning(activities = []) {
  return activities.map(dbActivityToPlanning);
}

export function planningActivitiesToCanonical(activities = []) {
  return activities.map(planningActivityToCanonical);
}

export function planningActivitiesToDb(activities = []) {
  return activities.map(planningActivityToDb);
}

export function planningActivitiesToGantt(activities = []) {
  return activities.map(planningActivityToGantt);
}
