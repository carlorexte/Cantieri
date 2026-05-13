function toIsoDate(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return value.trim();

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function computeDurationDays(startDate, endDate, fallback = 1) {
  if (!startDate || !endDate) return Math.max(1, Number(fallback) || 1);
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return Math.max(1, Number(fallback) || 1);
  }

  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

function normalizePredecessors(predecessors = []) {
  return (predecessors || []).map((dependency) => ({
    activity_id: dependency?.attivita_id || dependency?.activity_id || dependency?.id || null,
    type: dependency?.tipo_dipendenza || dependency?.type || dependency?.tipo || 'FS',
    lag_days: Number(dependency?.lag_giorni ?? dependency?.lag_days ?? dependency?.lag ?? 0) || 0
  })).filter((dependency) => dependency.activity_id);
}

function createSyntheticMacroArea(sourceLabel, activities) {
  const starts = activities.map((activity) => activity.start_date).filter(Boolean).sort();
  const ends = activities.map((activity) => activity.end_date).filter(Boolean).sort();
  return {
    id: 'MA-ROOT',
    code: '1',
    name: sourceLabel ? `Import ${sourceLabel}` : 'Attivita importate',
    type: 'raggruppamento',
    parent_id: null,
    start_date: starts[0] || null,
    end_date: ends[ends.length - 1] || starts[0] || null,
    duration_days: computeDurationDays(starts[0], ends[ends.length - 1], 1),
    color: '#64748b',
    order: 1
  };
}

export function adaptParsedActivitiesToCanonical(result, source, parserKey = 'generic') {
  const rawActivities = Array.isArray(result?.attivita) ? result.attivita : [];
  const normalized = rawActivities.map((activity, index) => ({
    id: activity.id || activity.wbs || activity.wbs_code || `ACT-${index + 1}`,
    external_id: activity.external_id || activity.id || activity.wbs || activity.wbs_code || `EXT-${index + 1}`,
    wbs: activity.wbs || activity.wbs_code || '',
    parent_id: activity.parent_id || null,
    type: activity.tipo_attivita || activity.type || 'task',
    description: String(activity.descrizione || activity.description || '').trim(),
    start_date: toIsoDate(activity.data_inizio || activity.start_date),
    end_date: toIsoDate(activity.data_fine || activity.end_date),
    duration_days: computeDurationDays(
      toIsoDate(activity.data_inizio || activity.start_date),
      toIsoDate(activity.data_fine || activity.end_date),
      activity.durata_giorni || activity.duration_days
    ),
    progress: Number(activity.percentuale_completamento ?? activity.progress ?? 0) || 0,
    status: activity.stato || activity.status || 'pianificata',
    amount: Number(activity.importo_previsto ?? activity.amount ?? 0) || 0,
    color: activity.colore || activity.color || (activity.tipo_attivita === 'raggruppamento' ? '#64748b' : '#3b82f6'),
    predecessors: normalizePredecessors(activity.predecessori || activity.predecessors),
    metadata: {
      parser: parserKey,
      source_row: Number(activity.source_row) || null
    },
    note: activity.note || '',
    order: index + 1
  }));

  // Fallback: se un'attività non ha parent_id ma il WBS lo suggerisce, derivalo
  const wbsToId = new Map(normalized.map((a) => [a.wbs, a.id]));
  normalized.forEach((activity) => {
    if (activity.parent_id) return;
    const parts = String(activity.wbs || '').split('.');
    if (parts.length > 1) {
      const parentWbs = parts.slice(0, -1).join('.');
      const parentId = wbsToId.get(parentWbs);
      if (parentId) activity.parent_id = parentId;
    }
  });

  let macroAreas = normalized
    .filter((activity) => activity.type === 'raggruppamento')
    .map((activity) => ({
      id: activity.id,
      code: activity.wbs || '',
      name: activity.description,
      type: 'raggruppamento',
      parent_id: null,
      start_date: activity.start_date,
      end_date: activity.end_date,
      duration_days: activity.duration_days,
      color: activity.color || '#64748b',
      order: activity.order,
      note: activity.note || ''
    }));

  const macroAreaIds = new Set(macroAreas.map((macroArea) => macroArea.id));
  const normalizedById = new Map(normalized.map((item) => [item.id, item]));
  const resolveMacroAreaId = (activity) => {
    let cursor = activity;
    const visited = new Set();

    while (cursor?.parent_id && !visited.has(cursor.parent_id)) {
      visited.add(cursor.parent_id);
      if (macroAreaIds.has(cursor.parent_id)) return cursor.parent_id;
      cursor = normalizedById.get(cursor.parent_id);
    }

    return null;
  };

  const activities = normalized
    .filter((activity) => activity.type !== 'raggruppamento')
    .map((activity) => {
      let macroAreaId = activity.parent_id && macroAreaIds.has(activity.parent_id)
        ? activity.parent_id
        : resolveMacroAreaId(activity);

      if (!macroAreaId && macroAreas.length === 1) {
        macroAreaId = macroAreas[0].id;
      }

      return {
        id: activity.id,
        external_id: activity.external_id,
        wbs: activity.wbs,
        parent_id: activity.parent_id || macroAreaId,
        macro_area_id: macroAreaId,
        type: activity.type === 'milestone' ? 'milestone' : 'task',
        description: activity.description,
        start_date: activity.start_date,
        end_date: activity.end_date,
        duration_days: activity.duration_days,
        progress: activity.progress,
        status: activity.status,
        amount: activity.amount,
        color: activity.color,
        predecessors: activity.predecessors,
        constraints: {
          type: activity.vincolo_tipo || null,
          date: toIsoDate(activity.vincolo_data || null)
        },
        metadata: activity.metadata,
        note: activity.note || '',
        order: activity.order
      };
    });

  // Nessun wrapper sintetico: le attività orfane rimangono senza macro_area_id

  const starts = [...macroAreas, ...activities].map((item) => item.start_date).filter(Boolean).sort();
  const ends = [...macroAreas, ...activities].map((item) => item.end_date).filter(Boolean).sort();

  return {
    schema_version: '2.0',
    success: true,
    project: {
      name: result?.metadata?.sheetName || result?.metadata?.foglio || source?.label || 'Cronoprogramma importato',
      start_date: starts[0] || null,
      end_date: ends[ends.length - 1] || starts[0] || null,
      duration_days: computeDurationDays(starts[0], ends[ends.length - 1], 1),
      source: {
        type: source?.mode || 'generic',
        file_name: source?.label || 'import',
        parser: parserKey,
        confidence: result?.metadata?.confidence || 'medium'
      }
    },
    macro_areas: macroAreas,
    activities,
    diagnostics: {
      warnings: [],
      errors: [],
      missing_dates_count: activities.filter((activity) => !activity.start_date || !activity.end_date).length,
      suspicious_durations_count: activities.filter((activity) => activity.duration_days <= 0 || activity.duration_days > 365).length
    }
  };
}

export default adaptParsedActivitiesToCanonical;
