import { parseCronoprogrammaAIAgent } from './cronoprogrammaAIAgent';
import { parseXLSXCronoprogramma } from './parseXLSXCronoprogramma';
import { parseCronoprogrammaSemplice } from './parseCronoprogrammaSemplice';
import { parseGoogleSheetColorBars } from './parseGoogleSheetColorBars';
import { parseGanttWithVision } from './parseGanttWithVision';
import { parseNormalizedJSON } from './parseNormalizedJSON';
import { adaptParsedActivitiesToCanonical } from './adaptParsedActivitiesToCanonical';
import { validateCanonicalCronoprogramma } from './validateCanonicalCronoprogramma';
import { normalizeCanonicalCronoprogramma } from './normalizeCanonicalCronoprogramma';
import {
  createPlanningActivity,
  planningActivitiesToCanonical,
  planningActivitiesToDb
} from './planningModel';

function computeDurationDays(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

function toConfidenceLabel(score) {
  if (score >= 180) return 'high';
  if (score >= 110) return 'medium';
  return 'low';
}

function getCandidateStrategy(parserKey) {
  switch (parserKey) {
    case 'normalized_json':
      return 'normalized';
    case 'google_sheet':
    case 'deterministic_excel':
      return 'structured';
    case 'hybrid_excel':
      return 'assisted';
    case 'vision_image':
      return 'vision';
    default:
      return 'generic';
  }
}

export function getCandidateLabel(parserKey) {
  switch (parserKey) {
    case 'normalized_json':
      return 'JSON normalizzato';
    case 'google_sheet':
      return 'Google Sheet strutturato';
    case 'deterministic_excel':
      return 'Excel deterministico';
    case 'hybrid_excel':
      return 'Excel assistito';
    case 'simple_gantt':
      return 'Gantt semplificato';
    case 'vision_image':
      return 'Immagine/PDF di recupero';
    default:
      return parserKey;
  }
}

function normalizeActivity(activity, index, parserKey) {
  const planningActivity = createPlanningActivity({
    ...activity,
    id: activity.id || activity.wbs || `ACT_${index + 1}`
  }, parserKey);

  const computedDuration = computeDurationDays(planningActivity.start_date, planningActivity.end_date);
  const originalDuration = Number(activity.durata_giorni) || planningActivity.duration_days;
  const isSummary = planningActivity.type === 'raggruppamento';
  const mismatchRatio = originalDuration > 0 ? Math.abs((computedDuration || originalDuration) - originalDuration) / originalDuration : 1;
  const isStrongMismatch = computedDuration && (mismatchRatio > 0.3 || Math.abs(computedDuration - originalDuration) > 7);

  if (computedDuration && (isSummary || originalDuration <= 0 || isStrongMismatch)) {
    planningActivity.duration_days = computedDuration;
  }

  return planningActivitiesToCanonical([planningActivity])[0];
}

function buildDiagnostics(activities) {
  const duplicateDescriptions = new Map();
  const startDates = new Map();

  for (const activity of activities) {
    const key = activity.description.toLowerCase();
    if (!key) continue;
    duplicateDescriptions.set(key, (duplicateDescriptions.get(key) || 0) + 1);

    if (activity.start_date) {
      startDates.set(activity.start_date, (startDates.get(activity.start_date) || 0) + 1);
    }
  }

  const missingDates = activities.filter((activity) => !activity.start_date || !activity.end_date);
  const suspiciousDurations = activities.filter((activity) => activity.duration_days > 365 || activity.duration_days <= 0);
  const duplicateRows = activities.filter((activity) => duplicateDescriptions.get(activity.description.toLowerCase()) > 1);
  let dominantStartDate = null;
  let dominantStartCount = 0;

  for (const [date, count] of startDates.entries()) {
    if (count > dominantStartCount) {
      dominantStartDate = date;
      dominantStartCount = count;
    }
  }

  const startDateClusterRatio = activities.length > 0 ? dominantStartCount / activities.length : 0;
  const anomalousStartCluster = dominantStartCount >= 5 && startDateClusterRatio >= 0.5;

  return {
    missingDates,
    suspiciousDurations,
    duplicateRows,
    dominantStartDate,
    dominantStartCount,
    startDateClusterRatio,
    anomalousStartCluster
  };
}

function scoreCandidate(result, parserKey) {
  const activities = Array.isArray(result.attivita) ? result.attivita : [];
  const metadata = result.metadata || {};
  const coverage = Number(metadata.dateCoverage) || 0;
  const total = activities.length;
  const withDates = activities.filter((activity) => activity.data_inizio && activity.data_fine).length;
  const computedCoverage = total > 0 ? Math.round((withDates / total) * 100) : 0;
  const effectiveCoverage = Math.max(coverage, computedCoverage);

  let score = total * 2 + effectiveCoverage;

  const professionalBias = {
    normalized_json: 0,
    google_sheet: 110,
    deterministic_excel: 95,
    hybrid_excel: -40,
    vision_image: -30
  };
  score += professionalBias[parserKey] || 0;

  if (parserKey === 'normalized_json') score += 1000; // Massima priorità
  if (parserKey === 'hybrid_excel') score += 50;
  if (parserKey === 'deterministic_excel') score += 25;
  if (parserKey === 'google_sheet') score += 30;
  if (parserKey === 'vision_image') score -= 10;

  const diagnostics = buildDiagnostics(activities.map((activity, index) => normalizeActivity(activity, index, parserKey)));
  score -= diagnostics.missingDates.length * 3;
  score -= diagnostics.suspiciousDurations.length * 2;
  if (diagnostics.anomalousStartCluster) {
    score -= 120;
  }

  return {
    score,
    effectiveCoverage,
    diagnostics
  };
}

function toCanonicalProject(candidate, source) {
  const canonicalPayload = candidate.result?.canonicalPayload
    || adaptParsedActivitiesToCanonical(candidate.result, source, candidate.key);

  const validation = validateCanonicalCronoprogramma(canonicalPayload);
  if (!validation.valid) {
    throw new Error(validation.errors.slice(0, 5).join(' | ') || 'Payload canonico non valido');
  }

  const normalized = normalizeCanonicalCronoprogramma(canonicalPayload, {
    projectSource: candidate.key
  });
  const diagnostics = buildDiagnostics(normalized.activities);

  return {
    schema_version: canonicalPayload.schema_version || '2.0',
    success: true,
    project: normalized.project,
    project_name: normalized.project?.name || source.label || 'Cronoprogramma importato',
    timeline: {
      start_date: normalized.project?.start_date || null,
      end_date: normalized.project?.end_date || null
    },
    macro_areas: normalized.macro_areas,
    activities: normalized.activities,
    planningActivities: normalized.planningActivities,
    source_summary: {
      mode: source.mode,
      label: source.label,
      parser: candidate.key,
      strategy: getCandidateStrategy(candidate.key),
      confidence: candidate.confidence
    },
    import_diagnostics: [
      ...validation.warnings.slice(0, 20).map((message) => ({
        severity: 'warning',
        code: 'validation_warning',
        message
      })),
      ...diagnostics.missingDates.slice(0, 20).map((activity) => ({
        severity: 'warning',
        code: 'missing_dates',
        message: `${activity.description}: date incomplete`
      })),
      ...(diagnostics.anomalousStartCluster ? [{
        severity: 'error',
        code: 'start_date_cluster',
        message: `Cluster anomalo su ${diagnostics.dominantStartDate}: ${diagnostics.dominantStartCount} attivita partono lo stesso giorno`
      }] : [])
    ],
    review: {
      ...normalized.review,
      anomalousStartCluster: diagnostics.anomalousStartCluster,
      dominantStartDate: diagnostics.dominantStartDate,
      dominantStartCount: diagnostics.dominantStartCount,
      startDateClusterRatio: diagnostics.startDateClusterRatio
    }
  };
}

async function runParsersForSource(source, options) {
  const parsers = [];

  if (source.mode === 'json') {
    // Parser JSON normalizzato ha massima priorità
    parsers.push({
      key: 'normalized_json',
      label: getCandidateLabel('normalized_json'),
      run: () => parseNormalizedJSON(source.payload, options)
    });
  } else if (source.mode === 'file') {
    parsers.push(
      {
        key: 'normalized_json',
        label: getCandidateLabel('normalized_json'),
        run: () => parseNormalizedJSON(source.payload, options)
      },
      {
        key: 'deterministic_excel',
        label: getCandidateLabel('deterministic_excel'),
        run: () => Promise.resolve(parseXLSXCronoprogramma(source.payload, options))
      },
      {
        key: 'hybrid_excel',
        label: getCandidateLabel('hybrid_excel'),
        run: () => parseCronoprogrammaAIAgent(source.payload, options)
      },
      {
        key: 'simple_gantt',
        label: getCandidateLabel('simple_gantt'),
        run: () => Promise.resolve(parseCronoprogrammaSemplice(source.payload, options))
      }
    );
  } else if (source.mode === 'sheet') {
    parsers.push({
      key: 'google_sheet',
      label: getCandidateLabel('google_sheet'),
      run: () => parseGoogleSheetColorBars(source.payload, options)
    });
  } else if (source.mode === 'vision') {
    parsers.push({
      key: 'vision_image',
      label: getCandidateLabel('vision_image'),
      run: () => parseGanttWithVision(source.payload, options)
    });
  }

  const candidates = [];

  for (const parser of parsers) {
    try {
      const result = await parser.run();
      
      if (!result || !result.success) {
        candidates.push({
          key: parser.key,
          label: parser.label,
          score: -1,
          confidence: 'low',
          error: result?.error || 'Errore restituito dal parser',
          result: null,
          diagnostics: null
        });
        continue;
      }
      
      if (!Array.isArray(result.attivita) || result.attivita.length === 0) {
        continue;
      }

      const scored = scoreCandidate(result, parser.key);
      const confidence = result.metadata?.confidence || toConfidenceLabel(scored.score);

      candidates.push({
        key: parser.key,
        label: parser.label,
        strategy: getCandidateStrategy(parser.key),
        score: scored.score,
        confidence,
        dateCoverage: scored.effectiveCoverage,
        attivitaCount: result.attivita.length,
        result,
        diagnostics: scored.diagnostics
      });
    } catch (error) {
      candidates.push({
        key: parser.key,
        label: parser.label,
        score: -1,
        confidence: 'low',
        error: error.message || 'Errore parser',
        result: null,
        diagnostics: null
      });
    }
  }

  const validCandidates = candidates
    .filter((candidate) => candidate.result)
    .sort((a, b) => b.score - a.score);

  const failedCandidates = candidates.filter((candidate) => !candidate.result);

  return { validCandidates, failedCandidates };
}

export async function parseMultimodalCronoprogramma(source, options = {}) {
  const { validCandidates, failedCandidates } = await runParsersForSource(source, options);

  if (validCandidates.length === 0) {
    // Raccogli eventuali errori dai parser che hanno fallito
    const errors = failedCandidates
      .filter((c) => c.error)
      .map((c) => `${c.label}: ${c.error}`)
      .join(' | ');

    return {
      success: false,
      error: errors ? `Errori API rilevati: ${errors}` : 'Nessun parser multimodale ha prodotto un risultato valido.',
      candidates: [],
      canonical: null
    };
  }

  const selectedCandidate = validCandidates[0];
  const canonical = toCanonicalProject(selectedCandidate, source);

  return {
    success: true,
    data: canonical,
    candidates: validCandidates.map((candidate) => ({
      key: candidate.key,
      label: candidate.label,
      strategy: candidate.strategy,
      score: candidate.score,
      confidence: candidate.confidence,
      dateCoverage: candidate.dateCoverage,
      diagnostics: candidate.diagnostics
    })),
    canonical,
    selectedCandidate: {
      key: selectedCandidate.key,
      label: selectedCandidate.label
    },
    selectedCandidateKey: selectedCandidate.key,
    selectedCandidateLabel: selectedCandidate.label,
    source,
    rawResults: Object.fromEntries(validCandidates.map((candidate) => [candidate.key, candidate.result]))
  };
}

export function materializeCandidate(importPackage, candidateKey) {
  const result = importPackage?.rawResults?.[candidateKey];
  const source = importPackage?.source;
  if (!result || !source) return null;

  const candidateMeta = (importPackage.candidates || []).find((candidate) => candidate.key === candidateKey);
  return {
    ...importPackage,
    selectedCandidateKey: candidateKey,
    selectedCandidateLabel: candidateMeta?.label || getCandidateLabel(candidateKey),
    canonical: {
      ...toCanonicalProject(
        {
          key: candidateKey,
          confidence: candidateMeta?.confidence || 'medium',
          result
        },
        source
      )
    }
  };
}

export function canonicalActivitiesToDbActivities(canonicalActivities) {
  const planningActivities = (canonicalActivities || []).map((activity) =>
    createPlanningActivity(activity, activity?.source_trace?.parser || 'canonical')
  );

  return planningActivitiesToDb(planningActivities).map((activity) => ({
    ...activity,
    categoria: 'altro'
  }));
}

export function canonicalProjectToDbActivities(canonicalProject) {
  const planningActivities = canonicalProject?.planningActivities
    || normalizeCanonicalCronoprogramma(canonicalProject, {
      projectSource: canonicalProject?.source_summary?.parser || 'canonical'
    }).planningActivities;

  return planningActivitiesToDb(planningActivities).map((activity) => ({
    ...activity,
    categoria: 'altro'
  }));
}
