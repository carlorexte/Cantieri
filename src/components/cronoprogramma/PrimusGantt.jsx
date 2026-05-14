import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronDown, ChevronRight as ChevronRightIcon, Layers, Plus, FileDown, Maximize2, Minimize2, AlertTriangle, CalendarClock, GripVertical } from 'lucide-react';
import logoOpen from '@/assets/logo-open.png';
import logoCollapsed from '@/assets/logo-collapsed.png';
import {
  format,
  addDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  parseISO,
  isValid,
  differenceInDays,
  addMonths,
  startOfMonth,
  endOfMonth,
  getWeek,
  isWithinInterval
} from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { Boxes } from 'lucide-react';
import { ActivityBar } from './ActivityBar';
import { useCPM } from '@/hooks/useCPM';
import BIMLinker from '@/components/computo/BIMLinker';
import { backendClient } from '@/api/backendClient';

const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 60;
const SIDEBAR_WIDTH = 380;
const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 800;
const EXPLICIT_MACRO_AREA_SOURCE_ROWS = new Set([16, 30, 52, 60, 130]);

function compareWbsLike(a, b) {
  return String(a || '').localeCompare(String(b || ''), 'it', { numeric: true, sensitivity: 'base' });
}

function extractSourceRow(item) {
  const metadataRow = Number(item?.metadata?.source_row);
  if (Number.isFinite(metadataRow) && metadataRow > 0) return metadataRow;

  const note = String(item?.note || '');
  const match = note.match(/source_row:(\d+)/i);
  if (!match) return null;

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function compareWbs(a, b) {
  const wbsA = String(a?.wbs_originale || a?.wbs || '');
  const wbsB = String(b?.wbs_originale || b?.wbs || '');
  if (wbsA && wbsB) {
    const partsA = wbsA.split('.').map(Number);
    const partsB = wbsB.split('.').map(Number);
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const diff = (partsA[i] ?? -1) - (partsB[i] ?? -1);
      if (diff !== 0) return diff;
    }
    return 0;
  }
  return 0;
}

function compareRows(a, b) {
  // 1. WBS originale (preserva ordine del documento)
  const wbsCmp = compareWbs(a, b);
  if (wbsCmp !== 0) return wbsCmp;
  // 2. Data inizio come fallback
  const aStart = a?._startDate instanceof Date ? a._startDate.getTime() : Number.MAX_SAFE_INTEGER;
  const bStart = b?._startDate instanceof Date ? b._startDate.getTime() : Number.MAX_SAFE_INTEGER;
  if (aStart !== bStart) return aStart - bStart;
  return String(a?.descrizione || '').localeCompare(String(b?.descrizione || ''), 'it', { sensitivity: 'base' });
}

function formatPlanningDate(value) {
  if (!(value instanceof Date) || !isValid(value)) return '-';
  return format(value, 'dd/MM/yyyy');
}

