function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function computeDurationDays(startDate, endDate) {
  if (!isIsoDate(startDate) || !isIsoDate(endDate)) return null;

  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;

  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

function detectDependencyCycles(activities = []) {
  const graph = new Map(
    activities.map((activity) => [
      activity.id,
      (activity.predecessors || []).map((dependency) => dependency.activity_id).filter(Boolean)
    ])
  );

  const visiting = new Set();
  const visited = new Set();
  const cycles = [];

  const visit = (activityId, path = []) => {
    if (!activityId || visited.has(activityId)) return;
    if (visiting.has(activityId)) {
      const startIndex = path.indexOf(activityId);
      cycles.push(path.slice(startIndex).concat(activityId));
      return;
    }

    visiting.add(activityId);
    const nextPath = [...path, activityId];
    (graph.get(activityId) || []).forEach((dependencyId) => visit(dependencyId, nextPath));
    visiting.delete(activityId);
    visited.add(activityId);
  };

  graph.forEach((_, activityId) => visit(activityId));
  return cycles;
}

export function validateCanonicalCronoprogramma(payload) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(payload)) {
    return {
      valid: false,
      errors: ['Payload canonico mancante o non valido'],
      warnings: [],
      stats: { macroAreas: 0, activities: 0, milestones: 0, tasks: 0 }
    };
  }

  const project = isPlainObject(payload.project) ? payload.project : null;
  const macroAreas = Array.isArray(payload.macro_areas) ? payload.macro_areas : null;
  const activities = Array.isArray(payload.activities) ? payload.activities : null;

  if (!payload.schema_version) errors.push('schema_version mancante');
  if (payload.success !== true) errors.push('success deve essere true');
  if (!project) errors.push('project mancante o non valido');
  if (!macroAreas) errors.push('macro_areas deve essere un array');
  if (!activities) errors.push('activities deve essere un array');

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      warnings,
      stats: { macroAreas: 0, activities: 0, milestones: 0, tasks: 0 }
    };
  }

  if (!project.name) warnings.push('project.name mancante');
  if (!isIsoDate(project.start_date) || !isIsoDate(project.end_date)) {
    errors.push('Date progetto mancanti o non in formato YYYY-MM-DD');
  } else if (project.end_date < project.start_date) {
    errors.push('project.end_date precede project.start_date');
  }

  if (macroAreas.length === 0) {
    errors.push('Deve esistere almeno una macro area');
  }

  const allNodes = [...macroAreas, ...activities];
  const allIds = new Set();
  allNodes.forEach((node) => {
    if (!node?.id) {
      errors.push('Nodo senza id');
      return;
    }

    if (allIds.has(node.id)) {
      errors.push(`ID duplicato: ${node.id}`);
      return;
    }

    allIds.add(node.id);
  });

  const macroAreaIds = new Set(macroAreas.map((item) => item.id).filter(Boolean));
  const activityIds = new Set(activities.map((item) => item.id).filter(Boolean));

  macroAreas.forEach((macroArea) => {
    if (macroArea?.type !== 'raggruppamento') {
      errors.push(`Macro area ${macroArea?.id || '-'} con type non valido`);
    }

    if (!macroArea?.name) warnings.push(`Macro area ${macroArea?.id || '-'} senza nome`);
    if (!isIsoDate(macroArea?.start_date) || !isIsoDate(macroArea?.end_date)) {
      errors.push(`Macro area ${macroArea?.id || '-'} con date non valide`);
    } else if (macroArea.end_date < macroArea.start_date) {
      errors.push(`Macro area ${macroArea.id}: end_date precede start_date`);
    }

    const expectedDuration = computeDurationDays(macroArea?.start_date, macroArea?.end_date);
    if (expectedDuration && Number(macroArea?.duration_days) && expectedDuration !== Number(macroArea.duration_days)) {
      warnings.push(`Macro area ${macroArea.id}: durata incoerente con le date`);
    }
  });

  activities.forEach((activity) => {
    if (!activity?.id) return;

    if (!['task', 'milestone'].includes(activity?.type)) {
      errors.push(`Attività ${activity.id}: type non valido (${activity?.type || 'n/a'})`);
    }

    if (!activity?.description) warnings.push(`Attività ${activity.id}: description mancante`);

    if (!isIsoDate(activity?.start_date) || !isIsoDate(activity?.end_date)) {
      errors.push(`Attività ${activity.id}: date non valide`);
    } else if (activity.end_date < activity.start_date) {
      errors.push(`Attività ${activity.id}: end_date precede start_date`);
    }

    const expectedDuration = computeDurationDays(activity?.start_date, activity?.end_date);
    if (activity?.type === 'milestone' && expectedDuration !== 1) {
      errors.push(`Attività ${activity.id}: una milestone deve durare 1 giorno`);
    } else if (expectedDuration && Number(activity?.duration_days) && expectedDuration !== Number(activity.duration_days)) {
      warnings.push(`Attività ${activity.id}: durata incoerente con le date`);
    }

    if (!activity?.parent_id) {
      errors.push(`Attività ${activity.id}: parent_id mancante`);
    } else if (!macroAreaIds.has(activity.parent_id) && !activityIds.has(activity.parent_id)) {
      errors.push(`Attività ${activity.id}: parent_id non trovato (${activity.parent_id})`);
    }

    if (!activity?.macro_area_id) {
      errors.push(`Attività ${activity.id}: macro_area_id mancante`);
    } else if (!macroAreaIds.has(activity.macro_area_id)) {
      errors.push(`Attività ${activity.id}: macro_area_id non trovato (${activity.macro_area_id})`);
    }

    if (Number(activity?.progress) < 0 || Number(activity?.progress) > 100) {
      warnings.push(`Attività ${activity.id}: progress fuori range`);
    }

    if (Number(activity?.amount) < 0) {
      warnings.push(`Attività ${activity.id}: amount negativo`);
    }

    (activity.predecessors || []).forEach((dependency, index) => {
      if (!dependency?.activity_id) {
        errors.push(`Attività ${activity.id}: predecessore ${index + 1} senza activity_id`);
        return;
      }

      if (!activityIds.has(dependency.activity_id)) {
        errors.push(`Attività ${activity.id}: predecessore non trovato (${dependency.activity_id})`);
      }

      if (dependency.type && !['FS', 'SS', 'FF', 'SF'].includes(dependency.type)) {
        warnings.push(`Attività ${activity.id}: tipo dipendenza non riconosciuto (${dependency.type})`);
      }
    });
  });

  macroAreas.forEach((macroArea) => {
    const children = activities.filter((activity) => activity.macro_area_id === macroArea.id);
    if (children.length === 0) warnings.push(`Macro area ${macroArea.id}: nessuna attività figlia`);
  });

  const cycles = detectDependencyCycles(activities);
  cycles.forEach((cycle) => errors.push(`Ciclo nelle dipendenze: ${cycle.join(' -> ')}`));

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      macroAreas: macroAreas.length,
      activities: activities.length,
      milestones: activities.filter((activity) => activity.type === 'milestone').length,
      tasks: activities.filter((activity) => activity.type === 'task').length
    }
  };
}

export default validateCanonicalCronoprogramma;
