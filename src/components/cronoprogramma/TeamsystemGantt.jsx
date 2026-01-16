import React, { useState, useEffect, useMemo, useRef, useCallback, useLayoutEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Home,
  Calendar as CalendarIcon,
  Plus,
  Clock,
  Play,
  CheckCircle2,
  Pause,
  AlertCircle,
  Flag,
  Route,
  Eye,
  EyeOff
} from "lucide-react";
import { format, parseISO, isToday, addDays, subDays, differenceInDays, min as minDate, max as maxDate, getISOWeek, startOfWeek, endOfWeek } from 'date-fns';
import { it } from 'date-fns/locale';
import { calcolaCriticalPath, ricalcolaDateDipendenti } from './CriticalPathCalculator';
import { toast } from 'sonner';

const DAY_WIDTH = 44;
const WEEK_DAY_WIDTH = 60;
const ROW_HEIGHT = 40;
const BAR_HEIGHT = 24;
const SIDEBAR_WIDTH = 340;

const statoIcons = {
  pianificata: { icon: Clock, color: "#94a3b8" },
  in_corso: { icon: Play, color: "#3b82f6" },
  completata: { icon: CheckCircle2, color: "#10b981" },
  sospesa: { icon: Pause, color: "#f59e0b" },
  in_ritardo: { icon: AlertCircle, color: "#ef4444" },
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export default function TeamsystemGantt({ attivita = [], cantiere, onAddAttivita, onEditAttivita, onUpdateAttivita, canEdit = false, isFullscreen = false }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroStato, setFiltroStato] = useState('tutti');
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const [dragInfo, setDragInfo] = useState(null);
  const [resizeInfo, setResizeInfo] = useState(null);
  const [viewMode, setViewMode] = useState('daily');
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [showCriticalPath, setShowCriticalPath] = useState(true);
  const [showDependencies, setShowDependencies] = useState(true);
  const [criticalPathData, setCriticalPathData] = useState(null);

  const sidebarRef = useRef(null);
  const headerRef = useRef(null);
  const gridRef = useRef(null);
  const containerRef = useRef(null);
  const clickTimerRef = useRef(null);

  useEffect(() => {
    if (!isFullscreen || !containerRef.current) return;
    
    const updateDimensions = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setContainerWidth(rect.width);
        setContainerHeight(rect.height);
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [isFullscreen]);

  // Calcola il Critical Path ogni volta che le attività cambiano
  useEffect(() => {
    if (attivita && attivita.length > 0) {
      const risultato = calcolaCriticalPath(attivita);
      setCriticalPathData(risultato);
      // console.log(`🎯 Critical Path calcolato: ${risultato.attivitaCritiche.length} attività critiche`);
    } else {
      setCriticalPathData(null);
    }
  }, [attivita]);

  const attivitaFiltrate = useMemo(() => {
    let list = attivita;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a => (a.descrizione || '').toLowerCase().includes(q));
    }
    if (filtroStato !== 'tutti') list = list.filter(a => a.stato === filtroStato);
    return list;
  }, [attivita, searchQuery, filtroStato]);

  // ORDINE CRONOLOGICO RIGOROSO GLOBALE
  const orderedRows = useMemo(() => {
    const rows = [];
    
    const allActivities = attivitaFiltrate.map(a => ({
      ...a,
      _groupId: a.gruppo_fase && a.gruppo_fase.trim() ? a.gruppo_fase.trim() : null
    }));

    const sortedActivities = allActivities.sort((a, b) => {
      if (!a.data_inizio && !b.data_inizio) return 0;
      if (!a.data_inizio) return 1;
      if (!b.data_inizio) return -1;
      
      const dateA = parseISO(a.data_inizio).getTime();
      const dateB = parseISO(b.data_inizio).getTime();
      
      if (dateA !== dateB) return dateA - dateB;
      
      if (a.data_fine && b.data_fine) {
        return parseISO(a.data_fine).getTime() - parseISO(b.data_fine).getTime();
      }
      if (!a.data_fine) return 1;
      if (!b.data_fine) return -1;
      
      return 0;
    });

    let lastGroupId = null;
    const groupActivityCounts = new Map();

    for (const activity of sortedActivities) {
      const currentGroupId = activity._groupId;

      // Solo se c'è un gruppo valido, creiamo l'intestazione di gruppo
      if (currentGroupId) {
        if (currentGroupId !== lastGroupId) {
          rows.push({ 
            type: 'group', 
            id: `group_${currentGroupId}`, 
            name: currentGroupId,
            groupIdKey: currentGroupId,
            count: 0 
          });
          lastGroupId = currentGroupId;
          // Initialize count for this group if it's the first time we see it
          if (!groupActivityCounts.has(currentGroupId)) {
              groupActivityCounts.set(currentGroupId, 0);
          }
        }

        // If the group is collapsed, count the activity but don't add it to rows
        if (collapsedGroups.has(currentGroupId)) {
          groupActivityCounts.set(currentGroupId, (groupActivityCounts.get(currentGroupId) || 0) + 1);
          continue; // Skip adding the activity row
        }
      } else {
        // Reset lastGroupId if no group for current activity, so next grouped activity gets its own header
        lastGroupId = null;
      }

      // Add the activity as a row
      rows.push({ type: 'activity', data: activity });
      
      // Aggiorna il conteggio del gruppo se esiste
      if (currentGroupId) {
        groupActivityCounts.set(currentGroupId, (groupActivityCounts.get(currentGroupId) || 0) + 1);
      }
    }

    // Aggiorna i conteggi nei gruppi
    rows.forEach(row => {
      if (row.type === 'group') {
        row.count = groupActivityCounts.get(row.groupIdKey) || 0;
      }
    });

    return rows;
  }, [attivitaFiltrate, collapsedGroups]);

  // Project date range - INIZIO DAL PRIMO GIORNO EFFETTIVO
  const projectDateRange = useMemo(() => {
    if (!attivita.length) return null;
    const starts = attivita.map(a => a.data_inizio ? parseISO(a.data_inizio) : null).filter(Boolean);
    const ends = attivita.map(a => a.data_fine ? parseISO(a.data_fine) : null).filter(Boolean);
    if (!starts.length || !ends.length) return null;
    
    const start = minDate(starts);
    const end = maxDate(ends);
    
    const projectStart = start;
    const projectEnd = end;
    
    return { projectStart, projectEnd };
  }, [attivita]);

  // Auto-switch a weekly in fullscreen se periodo lungo
  const effectiveViewMode = useMemo(() => {
    if (!isFullscreen || !projectDateRange) return viewMode;
    
    const days = differenceInDays(projectDateRange.projectEnd, projectDateRange.projectStart);
    
    // Se più di 60 giorni, passa automaticamente a weekly
    if (days > 60) {
      return 'weekly';
    }
    
    return viewMode;
  }, [isFullscreen, projectDateRange, viewMode]);

  // Timeline
  const timeline = useMemo(() => {
    if (!projectDateRange) return [];
    const { projectStart, projectEnd } = projectDateRange;
    
    if (effectiveViewMode === 'weekly') {
      const weeks = [];
      let current = startOfWeek(projectStart, { weekStartsOn: 1 });
      
      while (current <= projectEnd) {
        const weekEnd = endOfWeek(current, { weekStartsOn: 1 });
        const daysInWeek = [];
        for (let i = 0; i < 7; i++) {
          daysInWeek.push(addDays(current, i));
        }
        weeks.push({ start: current, end: weekEnd, days: daysInWeek });
        current = addDays(current, 7);
      }
      return weeks;
    } else {
      const days = [];
      let current = new Date(projectStart);
      while (current <= projectEnd) {
        days.push(new Date(current));
        current = addDays(current, 1);
      }
      return days;
    }
  }, [projectDateRange, effectiveViewMode]);

  // Calcola larghezza dinamica in fullscreen - NESSUN LIMITE MINIMO
  const currentDayWidth = useMemo(() => {
    if (!isFullscreen || !containerWidth || !timeline.length) {
      return effectiveViewMode === 'weekly' ? WEEK_DAY_WIDTH : DAY_WIDTH;
    }
    
    // Spazio disponibile: tolgo sidebar (340px) + padding/bordi (20px circa)
    const availableWidth = containerWidth - SIDEBAR_WIDTH - 20;
    const calculatedWidth = availableWidth / timeline.length;
    
    // In fullscreen NON imponiamo minimi, deve scalare liberamente
    return Math.max(calculatedWidth, 1); // Solo per evitare 0 o negativi
  }, [isFullscreen, containerWidth, timeline.length, effectiveViewMode]);

  // Calcola altezza dinamica in fullscreen - NESSUN LIMITE MINIMO
  const currentRowHeight = useMemo(() => {
    if (!isFullscreen || !containerHeight || !orderedRows.length) {
      return ROW_HEIGHT;
    }
    
    // Spazio disponibile: tolgo toolbar (~50px) + timeline header (~64px) + padding (20px)
    const toolbarHeight = 50;
    const timelineHeaderHeight = 64;
    const padding = 20;
    const availableHeight = containerHeight - toolbarHeight - timelineHeaderHeight - padding;
    
    const calculatedHeight = availableHeight / orderedRows.length;
    
    // In fullscreen NON imponiamo minimi, deve scalare liberamente
    return Math.max(calculatedHeight, 1); // Solo per evitare 0 o negativi
  }, [isFullscreen, containerHeight, orderedRows.length]);

  // Altezza barra proporzionale all'altezza riga
  const currentBarHeight = useMemo(() => {
    if (!isFullscreen) return BAR_HEIGHT;
    // La barra è il 60% dell'altezza della riga
    return Math.max(currentRowHeight * 0.6, 2);
  }, [currentRowHeight, isFullscreen]);

  // Month groups
  const monthGroups = useMemo(() => {
    if (!timeline.length) return [];
    
    const groups = [];
    let currentMonth = null;
    let startIdx = 0;
    
    if (effectiveViewMode === 'weekly') {
      timeline.forEach((week, i) => {
        const month = format(week.start, 'MMM yyyy', { locale: it });
        if (month !== currentMonth) {
          if (currentMonth !== null) groups.push({ month: currentMonth, startIdx, count: i - startIdx });
          currentMonth = month;
          startIdx = i;
        }
      });
    } else {
      timeline.forEach((d, i) => {
        const month = format(d, 'MMM yyyy', { locale: it });
        if (month !== currentMonth) {
          if (currentMonth !== null) groups.push({ month: currentMonth, startIdx, count: i - startIdx });
          currentMonth = month;
          startIdx = i;
        }
      });
    }
    if (currentMonth !== null) groups.push({ month: currentMonth, startIdx, count: timeline.length - startIdx });
    return groups;
  }, [timeline, effectiveViewMode]);

  // Sync scroll
  const syncScroll = useCallback((source) => {
    if (isFullscreen) return;
    
    if (source === 'sidebar' && sidebarRef.current && gridRef.current) {
      gridRef.current.scrollTop = sidebarRef.current.scrollTop;
    } else if (source === 'grid' && gridRef.current && sidebarRef.current) {
      sidebarRef.current.scrollTop = gridRef.current.scrollTop;
    }
    if ((source === 'header' || source === 'grid') && headerRef.current && gridRef.current) {
      if (source === 'header') gridRef.current.scrollLeft = headerRef.current.scrollLeft;
      else headerRef.current.scrollLeft = gridRef.current.scrollLeft;
    }
  }, [isFullscreen]);

  useEffect(() => {
    if (isFullscreen) return;
    
    const sb = sidebarRef.current;
    const hd = headerRef.current;
    const gd = gridRef.current;
    if (!sb || !hd || !gd) return;
    const onSidebarScroll = () => syncScroll('sidebar');
    const onHeaderScroll = () => syncScroll('header');
    const onGridScroll = () => syncScroll('grid');
    sb.addEventListener('scroll', onSidebarScroll);
    hd.addEventListener('scroll', onHeaderScroll);
    gd.addEventListener('scroll', onGridScroll);
    return () => {
      sb.removeEventListener('scroll', onSidebarScroll);
      hd.removeEventListener('scroll', onHeaderScroll);
      gd.removeEventListener('scroll', onGridScroll);
    };
  }, [syncScroll, isFullscreen]);

  const toggleGroupCollapse = (groupId) => {
    if (isFullscreen) return;
    const copy = new Set(collapsedGroups);
    if (copy.has(groupId)) copy.delete(groupId); else copy.add(groupId);
    setCollapsedGroups(copy);
  };

  const getActivityPosition = useCallback((activity, rowIndex) => {
    if (!activity.data_inizio || !activity.data_fine || !timeline.length) return null;
    const start = parseISO(activity.data_inizio);
    const end = parseISO(activity.data_fine);
    
    let startIdx = -1;
    let endIdx = -1;

    if (effectiveViewMode === 'weekly') {
      // Find the first week where the start date is within or before its end
      startIdx = timeline.findIndex(week => start <= week.end);
      // Find the first week where the end date is within or before its end
      // This is a bit tricky, if the activity ends in the middle of a week, we want the whole week block
      endIdx = timeline.findIndex(week => end <= week.end);

      if (startIdx === -1) startIdx = 0; // If start date is before timeline, use first week
      if (endIdx === -1) endIdx = timeline.length - 1; // If end date is after timeline, use last week
      if (endIdx < startIdx) endIdx = startIdx; // Ensure end index is not before start index
      
      const left = startIdx * currentDayWidth;
      const width = (endIdx - startIdx + 1) * currentDayWidth;
      const top = rowIndex * currentRowHeight + (currentRowHeight - currentBarHeight) / 2;
      
      return { left, width, top };
    } else {
      startIdx = timeline.findIndex(d => format(d, 'yyyy-MM-dd') === format(start, 'yyyy-MM-dd'));
      endIdx = timeline.findIndex(d => format(d, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd'));

      if (startIdx === -1) startIdx = 0;
      if (endIdx === -1) endIdx = timeline.length - 1;
      if (endIdx < startIdx) endIdx = startIdx;

      const left = startIdx * currentDayWidth;
      const width = (endIdx - startIdx + 1) * currentDayWidth;
      const top = rowIndex * currentRowHeight + (currentRowHeight - currentBarHeight) / 2;
      return { left, width, top };
    }
  }, [timeline, currentRowHeight, currentBarHeight, effectiveViewMode, currentDayWidth]);

  const scrollToActivity = useCallback((activity, rowIndex) => {
    if (isFullscreen) return;
    if (!gridRef.current || !headerRef.current || !sidebarRef.current || !timeline.length) return;
    
    const pos = getActivityPosition(activity, rowIndex);
    if (!pos) return;
    
    // Scrolla orizzontalmente per portare la barra all'inizio del grafico
    const scrollLeft = pos.left;
    gridRef.current.scrollLeft = scrollLeft;
    headerRef.current.scrollLeft = scrollLeft;
    
    // Scrolla anche verticalmente per centrare la riga
    const scrollTop = pos.top - (gridRef.current.clientHeight / 2) + (currentRowHeight / 2);
    gridRef.current.scrollTop = Math.max(0, scrollTop);
    sidebarRef.current.scrollTop = Math.max(0, scrollTop);
  }, [isFullscreen, timeline, getActivityPosition, currentRowHeight]);

  const handleActivityClick = useCallback((activity, rowIndex) => {
    if (isFullscreen || !canEdit) return; // Disabilita click in fullscreen o se non modificabile
    
    // Gestisce single vs double click
    if (clickTimerRef.current) {
      // È un double click
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      if (onEditAttivita) {
        onEditAttivita(activity);
      }
    } else {
      // Potrebbe essere un single click, aspetta per vedere se arriva il secondo click
      clickTimerRef.current = setTimeout(() => {
        // È un single click
        clickTimerRef.current = null;
        scrollToActivity(activity, rowIndex);
      }, 250); // 250ms di delay per distinguere single da double click
    }
  }, [isFullscreen, canEdit, onEditAttivita, scrollToActivity]);

  // Cleanup del timer quando il componente si smonta
  useEffect(() => {
    return () => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
    };
  }, []);

  const scrollToToday = useCallback(() => {
    if (isFullscreen) return;
    if (!gridRef.current || !headerRef.current || !timeline.length) return;
    
    let idx = -1;
    if (effectiveViewMode === 'weekly') {
      idx = timeline.findIndex(week => week.days.some(d => isToday(d)));
    } else {
      idx = timeline.findIndex(d => isToday(d));
    }
    
    if (idx === -1) {
      idx = Math.floor(timeline.length / 2);
    }
    
    // Posiziona la data attuale all'INIZIO della vista (non al centro)
    const scrollLeft = idx * currentDayWidth;
    const clampedScroll = Math.max(0, Math.min(scrollLeft, timeline.length * currentDayWidth - gridRef.current.clientWidth));
    
    gridRef.current.scrollLeft = clampedScroll;
    headerRef.current.scrollLeft = clampedScroll;
  }, [timeline, effectiveViewMode, currentDayWidth, isFullscreen]);

  const scrollToStart = useCallback(() => {
    if (isFullscreen) return;
    if (!gridRef.current || !headerRef.current) return;
    gridRef.current.scrollLeft = 0;
    headerRef.current.scrollLeft = 0;
  }, [isFullscreen]);

  const scrollToEnd = useCallback(() => {
    if (isFullscreen) return;
    if (!gridRef.current || !headerRef.current || !timeline.length) return;
    const maxScroll = timeline.length * currentDayWidth - gridRef.current.clientWidth;
    const scrollLeft = Math.max(0, maxScroll);
    gridRef.current.scrollLeft = scrollLeft;
    headerRef.current.scrollLeft = scrollLeft;
  }, [timeline, currentDayWidth, isFullscreen]);

  const handleBarMouseDown = (e, activity, rowIndex, handle) => {
    if (!canEdit || isFullscreen) return;
    e.stopPropagation(); // Prevent handleActivityClick from triggering
    const pos = getActivityPosition(activity, rowIndex);
    if (!pos) return;

    setDragInfo({ activity, startX: e.clientX, originalLeft: pos.left, originalWidth: pos.width });
    if (handle === 'resize-left' || handle === 'resize-right') {
      setResizeInfo({ activity, handle, startX: e.clientX, originalLeft: pos.left, originalWidth: pos.width });
      setDragInfo(null);
    }
  };

  useEffect(() => {
    if (!dragInfo && !resizeInfo) return;
    if (isFullscreen) return;

    const handleMouseMove = (e) => {
      if (dragInfo) {
        const deltaX = e.clientX - dragInfo.startX;
        const newLeft = dragInfo.originalLeft + deltaX;
        const newIdx = Math.round(newLeft / currentDayWidth);
        const clampedIdx = clamp(newIdx, 0, timeline.length - 1);
        
        let newStart, originalEnd;
        if (effectiveViewMode === 'weekly') {
          newStart = timeline[clampedIdx].start;
          originalEnd = parseISO(dragInfo.activity.data_fine);
        } else {
          newStart = timeline[clampedIdx];
          originalEnd = parseISO(dragInfo.activity.data_fine);
        }
        
        const duration = differenceInDays(originalEnd, parseISO(dragInfo.activity.data_inizio));
        const newEnd = addDays(newStart, duration);
        
        setDragInfo(prev => ({ ...prev, newStart: format(newStart, 'yyyy-MM-dd'), newEnd: format(newEnd, 'yyyy-MM-dd') }));
      } else if (resizeInfo) {
        const deltaX = e.clientX - resizeInfo.startX;
        
        if (resizeInfo.handle === 'resize-left') {
          const newLeft = resizeInfo.originalLeft + deltaX;
          const newIdx = Math.round(newLeft / currentDayWidth);
          const clampedIdx = clamp(newIdx, 0, timeline.length - 1);
          const newStart = effectiveViewMode === 'weekly' ? timeline[clampedIdx].start : timeline[clampedIdx];
          setResizeInfo(prev => ({ ...prev, newStart: format(newStart, 'yyyy-MM-dd') }));
        } else if (resizeInfo.handle === 'resize-right') {
          const newWidth = resizeInfo.originalWidth + deltaX;
          const days = Math.max(1, Math.round(newWidth / currentDayWidth));
          const startDate = parseISO(resizeInfo.activity.data_inizio);
          const newEnd = addDays(startDate, days - 1);
          setResizeInfo(prev => ({ ...prev, newEnd: format(newEnd, 'yyyy-MM-dd') }));
        }
      }
    };

    const handleMouseUp = async () => {
      if (dragInfo && dragInfo.newStart && dragInfo.newEnd) {
        const nuovaDurata = differenceInDays(parseISO(dragInfo.newEnd), parseISO(dragInfo.newStart)) + 1;
        
        // Aggiorna l'attività corrente
        const updatedActivity = {
          ...dragInfo.activity,
          data_inizio: dragInfo.newStart,
          data_fine: dragInfo.newEnd,
          durata_giorni: nuovaDurata
        };

        await onUpdateAttivita(dragInfo.activity.id, { 
          data_inizio: dragInfo.newStart, 
          data_fine: dragInfo.newEnd,
          durata_giorni: nuovaDurata
        });

        // Ricalcola e aggiorna le attività dipendenti
        const updates = ricalcolaDateDipendenti(updatedActivity, attivita);
        if (updates.length > 0) {
          toast.info(`${updates.length} attività dipendenti aggiornate automaticamente`);
          for (const update of updates) {
            await onUpdateAttivita(update.id, {
              data_inizio: update.data_inizio,
              data_fine: update.data_fine
            });
          }
        }
      } else if (resizeInfo) {
        const updates = {};
        let finalStartDate = parseISO(resizeInfo.activity.data_inizio);
        let finalEndDate = parseISO(resizeInfo.activity.data_fine);
        
        if (resizeInfo.newStart) {
          updates.data_inizio = resizeInfo.newStart;
          finalStartDate = parseISO(resizeInfo.newStart);
        }
        
        if (resizeInfo.newEnd) {
          updates.data_fine = resizeInfo.newEnd;
          finalEndDate = parseISO(resizeInfo.newEnd);
        }
        
        if (finalStartDate && finalEndDate) {
            const effectiveEndDate = maxDate([finalStartDate, finalEndDate]);
            updates.durata_giorni = differenceInDays(effectiveEndDate, finalStartDate) + 1;
        }
        
        if (Object.keys(updates).length) {
          await onUpdateAttivita(resizeInfo.activity.id, updates);

          // Ricalcola attività dipendenti anche per resize
          const updatedActivity = { ...resizeInfo.activity, ...updates };
          const dependentUpdates = ricalcolaDateDipendenti(updatedActivity, attivita);
          if (dependentUpdates.length > 0) {
            toast.info(`${dependentUpdates.length} attività dipendenti aggiornate`);
            for (const update of dependentUpdates) {
              await onUpdateAttivita(update.id, {
                data_inizio: update.data_inizio,
                data_fine: update.data_fine
              });
            }
          }
        }
      }
      setDragInfo(null);
      setResizeInfo(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragInfo, resizeInfo, timeline, onUpdateAttivita, effectiveViewMode, currentDayWidth, isFullscreen, attivita]);

  // Funzione helper per trovare l'attività in criticalPathData
  const isActivityCritical = useCallback((activityId) => {
    if (!showCriticalPath || !criticalPathData) return false;
    return criticalPathData.attivitaCritiche.some(a => a.id === activityId);
  }, [showCriticalPath, criticalPathData]);

  if (!projectDateRange || !timeline.length) {
    return (
      <Card className="w-full h-full flex items-center justify-center bg-white">
        <div className="text-center p-12">
          <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <h3 className="text-base font-medium text-slate-900 mb-1">Nessuna attività da visualizzare</h3>
          <p className="text-sm text-slate-500 mb-4">Aggiungi attività con date per visualizzare il cronoprogramma</p>
          {canEdit && onAddAttivita && (
            <Button onClick={onAddAttivita} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-1.5" />
              Aggiungi Attività
            </Button>
          )}
        </div>
      </Card>
    );
  }

  const currentTimelineTotalWidth = timeline.length * currentDayWidth;
  const currentTotalHeight = orderedRows.length * currentRowHeight;

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white flex-shrink-0" style={isFullscreen ? { height: 50 } : {}}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Cerca attività..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64 h-9 text-sm border-slate-200"
              disabled={isFullscreen}
            />
          </div>
          <Select value={filtroStato} onValueChange={setFiltroStato} disabled={isFullscreen}>
            <SelectTrigger className="w-40 h-9 text-sm border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tutti">Tutti</SelectItem>
              <SelectItem value="pianificata">Pianificata</SelectItem>
              <SelectItem value="in_corso">In Corso</SelectItem>
              <SelectItem value="completata">Completata</SelectItem>
              <SelectItem value="sospesa">Sospesa</SelectItem>
              <SelectItem value="in_ritardo">In Ritardo</SelectItem>
            </SelectContent>
          </Select>
          
          {!isFullscreen && (
            <>
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                <Button
                  variant={viewMode === 'daily' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('daily')}
                  className={`h-7 text-xs ${viewMode === 'daily' ? 'bg-white shadow-sm' : 'hover:bg-slate-200'}`}
                >
                  Giorni
                </Button>
                <Button
                  variant={viewMode === 'weekly' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('weekly')}
                  className={`h-7 text-xs ${viewMode === 'weekly' ? 'bg-white shadow-sm' : 'hover:bg-slate-200'}`}
                >
                  Settimane
                </Button>
              </div>

              <div className="flex items-center gap-2 ml-2">
                <Button
                  variant={showCriticalPath ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowCriticalPath(!showCriticalPath)}
                  className={`h-8 text-xs ${showCriticalPath ? 'bg-red-600 text-white hover:bg-red-700' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  {showCriticalPath ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
                  Critical Path
                </Button>
                <Button
                  variant={showDependencies ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowDependencies(!showDependencies)}
                  className={`h-8 text-xs ${showDependencies ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  {showDependencies ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
                  <Route className="w-4 h-4 mr-1" />
                  Dipendenze
                </Button>
              </div>
            </>
          )}
          
          {isFullscreen && (
            <div className="text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-md">
              <span className="font-medium">{orderedRows.filter(r => r.type === 'activity').length} attività</span> • <span className="font-medium">{timeline.length} {effectiveViewMode === 'weekly' ? 'settimane' : 'giorni'}</span>
              {criticalPathData && criticalPathData.attivitaCritiche.length > 0 && showCriticalPath && (
                <span className="ml-2">• <span className="font-medium text-red-600">{criticalPathData.attivitaCritiche.length} critiche</span></span>
              )}
              {effectiveViewMode === 'weekly' && viewMode === 'daily' && (
                <span className="ml-2 text-xs text-blue-600">(vista settimanale auto)</span>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {!isFullscreen && (
            <>
              <Button variant="ghost" size="sm" onClick={scrollToStart} className="h-8 text-sm text-slate-600 hover:bg-slate-100">
                <Home className="w-4 h-4 mr-1" />
                Inizio
              </Button>
              <Button variant="ghost" size="sm" onClick={scrollToToday} className="h-8 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                <CalendarIcon className="w-4 h-4 mr-1" />
                Oggi
              </Button>
              <Button variant="ghost" size="sm" onClick={scrollToEnd} className="h-8 text-sm text-slate-600 hover:bg-slate-100">
                Fine
              </Button>
            </>
          )}
          {canEdit && onAddAttivita && !isFullscreen && (
            <Button size="sm" onClick={onAddAttivita} className="bg-indigo-600 hover:bg-indigo-700 h-8 ml-2">
              <Plus className="w-4 h-4 mr-1" />
              Aggiungi
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="flex flex-col border-r border-slate-200 bg-white" style={{ width: SIDEBAR_WIDTH }}>
          <div className="h-16 border-b border-slate-200 flex items-center px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider flex-shrink-0" style={isFullscreen ? { height: 64 } : {}}>
            Attività
          </div>
          <div ref={sidebarRef} className={`flex-1 ${isFullscreen ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'}`}>
            {orderedRows.map((row, idx) => {
              if (row.type === 'group') {
                const groupIdToToggle = row.groupIdKey;
                const isCollapsed = collapsedGroups.has(groupIdToToggle);
                return (
                  <div
                    key={row.id}
                    data-row-type="group"
                    className={`flex items-center px-4 border-b border-slate-100 bg-slate-50 text-sm font-medium text-slate-700 transition-colors ${!isFullscreen ? 'hover:bg-slate-100 cursor-pointer' : ''}`}
                    style={{ height: currentRowHeight }}
                    onClick={() => !isFullscreen && toggleGroupCollapse(groupIdToToggle)}
                  >
                    {!isFullscreen && (isCollapsed ? 
                      <ChevronRightIcon className="w-4 h-4 mr-2 flex-shrink-0 text-slate-500" /> : 
                      <ChevronDown className="w-4 h-4 mr-2 flex-shrink-0 text-slate-500" />
                    )}
                    <span className="truncate flex-1 text-xs">{row.name}</span>
                    <span className="text-xs text-slate-400 bg-white px-2 py-0.5 rounded-full ml-2">{row.count}</span>
                  </div>
                );
              } else {
                const a = row.data;
                const isCritical = isActivityCritical(a.id);
                const Icon = a.tipo_attivita === 'milestone' ? Flag : (statoIcons[a.stato]?.icon || Clock);
                const color = isCritical ? "#ef4444" : (statoIcons[a.stato]?.color || "#94a3b8");
                return (
                  <div
                    key={a.id}
                    data-row-type="activity"
                    className={`flex items-center px-4 pl-10 border-b border-slate-50 transition-colors ${!isFullscreen ? 'hover:bg-slate-50 group' : ''}`}
                    style={{ height: currentRowHeight }}
                  >
                    <div 
                      className="flex-1 flex items-center min-w-0 cursor-pointer mr-2"
                      onClick={() => handleActivityClick(a, idx)}
                    >
                      <span className="truncate text-xs font-medium text-slate-600 group-hover:text-slate-900">{a.descrizione}</span>
                    </div>
                    
                    {canEdit && !isFullscreen ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <div className="cursor-pointer p-1 rounded hover:bg-slate-200">
                            <Icon className="w-3 h-3 flex-shrink-0" style={{ color }} />
                          </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {Object.entries(statoIcons).map(([key, config]) => (
                            <DropdownMenuItem 
                              key={key}
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateAttivita(a.id, { stato: key });
                              }}
                              className="flex items-center gap-2 text-xs"
                            >
                              <config.icon className="w-3 h-3" style={{ color: config.color }} />
                              <span className="capitalize">{key.replace('_', ' ')}</span>
                              {a.stato === key && <CheckCircle2 className="w-3 h-3 ml-auto text-green-600" />}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Icon className="w-3 h-3 flex-shrink-0" style={{ color }} />
                    )}

                    {a.tipo_attivita === 'milestone' && (
                      <Badge variant="secondary" className="ml-2 text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
                        M
                      </Badge>
                    )}
                  </div>
                );
              }
            })}
          </div>
        </div>

        {/* Gantt Area */}
        <div className="flex flex-col flex-1 overflow-hidden bg-white">
          {/* Timeline Header */}
          <div ref={headerRef} className={`h-16 border-b border-slate-200 flex-shrink-0 bg-white ${isFullscreen ? 'overflow-hidden' : 'overflow-x-auto overflow-y-hidden'}`} style={isFullscreen ? { height: 64 } : {}}>
            <div style={{ width: currentTimelineTotalWidth }} className="h-full">
              {/* Month Row */}
              <div className="flex h-8 border-b border-slate-100">
                {monthGroups.map((mg, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-center border-r border-slate-100 text-[10px] font-semibold text-slate-600 uppercase tracking-wide bg-white"
                    style={{ width: mg.count * currentDayWidth }}
                  >
                    {mg.month}
                  </div>
                ))}
              </div>
              {/* Day/Week Row */}
              <div className="flex h-8 bg-white">
                {effectiveViewMode === 'weekly' ? (
                  timeline.map((week, i) => {
                    const weekNum = getISOWeek(week.start);
                    const startDay = format(week.start, 'dd/MM');
                    const hasToday = week.days.some(d => isToday(d));
                    return (
                      <div
                        key={`week-${i}`}
                        className={`flex flex-col items-center justify-center border-r border-slate-100 transition-colors ${hasToday ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700'}`}
                        style={{ width: currentDayWidth, minWidth: currentDayWidth }}
                      >
                        <div className="font-semibold text-[10px]">S{weekNum}</div>
                        <div className="text-[8px] text-slate-500">{startDay}</div>
                      </div>
                    );
                  })
                ) : (
                  timeline.map((d, i) => {
                    const isTodayDate = isToday(d);
                    const dayOfMonth = format(d, 'd');
                    const dayName = format(d, 'EEE', { locale: it }).toUpperCase();
                    return (
                      <div
                        key={`day-${i}`}
                        className={`flex flex-col items-center justify-center border-r border-slate-100 transition-colors ${isTodayDate ? 'bg-indigo-600 text-white font-bold' : 'text-slate-700'}`}
                        style={{ width: currentDayWidth, minWidth: currentDayWidth }}
                      >
                        <div className={`text-[8px] font-medium leading-tight ${isTodayDate ? 'text-white opacity-90' : 'text-slate-500'}`}>{dayName}</div>
                        <div className="text-xs font-bold leading-tight">{dayOfMonth}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Gantt Grid */}
          <div ref={gridRef} className={`flex-1 relative bg-white ${isFullscreen ? 'overflow-hidden' : 'overflow-auto'}`}>
            <div style={{ width: currentTimelineTotalWidth, height: currentTotalHeight }} className="relative">
              {/* Griglia di sfondo */}
              <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
                {/* Linee verticali */}
                {effectiveViewMode === 'weekly' ? (
                  timeline.map((week, i) => {
                    const x = i * currentDayWidth;
                    const hasToday = week.days.some(d => isToday(d));
                    return (
                      <line 
                        key={`v${i}`} 
                        x1={x} 
                        y1={0} 
                        x2={x} 
                        y2={currentTotalHeight} 
                        stroke={hasToday ? "#6366f1" : "#e2e8f0"} 
                        strokeWidth={hasToday ? 2 : 1} 
                        opacity={hasToday ? 0.5 : 1} 
                      />
                    );
                  })
                ) : (
                  timeline.map((d, i) => {
                    const x = i * currentDayWidth;
                    const isTodayLine = isToday(d);
                    return (
                      <line 
                        key={`v${i}`} 
                        x1={x} 
                        y1={0} 
                        x2={x} 
                        y2={currentTotalHeight} 
                        stroke={isTodayLine ? "#6366f1" : "#e2e8f0"} 
                        strokeWidth={isTodayLine ? 2 : 1} 
                        opacity={isTodayLine ? 0.5 : 1} 
                      />
                    );
                  })
                )}
                {/* Linee orizzontali */}
                {orderedRows.map((_, i) => {
                  const y = i * currentRowHeight;
                  return (
                    <line 
                      key={`h${i}`} 
                      x1={0} 
                      y1={y} 
                      x2={currentTimelineTotalWidth} 
                      y2={y} 
                      stroke="#f1f5f9" 
                      strokeWidth={1} 
                    />
                  );
                })}
              </svg>

              {/* Linee di dipendenza */}
              {showDependencies && !isFullscreen && (
                <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%', zIndex: 5 }}>
                  {orderedRows.map((row, idx) => {
                    if (row.type !== 'activity') return null;
                    const a = row.data;
                    if (!a.predecessori || a.predecessori.length === 0) return null;

                    const pos = getActivityPosition(a, idx);
                    if (!pos) return null;

                    return a.predecessori.map((pred, predIdx) => {
                      const predActivity = orderedRows.find(r => r.type === 'activity' && r.data.id === pred.attivita_id);
                      if (!predActivity) return null;

                      const predIdx2 = orderedRows.indexOf(predActivity);
                      const predPos = getActivityPosition(predActivity.data, predIdx2);
                      if (!predPos) return null;

                      // Coordinate per la linea di dipendenza
                      let x1, y1, x2, y2;
                      
                      const barGap = 4; // Gap between bar and line start/end
                      const verticalOffset = currentBarHeight / 2;

                      switch (pred.tipo_dipendenza) {
                        case 'FS': // Finish-to-Start
                          x1 = predPos.left + predPos.width + barGap;
                          y1 = predPos.top + verticalOffset;
                          x2 = pos.left - barGap;
                          y2 = pos.top + verticalOffset;
                          break;
                        case 'SS': // Start-to-Start
                          x1 = predPos.left - barGap;
                          y1 = predPos.top + verticalOffset;
                          x2 = pos.left - barGap;
                          y2 = pos.top + verticalOffset;
                          break;
                        case 'FF': // Finish-to-Finish
                          x1 = predPos.left + predPos.width + barGap;
                          y1 = predPos.top + verticalOffset;
                          x2 = pos.left + pos.width + barGap;
                          y2 = pos.top + verticalOffset;
                          break;
                        case 'SF': // Start-to-Finish
                          x1 = predPos.left - barGap;
                          y1 = predPos.top + verticalOffset;
                          x2 = pos.left + pos.width + barGap;
                          y2 = pos.top + verticalOffset;
                          break;
                        default: // Fallback to FS
                          x1 = predPos.left + predPos.width + barGap;
                          y1 = predPos.top + verticalOffset;
                          x2 = pos.left - barGap;
                          y2 = pos.top + verticalOffset;
                      }

                      // Linea con freccia
                      const isBothCritical = isActivityCritical(a.id) && isActivityCritical(predActivity.data.id);
                      const color = isBothCritical ? "#dc2626" : "#94a3b8";
                      const strokeWidth = isBothCritical ? 2 : 1;
                      const strokeDasharray = isBothCritical ? "0" : "4,4";

                      return (
                        <g key={`dep-${a.id}-${pred.attivita_id}-${predIdx}`}>
                          <line
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke={color}
                            strokeWidth={strokeWidth}
                            strokeDasharray={strokeDasharray}
                            opacity={0.6}
                          />
                          {/* Freccia */}
                          <polygon
                            points={`${x2},${y2} ${x2-6},${y2-4} ${x2-6},${y2+4}`}
                            fill={color}
                            opacity={0.6}
                          />
                        </g>
                      );
                    });
                  })}
                </svg>
              )}

              {/* Barre delle attività e Milestone */}
              {orderedRows.map((row, idx) => {
                if (row.type !== 'activity') return null;
                const a = row.data;
                const pos = getActivityPosition(a, idx);
                if (!pos) return null;

                const isDragging = dragInfo?.activity.id === a.id;
                const isResizing = resizeInfo?.activity.id === a.id;
                let displayPos = pos;
                
                if (isDragging && dragInfo.newStart && dragInfo.newEnd) {
                  let newStartIdx = -1;
                  let newEndIdx = -1;
                  
                  if (effectiveViewMode === 'weekly') {
                    newStartIdx = timeline.findIndex(week => {
                      const targetDate = parseISO(dragInfo.newStart);
                      return targetDate >= week.start && targetDate <= week.end;
                    });
                    newEndIdx = timeline.findIndex(week => {
                      const targetDate = parseISO(dragInfo.newEnd);
                      return targetDate >= week.start && targetDate <= week.end;
                    });
                  } else {
                    newStartIdx = timeline.findIndex(d => format(d, 'yyyy-MM-dd') === dragInfo.newStart);
                    newEndIdx = timeline.findIndex(d => format(d, 'yyyy-MM-dd') === dragInfo.newEnd);
                  }
                  
                  if (newStartIdx !== -1 && newEndIdx !== -1) {
                    const dayWidth = currentDayWidth;
                    displayPos = {
                      left: newStartIdx * dayWidth,
                      width: (newEndIdx - newStartIdx + 1) * dayWidth,
                      top: pos.top
                    };
                  }
                } else if (resizeInfo) {
                  const dayWidth = currentDayWidth;
                  let newLeft = pos.left;
                  let newWidth = pos.width;
                  
                  if (resizeInfo.newStart) {
                    let newStartIdx = -1;
                    if (effectiveViewMode === 'weekly') {
                      newStartIdx = timeline.findIndex(week => {
                        const targetDate = parseISO(resizeInfo.newStart);
                        return targetDate >= week.start && targetDate <= week.end;
                      });
                    } else {
                      newStartIdx = timeline.findIndex(d => format(d, 'yyyy-MM-dd') === resizeInfo.newStart);
                    }
                    
                    if (newStartIdx !== -1) {
                      newLeft = newStartIdx * dayWidth;
                      const endIdx = effectiveViewMode === 'weekly' 
                        ? timeline.findIndex(week => {
                            const targetDate = parseISO(a.data_fine);
                            return targetDate >= week.start && targetDate <= week.end;
                          })
                        : timeline.findIndex(d => format(d, 'yyyy-MM-dd') === a.data_fine);
                      if (endIdx !== -1) {
                        newWidth = (endIdx - newStartIdx + 1) * dayWidth;
                      }
                    }
                  }
                  
                  if (resizeInfo.newEnd) {
                    let startIdx = -1;
                    let newEndIdx = -1;
                    
                    if (effectiveViewMode === 'weekly') {
                      startIdx = timeline.findIndex(week => {
                        const targetDate = parseISO(a.data_inizio);
                        return targetDate >= week.start && targetDate <= week.end;
                      });
                      newEndIdx = timeline.findIndex(week => {
                        const targetDate = parseISO(resizeInfo.newEnd);
                        return targetDate >= week.start && targetDate <= week.end;
                      });
                    } else {
                      startIdx = timeline.findIndex(d => format(d, 'yyyy-MM-dd') === a.data_inizio);
                      newEndIdx = timeline.findIndex(d => format(d, 'yyyy-MM-dd') === resizeInfo.newEnd);
                    }
                    
                    if (startIdx !== -1 && newEndIdx !== -1) {
                      newWidth = (newEndIdx - startIdx + 1) * dayWidth;
                    }
                  }
                  
                  displayPos = { left: newLeft, width: newWidth, top: pos.top };
                }

                const isCritical = isActivityCritical(a.id);
                const barColor = isCritical ? "#dc2626" : (a.colore || "#6366f1");
                const completion = a.percentuale_completamento || 0;

                // Milestone: visualizza come diamante
                if (a.tipo_attivita === 'milestone') {
                  const diamondSize = Math.min(currentBarHeight * 1.5, 24);
                  const centerX = displayPos.left + (effectiveViewMode === 'weekly' ? currentDayWidth / 2 : displayPos.width / 2); // Center milestone on the day/week it occurs
                  const centerY = displayPos.top + currentBarHeight / 2;

                  return (
                    <g key={a.id}>
                      <polygon
                        points={`${centerX},${centerY - diamondSize/2} ${centerX + diamondSize/2},${centerY} ${centerX},${centerY + diamondSize/2} ${centerX - diamondSize/2},${centerY}`}
                        fill={barColor}
                        stroke={isCritical ? "#7f1d1d" : "#1e40af"}
                        strokeWidth={2}
                        opacity={isDragging || isResizing ? 0.6 : 0.9}
                        className="cursor-pointer hover:opacity-100 transition-opacity"
                        onMouseDown={(e) => !isFullscreen && canEdit && handleBarMouseDown(e.nativeEvent, a, idx, 'move')}
                      />
                      {isCritical && (
                        <text
                          x={centerX}
                          y={centerY + diamondSize/2 + 10} // Adjusted text position
                          textAnchor="middle"
                          className="text-[8px] font-bold fill-red-600"
                        >
                          CRITICO
                        </text>
                      )}
                    </g>
                  );
                }

                // Task normale: barra standard
                return (
                  <div
                    key={a.id}
                    className="absolute rounded cursor-pointer hover:shadow-md transition-shadow group"
                    style={{
                      left: displayPos.left + 2,
                      top: displayPos.top,
                      width: Math.max(displayPos.width - 4, 1),
                      height: currentBarHeight,
                      backgroundColor: barColor,
                      opacity: isDragging || isResizing ? 0.6 : 0.9,
                      zIndex: isDragging || isResizing ? 10 : 1,
                      border: isCritical ? '2px solid #7f1d1d' : 'none'
                    }}
                    onMouseDown={(e) => handleBarMouseDown(e, a, idx, 'move')}
                  >
                    {/* Barra di completamento */}
                    <div
                      className="absolute inset-0 bg-white bg-opacity-20 rounded-l"
                      style={{ width: `${completion}%` }}
                    />
                    {/* Testo */}
                    <div className="relative h-full flex items-center px-2 text-white text-[10px] font-medium truncate">
                      {isCritical && <span className="mr-1">⚠️</span>}
                      {!isFullscreen && a.descrizione} {/* Show description only if not in fullscreen */}
                    </div>
                    {/* Maniglie di ridimensionamento */}
                    {canEdit && !isFullscreen && (
                      <>
                        <div
                          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white bg-opacity-40 rounded-l"
                          onMouseDown={(e) => handleBarMouseDown(e, a, idx, 'resize-left')}
                        />
                        <div
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-white bg-opacity-40 rounded-r"
                          onMouseDown={(e) => handleBarMouseDown(e, a, idx, 'resize-right')}
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}