export default function PrimusGantt({
  attivita,
  sals,
  cantiere,
  onAddAttivita,
  onEditAttivita,
  onAttivitaUpdate,
  onProgressUpdate,
  isSectionFullView = false,
  onToggleSectionFullView = () => {}
}) {
  const [timeRange, setTimeRange] = useState({ start: new Date(), end: new Date() });
  const [expandedGroups, setExpandedGroups] = useState({});
  const [progressEditActivity, setProgressEditActivity] = useState(null);
  const [progressValue, setProgressValue] = useState(0);
  const [isCompactWbsView, setIsCompactWbsView] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [viewMode, setViewMode] = useState('week');
  const [hoveredRow, setHoveredRow] = useState(null);
  const [draggedSidebarActivityId, setDraggedSidebarActivityId] = useState(null);
  const [sidebarDropMacroAreaId, setSidebarDropMacroAreaId] = useState(null);
  const [reorderDropTargetId, setReorderDropTargetId] = useState(null);
  const [localOrder, setLocalOrder] = useState(null);
  const [timelineViewportWidth, setTimelineViewportWidth] = useState(1200);
  const [vociComputo, setVociComputo] = useState([]);
  const [linksComputo, setLinksComputo] = useState([]);
  const [isLoadingBim, setIsLoadingBim] = useState(false);
  const [bimLinkerActivity, setBimLinkerActivity] = useState(null);
  const [dropTargetRowId, setDropTargetRowId] = useState(null);

  const scrollContainerRef = useRef(null);
  const sidebarRef = useRef(null);
  const resizeHandleRef = useRef(null);
  const fullViewAutoFitAppliedRef = useRef(false);

  useEffect(() => {
    setLocalOrder(null);
  }, [attivita]);

  const projectStartForCPM = useMemo(() => {
    if (cantiere?.data_inizio) return cantiere.data_inizio;
    const dates = (attivita || []).map((item) => item.data_inizio).filter(Boolean).sort();
    return dates[0] || null;
  }, [attivita, cantiere?.data_inizio]);

  const { cpmResult, rescheduleActivity } = useCPM(attivita, projectStartForCPM);

  const loadBimData = useCallback(async () => {
    // BIM in standby
    setVociComputo([]);
    setLinksComputo([]);
  }, []);

  useEffect(() => {
    loadBimData();
  }, [loadBimData]);

  // Mappa link per attività per accesso rapido
  const linksMap = useMemo(() => {
    const map = {};
    linksComputo.forEach(link => {
      if (!map[link.attivita_id]) map[link.attivita_id] = [];
      map[link.attivita_id].push(link);
    });
    return map;
  }, [linksComputo]);

  const config = useMemo(() => {
    switch (viewMode) {
      case 'day': return { colWidth: 34, daysPerCol: 1 };
      case 'month': return { colWidth: 84, daysPerCol: 30.44 };
      case 'fit': {
        const fitStart = timeRange.start && isValid(timeRange.start) ? startOfMonth(timeRange.start) : new Date();
        const fitEnd = timeRange.end && isValid(timeRange.end) ? endOfMonth(timeRange.end) : new Date();
        const monthCount = Math.max(1, eachMonthOfInterval({ start: fitStart, end: fitEnd }).length);
        const availableWidth = Math.max(timelineViewportWidth - 8, monthCount * 32);
        return { colWidth: Math.max(32, availableWidth / monthCount), daysPerCol: 30.44 };
      }
      case 'week':
      default:
        return { colWidth: 48, daysPerCol: 7 };
    }
  }, [timeRange.end, timeRange.start, timelineViewportWidth, viewMode]);

  const processedData = useMemo(() => {
    if (!attivita?.length) return [];

    const nodes = attivita.map((item) => ({
      ...item,
      children: [],
      level: 0,
      wbs: '',
      _startDate: item.data_inizio ? parseISO(item.data_inizio) : null,
      _endDate: item.data_fine ? parseISO(item.data_fine) : null,
      _duration: item.durata_giorni || 1,
      _amount: item.importo_previsto || 0,
      _bimAmount: (linksMap[item.id] || []).reduce((sum, link) => sum + (link.quantita_allocata * (link.voci_computo?.prezzo_unitario || 0)), 0),
      _hasBim: !!linksMap[item.id]?.length,
      _cpmDetails: cpmResult?.results?.find((row) => row.activity.id === item.id) || null
    }));

    const nodeMap = new Map(nodes.map((item) => [item.id, item]));
    const roots = [];

    nodes.forEach((node) => {
      if (node.parent_id && nodeMap.has(node.parent_id)) {
        nodeMap.get(node.parent_id).children.push(node);
      } else {
        roots.push(node);
      }
    });

    const calculateTotals = (node) => {
      if (!node.children.length) {
        return {
          start: node._startDate,
          end: node._endDate,
          amount: node._amount,
          bimAmount: node._bimAmount || 0
        };
      }

      let minStart = null;
      let maxEnd = null;
      let totalAmount = 0;
      let totalBimAmount = 0;

      node.children.forEach((child) => {
        const childTotals = calculateTotals(child);
        if (childTotals.start && (!minStart || childTotals.start < minStart)) minStart = childTotals.start;
        if (childTotals.end && (!maxEnd || childTotals.end > maxEnd)) maxEnd = childTotals.end;
        totalAmount += childTotals.amount || 0;
        totalBimAmount += childTotals.bimAmount || 0;
      });

      if (node.tipo_attivita === 'raggruppamento') {
        node._startDate = minStart;
        node._endDate = maxEnd;
        node._amount = totalAmount;
        node._bimAmount = totalBimAmount;
        if (minStart && maxEnd) {
          node._duration = differenceInDays(maxEnd, minStart) + 1;
        }
      }

      return {
        start: node._startDate,
        end: node._endDate,
        amount: node._amount || 0,
        bimAmount: node._bimAmount || 0
      };
    };

    roots.sort(compareRows);
    roots.forEach((root) => calculateTotals(root));
    nodes.forEach((node) => node.children.sort(compareRows));

    if (localOrder) {
      const orderMap = new Map(localOrder.map((id, index) => [id, index]));
      roots.sort((a, b) => {
        const aOrder = orderMap.get(a.id);
        const bOrder = orderMap.get(b.id);
        if (aOrder === undefined && bOrder === undefined) return 0;
        if (aOrder === undefined) return 1;
        if (bOrder === undefined) return -1;
        return aOrder - bOrder;
      });
    }

    const flat = [];
    const walk = (node, level, prefix) => {
      node.level = level;
      node.wbs = prefix;
      flat.push(node);

      if (expandedGroups[node.id] !== false) {
        node.children.forEach((child, index) => walk(child, level + 1, `${prefix}.${index + 1}`));
      }
    };

    roots.forEach((root, index) => walk(root, 0, `${index + 1}`));
    return flat;
  }, [attivita, cpmResult, expandedGroups, localOrder]);

  const macroAreaRows = useMemo(
    () => processedData.filter((item) => item.tipo_attivita === 'raggruppamento'),
    [processedData]
  );

  const isExplicitMacroArea = useCallback((item) => {
    if (item?.tipo_attivita !== 'raggruppamento') return false;
    return EXPLICIT_MACRO_AREA_SOURCE_ROWS.has(extractSourceRow(item));
  }, []);

  useEffect(() => {
    if (!processedData.length) return;

    const nextExpanded = {};
    let hasChanges = false;
    processedData.forEach((node) => {
      if (node.level < 2 && expandedGroups[node.id] === undefined) {
        nextExpanded[node.id] = true;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setExpandedGroups((current) => ({ ...current, ...nextExpanded }));
    }
  }, [processedData, expandedGroups]);

  useEffect(() => {
    const dates = processedData
      .flatMap((item) => [item._startDate, item._endDate])
      .filter((date) => date && isValid(date));

    if (!dates.length) return;

    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    setTimeRange({
      start: addDays(minDate, -7),
      end: addDays(maxDate, 7)
    });
  }, [processedData]);

  useEffect(() => {
    const updateViewportWidth = () => {
      const nextWidth = scrollContainerRef.current?.clientWidth || Math.max(window.innerWidth - SIDEBAR_WIDTH - 48, 960);
      setTimelineViewportWidth(nextWidth);
    };

    updateViewportWidth();
    window.addEventListener('resize', updateViewportWidth);
    return () => window.removeEventListener('resize', updateViewportWidth);
  }, []);

  const timeColumns = useMemo(() => {
    if (!timeRange.start || !timeRange.end) return [];

    if (viewMode === 'day') {
      return eachDayOfInterval({ start: timeRange.start, end: timeRange.end });
    }

    if (viewMode === 'month' || viewMode === 'fit') {
      return eachMonthOfInterval({ start: timeRange.start, end: timeRange.end });
    }

    const weeks = [];
    let cursor = new Date(timeRange.start);
    while (cursor <= timeRange.end) {
      weeks.push(new Date(cursor));
      cursor = addDays(cursor, 7);
    }
    return weeks;
  }, [timeRange, viewMode]);

  const salMarkers = useMemo(() => {
    if (!Array.isArray(sals)) return [];
    return sals
      .map((sal) => ({
        id: sal.id,
        date: parseISO(sal.data_sal),
        amount: sal.imponibile || 0,
        description: sal.descrizione || `SAL ${sal.numero_sal || ''}`
      }))
      .filter((item) => isValid(item.date) && isWithinInterval(item.date, { start: timeRange.start, end: timeRange.end }));
  }, [sals, timeRange]);

  const overviewStats = useMemo(() => {
    const today = new Date();
    const validActivities = processedData.filter((item) => item._startDate && item._endDate);
    const startDates = validActivities.map((item) => item._startDate);
    const endDates = validActivities.map((item) => item._endDate);
    const delayedActivities = processedData.filter((item) => item.tipo_attivita === 'task' && item._endDate && item._endDate < today && item.stato !== 'completata').length;
    const salToInvoice = (sals || []).filter((item) => {
      if (!item?.data_sal) return false;
      const date = parseISO(item.data_sal);
      return isValid(date) && date <= today;
    }).length;

    return {
      projectStart: startDates.length ? new Date(Math.min(...startDates)) : null,
      projectEnd: endDates.length ? new Date(Math.max(...endDates)) : null,
      delayedActivities,
      salToInvoice
    };
  }, [processedData, sals]);

  const salProgressStats = useMemo(() => {
    const tasks = processedData.filter(item => item.tipo_attivita === 'task' && item._startDate && item._endDate);
    if (!tasks.length) return null;

    const allStarts = tasks.map(i => i._startDate);
    const allEnds = tasks.map(i => i._endDate);
    const projectStart = new Date(Math.min(...allStarts));
    const projectEnd = new Date(Math.max(...allEnds));
    const durataGiorni = differenceInDays(projectEnd, projectStart) + 1;

    const today = new Date();
    const giorniTrascorsi = Math.max(0, Math.min(differenceInDays(today, projectStart), durataGiorni));
    const percTemporale = durataGiorni > 0 ? Math.round((giorniTrascorsi / durataGiorni) * 100) : 0;

    const valoreContratto =
      (parseFloat(cantiere?.importo_lavori_netto_ribasso) || 0) +
      (parseFloat(cantiere?.importo_progettazione) || 0) +
      (parseFloat(cantiere?.oneri_sicurezza_importo) || 0);
    const valoreAtteso = valoreContratto * percTemporale / 100;

    let totalDurata = 0;
    let sommaPct = 0;
    tasks.forEach(item => {
      const d = item._duration || 1;
      totalDurata += d;
      sommaPct += (item.percentuale_completamento || 0) * d;
    });
    const percReale = totalDurata > 0 ? Math.round(sommaPct / totalDurata) : 0;

    return { durataGiorni, giorniTrascorsi, percTemporale, valoreContratto, valoreAtteso, percReale, projectStart, projectEnd };
  }, [processedData, cantiere]);

  const salCurveData = useMemo(() => {
    if (!salProgressStats?.valoreContratto || salProgressStats.valoreContratto <= 0) return null;
    const { valoreContratto, durataGiorni, projectStart, projectEnd } = salProgressStats;
    if (!projectStart || !projectEnd) return null;

    const dailyRate = valoreContratto / Math.max(1, durataGiorni);

    const sortedSals = [...(sals || [])]
      .filter(s => s.data_sal && isValid(parseISO(s.data_sal)))
      .sort((a, b) => new Date(a.data_sal).getTime() - new Date(b.data_sal).getTime());

    let cumulative = 0;
    const salThresholds = sortedSals
      .map(sal => {
        cumulative += parseFloat(sal.imponibile) || 0;
        return { id: sal.id, cumulativeAmount: cumulative, label: sal.descrizione || `SAL ${sal.numero_sal || ''}` };
      })
      .filter(t => t.cumulativeAmount > 0 && t.cumulativeAmount <= valoreContratto);

    const today = new Date();
    const startD = (projectStart instanceof Date) ? projectStart : new Date(projectStart || today);
    const dRate = Number(dailyRate) || 0;
    const vContratto = Number(valoreContratto) || 0;
    
    // Explicitly calculate to avoid lint errors
    const elapsed = differenceInDays(today, startD);
    const daysElapsed = Number(Math.max(0, elapsed));
    const todayAccrued = Number(Math.min(dRate * daysElapsed, vContratto));
    
    const nextSal = salThresholds.find(t => Number(t.cumulativeAmount) > todayAccrued);
    const toNextSal = nextSal ? (Number(nextSal.cumulativeAmount) - todayAccrued) : 0;

    return { valoreContratto: vContratto, durataGiorni, dailyRate: dRate, projectStart: startD, projectEnd, salThresholds, todayAccrued, nextSal, toNextSal };
  }, [salProgressStats, sals]);

  const handleScroll = (event) => {
    if (sidebarRef.current) {
      sidebarRef.current.scrollTop = event.target.scrollTop;
    }
  };

  // Resize sidebar con drag
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const newWidth = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, e.clientX - 200));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const startResize = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  // Doppio click per collassare/espandere sidebar
  const handleSidebarDoubleClick = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  const toggleGroup = (id) => {
    setIsCompactWbsView(false);
    setExpandedGroups((current) => ({
      ...current,
      [id]: !current[id]
    }));
  };

  const getBarPosition = useCallback((start, end) => {
    if (!start || !end || !isValid(start) || !isValid(end) || !timeRange.start) return null;

    const offsetDays = differenceInDays(start, timeRange.start);
    const durationDays = differenceInDays(end, start) + 1;
    const pxPerDay = config.colWidth / config.daysPerCol;

    return {
      left: offsetDays * pxPerDay,
      width: Math.max(durationDays * pxPerDay, 6)
    };
  }, [config, timeRange.start]);

  const handleSidebarMoveToMacroArea = useCallback(async (activityId, targetMacroAreaId) => {
    if (!activityId || !targetMacroAreaId || !onAttivitaUpdate) return;

    const active = attivita?.find((item) => item.id === activityId);
    const targetMacroArea = attivita?.find((item) => item.id === targetMacroAreaId);
    if (!active || !targetMacroArea) return;
    if (active.tipo_attivita === 'raggruppamento') return;
    if (targetMacroArea.tipo_attivita !== 'raggruppamento') return;
    if ((active.parent_id || null) === targetMacroAreaId) return;

    const treeMap = new Map((attivita || []).map((item) => {
      const row = processedData.find((processed) => processed.id === item.id);
      return [item.id, {
        ...item,
        children: [],
        _currentWbs: row?.wbs || item.wbs || ''
      }];
    }));
    const rootNodes = [];

    treeMap.forEach((node) => {
      if (node.parent_id && treeMap.has(node.parent_id)) {
        treeMap.get(node.parent_id).children.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    treeMap.forEach((node) => {
      node.children.sort((a, b) => compareWbsLike(a._currentWbs, b._currentWbs));
    });

    const sourceParentId = active.parent_id || null;
    if (sourceParentId && treeMap.has(sourceParentId)) {
      treeMap.get(sourceParentId).children = treeMap.get(sourceParentId).children.filter((child) => child.id !== activityId);
    } else {
      const rootIndex = rootNodes.findIndex((node) => node.id === activityId);
      if (rootIndex >= 0) rootNodes.splice(rootIndex, 1);
    }

    const movingNode = treeMap.get(activityId);
    movingNode.parent_id = targetMacroAreaId;
    const targetChildren = treeMap.get(targetMacroAreaId)?.children || [];
    targetChildren.push(movingNode);
    targetChildren.sort((a, b) => compareWbsLike(a._currentWbs, b._currentWbs));
    treeMap.get(targetMacroAreaId).children = targetChildren;

    rootNodes.sort((a, b) => compareWbsLike(a._currentWbs, b._currentWbs));

    const updates = [];
    const visit = (node, prefix) => {
      updates.push({
        id: node.id,
        wbs: prefix,
        parent_id: node.parent_id || null
      });
      node.children.forEach((child, index) => visit(child, `${prefix}.${index + 1}`));
    };

    rootNodes.forEach((node, index) => visit(node, `${index + 1}`));

    await onAttivitaUpdate(updates.map((item) => item.id), { directUpdates: updates });
    toast.success('Attività spostata nella macro area selezionata');
  }, [attivita, onAttivitaUpdate, processedData]);

  const handleSidebarDragStart = useCallback((event, activityId) => {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', activityId);
    setDraggedSidebarActivityId(activityId);
  }, []);

  const handleSidebarDragEnd = useCallback(() => {
    setDraggedSidebarActivityId(null);
    setSidebarDropMacroAreaId(null);
  }, []);

  const handleSidebarMacroAreaDrop = useCallback(async (event, macroAreaId) => {
    event.preventDefault();
    const droppedActivityId = event.dataTransfer.getData('text/plain') || draggedSidebarActivityId;
    setDraggedSidebarActivityId(null);
    setSidebarDropMacroAreaId(null);
    await handleSidebarMoveToMacroArea(droppedActivityId, macroAreaId);
  }, [draggedSidebarActivityId, handleSidebarMoveToMacroArea]);

  const handleSidebarReorderDragOver = useCallback((e, item) => {
    if (!draggedSidebarActivityId) return;
    if (item.tipo_attivita === 'raggruppamento') return;
    if (item.id === draggedSidebarActivityId) return;
    e.preventDefault();
    e.stopPropagation();
    setReorderDropTargetId(item.id);
  }, [draggedSidebarActivityId]);

  const handleSidebarReorderDrop = useCallback((e, targetItem) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedId = draggedSidebarActivityId;
    if (!draggedId || draggedId === targetItem.id) {
      setDraggedSidebarActivityId(null);
      setReorderDropTargetId(null);
      return;
    }
    if (targetItem.tipo_attivita === 'raggruppamento') {
      setDraggedSidebarActivityId(null);
      setReorderDropTargetId(null);
      return;
    }

    const sourceIndex = processedData.findIndex(item => item.id === draggedId);
    const targetIndex = processedData.findIndex(item => item.id === targetItem.id);
    if (sourceIndex === -1 || targetIndex === -1) {
      setDraggedSidebarActivityId(null);
      setReorderDropTargetId(null);
      return;
    }

    const reorderedActivities = [...processedData];
    const [removed] = reorderedActivities.splice(sourceIndex, 1);
    reorderedActivities.splice(targetIndex, 0, removed);

    const newOrder = reorderedActivities.map(item => item.id);
    setLocalOrder(newOrder);

    setDraggedSidebarActivityId(null);
    setReorderDropTargetId(null);
    toast.success('Attività riordinata');
  }, [draggedSidebarActivityId, processedData]);

  const handleFitToProject = useCallback(() => {
    const dates = processedData
      .flatMap((item) => [item._startDate, item._endDate])
      .filter((date) => date && isValid(date));

    if (!dates.length) return;

    const minDate = startOfMonth(new Date(Math.min(...dates)));
    const maxDate = endOfMonth(new Date(Math.max(...dates)));
    setViewMode('fit');
    setTimeRange({ start: minDate, end: maxDate });
    setExpandedGroups(() => {
      const next = {};
      processedData.forEach((item) => {
        if (item.children?.length) next[item.id] = false;
      });
      return next;
    });
    setIsCompactWbsView(true);

    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 0;
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [processedData]);

  const handleExpandWbs = useCallback(() => {
    setExpandedGroups(() => {
      const next = {};
      processedData.forEach((item) => {
        if (item.children?.length && item.level < 2) next[item.id] = true;
      });
      return next;
    });
    setIsCompactWbsView(false);
  }, [processedData]);

  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
    if (mode !== 'fit') {
      setIsCompactWbsView(false);
    }
  }, []);

  useEffect(() => {
    if (!isSectionFullView) {
      fullViewAutoFitAppliedRef.current = false;
      return;
    }

    if (!processedData.length || fullViewAutoFitAppliedRef.current) return;
    handleFitToProject();
    fullViewAutoFitAppliedRef.current = true;
  }, [handleFitToProject, isSectionFullView, processedData.length]);

  const handleExportPdf = useCallback(() => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const title = cantiere?.denominazione || cantiere?.oggetto_lavori || 'Cronoprogramma';
    const rows = processedData.filter((item) => item.tipo_attivita !== 'raggruppamento');
    const columns = [
      { label: 'WBS', width: 18 },
      { label: 'Descrizione', width: 90 },
      { label: 'Inizio', width: 26 },
      { label: 'Fine', width: 26 },
      { label: 'Dur.', width: 18 },
      { label: 'Stato', width: 24 }
    ];
    const marginLeft = 10;
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Cronoprogramma - Vista Totale', marginLeft, 14);
    doc.setFontSize(10);
    doc.text(title, marginLeft, 20);
    doc.setFont('helvetica', 'normal');
    doc.text(`Inizio complessivo: ${formatPlanningDate(overviewStats.projectStart)}`, marginLeft, 27);
    doc.text(`Fine complessiva: ${formatPlanningDate(overviewStats.projectEnd)}`, marginLeft + 60, 27);
    doc.text(`Attivita in ritardo: ${overviewStats.delayedActivities}`, marginLeft + 120, 27);
    doc.text(`SAL da fatturare/verificare: ${overviewStats.salToInvoice}`, marginLeft + 182, 27);
    doc.text(`Export: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - 58, 14);

    let x = marginLeft;
    const headerY = 36;
    doc.setFillColor(241, 245, 249);
    doc.rect(marginLeft, headerY - 5, columns.reduce((sum, col) => sum + col.width, 0), 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    columns.forEach((column) => {
      doc.text(column.label, x + 1, headerY);
      x += column.width;
    });

    doc.setFont('helvetica', 'normal');
    let y = 42;
    rows.forEach((item) => {
      if (y > 195) return;
      const values = [
        item.wbs || '',
        String(item.descrizione || '').slice(0, 54),
        formatPlanningDate(item._startDate),
        formatPlanningDate(item._endDate),
        String(item._duration || '-'),
        item.stato || '-'
      ];
      let currentX = marginLeft;
      values.forEach((value, index) => {
        doc.text(String(value), currentX + 1, y);
        currentX += columns[index].width;
      });
      y += 6;
    });

    doc.save(`cronoprogramma-vista-totale-${String(title).replace(/[\\/:*?"<>|]/g, '-').slice(0, 48)}.pdf`);
  }, [cantiere?.denominazione, cantiere?.oggetto_lavori, overviewStats, processedData]);

  const handleActivityDateChange = useCallback(async (activityId, deltaDays) => {
    if (!deltaDays) return;

    const row = processedData.find((item) => item.id === activityId);
    if (!row || !row._startDate || !isValid(row._startDate)) return;

    const nextStart = addDays(row._startDate, deltaDays);

    if (cpmResult) {
      const result = rescheduleActivity(activityId, format(nextStart, 'yyyy-MM-dd'));
      if (result?.updatedActivities?.length && onAttivitaUpdate) {
        await onAttivitaUpdate(result.updatedActivities, result.result);
        toast.success(`Attivita spostata di ${deltaDays > 0 ? '+' : ''}${deltaDays} giorni`);
      }
      return;
    }

    if (!onAttivitaUpdate) return;

    const duration = Math.max(1, row._duration || 1);
    const nextEnd = row.tipo_attivita === 'milestone' ? nextStart : addDays(nextStart, duration - 1);

    await onAttivitaUpdate([activityId], {
      directUpdates: [{
        id: activityId,
        data_inizio: format(nextStart, 'yyyy-MM-dd'),
        data_fine: format(nextEnd, 'yyyy-MM-dd')
      }]
    });

    toast.success(`Attivita spostata di ${deltaDays > 0 ? '+' : ''}${deltaDays} giorni`);
  }, [cpmResult, onAttivitaUpdate, processedData, rescheduleActivity]);

  const handleRowDragEnd = useCallback(() => {
    setDropTargetRowId(null);
  }, []);

  const handleRowDragOver = useCallback((e, item) => {
    if (item.tipo_attivita === 'raggruppamento') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetRowId(item.id);
  }, []);

  const handleRowDrop = useCallback(async (e, targetItem) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId || draggedId === targetItem.id) {
      handleRowDragEnd();
      return;
    }
    if (targetItem.tipo_attivita === 'raggruppamento') {
      handleRowDragEnd();
      return;
    }

    const sourceItem = processedData.find(item => item.id === draggedId);
    if (!sourceItem || !onAttivitaUpdate) {
      handleRowDragEnd();
      return;
    }

    const sourceIndex = processedData.findIndex(item => item.id === draggedId);
    const targetIndex = processedData.findIndex(item => item.id === targetItem.id);
    if (sourceIndex === -1 || targetIndex === -1) {
      handleRowDragEnd();
      return;
    }

    const reorderedActivities = [...processedData];
    const [removed] = reorderedActivities.splice(sourceIndex, 1);
    reorderedActivities.splice(targetIndex, 0, removed);

    const updates = reorderedActivities.map((item, index) => ({
      id: item.id,
      ordinamento: index
    }));

    try {
      await onAttivitaUpdate(updates.map(u => u.id), { directUpdates: updates });
      toast.success('Attività riordinata');
    } catch (err) {
      toast.error('Errore riordinamento');
    }

    handleRowDragEnd();
  }, [processedData, onAttivitaUpdate, handleRowDragEnd]);

  const handleActivityResize = useCallback(async (activityId, resizeData) => {
    if (!onAttivitaUpdate || !resizeData) return;

    const row = processedData.find((item) => item.id === activityId);
    if (!row || !row._startDate || !row._endDate || !isValid(row._startDate) || !isValid(row._endDate)) return;
    if (row.tipo_attivita !== 'task') return;

    const nextDuration = Math.max(1, Number(resizeData.durationDays) || row._duration || 1);
    let nextStart = row._startDate;
    let nextEnd = row._endDate;

    if (resizeData.edge === 'left') {
      nextStart = addDays(row._startDate, Number(resizeData.deltaDays) || 0);
      if (!isValid(nextStart) || nextStart > row._endDate) return;
      nextEnd = row._endDate;
    } else {
      nextStart = row._startDate;
      nextEnd = addDays(row._startDate, nextDuration - 1);
    }

    await onAttivitaUpdate([activityId], {
      directUpdates: [{
        id: activityId,
        data_inizio: format(nextStart, 'yyyy-MM-dd'),
        data_fine: format(nextEnd, 'yyyy-MM-dd'),
        durata_giorni: nextDuration
      }]
    });

    toast.success(`Durata attività aggiornata a ${nextDuration} giorni`);
  }, [onAttivitaUpdate, processedData]);

  const handleProgressSave = useCallback(async () => {
    if (!progressEditActivity || !onProgressUpdate) return;
    try {
      await onProgressUpdate(progressEditActivity.id, progressValue);
      setProgressEditActivity(null);
    } catch {
      toast.error('Errore aggiornamento avanzamento');
    }
  }, [progressEditActivity, progressValue, onProgressUpdate]);

  return (
    <div className={`flex flex-col h-full bg-white border border-slate-200 shadow-sm overflow-hidden ${isSectionFullView ? 'rounded-none' : 'rounded-lg'}`}>
      <div className="border-b border-slate-200 px-4 py-3 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: logo (when collapsed) + title + date range */}
          <div className="flex items-center gap-4 min-w-0">
            {/* Logo button when sidebar collapsed */}
            {isSidebarCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-slate-100 flex-shrink-0"
                onClick={() => setIsSidebarCollapsed(false)}
                title="Mostra lista attività"
              >
                <img
                  src={logoCollapsed}
                  alt="Mostra menu"
                  className="w-6 h-6 object-contain"
                />
              </Button>
            )}
            
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 text-sm leading-tight">Cronoprogramma Lavori</h3>
              <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                {formatPlanningDate(overviewStats.projectStart)} → {formatPlanningDate(overviewStats.projectEnd)}
              </p>
            </div>

            {/* Time scale toggle */}
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              <Button type="button" variant={viewMode === 'day' ? 'default' : 'ghost'} size="sm" className={`h-7 text-xs px-2.5 rounded-md ${viewMode === 'day' ? '' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => handleViewModeChange('day')}>Giorni</Button>
              <Button type="button" variant={viewMode === 'week' ? 'default' : 'ghost'} size="sm" className={`h-7 text-xs px-2.5 rounded-md ${viewMode === 'week' ? '' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => handleViewModeChange('week')}>Settimane</Button>
              <Button type="button" variant={viewMode === 'month' ? 'default' : 'ghost'} size="sm" className={`h-7 text-xs px-2.5 rounded-md ${viewMode === 'month' ? '' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => handleViewModeChange('month')}>Mesi</Button>
            </div>
          </div>

          {/* Right: stats + actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {overviewStats.delayedActivities > 0 && (
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-amber-700 font-semibold">{overviewStats.delayedActivities} in ritardo</span>
              </div>
            )}
            {overviewStats.salToInvoice > 0 && (
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1.5 text-xs">
                <CalendarClock className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-blue-700 font-semibold">{overviewStats.salToInvoice} SAL da verificare</span>
              </div>
            )}

            {/* Icon buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-slate-100"
                onClick={() => setIsSidebarCollapsed(v => !v)}
                title={isSidebarCollapsed ? 'Mostra lista' : 'Nascondi lista'}
              >
                <img
                  src={isSidebarCollapsed ? logoCollapsed : logoOpen}
                  alt={isSidebarCollapsed ? 'Apri menu' : 'Chiudi menu'}
                  className="w-6 h-6 object-contain"
                />
              </Button>
              {isSectionFullView && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600" onClick={handleFitToProject} title="Adatta progetto">
                  <Layers className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600" onClick={onToggleSectionFullView} title={isSectionFullView ? 'Esci vista totale' : 'Vista totale'}>
                {isSectionFullView ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600" onClick={handleExportPdf} title="Esporta PDF">
                <FileDown className="w-4 h-4" />
              </Button>
            </div>

            <Button size="sm" onClick={onAddAttivita} className="h-8">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Nuova Voce
            </Button>
          </div>
        </div>
      </div>



      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <div
          ref={sidebarRef}
          className="flex-shrink-0 border-r border-slate-200 overflow-hidden bg-white z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)] transition-[width] duration-300"
          style={{ width: isSidebarCollapsed ? 0 : sidebarWidth }}
          onDoubleClick={handleSidebarDoubleClick}
        >
          <div className="flex border-b border-slate-200 bg-slate-50 font-semibold text-[10px] text-slate-400 uppercase tracking-widest" style={{ height: HEADER_HEIGHT }}>
            <div className="w-16 border-r border-slate-200 flex items-center justify-center">WBS</div>
            <div className="flex-1 border-r border-slate-200 flex items-center px-3">Descrizione attività</div>
            <div className="w-24 border-r border-slate-200 flex items-center justify-end px-2">Importo</div>
            <div className="w-16 flex items-center justify-center">GG</div>
          </div>

          <div>
            {processedData.map((item) => (
              <div
                key={item.id}
                className={`flex border-b border-slate-100 text-sm hover:bg-orange-50/60 transition-colors ${
                  hoveredRow === item.id ? 'bg-orange-50/60' : ''
                } ${
                  item.tipo_attivita === 'raggruppamento'
                    ? (isExplicitMacroArea(item)
                      ? 'bg-sky-50/90 cursor-pointer'
                      : 'bg-slate-50')
                    : ''
                } ${
                  item.tipo_attivita !== 'raggruppamento' ? 'cursor-pointer' : ''
                } ${
                  sidebarDropMacroAreaId === item.id && item.tipo_attivita === 'raggruppamento' ? 'bg-emerald-50 ring-1 ring-inset ring-emerald-300' : ''
                } ${
                  reorderDropTargetId === item.id ? 'bg-indigo-100 border-t-2 border-t-indigo-500' : ''
                }`}
                style={{ height: ROW_HEIGHT }}
                onMouseEnter={() => setHoveredRow(item.id)}
                onMouseLeave={() => setHoveredRow(null)}
                onClick={() => onEditAttivita(item)}
                onDragOver={(event) => {
                  if (draggedSidebarActivityId && item.id !== draggedSidebarActivityId) {
                    if (item.tipo_attivita === 'raggruppamento') {
                      if (sidebarDropMacroAreaId !== item.id) {
                        setSidebarDropMacroAreaId(item.id);
                      }
                    } else {
                      handleSidebarReorderDragOver(event, item);
                      return;
                    }
                  }
                }}
                onDragLeave={() => {
                  if (sidebarDropMacroAreaId === item.id) {
                    setSidebarDropMacroAreaId(null);
                  }
                  if (reorderDropTargetId === item.id) {
                    setReorderDropTargetId(null);
                  }
                }}
                onDrop={(event) => {
                  if (reorderDropTargetId === item.id) {
                    handleSidebarReorderDrop(event, item);
                  } else {
                    handleSidebarMacroAreaDrop(event, item.id);
                  }
                }}
              >
                <div className="w-16 border-r border-slate-200 flex items-center justify-center font-mono text-slate-500 text-xs truncate">
                  {item.wbs}
                </div>
                <div className="flex-1 border-r border-slate-200 flex items-center overflow-hidden px-3">
                  <div style={{ paddingLeft: `${item.level * 16}px` }} className="flex items-center gap-1 truncate w-full">
                    <div className="flex-shrink-0" title={item._hasBim ? 'Modifica collegamenti BIM 5D' : 'Collega a voci di computo (BIM 5D)'}>
                      <button
                        type="button"
                        className={`p-1 rounded hover:bg-indigo-100 transition-colors ${item._hasBim ? 'text-indigo-600 bg-indigo-50' : 'text-slate-300'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setBimLinkerActivity(item);
                        }}
                      >
                        <Boxes className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {item.children?.length > 0 && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleGroup(item.id);
                        }}
                        className="p-0.5 hover:bg-slate-200 rounded"
                      >
                        {expandedGroups[item.id] !== false ? <ChevronDown className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />}
                      </button>
                    )}
                    <span className={`truncate ${
                      item.tipo_attivita === 'raggruppamento'
                        ? (isExplicitMacroArea(item) ? 'font-bold text-sky-950' : 'font-bold text-slate-800')
                        : 'text-slate-700'
                    }`} title={item.descrizione}>
                      {item.descrizione}
                    </span>
                    <div className="flex-shrink-0" title="Collegato a Computo Metrico (BIM 5D)">
                      {item._hasBim && (
                        <Boxes className="w-3 h-3 text-indigo-500" />
                      )}
                    </div>
                  </div>
                </div>
                <div className="w-24 border-r border-slate-200 flex items-center justify-end font-mono text-[11px] px-2">
                  <div className="text-right">
                    {item._bimAmount > 0 ? (
                      <div className="text-indigo-600 font-bold leading-tight" title="Importo da Computo Metrico (BIM 5D)">
                        {item._bimAmount.toLocaleString('it-IT', { maximumFractionDigits: 0 })} €
                      </div>
                    ) : (
                      item._amount > 0 && <div className="text-slate-400">{item._amount.toLocaleString('it-IT', { maximumFractionDigits: 0 })} €</div>
                    )}
                  </div>
                </div>
                <div className="w-16 flex items-center justify-center text-xs text-slate-500 gap-1">
                  {item._duration}
                  {item.tipo_attivita !== 'raggruppamento' && macroAreaRows.length > 0 && (
                    <button
                      type="button"
                      draggable
                      onDragStart={(event) => handleSidebarDragStart(event, item.id)}
                      onDragEnd={handleSidebarDragEnd}
                      onClick={(event) => event.stopPropagation()}
                      className={`rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 ${
                        draggedSidebarActivityId === item.id ? 'bg-slate-200 text-slate-700' : ''
                      }`}
                      title="Trascina su una macro area per spostare l'attività"
                    >
                      <GripVertical className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            <div className="border-t-2 border-slate-300 bg-gradient-to-r from-orange-50 to-amber-50 px-3 py-2.5" style={{ height: 100 }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-orange-800 uppercase tracking-wider">📋 Scadenze SAL</span>
                <span className="text-[10px] text-orange-600 font-medium">{salMarkers.length} SAL</span>
              </div>
              {salCurveData && (
                <div className="text-[10px] mb-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                  <span className="text-blue-700 font-semibold">
                    +{Math.round(salCurveData.dailyRate).toLocaleString('it-IT')} €/gg
                  </span>
                  {salCurveData.nextSal && (
                    <span className="text-orange-700">
                      prossimo SAL: mancano {Math.round(salCurveData.toNextSal / 1000)}k€
                    </span>
                  )}
                </div>
              )}
              {salMarkers.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {salMarkers.slice(0, 5).map((sal) => (
                    <div
                      key={sal.id}
                      className="inline-flex items-center gap-1 bg-orange-100 border border-orange-300 text-orange-800 text-[9px] px-1.5 py-0.5 rounded font-medium"
                      title={`${sal.description}\n${format(sal.date, 'dd/MM/yyyy')}\n${Math.round(sal.amount).toLocaleString('it-IT')} €`}
                    >
                      <span>{format(sal.date, 'dd/MM')}</span>
                    </div>
                  ))}
                  {salMarkers.length > 5 && (
                    <div className="inline-flex items-center bg-orange-200 text-orange-700 text-[9px] px-1.5 py-0.5 rounded font-medium">
                      +{salMarkers.length - 5}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[10px] text-orange-600 italic">Nessun SAL pianificato</div>
              )}
            </div>
          </div>
        </div>

        {/* Resize handle */}
        {!isSidebarCollapsed && (
          <div
            ref={resizeHandleRef}
            className="w-1 hover:w-1.5 bg-slate-200 hover:bg-indigo-500 cursor-col-resize z-30 transition-colors group"
            onMouseDown={startResize}
            title="Trascina per ridimensionare - Doppio click per collassare/espandere"
          >
            <div className="opacity-0 group-hover:opacity-100 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50 pointer-events-none">
              Trascina o doppio click
            </div>
          </div>
        )}

          <div className="flex-1 overflow-auto bg-white" ref={scrollContainerRef} onScroll={handleScroll}>
            <div style={{ width: timeColumns.length * config.colWidth }}>
              <div className="sticky top-0 z-10 bg-white" style={{ height: HEADER_HEIGHT }}>
                <div className="flex h-8 border-b border-slate-200">
                  {(() => {
                    const blocks = [];
                    let currentBlock = null;
                    let count = 0;

                    timeColumns.forEach((colDate, index) => {
                      const label = viewMode === 'month' || viewMode === 'fit'
                        ? format(colDate, 'yyyy', { locale: it })
                        : format(colDate, 'MMM yyyy', { locale: it });

                      if (label !== currentBlock) {
                        if (currentBlock) blocks.push({ name: currentBlock, width: count * config.colWidth });
                        currentBlock = label;
                        count = 1;
                      } else {
                        count += 1;
                      }

                      if (index === timeColumns.length - 1) {
                        blocks.push({ name: currentBlock, width: count * config.colWidth });
                      }
                    });

                    return blocks.map((block, index) => (
                      <div key={index} className="border-r border-slate-200 bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase tracking-wider" style={{ width: block.width }}>
                        {block.name}
                      </div>
                    ));
                  })()}
                </div>
                <div className="flex h-7 border-b border-slate-200">
                  {timeColumns.map((colDate, index) => {
                    let label = '';
                    if (viewMode === 'day') label = format(colDate, 'dd');
                    else if (viewMode === 'week') label = `Set ${getWeek(colDate)}`;
                    else if (viewMode === 'fit') label = format(colDate, 'MMM', { locale: it });
                    else label = format(colDate, 'MMM', { locale: it });

                    return (
                      <div key={index} className="flex items-center justify-center text-[10px] border-r border-slate-100 text-slate-400" style={{ width: config.colWidth }}>
                        {label}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex pointer-events-none">
                  {timeColumns.map((_, index) => (
                    <div key={index} className="border-r border-slate-100 h-full" style={{ width: config.colWidth }} />
                  ))}
                </div>

                {processedData.map((item) => {
                  const pos = getBarPosition(item._startDate, item._endDate);
                  const isCritical = Boolean(item._cpmDetails?.isCritical);
                  const isDropTarget = dropTargetRowId === item.id;
                  const canDragRow = item.tipo_attivita === 'task';
                  return (
                    <div
                      key={item.id}
                      onDragOver={canDragRow ? (e) => handleRowDragOver(e, item) : undefined}
                      onDrop={canDragRow ? (e) => handleRowDrop(e, item) : undefined}
                      onDragLeave={() => setDropTargetRowId(null)}
                      className={`
                        relative border-b border-slate-100 transition-all
                        ${hoveredRow === item.id ? 'bg-orange-50/40' : ''}
                        ${isDropTarget ? 'bg-emerald-100 border-t-2 border-emerald-500' : ''}
                      `}
                      style={{ height: ROW_HEIGHT }}
                      onMouseEnter={() => setHoveredRow(item.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      {pos && (
                        item.tipo_attivita === 'raggruppamento' ? (
                          <div
                            className="absolute"
                            style={{ left: pos.left, width: pos.width, top: (ROW_HEIGHT - 10) / 2 }}
                          >
                            <div className="h-2.5 bg-slate-400 rounded-sm opacity-70" style={{ width: '100%' }} />
                          </div>
                        ) : (
                          <ActivityBar
                            activity={item}
                            duration={item._duration || 1}
                            isCritical={isCritical}
                            canResize={item.tipo_attivita === 'task'}
                            dayWidth={config.colWidth / config.daysPerCol}
                            barLeft={pos.left}
                            barWidth={pos.width}
                            onResizeCommit={handleActivityResize}
                            onProgressClick={onProgressUpdate ? (activity) => {
                              setProgressEditActivity(activity);
                              setProgressValue(activity.percentuale_completamento || 0);
                            } : undefined}
                          />
                        )
                      )}
                    </div>
                  );
                })}

                <div className="border-t-2 border-slate-300 bg-slate-50 relative" style={{ height: 100 }}>
                  <div className="absolute inset-0 flex pointer-events-none">
                    {timeColumns.map((_, index) => (
                      <div key={index} className="border-r border-slate-100 h-full" style={{ width: config.colWidth }} />
                    ))}
                  </div>

                  {/* Curva avanzamento economico */}
                  {salCurveData && timeRange.start && (() => {
                    const pxPerDay = config.colWidth / config.daysPerCol;
                    const chartH = 100;
                    const padTop = 10;
                    const padBottom = 16;
                    const usableH = chartH - padTop - padBottom;
                    const toX = (date) => differenceInDays(date, timeRange.start) * pxPerDay;
                    const toY = (amount) => chartH - padBottom - (Math.min(Math.max(amount, 0), salCurveData.valoreContratto) / salCurveData.valoreContratto) * usableH;
                    const x0 = toX(salCurveData.projectStart);
                    const x1 = toX(salCurveData.projectEnd);
                    const y0 = toY(0);
                    const y1 = toY(salCurveData.valoreContratto);
                    const totalW = timeColumns.length * config.colWidth;
                    const today = new Date();
                    const xToday = toX(today);
                    const yToday = toY(salCurveData.todayAccrued);
                    const fmtAmount = (v) => v >= 1000000
                      ? `${(v / 1000000).toFixed(2)}M€`
                      : `${Math.round(v / 1000)}k€`;

                    return (
                      <svg
                        className="absolute inset-0 pointer-events-none"
                        width={totalW}
                        height={chartH}
                        style={{ zIndex: 5 }}
                      >
                        {/* Area sotto la curva */}
                        <path d={`M${x0},${y0} L${x1},${y1} L${x1},${y0} Z`} fill="rgba(59,130,246,0.08)" />
                        {/* Linea di avanzamento lineare */}
                        <line x1={x0} y1={y0} x2={x1} y2={y1} stroke="#3b82f6" strokeWidth="1.5" opacity="0.8" />

                        {/* Soglie SAL cumulative */}
                        {salCurveData.salThresholds.map((t) => {
                          const y = toY(t.cumulativeAmount);
                          const xCross = x0 + (t.cumulativeAmount / salCurveData.valoreContratto) * (x1 - x0);
                          const labelX = Math.max(2, xCross - 50);
                          return (
                            <g key={t.id}>
                              <line x1={labelX} y1={y} x2={xCross} y2={y} stroke="#f97316" strokeWidth="1" strokeDasharray="3,2" opacity="0.9" />
                              <line x1={xCross} y1={y} x2={xCross} y2={y0} stroke="#f97316" strokeWidth="1" strokeDasharray="2,3" opacity="0.35" />
                              <text x={labelX} y={y - 2} fill="#c2410c" fontSize="8" fontFamily="monospace">{fmtAmount(t.cumulativeAmount)}</text>
                            </g>
                          );
                        })}

                        {/* Marker oggi con importo atteso */}
                        {xToday > x0 && xToday < x1 && (
                          <g>
                            <line x1={xToday} y1={padTop} x2={xToday} y2={y0} stroke="#10b981" strokeWidth="1.5" opacity="0.85" />
                            <circle cx={xToday} cy={yToday} r={3} fill="#10b981" />
                            <text x={xToday + 4} y={yToday - 2} fill="#065f46" fontSize="8" fontWeight="bold" fontFamily="monospace">
                              {fmtAmount(salCurveData.todayAccrued)}
                            </text>
                          </g>
                        )}
                      </svg>
                    );
                  })()}

                  {salMarkers.map((sal) => {
                    const pxPerDay = config.colWidth / config.daysPerCol;
                    const offset = differenceInDays(sal.date, timeRange.start) * pxPerDay + (pxPerDay / 2);
                    return (
                      <div key={sal.id} className="absolute top-0 bottom-0 z-10 flex flex-col items-center group" style={{ left: offset }}>
                        <div className="h-full w-0.5 bg-orange-400 border-l border-dashed border-orange-400" />
                        <div className="absolute top-2 bg-orange-100 border border-orange-300 text-orange-800 text-[10px] px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap z-20">
                          <div className="font-bold">SAL {format(sal.date, 'dd/MM')}</div>
                          <div>{Math.round(sal.amount).toLocaleString('it-IT')} €</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
      </div>

      <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-2 text-[11px] text-slate-400">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <GripVertical className="w-3.5 h-3.5 text-slate-500" />
            Trascina l'handle sulla macro area per spostare l'attività
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            Curva avanzamento economico (€/gg)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
            Marker SAL — verifica fatturazione
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            Attività oltre la data fine = ritardo
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            Percorso critico CPM
          </span>
        </div>
      </div>

      {/* Dialog avanzamento attività */}
      <Dialog open={!!progressEditActivity} onOpenChange={(open) => { if (!open) setProgressEditActivity(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Avanzamento attività</DialogTitle>
          </DialogHeader>
          {progressEditActivity && (
            <div className="space-y-4 py-1">
              <p className="text-sm text-slate-600 truncate" title={progressEditActivity.descrizione}>
                {progressEditActivity.descrizione}
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Percentuale completamento</Label>
                  <span className="text-2xl font-bold text-indigo-700">{progressValue}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={progressValue}
                  onChange={e => setProgressValue(Number(e.target.value))}
                  className="w-full accent-indigo-600 h-2"
                />
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={progressValue}
                    onChange={e => setProgressValue(Math.min(100, Math.max(0, Number(e.target.value))))}
                    className="w-24"
                  />
                  <span className="text-sm text-slate-500">%</span>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setProgressEditActivity(null)}>Annulla</Button>
                <Button onClick={handleProgressSave}>Salva</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <BIMLinker
        isOpen={!!bimLinkerActivity}
        onOpenChange={(open) => !open && setBimLinkerActivity(null)}
        activity={bimLinkerActivity}
        vociComputo={vociComputo}
        existingLinks={bimLinkerActivity ? linksMap[bimLinkerActivity.id] || [] : []}
        onLinksUpdated={() => loadBimData()}
      />
    </div>
  );
}
