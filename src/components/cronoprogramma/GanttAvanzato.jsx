/**
 * GanttAvanzato - Diagramma di Gantt con supporto CPM completo
 * 
 * Estende il PrimusGantt con:
 * - Visualizzazione frecce dipendenze
 * - Evidenziazione percorso critico
 * - Drag-to-reschedule con propagazione
 * - Tooltip con dettagli float
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Plus,
  Search,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  DollarSign,
  Layers,
  Flag,
  AlertTriangle,
  Move,
  GripVertical,
  Zap,
  Maximize2,
  X,
  FileDown
} from "lucide-react";
import {
  format,
  addDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  isSameDay,
  isWithinInterval,
  parseISO,
  isValid,
  differenceInDays,
  addMonths,
  startOfMonth,
  endOfMonth,
  getWeek
} from "date-fns";
import { it } from "date-fns/locale";
import { useCPM } from '@/hooks/useCPM';
import { CPMStats, ActivityCPMDetails, CriticalPathList } from './CPMStats';
import { GanttDndProvider } from './GanttDndProvider';
import { ActivityBar } from './ActivityBar';
import { toast } from 'sonner';

// Costanti di stile
const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 60;
const DAY_WIDTH = 40;
const SIDEBAR_WIDTH = 380;

function compareWbs(a, b) {
  const aWbs = String(a?.wbs || '');
  const bWbs = String(b?.wbs || '');
  if (aWbs && bWbs && aWbs !== bWbs) {
    return aWbs.localeCompare(bWbs, undefined, { numeric: true, sensitivity: 'base' });
  }

  const aStart = a?._startDate instanceof Date ? a._startDate.getTime() : Number.MAX_SAFE_INTEGER;
  const bStart = b?._startDate instanceof Date ? b._startDate.getTime() : Number.MAX_SAFE_INTEGER;
  if (aStart !== bStart) return aStart - bStart;

  return String(a?.descrizione || '').localeCompare(String(b?.descrizione || ''), 'it', { sensitivity: 'base' });
}

function getBaselineVarianceDays(activity) {
  if (!(activity?._startDate instanceof Date) || !(activity?._baselineStartDate instanceof Date)) {
    return null;
  }

  return differenceInDays(activity._startDate, activity._baselineStartDate);
}

function formatPlanningDate(value) {
  if (!(value instanceof Date) || !isValid(value)) return '-';
  return format(value, 'dd/MM/yyyy');
}

export default function GanttAvanzato({
  attivita,
  sals,
  cantiere,
  onAddAttivita,
  onEditAttivita,
  onAttivitaUpdate
}) {
  const [timeRange, setTimeRange] = useState({ start: new Date(), end: new Date() });
  const [expandedGroups, setExpandedGroups] = useState({});
  const [viewMode, setViewMode] = useState('day');
  const scrollContainerRef = useRef(null);
  const sidebarRef = useRef(null);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showCPMStats, setShowCPMStats] = useState(false);
  const [showCriticalPath, setShowCriticalPath] = useState(true);
  const [showDependencies, setShowDependencies] = useState(true);
  const [showBaseline, setShowBaseline] = useState(true);
  const [showConstraints, setShowConstraints] = useState(true);
  const [showOnlyVariance, setShowOnlyVariance] = useState(false);
  const [isSheetFitView, setIsSheetFitView] = useState(false);
  const [draggedRowId, setDraggedRowId] = useState(null);
  const [rowDropTargetId, setRowDropTargetId] = useState(null);

  const projectStartForCPM = useMemo(() => {
    if (cantiere?.data_inizio) return cantiere.data_inizio;
    if (!attivita || attivita.length === 0) return null;
    const validDates = attivita
      .map(a => a.data_inizio)
      .filter(Boolean)
      .sort();
    return validDates[0] || null;
  }, [cantiere?.data_inizio, attivita]);

  // Hook CPM
  const {
    cpmResult,
    isLoading: cpmLoading,
    error: cpmError,
    rescheduleActivity,
    getActivityDetails,
    getCriticalActivities
  } = useCPM(attivita, projectStartForCPM);

  const config = useMemo(() => {
    switch (viewMode) {
      case 'week': return { colWidth: 40, daysPerCol: 7 };
      case 'month': return { colWidth: 60, daysPerCol: 30.44 };
      case 'day': default: return { colWidth: 40, daysPerCol: 1 };
    }
  }, [viewMode]);

  // Elaborazione dati gerarchici (WBS)
  const processedData = useMemo(() => {
    console.log('📊 GanttAvanzato: Ricevute', attivita?.length || 0, 'attività props:', attivita);
    if (!attivita || attivita.length === 0) {
      console.warn('⚠️ GanttAvanzato: nessuna attività da elaborare', { attivita });
      return [];
    }

    const nodes = attivita.map(a => {
      // 1. PRIORITÀ: date dal database (fonte di verità)
      let startDate = a.data_inizio ? parseISO(a.data_inizio) : null;
      let endDate = a.data_fine ? parseISO(a.data_fine) : null;

      // 2. Usa CPM solo se mancano date DB E ci sono predecessori
      const cpmDetails = cpmResult ? getActivityDetails(a.id) : null;
      const hasDependencies = Array.isArray(a.predecessori) && a.predecessori.length > 0;
      const hasDbDates = Boolean(startDate && endDate);

      if (!hasDbDates && hasDependencies && cpmDetails?.data_inizio_calcolata) {
        startDate = parseISO(cpmDetails.data_inizio_calcolata);
        endDate = parseISO(cpmDetails.data_fine_calcolata);
      }

      // 3. Fallback: calcola da durata se manca solo una data
      if (startDate && !endDate && a.durata_giorni) {
        endDate = addDays(startDate, a.durata_giorni - 1);
      }
      if (!startDate && endDate && a.durata_giorni) {
        startDate = addDays(endDate, -(a.durata_giorni - 1));
      }

      return {
        ...a,
        children: [],
        level: 0,
        _startDate: startDate,
        _endDate: endDate,
        _baselineStartDate: a.baseline_start_date ? parseISO(a.baseline_start_date) : null,
        _baselineEndDate: a.baseline_end_date ? parseISO(a.baseline_end_date) : null,
        _duration: a.durata_giorni || 1,
        _amount: a.importo_previsto || 0,
        _cpmDetails: cpmDetails,
        _hasValidDates: Boolean(startDate && endDate), // Flag per UI
      };
    });

    const map = {};
    const roots = [];

    nodes.forEach(node => { map[node.id] = node; });

    nodes.forEach(node => {
      if (node.parent_id && map[node.parent_id]) {
        map[node.parent_id].children.push(node);
      } else {
        roots.push(node);
      }
    });

    const flatList = [];

    const traverse = (node, level, prefix) => {
      node.level = level;
      node.wbs = prefix;

      flatList.push(node);

      // Rimosso setExpandedGroups da qui - verrà gestito in useEffect separato

      if (expandedGroups[node.id] !== false) {
        node.children.forEach((child, index) => {
          traverse(child, level + 1, `${prefix}.${index + 1}`);
        });
      }
    };

    roots.sort(compareWbs);
    nodes.forEach((node) => node.children.sort(compareWbs));
    roots.forEach((root, index) => traverse(root, 0, `${index + 1}`));

    console.log('✅ GanttAvanzato: Dati processati con successo. Elementi:', flatList.length, flatList);
    return flatList;
  }, [attivita, expandedGroups, cpmResult]);

  const baselineStats = useMemo(() => {
    const stats = { ahead: 0, late: 0, onTrack: 0 };

    processedData.forEach((item) => {
      const varianceDays = getBaselineVarianceDays(item);
      if (varianceDays === null) return;
      if (varianceDays > 0) stats.late += 1;
      else if (varianceDays < 0) stats.ahead += 1;
      else stats.onTrack += 1;
    });

    return stats;
  }, [processedData]);

  const baselineTotals = useMemo(() => {
    let totalVarianceDays = 0;
    let maxDelayDays = 0;

    processedData.forEach((item) => {
      const varianceDays = getBaselineVarianceDays(item);
      if (varianceDays === null) return;
      totalVarianceDays += varianceDays;
      if (varianceDays > maxDelayDays) maxDelayDays = varianceDays;
    });

    return {
      totalVarianceDays,
      maxDelayDays
    };
  }, [processedData]);

  const hasBaselineData = useMemo(
    () => processedData.some((item) => item._baselineStartDate && item._baselineEndDate),
    [processedData]
  );

  const hasConstraintData = useMemo(
    () => processedData.some((item) => item.vincolo_tipo && item.vincolo_tipo !== 'asap' && item.vincolo_tipo !== 'alap'),
    [processedData]
  );

  const visibleData = useMemo(() => {
    if (!showOnlyVariance) return processedData;
    return processedData.filter((item) => {
      const varianceDays = getBaselineVarianceDays(item);
      return varianceDays !== null && varianceDays !== 0;
    });
  }, [processedData, showOnlyVariance]);

  const handleExportPdf = useCallback(() => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const title = cantiere?.denominazione || cantiere?.oggetto_lavori || 'Cronoprogramma';
    const exportRows = visibleData.filter((item) => item.tipo_attivita !== 'raggruppamento');
    const marginLeft = 12;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const columns = [
      { key: 'wbs', label: 'WBS', width: 20 },
      { key: 'descrizione', label: 'Descrizione', width: 78 },
      { key: 'inizio', label: 'Inizio', width: 24 },
      { key: 'fine', label: 'Fine', width: 24 },
      { key: 'blInizio', label: 'BL Inizio', width: 24 },
      { key: 'blFine', label: 'BL Fine', width: 24 },
      { key: 'var', label: 'Var', width: 18 },
      { key: 'stato', label: 'Stato', width: 28 }
    ];

    const drawHeader = (pageNumber) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Cronoprogramma - Progetto vs Esecuzione', marginLeft, 14);
      doc.setFontSize(11);
      doc.text(title, marginLeft, 21);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Data export: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - 60, 14);
      doc.text(`Pagina ${pageNumber}`, pageWidth - 30, 21);

      doc.setDrawColor(220, 226, 232);
      doc.line(marginLeft, 24, pageWidth - marginLeft, 24);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`Fuori baseline: ${baselineStats.late + baselineStats.ahead}`, marginLeft, 31);
      doc.text(`Max ritardo: ${baselineTotals.maxDelayDays}g`, marginLeft + 48, 31);
      doc.text(`Scostamento netto: ${baselineTotals.totalVarianceDays > 0 ? `+${baselineTotals.totalVarianceDays}` : baselineTotals.totalVarianceDays}g`, marginLeft + 92, 31);
      doc.text(`Filtro attivo: ${showOnlyVariance ? 'solo fuori baseline' : 'tutte le attivita visibili'}`, marginLeft + 160, 31);

      let x = marginLeft;
      const headerY = 40;
      doc.setFillColor(241, 245, 249);
      doc.rect(marginLeft, headerY - 5, columns.reduce((sum, col) => sum + col.width, 0), 8, 'F');
      doc.setFontSize(8);
      columns.forEach((column) => {
        doc.text(column.label, x + 1, headerY);
        x += column.width;
      });
      return headerY + 4;
    };

    let y = drawHeader(1);
    let pageNumber = 1;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    exportRows.forEach((item) => {
      if (y > pageHeight - 12) {
        doc.addPage();
        pageNumber += 1;
        y = drawHeader(pageNumber);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
      }

      const varianceDays = getBaselineVarianceDays(item);
      const varianceLabel = varianceDays === null ? '-' : varianceDays > 0 ? `+${varianceDays}g` : varianceDays < 0 ? `${varianceDays}g` : '0g';
      const values = [
        item.wbs || '',
        String(item.descrizione || '').slice(0, 48),
        formatPlanningDate(item._startDate),
        formatPlanningDate(item._endDate),
        formatPlanningDate(item._baselineStartDate),
        formatPlanningDate(item._baselineEndDate),
        varianceLabel,
        item.stato || '-'
      ];

      let x = marginLeft;
      values.forEach((value, index) => {
        if (index === 6 && varianceDays !== null) {
          if (varianceDays > 0) doc.setTextColor(180, 83, 9);
          else if (varianceDays < 0) doc.setTextColor(3, 105, 161);
          else doc.setTextColor(71, 85, 105);
        } else {
          doc.setTextColor(15, 23, 42);
        }
        doc.text(String(value), x + 1, y);
        x += columns[index].width;
      });

      doc.setDrawColor(241, 245, 249);
      doc.line(marginLeft, y + 2, marginLeft + columns.reduce((sum, col) => sum + col.width, 0), y + 2);
      y += 6;
    });

    const safeTitle = String(title).replace(/[\\/:*?"<>|]/g, '-').slice(0, 60) || 'cronoprogramma';
    doc.save(`cronoprogramma-${safeTitle}.pdf`);
  }, [baselineStats, baselineTotals, cantiere?.denominazione, cantiere?.oggetto_lavori, showOnlyVariance, visibleData]);

  // Inizializza expanded groups automaticamente per i primi 2 livelli
  useEffect(() => {
    if (!processedData.length) return;

    const newExpanded = {};
    let hasChanges = false;

    processedData.forEach(node => {
      if (node.level < 2 && expandedGroups[node.id] === undefined) {
        newExpanded[node.id] = true;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setExpandedGroups(prev => ({ ...prev, ...newExpanded }));
    }
  }, [processedData]);

  // Calcolo range temporale
  useEffect(() => {
    if (!processedData.length) return;

    const dates = processedData
      .map(n => [n._startDate, n._endDate])
      .flat()
      .filter(d => d && isValid(d));

    if (dates.length > 0) {
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));

      setTimeRange({
        start: isSheetFitView ? minDate : addDays(minDate, -15),
        end: isSheetFitView ? maxDate : addDays(maxDate, 15)
      });
    }
  }, [attivita, isSheetFitView]);

  const timeColumns = useMemo(() => {
    if (!timeRange.start || !timeRange.end) return [];

    if (viewMode === 'day') {
      return eachDayOfInterval({ start: timeRange.start, end: timeRange.end });
    } else if (viewMode === 'week') {
      const weeks = [];
      let cursor = new Date(timeRange.start);
      while (cursor <= timeRange.end) {
        weeks.push(new Date(cursor));
        cursor = addDays(cursor, 7);
      }
      return weeks;
    } else if (viewMode === 'month') {
      return eachMonthOfInterval({ start: timeRange.start, end: timeRange.end });
    }
    return [];
  }, [timeRange, viewMode]);

  const handleScroll = (e) => {
    if (sidebarRef.current) {
      sidebarRef.current.scrollTop = e.target.scrollTop;
    }
  };

  const toggleGroup = (id) => {
    setExpandedGroups(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleRowReorder = useCallback(async (activeId, overId) => {
    if (!activeId || !overId || activeId === overId || !onAttivitaUpdate) return;

    const active = attivita?.find((item) => item.id === activeId);
    const over = attivita?.find((item) => item.id === overId);
    if (!active || !over) return;

    const sameParent = (active.parent_id || null) === (over.parent_id || null);
    if (!sameParent) {
      toast.error('Puoi riordinare solo righe dello stesso livello WBS');
      return;
    }

    const siblings = (attivita || [])
      .filter((item) => (item.parent_id || null) === (active.parent_id || null))
      .map((item) => {
        const computed = processedData.find((row) => row.id === item.id);
        return {
          ...item,
          wbs: computed?.wbs || item.wbs || '',
          _startDate: item.data_inizio ? parseISO(item.data_inizio) : null
        };
      })
      .sort(compareWbs);

    const fromIndex = siblings.findIndex((item) => item.id === activeId);
    const toIndex = siblings.findIndex((item) => item.id === overId);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

    const [moved] = siblings.splice(fromIndex, 1);
    siblings.splice(toIndex, 0, moved);

    const orderedSiblingIds = siblings.map((item) => item.id);

    const treeMap = new Map((attivita || []).map((item) => [item.id, { ...item, children: [] }]));
    const rootNodes = [];

    treeMap.forEach((node) => {
      if (node.parent_id && treeMap.has(node.parent_id)) {
        treeMap.get(node.parent_id).children.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    treeMap.forEach((node) => {
      node.children.sort((a, b) => {
        const rowA = processedData.find((row) => row.id === a.id);
        const rowB = processedData.find((row) => row.id === b.id);
        return compareWbs({ ...a, wbs: rowA?.wbs }, { ...b, wbs: rowB?.wbs });
      });
    });

    if (active.parent_id && treeMap.has(active.parent_id)) {
      treeMap.get(active.parent_id).children = orderedSiblingIds.map((id) => treeMap.get(id));
    } else {
      const currentRootIds = rootNodes.map((node) => node.id);
      rootNodes.length = 0;
      orderedSiblingIds.forEach((id) => rootNodes.push(treeMap.get(id)));
      currentRootIds
        .filter((id) => !orderedSiblingIds.includes(id))
        .forEach((id) => rootNodes.push(treeMap.get(id)));
    }

    const updates = [];
    const visit = (node, prefix) => {
      updates.push({ id: node.id, wbs: prefix, parent_id: node.parent_id || null });
      node.children.forEach((child, index) => visit(child, `${prefix}.${index + 1}`));
    };

    if (active.parent_id) {
      rootNodes.sort((a, b) => {
        const rowA = processedData.find((row) => row.id === a.id);
        const rowB = processedData.find((row) => row.id === b.id);
        return compareWbs({ ...a, wbs: rowA?.wbs }, { ...b, wbs: rowB?.wbs });
      });
    }

    rootNodes.forEach((node, index) => visit(node, `${index + 1}`));

    await onAttivitaUpdate(updates.map((item) => item.id), { directUpdates: updates });
    toast.success('Ordine WBS aggiornato');
  }, [attivita, onAttivitaUpdate, processedData]);

  const getBarPosition = useCallback((start, end) => {
    if (!start || !end || !timeRange.start) {
      return null;
    }

    if (!isValid(start) || !isValid(end)) {
      return null;
    }

    const offsetDays = differenceInDays(start, timeRange.start);
    const durationDays = differenceInDays(end, start) + 1;

    const pxPerDay = config.colWidth / config.daysPerCol;

    const left = offsetDays * pxPerDay;
    const width = Math.max(durationDays * pxPerDay, 4); // Minimo 4px per visibilità

    return {
      left,
      width,
      // Debug info
      _debug: { offsetDays, durationDays, pxPerDay, start, end }
    };
  }, [timeRange.start, config]);

  // Drag handlers per @dnd-kit
  const handleActivityDateChange = useCallback(async (activityId, changes) => {
    const { data_inizio, deltaDays } = changes;

    if (!data_inizio || deltaDays === 0) return;

    if (cpmResult) {
      const result = rescheduleActivity(activityId, data_inizio);
      if (!result || result.updatedActivities.length === 0) return;

      if (result.updatedActivities.length > 1) {
        const confirmed = window.confirm(
          `L'attività è stata spostata di ${deltaDays} giorni.\n\n` +
          `Questo cambiamento influenzerà ${result.updatedActivities.length - 1} attività successive.\n\n` +
          `Vuoi procedere?`
        );
        if (!confirmed) return;
      }

      if (onAttivitaUpdate) {
        await onAttivitaUpdate(result.updatedActivities, result.result);
      }

      toast.success(`Attività aggiornata: ${deltaDays > 0 ? '+' : ''}${deltaDays} giorni`);
      return;
    }

    const source = attivita?.find(a => a.id === activityId);
    if (!source) return;

    const normalizedStart = data_inizio instanceof Date ? data_inizio : parseISO(data_inizio);
    if (!isValid(normalizedStart)) {
      toast.error('Data di inizio non valida');
      return;
    }

    const duration = Math.max(1, source.durata_giorni || 1);
    const normalizedEnd = source.tipo_attivita === 'milestone'
      ? normalizedStart
      : addDays(normalizedStart, duration - 1);

    if (onAttivitaUpdate) {
      await onAttivitaUpdate([activityId], {
        directUpdates: [{
          id: activityId,
          data_inizio: format(normalizedStart, 'yyyy-MM-dd'),
          data_fine: format(normalizedEnd, 'yyyy-MM-dd')
        }]
      });
    }

    toast.success(`Attività aggiornata: ${deltaDays > 0 ? '+' : ''}${deltaDays} giorni`);
  }, [cpmResult, rescheduleActivity, onAttivitaUpdate, attivita]);

  const handleActivityDrop = useCallback((activityId, deltaDays) => {
    if (!deltaDays) return;

    const row = processedData.find(item => item.id === activityId);
    if (!row || !row._startDate || !isValid(row._startDate)) return;

    const newStart = addDays(row._startDate, deltaDays);
    handleActivityDateChange(activityId, {
      data_inizio: newStart,
      deltaDays
    });
  }, [processedData, handleActivityDateChange]);

  const handleResizeCommit = useCallback(async (activityId, changes) => {
    const { edge, deltaDays, durationDays } = changes;
    const row = processedData.find(item => item.id === activityId);
    if (!row || !row._startDate) return;

    let newStart = row._startDate;
    let newEnd;

    if (edge === 'left') {
      newStart = addDays(row._startDate, deltaDays);
      newEnd = row._endDate;
    } else {
      newStart = row._startDate;
      newEnd = addDays(row._endDate, deltaDays);
    }

    const newDuration = Math.max(1, differenceInDays(newEnd, newStart) + 1);

    await handleActivityDateChange(activityId, {
      data_inizio: newStart,
      deltaDays: edge === 'left' ? deltaDays : 0
    });
  }, [processedData, handleActivityDateChange]);

  // Cash Flow Mensile
  const cashFlow = useMemo(() => {
    const months = {};
    let curr = startOfMonth(timeRange.start);
    const end = endOfMonth(timeRange.end);

    while (curr <= end) {
      months[format(curr, 'yyyy-MM')] = 0;
      curr = addMonths(curr, 1);
    }

    processedData.forEach(item => {
      if (item.tipo_attivita === 'task' && item._amount > 0 && item._startDate && item._endDate) {
        const dailyAmount = item._amount / item._duration;
        const days = eachDayOfInterval({ start: item._startDate, end: item._endDate });

        days.forEach(day => {
          const key = format(day, 'yyyy-MM');
          if (months[key] !== undefined) {
            months[key] += dailyAmount;
          }
        });
      }
    });

    return months;
  }, [processedData, timeRange]);

  const salMarkers = useMemo(() => {
    if (!sals) return [];
    return sals.map(sal => ({
      id: sal.id,
      date: parseISO(sal.data_sal),
      amount: sal.imponibile || 0,
      description: sal.descrizione || `SAL ${sal.numero_sal || ''}`,
      type: sal.tipo_sal_dettaglio
    })).filter(s => isValid(s.date) && isWithinInterval(s.date, { start: timeRange.start, end: timeRange.end }));
  }, [sals, timeRange]);

  // Calcola frecce dipendenze
  const dependencyLines = useMemo(() => {
    if (!showDependencies || !cpmResult) return [];

    const lines = [];
    const pxPerDay = config.colWidth / config.daysPerCol;

    processedData.forEach(att => {
      if (!att.predecessori || att.predecessori.length === 0) return;

      const targetPos = getBarPosition(att._startDate, att._endDate);
      if (!targetPos) return;

      att.predecessori.forEach(pred => {
        const predAtt = processedData.find(a => a.id === pred.attivita_id || a.id === pred.id);
        if (!predAtt) return;

        const sourcePos = getBarPosition(predAtt._startDate, predAtt._endDate);
        if (!sourcePos) return;

        // Calcola punti per la freccia
        const tipo = pred.tipo_dipendenza || pred.tipo || 'FS';
        const lag = pred.lag_giorni || pred.lag || 0;
        const lagPx = lag * pxPerDay;

        let startX, endX;

        switch (tipo) {
          case 'FS':
            startX = sourcePos.left + sourcePos.width;
            endX = targetPos.left;
            break;
          case 'SS':
            startX = sourcePos.left;
            endX = targetPos.left;
            break;
          case 'FF':
            startX = sourcePos.left + sourcePos.width;
            endX = targetPos.left + targetPos.width;
            break;
          case 'SF':
            startX = sourcePos.left;
            endX = targetPos.left + targetPos.width;
            break;
          default:
            startX = sourcePos.left + sourcePos.width;
            endX = targetPos.left;
        }

        // Aggiungi lag
        startX += lagPx;

        lines.push({
          id: `${pred.attivita_id || pred.id}-${att.id}`,
          startX,
          endX,
          y: processedData.indexOf(att) * ROW_HEIGHT + ROW_HEIGHT / 2
        });
      });
    });

    return lines;
  }, [processedData, showDependencies, cpmResult, config]);

  const handleFitToProject = useCallback(() => {
    const dates = processedData
      .map(n => [n._startDate, n._endDate])
      .flat()
      .filter(d => d && isValid(d));

    if (dates.length === 0) return;

    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    const totalDays = Math.max(1, differenceInDays(maxDate, minDate) + 1);

    setIsSheetFitView(true);
    setViewMode('week');

    setTimeRange({
      start: minDate,
      end: maxDate
    });

    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 0;
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [processedData]);

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-lg shadow-sm">
      <div className="flex-shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            Cronoprogramma Lavori
          </h3>

          <div className="flex bg-white rounded-md border border-slate-200 p-0.5">
            <Button
              variant={viewMode === 'day' ? 'secondary' : 'ghost'}
              size="sm"
              className={`h-7 text-xs px-2 ${viewMode === 'day' ? 'bg-slate-100 font-medium' : 'text-slate-600'}`}
              onClick={() => {
                setIsSheetFitView(false);
                setViewMode('day');
              }}
            >
              Giornaliero
            </Button>
            <Button
              variant={viewMode === 'week' ? 'secondary' : 'ghost'}
              size="sm"
              className={`h-7 text-xs px-2 ${viewMode === 'week' ? 'bg-slate-100 font-medium' : 'text-slate-600'}`}
              onClick={() => {
                setIsSheetFitView(false);
                setViewMode('week');
              }}
            >
              Settimanale
            </Button>
            <Button
              variant={viewMode === 'month' ? 'secondary' : 'ghost'}
              size="sm"
              className={`h-7 text-xs px-2 ${viewMode === 'month' ? 'bg-slate-100 font-medium' : 'text-slate-600'}`}
              onClick={() => {
                setIsSheetFitView(false);
                setViewMode('month');
              }}
            >
              Mensile
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2"
            onClick={handleFitToProject}
          >
            <Maximize2 className="w-3 h-3 mr-1" />
            Vista Totale
          </Button>
        </div>

        {/* Toggle Options */}
        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-md border border-slate-200 mr-4 text-xs">
          <span className="font-semibold text-slate-700">Legenda:</span>
          <span className="inline-flex items-center gap-1 text-emerald-700">
            <span className="w-3 h-3 rounded-sm border border-emerald-400 bg-emerald-100/60 inline-block" />
            Baseline
          </span>
          <span className="inline-flex items-center gap-1 text-amber-700">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
            Ritardo
          </span>
          <span className="inline-flex items-center gap-1 text-sky-700">
            <span className="w-3 h-3 rounded-full bg-sky-500 inline-block" />
            Anticipo
          </span>
          <span className="text-slate-500">
            BL: {baselineStats.onTrack} in linea, {baselineStats.late} in ritardo, {baselineStats.ahead} in anticipo
          </span>
        </div>

        <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-md border border-slate-200 mr-4 text-xs">
          <span className="font-semibold text-slate-700">Progetto vs Esecuzione:</span>
          <span className="text-slate-600">Fuori baseline: <strong>{baselineStats.late + baselineStats.ahead}</strong></span>
          <span className="text-amber-700">Max ritardo: <strong>{baselineTotals.maxDelayDays}g</strong></span>
          <span className={`${baselineTotals.totalVarianceDays > 0 ? 'text-amber-700' : baselineTotals.totalVarianceDays < 0 ? 'text-sky-700' : 'text-slate-600'}`}>
            Scostamento netto: <strong>{baselineTotals.totalVarianceDays > 0 ? `+${baselineTotals.totalVarianceDays}` : baselineTotals.totalVarianceDays}g</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={showDependencies ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowDependencies(!showDependencies)}
            className="h-8"
          >
            <Move className="w-3 h-3 mr-1" />
            Dipendenze
          </Button>
          <Button
            variant={showBaseline ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowBaseline(!showBaseline)}
            className="h-8"
          >
            <Layers className="w-3 h-3 mr-1" />
            Baseline
          </Button>
          <Button
            variant={showConstraints ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowConstraints(!showConstraints)}
            className="h-8"
          >
            <AlertTriangle className="w-3 h-3 mr-1" />
            Vincoli
          </Button>
          <Button
            variant={showCriticalPath ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowCriticalPath(!showCriticalPath)}
            className="h-8"
          >
            <Flag className="w-3 h-3 mr-1" />
            Critico
          </Button>
          <Button
            variant={showCPMStats ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowCPMStats(!showCPMStats)}
            className="h-8"
          >
            <Zap className="w-3 h-3 mr-1" />
            Stats
          </Button>
          <Button
            variant={showOnlyVariance ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowOnlyVariance(!showOnlyVariance)}
            className="h-8"
          >
            <AlertTriangle className="w-3 h-3 mr-1" />
            Solo fuori baseline
          </Button>
        </div>

        <div className="flex items-center gap-4 bg-indigo-50 px-3 py-1 rounded-md border border-indigo-100 mr-4">
          <div className="text-xs text-indigo-800">
            <span className="font-semibold">Totale Lavori:</span> € {processedData.reduce((acc, item) => item.level === 0 ? acc + (item._amount || 0) : acc, 0).toLocaleString('it-IT', { maximumFractionDigits: 0 })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleExportPdf} className="h-8">
            <FileDown className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button size="sm" onClick={onAddAttivita} className="">
            <Plus className="w-4 h-4 mr-2" />
            Aggiungi Voce
          </Button>
        </div>
      </div>

      {/* CPM Stats - Fissa */}
      {showCPMStats && cpmResult && (
        <div className="flex-shrink-0 border-b border-slate-200 p-4 bg-slate-50">
          <CPMStats cpmResult={cpmResult} />
        </div>
      )}

      {/* Loading/Error states - Fisso */}
      {cpmLoading && (
        <div className="flex-shrink-0 p-4 text-center text-slate-500">
          Calcolo CPM in corso...
        </div>
      )}

      {cpmError && (
        <div className="flex-shrink-0 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg m-4">
          <AlertTriangle className="w-5 h-5 inline mr-2" />
          Errore CPM: {cpmError}
        </div>
      )}

      {/* Main Content - Scrollabile */}
      <div className="flex flex-1 overflow-hidden relative min-h-0">
        {/* Left Sidebar - Fissa orizzontalmente */}
        <div
          ref={sidebarRef}
          className="flex-shrink-0 border-r border-slate-200 overflow-hidden bg-white z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)]"
          style={{ width: SIDEBAR_WIDTH }}
        >
          {/* Header Sidebar - Fisso */}
          <div
            className="flex border-b border-slate-200 bg-slate-100 font-semibold text-xs text-slate-600 uppercase tracking-wider flex-shrink-0"
            style={{ height: HEADER_HEIGHT }}
          >
            <div className="w-16 border-r border-slate-200 flex items-center justify-center">WBS</div>
            <div className="flex-1 border-r border-slate-200 flex items-center px-3">Descrizione Lavori</div>
            <div className="w-24 border-r border-slate-200 flex items-center justify-end px-2">Importo</div>
            <div className="w-16 flex items-center justify-center">GG</div>
          </div>

          {/* Attività - Scroll sincronizzato dalla griglia */}
          <div>
            {visibleData.map((item, index) => (
              <div
                key={item.id}
                className={`flex border-b border-slate-100 hover:bg-indigo-50 transition-colors cursor-pointer ${hoveredRow === item.id ? 'bg-indigo-50' : ''
                  } ${item._cpmDetails?.isCritical ? 'bg-red-50' : ''} ${rowDropTargetId === item.id ? 'ring-2 ring-inset ring-indigo-400' : ''}`}
                style={{ height: ROW_HEIGHT }}
                onMouseEnter={() => setHoveredRow(item.id)}
                onMouseLeave={() => setHoveredRow(null)}
                onDragOver={(e) => {
                  if (!draggedRowId || draggedRowId === item.id) return;
                  e.preventDefault();
                  setRowDropTargetId(item.id);
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const activeId = draggedRowId || e.dataTransfer.getData('text/plain');
                  setDraggedRowId(null);
                  setRowDropTargetId(null);
                  await handleRowReorder(activeId, item.id);
                }}
                onClick={() => {
                  setSelectedActivity(item);
                  onEditAttivita(item);
                }}
              >
                {(() => {
                  const varianceDays = getBaselineVarianceDays(item);
                  const varianceLabel = varianceDays === null ? null : varianceDays > 0 ? `+${varianceDays}g` : varianceDays < 0 ? `${varianceDays}g` : '0g';
                  const varianceClass = varianceDays > 0
                    ? 'border-amber-300 text-amber-700 bg-amber-50'
                    : varianceDays < 0
                      ? 'border-sky-300 text-sky-700 bg-sky-50'
                      : 'border-slate-300 text-slate-600 bg-slate-50';
                  item._varianceLabel = varianceLabel;
                  item._varianceClass = varianceClass;
                  return null;
                })()}
                <div className="w-16 border-r border-slate-200 flex items-center justify-center font-mono text-slate-500 text-xs truncate">
                  {item.wbs}
                </div>
                <div className="flex-1 border-r border-slate-200 flex items-center overflow-hidden px-3">
                  <div style={{ paddingLeft: `${item.level * 16}px` }} className="flex items-center gap-1 truncate w-full">
                    <button
                      type="button"
                      draggable
                      onClick={(e) => e.stopPropagation()}
                      onDragStart={(e) => {
                        e.stopPropagation();
                        setDraggedRowId(item.id);
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', item.id);
                      }}
                      onDragEnd={() => {
                        setDraggedRowId(null);
                        setRowDropTargetId(null);
                      }}
                      className="p-0.5 hover:bg-slate-200 rounded cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700"
                      title="Trascina per riordinare"
                    >
                      <GripVertical className="w-3.5 h-3.5" />
                    </button>
                    {item.children && item.children.length > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleGroup(item.id); }}
                        className="p-0.5 hover:bg-slate-200 rounded"
                      >
                        {expandedGroups[item.id] !== false ? <ChevronDown className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />}
                      </button>
                    )}
                    <span className={`truncate ${item.tipo_attivita === 'raggruppamento' ? 'font-bold text-slate-800' : 'text-slate-700'}`}>
                      {item.descrizione}
                    </span>
                    {showConstraints && item.vincolo_tipo && item.vincolo_tipo !== 'asap' && item.vincolo_tipo !== 'alap' && (
                      <Badge variant="outline" className="ml-1 h-5 px-1.5 text-[10px] uppercase border-amber-300 text-amber-700 bg-amber-50">
                        {item.vincolo_tipo}
                      </Badge>
                    )}
                    {showBaseline && item._baselineStartDate && item._baselineEndDate && (
                      <Badge variant="outline" className="ml-1 h-5 px-1.5 text-[10px] border-emerald-300 text-emerald-700 bg-emerald-50">
                        BL
                      </Badge>
                    )}
                    {showBaseline && item._varianceLabel && (
                      <Badge variant="outline" className={`ml-1 h-5 px-1.5 text-[10px] ${item._varianceClass}`}>
                        {item._varianceLabel}
                      </Badge>
                    )}
                    {item._cpmDetails?.isCritical && (
                      <Flag className="w-3 h-3 text-red-500 flex-shrink-0 ml-1" />
                    )}
                  </div>
                </div>
                <div className="w-24 border-r border-slate-200 flex items-center justify-end font-mono text-xs px-2">
                  {item._amount > 0 ? `€ ${item._amount.toLocaleString('it-IT', { maximumFractionDigits: 0 })}` : '-'}
                </div>
                <div className="w-16 flex items-center justify-center text-xs text-slate-500">
                  {item._duration}
                </div>
              </div>
            ))}

            <div className="border-t-2 border-slate-300 bg-slate-50 p-3 text-right font-bold text-xs flex items-center justify-end" style={{ height: 100 }}>
              TOTALE MENSILE
            </div>
          </div>
        </div>

        {/* Right Content (Gantt Chart) */}
        <div
          className="flex-1 overflow-auto bg-white"
          ref={scrollContainerRef}
          onScroll={handleScroll}
          style={{ maxHeight: '100%' }}
        >
          <div style={{ width: timeColumns.length * config.colWidth }}>
            {/* Timeline Header */}
            <div className="sticky top-0 z-10 bg-white" style={{ height: HEADER_HEIGHT }}>
              <div className="flex h-8 border-b border-slate-200">
                {(() => {
                  const blocks = [];
                  let currentBlock = null;
                  let count = 0;

                  timeColumns.forEach((colDate, i) => {
                    let label = '';
                    if (viewMode === 'day' || viewMode === 'week') {
                      label = format(colDate, 'MMM yyyy', { locale: it });
                    } else {
                      label = format(colDate, 'yyyy', { locale: it });
                    }

                    if (label !== currentBlock) {
                      if (currentBlock) {
                        blocks.push({ name: currentBlock, width: count * config.colWidth });
                      }
                      currentBlock = label;
                      count = 1;
                    } else {
                      count++;
                    }
                    if (i === timeColumns.length - 1) {
                      blocks.push({ name: currentBlock, width: count * config.colWidth });
                    }
                  });

                  return blocks.map((b, i) => (
                    <div key={i} className="border-r border-slate-200 bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-600 uppercase" style={{ width: b.width }}>
                      {b.name}
                    </div>
                  ));
                })()}
              </div>
              <div className="flex h-7 border-b border-slate-200">
                {timeColumns.map((colDate, i) => {
                  let label = '';
                  if (viewMode === 'day') label = format(colDate, 'dd');
                  else if (viewMode === 'week') label = `${format(colDate, 'd/M')} - ${format(addDays(colDate, 6), 'd/M')}`;
                  else if (viewMode === 'month') label = format(colDate, 'MMM', { locale: it });

                  return (
                    <div
                      key={i}
                      className={`flex items-center justify-center text-[10px] border-r border-slate-100 text-slate-600`}
                      style={{ width: config.colWidth }}
                    >
                      {label}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Grid & Bars */}
            <div className="relative">
              {/* Background Grid */}
              <div className="absolute inset-0 flex pointer-events-none">
                {timeColumns.map((colDate, i) => (
                  <div
                    key={i}
                    className={`border-r border-slate-100 h-full`}
                    style={{ width: config.colWidth }}
                  />
                ))}
                {/* Linea Oggi */}
                {(() => {
                  const today = new Date();
                  if (isWithinInterval(today, { start: timeRange.start, end: timeRange.end })) {
                    const pxPerDay = config.colWidth / config.daysPerCol;
                    const offset = differenceInDays(today, timeRange.start) * pxPerDay + (pxPerDay / 2);
                    return (
                      <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10" style={{ left: offset }}>
                        <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full" />
                      </div>
                    );
                  }
                })()}
              </div>

              {/* Dependency Lines */}
              {showDependencies && dependencyLines.length > 0 && (
                <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
                  <defs>
                    <marker
                      id="arrowhead-fs"
                      markerWidth="10"
                      markerHeight="7"
                      refX="9"
                      refY="3.5"
                      orient="auto"
                    >
                      <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
                    </marker>
                    <marker
                      id="arrowhead-critical"
                      markerWidth="10"
                      markerHeight="7"
                      refX="9"
                      refY="3.5"
                      orient="auto"
                    >
                      <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
                    </marker>
                  </defs>
                  {dependencyLines.map((line) => {
                    const isCritical = processedData.find(a =>
                      a.predecessori?.some(p => `${p.attivita_id || p.id}-${a.id}` === line.id)
                    )?._cpmDetails?.isCritical;

                    return (
                      <path
                        key={line.id}
                        d={`M ${line.startX} ${line.y} L ${line.endX} ${line.y}`}
                        stroke={isCritical ? '#ef4444' : '#64748b'}
                        strokeWidth={isCritical ? 3 : 2}
                        fill="none"
                        markerEnd={`url(#arrowhead-${isCritical ? 'critical' : 'fs'})`}
                        strokeDasharray={line.startX > line.endX ? "5,5" : "none"}
                      />
                    );
                  })}
                </svg>
              )}

              {/* Activity Rows */}
              {visibleData.map((item) => {
                const pos = getBarPosition(item._startDate, item._endDate);
                const baselinePos = showBaseline
                  ? getBarPosition(item._baselineStartDate, item._baselineEndDate)
                  : null;
                const varianceDays = getBaselineVarianceDays(item);
                const isCritical = item._cpmDetails?.isCritical;
                const hasValidDates = item._startDate && item._endDate && isValid(item._startDate) && isValid(item._endDate);

                return (
                  <div
                    key={item.id}
                    className={`relative border-b border-slate-100 transition-colors ${hoveredRow === item.id ? 'bg-indigo-50/50' : ''
                      } ${isCritical ? 'bg-red-50/30' : ''}`}
                    style={{ height: ROW_HEIGHT }}
                    onMouseEnter={() => setHoveredRow(item.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    {baselinePos && item.tipo_attivita !== 'raggruppamento' && (
                      <div
                        className="absolute border border-emerald-400 bg-emerald-100/40 rounded-sm"
                        style={{
                          left: baselinePos.left,
                          width: Math.max(baselinePos.width, 6),
                          height: 10,
                          top: (ROW_HEIGHT - 10) / 2,
                          zIndex: 1
                        }}
                        title={`Baseline: ${format(item._baselineStartDate, 'dd/MM/yyyy')} - ${format(item._baselineEndDate, 'dd/MM/yyyy')}`}
                      />
                    )}
                    {showBaseline && pos && varianceDays !== null && varianceDays !== 0 && item.tipo_attivita !== 'raggruppamento' && (
                      <div
                        className={`absolute rounded-full ${varianceDays > 0 ? 'bg-amber-500' : 'bg-sky-500'}`}
                        style={{
                          left: pos.left - 3,
                          top: (ROW_HEIGHT - 6) / 2,
                          width: 6,
                          height: 6,
                          zIndex: 3
                        }}
                        title={varianceDays > 0 ? `In ritardo di ${varianceDays} giorni rispetto alla baseline` : `In anticipo di ${Math.abs(varianceDays)} giorni rispetto alla baseline`}
                      />
                    )}
                    {pos ? (
                      item.tipo_attivita === 'raggruppamento' ? (
                        /* Barra raggruppamento - centrata verticalmente */
                        <div
                          className="absolute h-3 bg-slate-800 opacity-80"
                          style={{
                            left: pos.left,
                            width: pos.width,
                            top: (ROW_HEIGHT - 12) / 2 // Centrato: (40px - 12px) / 2 = 14px
                          }}
                        >
                          <div className="absolute -left-1 top-3 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-800"></div>
                          <div className="absolute -right-1 top-3 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-800"></div>
                        </div>
                      ) : (
                        /* Barra attività - solo resize */
                        <ActivityBar
                          activity={item}
                          duration={item._duration || 1}
                          isCritical={isCritical}
                          canResize={!isCritical}
                          dayWidth={config.colWidth / config.daysPerCol}
                          barLeft={pos.left}
                          barWidth={pos.width}
                          onResizeCommit={handleResizeCommit}
                        />
                      )
                    ) : (
                      /* Fallback: mostra indicazione per attività senza date valide */
                      !hasValidDates && item.tipo_attivita !== 'raggruppamento' && (
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-amber-600 italic">
                          ⚠️ Date mancanti: {item._startDate ? 'inizio OK' : 'no inizio'} / {item._endDate ? 'fine OK' : 'no fine'}
                        </div>
                      )
                    )}
                  </div>
                );
              })}

              {/* SAL Markers & Cash Flow Row */}
              <div className="border-t-2 border-slate-300 bg-slate-50 relative" style={{ height: 120 }}>
                <div className="absolute inset-0 flex pointer-events-none">
                  {timeColumns.map((day, i) => (
                    <div key={i} className="border-r border-slate-100 h-full" style={{ width: config.colWidth }} />
                  ))}
                </div>

                {salMarkers.map(sal => {
                  const pxPerDay = config.colWidth / config.daysPerCol;
                  const offset = differenceInDays(sal.date, timeRange.start) * pxPerDay + (pxPerDay / 2);
                  return (
                    <div
                      key={sal.id}
                      className="absolute top-0 bottom-0 z-10 flex flex-col items-center group"
                      style={{ left: offset }}
                    >
                      <div className="h-full w-0.5 bg-red-400 border-l border-dashed border-red-400"></div>
                      <div className="absolute top-2 bg-red-100 border border-red-300 text-red-800 text-[10px] px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap z-20 hover:scale-110 transition-transform cursor-pointer">
                        <div className="font-bold">SAL {sal.date.getDate()}/{sal.date.getMonth() + 1}</div>
                        <div>€ {sal.amount.toLocaleString('it-IT', { maximumFractionDigits: 0 })}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Details Panel */}
      {selectedActivity && (
        <div className="border-t border-slate-200 p-4 bg-white relative">
          <button
            onClick={() => setSelectedActivity(null)}
            className="absolute top-2 right-2 p-1.5 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-700 transition-colors z-10"
            title="Chiudi dettagli attività"
          >
            <X className="w-4 h-4" />
          </button>
          <ActivityCPMDetails
            activity={selectedActivity}
            cpmDetails={getActivityDetails(selectedActivity.id)}
          />
        </div>
      )}
    </div>
  );
}
