import { createPlanningActivity, planningActivitiesToCanonical } from './planningModel';

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function computeDurationDays(startDate, endDate, fallback = 1) {
  if (!isIsoDate(startDate) || !isIsoDate(endDate)) return Math.max(1, Number(fallback) || 1);
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return Math.max(1, Number(fallback) || 1);
  }

  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

function normalizePredecessors(predecessors = []) {
  return (predecessors || []).map((dependency) => ({
    activity_id: dependency?.activity_id || dependency?.attivita_id || dependency?.id || null,
    type: dependency?.type || dependency?.tipo || dependency?.tipo_dipendenza || 'FS',
    lag_days: Number(dependency?.lag_days ?? dependency?.lag_giorni ?? dependency?.lag ?? 0) || 0
  })).filter((dependency) => dependency.activity_id);
}

function getActivityOrderMap(nodes = []) {
  return new Map(nodes.map((node, index) => [node.id, Number(node.order) || index + 1]));
}

function recomputeMacroAreaDates(macroAreas, activities) {
  const nextMacroAreas = macroAreas.map((macroArea) => ({ ...macroArea }));

  nextMacroAreas.forEach((macroArea) => {
    const children = activities.filter((activity) => activity.macro_area_id === macroArea.id);
    const starts = children.map((activity) => activity.start_date).filter(isIsoDate).sort();
    const ends = children.map((activity) => activity.end_date).filter(isIsoDate).sort();

    if (starts.length > 0) {
      macroArea.start_date = starts[0];
      macroArea.end_date = ends[ends.length - 1];
      macroArea.duration_days = computeDurationDays(macroArea.start_date, macroArea.end_date, macroArea.duration_days);
    }
  });

  return nextMacroAreas;
}

function regenerateWbs(macroAreas, activities) {
  const macroAreaOrder = getActivityOrderMap(macroAreas);
  const orderedMacroAreas = [...macroAreas].sort((a, b) => (macroAreaOrder.get(a.id) || 0) - (macroAreaOrder.get(b.id) || 0));
  const byParent = new Map();

  activities.forEach((activity) => {
    const parentKey = activity.parent_id || activity.macro_area_id || '__root__';
    const bucket = byParent.get(parentKey) || [];
    bucket.push(activity);
    byParent.set(parentKey, bucket);
  });

  byParent.forEach((bucket) => {
    bucket.sort((a, b) => {
      const aOrder = Number(a.order) || 0;
      const bOrder = Number(b.order) || 0;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return String(a.description || '').localeCompare(String(b.description || ''), 'it', { sensitivity: 'base' });
    });
  });

  const walk = (parentId, prefix) => {
    const bucket = byParent.get(parentId) || [];
    bucket.forEach((activity, index) => {
      const nextPrefix = `${prefix}.${index + 1}`;
      activity.wbs = nextPrefix;
      walk(activity.id, nextPrefix);
    });
  };

  orderedMacroAreas.forEach((macroArea, index) => {
    macroArea.code = macroArea.code || `${index + 1}`;
    walk(macroArea.id, macroArea.code);
  });

  return {
    macroAreas: orderedMacroAreas,
    activities
  };
}

