import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight as ChevronRightIcon, Layers, Plus, FileDown, Maximize2, Minimize2, AlertTriangle, CalendarClock } from 'lucide-react';
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
import { GanttDndProvider } from './GanttDndProvider';
import { ActivityBar } from './ActivityBar';
import { useCPM } from '@/hooks/useCPM';

const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 60;
const SIDEBAR_WIDTH = 380;
const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 800;

function compareRows(a, b) {
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
  isSectionFullView = false,
  onToggleSectionFullView = () => {}
}) {
  const [timeRange, setTimeRange] = useState({ start: new Date(), end: new Date() });
  const [expandedGroups, setExpandedGroups] = useState({});
  const [isCompactWbsView, setIsCompactWbsView] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [viewMode, setViewMode] = useState('week');
  const [hoveredRow, setHoveredRow] = useState(null);
  const [draggingActivity, setDraggingActivity] = useState(null);
  const [timelineViewportWidth, setTimelineViewportWidth] = useState(1200);
  const scrollContainerRef = useRef(null);
  const sidebarRef = useRef(null);
  const resizeHandleRef = useRef(null);

  const projectStartForCPM = useMemo(() => {
    if (cantiere?.data_inizio) return cantiere.data_inizio;
    const dates = (attivita || []).map((item) => item.data_inizio).filter(Boolean).sort();
    return dates[0] || null;
  }, [attivita, cantiere?.data_inizio]);

  const { cpmResult, rescheduleActivity } = useCPM(attivita, projectStartForCPM);

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
          amount: node._amount
        };
      }

      let minStart = null;
      let maxEnd = null;
      let totalAmount = 0;

      node.children.forEach((child) => {
        const childTotals = calculateTotals(child);
        if (childTotals.start && (!minStart || childTotals.start < minStart)) minStart = childTotals.start;
        if (childTotals.end && (!maxEnd || childTotals.end > maxEnd)) maxEnd = childTotals.end;
        totalAmount += childTotals.amount || 0;
      });

      if (node.tipo_attivita === 'raggruppamento') {
        node._startDate = minStart;
        node._endDate = maxEnd;
        node._amount = totalAmount;
        if (minStart && maxEnd) {
          node._duration = differenceInDays(maxEnd, minStart) + 1;
        }
      }

      return {
        start: node._startDate,
        end: node._endDate,
        amount: node._amount || 0
      };
    };

    roots.sort(compareRows);
    roots.forEach((root) => calculateTotals(root));
    nodes.forEach((node) => node.children.sort(compareRows));

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
  }, [attivita, cpmResult, expandedGroups]);

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

  useEffect(() => {
    if (!isSectionFullView || !processedData.length) return;
    handleFitToProject();
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
              <Button variant={viewMode === 'day' ? 'default' : 'ghost'} size="sm" className={`h-7 text-xs px-2.5 rounded-md ${viewMode === 'day' ? '' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setViewMode('day')}>Giorni</Button>
              <Button variant={viewMode === 'week' ? 'default' : 'ghost'} size="sm" className={`h-7 text-xs px-2.5 rounded-md ${viewMode === 'week' ? '' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setViewMode('week')}>Settimane</Button>
              <Button variant={viewMode === 'month' ? 'default' : 'ghost'} size="sm" className={`h-7 text-xs px-2.5 rounded-md ${viewMode === 'month' ? '' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setViewMode('month')}>Mesi</Button>
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
                className={`flex border-b border-slate-100 text-sm hover:bg-orange-50/60 transition-colors cursor-pointer ${hoveredRow === item.id ? 'bg-orange-50/60' : ''}`}
                style={{ height: ROW_HEIGHT }}
                onMouseEnter={() => setHoveredRow(item.id)}
                onMouseLeave={() => setHoveredRow(null)}
                onClick={() => onEditAttivita(item)}
              >
                <div className="w-16 border-r border-slate-200 flex items-center justify-center font-mono text-slate-500 text-xs truncate">
                  {item.wbs}
                </div>
                <div className="flex-1 border-r border-slate-200 flex items-center overflow-hidden px-3">
                  <div style={{ paddingLeft: `${item.level * 16}px` }} className="flex items-center gap-1 truncate w-full">
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
                    <span className={`truncate ${item.tipo_attivita === 'raggruppamento' ? 'font-bold text-slate-800' : 'text-slate-700'}`} title={item.descrizione}>
                      {item.descrizione}
                    </span>
                  </div>
                </div>
                <div className="w-24 border-r border-slate-200 flex items-center justify-end font-mono text-xs px-2">
                  {item._amount > 0 ? `${item._amount.toLocaleString('it-IT', { maximumFractionDigits: 0 })} €` : '-'}
                </div>
                <div className="w-16 flex items-center justify-center text-xs text-slate-500">
                  {item._duration}
                </div>
              </div>
            ))}

            <div className="border-t-2 border-slate-300 bg-gradient-to-r from-orange-50 to-amber-50 px-3 py-4" style={{ height: 72 }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-orange-800 uppercase tracking-wider">📋 Scadenze SAL</span>
                <span className="text-[10px] text-orange-600 font-medium">{salMarkers.length} SAL</span>
              </div>
              {salMarkers.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {salMarkers.slice(0, 6).map((sal) => (
                    <div
                      key={sal.id}
                      className="inline-flex items-center gap-1 bg-orange-100 border border-orange-300 text-orange-800 text-[9px] px-1.5 py-0.5 rounded font-medium"
                      title={`${sal.description}\n${format(sal.date, 'dd/MM/yyyy')}\n${Math.round(sal.amount).toLocaleString('it-IT')} €`}
                    >
                      <span>{format(sal.date, 'dd/MM')}</span>
                    </div>
                  ))}
                  {salMarkers.length > 6 && (
                    <div className="inline-flex items-center bg-orange-200 text-orange-700 text-[9px] px-1.5 py-0.5 rounded font-medium">
                      +{salMarkers.length - 6}
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

        <GanttDndProvider
          onActivityDrop={(activityId, deltaDays) => handleActivityDateChange(activityId, deltaDays)}
          onDragStateChange={setDraggingActivity}
          draggingActivity={draggingActivity}
          dayWidth={config.colWidth / config.daysPerCol}
        >
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
                  return (
                    <div
                      key={item.id}
                      className={`relative border-b border-slate-100 transition-colors ${hoveredRow === item.id ? 'bg-orange-50/40' : ''}`}
                      style={{ height: ROW_HEIGHT }}
                      onMouseEnter={() => setHoveredRow(item.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      {pos && (
                        item.tipo_attivita === 'raggruppamento' ? (
                          <div
                            className="absolute h-3 bg-slate-800 opacity-80"
                            style={{ left: pos.left, width: pos.width, top: (ROW_HEIGHT - 12) / 2 }}
                          >
                            <div className="absolute -left-1 top-3 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-800" />
                            <div className="absolute -right-1 top-3 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-800" />
                          </div>
                        ) : (
                          <ActivityBar
                            activity={item}
                            startDate={item._startDate instanceof Date ? item._startDate.toISOString().split('T')[0] : item.data_inizio}
                            duration={item._duration || 1}
                            isCritical={isCritical}
                            canDrag={item.tipo_attivita === 'task'}
                            viewMode={viewMode}
                            timelineStart={format(timeRange.start, 'yyyy-MM-dd')}
                            dayWidth={config.colWidth / config.daysPerCol}
                            barLeft={pos.left}
                            barWidth={pos.width}
                          />
                        )
                      )}
                    </div>
                  );
                })}

                <div className="border-t-2 border-slate-300 bg-slate-50 relative" style={{ height: 72 }}>
                  <div className="absolute inset-0 flex pointer-events-none">
                    {timeColumns.map((_, index) => (
                      <div key={index} className="border-r border-slate-100 h-full" style={{ width: config.colWidth }} />
                    ))}
                  </div>

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
        </GanttDndProvider>
      </div>

      <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-2 text-[11px] text-slate-400">
        <div className="flex flex-wrap items-center gap-4">
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
    </div>
  );
}