export function normalizeCanonicalCronoprogramma(payload, options = {}) {
  const {
    recomputeMacroAreaDates: shouldRecomputeMacroAreaDates = true,
    regenerateWbs: shouldRegenerateWbs = true,
    projectSource = 'canonical-import'
  } = options;

  const macroAreas = (payload?.macro_areas || []).map((macroArea, index) => ({
    id: macroArea.id,
    code: macroArea.code || macroArea.wbs || `${index + 1}`,
    name: String(macroArea.name || macroArea.description || '').trim(),
    type: 'raggruppamento',
    parent_id: macroArea.parent_id || null,
    start_date: macroArea.start_date || null,
    end_date: macroArea.end_date || null,
    duration_days: computeDurationDays(macroArea.start_date, macroArea.end_date, macroArea.duration_days),
    color: macroArea.color || '#64748b',
    order: Number(macroArea.order) || index + 1
  }));

  const activities = (payload?.activities || []).map((activity, index) => ({
    id: activity.id,
    external_id: activity.external_id || activity.id,
    wbs: activity.wbs || '',
    parent_id: activity.parent_id || null,
    macro_area_id: activity.macro_area_id || activity.parent_id || null,
    type: activity.type || 'task',
    description: String(activity.description || activity.name || '').trim(),
    start_date: activity.start_date || null,
    end_date: activity.end_date || null,
    duration_days: computeDurationDays(activity.start_date, activity.end_date, activity.duration_days),
    progress: Number(activity.progress ?? 0) || 0,
    status: activity.status || 'pianificata',
    amount: Number(activity.amount ?? 0) || 0,
    color: activity.color || '#3b82f6',
    predecessors: normalizePredecessors(activity.predecessors),
    constraints: {
      type: activity.constraints?.type || null,
      date: activity.constraints?.date || null
    },
    metadata: {
      ...(activity.metadata || {}),
      source: projectSource,
      node_kind: 'activity'
    },
    note: activity.note || '',
    order: Number(activity.order) || index + 1
  }));

  const nextMacroAreas = shouldRecomputeMacroAreaDates
    ? recomputeMacroAreaDates(macroAreas, activities)
    : macroAreas;

  const withWbs = shouldRegenerateWbs
    ? regenerateWbs(nextMacroAreas, activities)
    : { macroAreas: nextMacroAreas, activities };

  const planningActivities = [
    ...withWbs.macroAreas.map((macroArea) => createPlanningActivity({
      id: macroArea.id,
      external_id: macroArea.id,
      wbs: macroArea.code,
      parent_id: macroArea.parent_id,
      type: 'raggruppamento',
      description: macroArea.name,
      start_date: macroArea.start_date,
      end_date: macroArea.end_date,
      duration_days: macroArea.duration_days,
      color: macroArea.color,
      status: 'pianificata',
      note: macroArea.note || '',
      metadata: {
        source: projectSource,
        node_kind: 'macro_area'
      }
    }, projectSource)),
    ...withWbs.activities.map((activity) => createPlanningActivity({
      id: activity.id,
      external_id: activity.external_id,
      wbs: activity.wbs,
      parent_id: activity.parent_id,
      type: activity.type,
      description: activity.description,
      start_date: activity.start_date,
      end_date: activity.end_date,
      duration_days: activity.duration_days,
      predecessors: activity.predecessors,
      progress: activity.progress,
      amount: activity.amount,
      color: activity.color,
      status: activity.status,
      note: activity.note || '',
      constraint_type: activity.constraints?.type || null,
      constraint_date: activity.constraints?.date || null,
      metadata: activity.metadata
    }, projectSource))
  ].sort((a, b) => String(a.wbs || '').localeCompare(String(b.wbs || ''), 'it', { numeric: true, sensitivity: 'base' }));

  const canonicalActivities = planningActivitiesToCanonical(planningActivities);
  const starts = canonicalActivities.map((activity) => activity.start_date).filter(Boolean).sort();
  const ends = canonicalActivities.map((activity) => activity.end_date).filter(Boolean).sort();
  const missingDates = canonicalActivities.filter((activity) => !activity.start_date || !activity.end_date);
  const duplicateDescriptions = new Map();

  canonicalActivities.forEach((activity) => {
    const key = String(activity.description || '').trim().toLowerCase();
    if (!key) return;
    duplicateDescriptions.set(key, (duplicateDescriptions.get(key) || 0) + 1);
  });

  const duplicateRows = canonicalActivities.filter((activity) => duplicateDescriptions.get(String(activity.description || '').trim().toLowerCase()) > 1);
  const suspiciousDurations = canonicalActivities.filter((activity) => activity.duration_days > 365 || activity.duration_days <= 0);

  return {
    project: {
      ...(payload?.project || {}),
      start_date: starts[0] || payload?.project?.start_date || null,
      end_date: ends[ends.length - 1] || payload?.project?.end_date || null,
      duration_days: computeDurationDays(starts[0] || payload?.project?.start_date, ends[ends.length - 1] || payload?.project?.end_date, payload?.project?.duration_days)
    },
    macro_areas: withWbs.macroAreas,
    activities: canonicalActivities,
    planningActivities,
    diagnostics: payload?.diagnostics || { warnings: [], errors: [] },
    review: {
      totalActivities: canonicalActivities.length,
      withDates: canonicalActivities.length - missingDates.length,
      missingDatesCount: missingDates.length,
      duplicateCount: duplicateRows.length,
      suspiciousDurationsCount: suspiciousDurations.length,
      macroAreasCount: withWbs.macroAreas.length,
      projectStart: starts[0] || null,
      projectEnd: ends[ends.length - 1] || null,
      sampleMissingDates: missingDates.slice(0, 8),
      sampleActivities: canonicalActivities.slice(0, 12)
    }
  };
}

export default normalizeCanonicalCronoprogramma;
