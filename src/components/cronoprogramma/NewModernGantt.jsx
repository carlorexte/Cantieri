
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
} from "lucide-react";
import { format, parseISO, isToday, addDays, subDays, differenceInDays, min as minDate, max as maxDate } from 'date-fns';
import { it } from 'date-fns/locale';

const DAY_WIDTH = 40;
const ROW_HEIGHT = 40;
const BAR_HEIGHT = 28;
const SIDEBAR_WIDTH = 320;

const statoIcons = {
  pianificata: { icon: Clock, color: "#6b7280" },
  in_corso: { icon: Play, color: "#3b82f6" },
  completata: { icon: CheckCircle2, color: "#10b981" },
  sospesa: { icon: Pause, color: "#f59e0b" },
  in_ritardo: { icon: AlertCircle, color: "#ef4444" },
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export default function NewModernGantt({ attivita = [], cantiere, onAddAttivita, onEditAttivita, onUpdateAttivita, canEdit = false }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroStato, setFiltroStato] = useState('tutti');
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const [effectiveRowHeight, setEffectiveRowHeight] = useState(ROW_HEIGHT);
  const [dragInfo, setDragInfo] = useState(null);
  const [resizeInfo, setResizeInfo] = useState(null);

  const sidebarRef = useRef(null);
  const headerRef = useRef(null);
  const gridRef = useRef(null);

  // Filtered activities
  const attivitaFiltrate = useMemo(() => {
    let list = attivita;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a => (a.descrizione || '').toLowerCase().includes(q));
    }
    if (filtroStato !== 'tutti') list = list.filter(a => a.stato === filtroStato);
    return list;
  }, [attivita, searchQuery, filtroStato]);

  // Unified order for sidebar and bars
  const orderedRows = useMemo(() => {
    const rows = [];
    const grouped = new Map();
    const noGroup = [];

    for (const a of attivitaFiltrate) {
      const key = a.gruppo_fase && a.gruppo_fase.trim() ? a.gruppo_fase.trim() : '';
      if (!key) {
        noGroup.push(a);
        continue;
      }
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(a);
    }

    const groupsWithMeta = Array.from(grouped.entries()).map(([groupName, list]) => {
      const minStart = list
        .map(x => x.data_inizio ? parseISO(x.data_inizio) : null)
        .filter(Boolean);
      const minDateVal = minStart.length ? minDate(minStart) : null;
      const ordered = [...list].sort((a, b) => {
        if (!a.data_inizio && !b.data_inizio) return 0;
        if (!a.data_inizio) return 1;
        if (!b.data_inizio) return -1;
        return parseISO(a.data_inizio) - parseISO(b.data_inizio);
      });
      return { groupName, activities: ordered, minDateVal };
    }).sort((g1, g2) => {
      if (!g1.minDateVal && !g2.minDateVal) return 0;
      if (!g1.minDateVal) return 1;
      if (!g2.minDateVal) return -1;
      return g1.minDateVal - g2.minDateVal;
    });

    for (const g of groupsWithMeta) {
      rows.push({ type: 'group', id: `group_${g.groupName}`, name: g.groupName, count: g.activities.length });
      if (!collapsedGroups.has(g.groupName)) {
        for (const a of g.activities) rows.push({ type: 'activity', data: a });
      }
    }

    if (noGroup.length) {
      const ordered = [...noGroup].sort((a, b) => {
        if (!a.data_inizio && !b.data_inizio) return 0;
        if (!a.data_inizio) return 1;
        if (!b.data_inizio) return -1;
        return parseISO(a.data_inizio) - parseISO(b.data_inizio);
      });
      rows.push({ type: 'group', id: '_SENZA_GRUPPO_', name: 'ALTRE ATTIVITÀ', count: ordered.length });
      if (!collapsedGroups.has('_SENZA_GRUPPO_')) {
        for (const a of ordered) rows.push({ type: 'activity', data: a });
      }
    }

    return rows;
  }, [attivitaFiltrate, collapsedGroups]);

  // Project date range
  const projectDateRange = useMemo(() => {
    if (!attivita.length) return null;
    const starts = attivita.map(a => a.data_inizio ? parseISO(a.data_inizio) : null).filter(Boolean);
    const ends = attivita.map(a => a.data_fine ? parseISO(a.data_fine) : null).filter(Boolean);
    if (!starts.length || !ends.length) return null;
    const start = minDate(starts);
    const end = maxDate(ends);
    const totalDays = differenceInDays(end, start) + 1;
    return { projectStart: start, projectEnd: end, totalDays };
  }, [attivita]);

  // Build timeline with buffer
  const timeline = useMemo(() => {
    if (!projectDateRange) return [];
    const start = subDays(projectDateRange.projectStart, 7);
    const end = addDays(projectDateRange.projectEnd, 7);
    const td = differenceInDays(end, start) + 1;
    return Array.from({ length: td }, (_, i) => addDays(start, i));
  }, [projectDateRange]);

  // Sync scroll: vertical
  const onSidebarScroll = useCallback(() => {
    if (!gridRef.current || !sidebarRef.current) return;
    gridRef.current.scrollTop = sidebarRef.current.scrollTop;
  }, []);
  
  const onGridScroll = useCallback(() => {
    if (!gridRef.current || !sidebarRef.current) return;
    sidebarRef.current.scrollTop = gridRef.current.scrollTop;
  }, []);

  useEffect(() => {
    const s = sidebarRef.current;
    const g = gridRef.current;
    if (!s || !g) return;
    s.addEventListener('scroll', onSidebarScroll);
    g.addEventListener('scroll', onGridScroll);
    return () => {
      s.removeEventListener('scroll', onSidebarScroll);
      g.removeEventListener('scroll', onGridScroll);
    };
  }, [onSidebarScroll, onGridScroll]);

  // Measure row height from actual DOM to ensure perfect alignment across environments
  useLayoutEffect(() => {
    const container = sidebarRef.current;
    if (!container) return;
    const children = Array.from(container.querySelectorAll('[data-row]'));
    for (const el of children) {
      const rect = el.getBoundingClientRect();
      if (rect && rect.height) {
        setEffectiveRowHeight(rect.height);
        break;
      }
    }
  }, [orderedRows]);

  // Helpers
  const toggleGroupCollapse = (groupId) => {
    const copy = new Set(collapsedGroups);
    if (copy.has(groupId)) copy.delete(groupId); else copy.add(groupId);
    setCollapsedGroups(copy);
  };

  const scrollToToday = () => {
    if (!gridRef.current || !timeline.length) return;
    const idx = timeline.findIndex(d => isToday(d));
    if (idx === -1) return;
    const left = clamp(idx * DAY_WIDTH - gridRef.current.clientWidth / 2, 0, timeline.length * DAY_WIDTH);
    gridRef.current.scrollTo({ left, behavior: 'smooth' });
    headerRef.current?.scrollTo({ left, behavior: 'smooth' });
  };

  const scrollToStart = () => {
    gridRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
    headerRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
  };

  const scrollToEnd = () => {
    if (!gridRef.current || !timeline.length) return;
    const maxLeft = timeline.length * DAY_WIDTH - gridRef.current.clientWidth;
    const left = Math.max(0, maxLeft);
    gridRef.current.scrollTo({ left, behavior: 'smooth' });
    headerRef.current?.scrollTo({ left, behavior: 'smooth' });
  };

  // Drag & Resize interactions
  const handleMouseDown = (e, activity) => {
    if (!canEdit) return;
    e.preventDefault();
    e.stopPropagation();
    setDragInfo({ activity: { ...activity }, startX: e.clientX });
  };
  
  const handleResizeStart = (e, activity, handle) => {
    if (!canEdit) return;
    e.preventDefault();
    e.stopPropagation();
    setResizeInfo({ activity: { ...activity }, startX: e.clientX, handle });
  };
  
  const handleMouseMove = useCallback((e) => {
    if (!canEdit) return;
    if (resizeInfo) {
      const deltaDays = Math.round((e.clientX - resizeInfo.startX) / DAY_WIDTH);
      const originalStart = parseISO(resizeInfo.activity.data_inizio);
      const originalEnd = parseISO(resizeInfo.activity.data_fine);
      if (resizeInfo.handle === 'start') {
        const newStart = addDays(originalStart, deltaDays);
        if (newStart >= originalEnd) return;
        const duration = differenceInDays(originalEnd, newStart) + 1;
        onUpdateAttivita?.(resizeInfo.activity.id, {
          ...resizeInfo.activity,
          data_inizio: format(newStart, 'yyyy-MM-dd'),
          durata_giorni: duration,
        });
      } else {
        const newEnd = addDays(originalEnd, deltaDays);
        if (newEnd <= originalStart) return;
        const duration = differenceInDays(newEnd, originalStart) + 1;
        onUpdateAttivita?.(resizeInfo.activity.id, {
          ...resizeInfo.activity,
          data_fine: format(newEnd, 'yyyy-MM-dd'),
          durata_giorni: duration,
        });
      }
    } else if (dragInfo) {
      const deltaDays = Math.round((e.clientX - dragInfo.startX) / DAY_WIDTH);
      const originalStart = parseISO(dragInfo.activity.data_inizio);
      const originalEnd = parseISO(dragInfo.activity.data_fine);
      const duration = differenceInDays(originalEnd, originalStart);
      const newStart = addDays(originalStart, deltaDays);
      const newEnd = addDays(newStart, duration);
      onUpdateAttivita?.(dragInfo.activity.id, {
        ...dragInfo.activity,
        data_inizio: format(newStart, 'yyyy-MM-dd'),
        data_fine: format(newEnd, 'yyyy-MM-dd'),
      });
    }
  }, [dragInfo, resizeInfo, canEdit, onUpdateAttivita]);
  
  const handleMouseUp = useCallback(() => { 
    setDragInfo(null); 
    setResizeInfo(null); 
  }, []);
  
  useEffect(() => {
    if (dragInfo || resizeInfo) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragInfo, resizeInfo, handleMouseMove, handleMouseUp]);

  // Compute bar position
  const getActivityPosition = (activity, rowIndex) => {
    if (!activity?.data_inizio || !activity?.data_fine || !timeline.length) return null;
    const start = parseISO(activity.data_inizio);
    const end = parseISO(activity.data_fine);
    const timelineStart = timeline[0];
    const startIndex = differenceInDays(start, timelineStart);
    const durationDays = differenceInDays(end, start) + 1;
    if (startIndex < -durationDays || startIndex > timeline.length) return null;
    const left = startIndex * DAY_WIDTH + 1;
    const width = Math.max(durationDays * DAY_WIDTH - 2, 8);
    const top = rowIndex * effectiveRowHeight + Math.max(0, (effectiveRowHeight - BAR_HEIGHT) / 2);
    return { left, width, top };
  };

  const renderHeader = () => (
    <div className="border-b border-slate-200 bg-white">
      {/* Months row */}
      <div className="flex h-6 text-[10px] text-slate-500 select-none">
        {timeline.map((day, i) => {
          const isFirstOfMonth = i === 0 || format(day, 'MMM yyyy', { locale: it }) !== format(timeline[i - 1], 'MMM yyyy', { locale: it });
          return isFirstOfMonth ? (
            <div key={`m-${i}`} style={{ width: DAY_WIDTH }} className="flex items-center justify-center border-r border-slate-200">
              {format(day, 'MMM yyyy', { locale: it })}
            </div>
          ) : (
            <div key={`m-${i}`} style={{ width: DAY_WIDTH }} className="border-r border-slate-200" />
          );
        })}
      </div>
      {/* Days row */}
      <div className="flex h-8 text-[11px] bg-white select-none">
        {timeline.map((day, i) => (
          <div
            key={`d-${i}`}
            style={{ width: DAY_WIDTH }}
            className={`flex flex-col items-center justify-center border-r border-slate-200 ${isToday(day) ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600'}`}
          >
            <div>{format(day, 'EEE', { locale: it })}</div>
            <div className="text-xs font-bold">{format(day, 'dd', { locale: it })}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderBar = (activity, rowIndex) => {
    const current = (dragInfo && dragInfo.activity.id === activity.id) ? dragInfo.activity : (resizeInfo && resizeInfo.activity.id === activity.id) ? resizeInfo.activity : activity;
    const pos = getActivityPosition(current, rowIndex);
    if (!pos) return null;
    const statoInfo = statoIcons[current.stato] || statoIcons.pianificata;
    const Icon = statoInfo.icon;
    const completion = current.percentuale_completamento || 0;
    const color = current.colore || '#4f46e5';
    const showText = pos.width > 80;
    return (
      <div
        key={activity.id}
        className={`absolute group transition-all duration-150 ${canEdit ? 'cursor-move' : 'cursor-pointer'}`}
        style={{ top: pos.top, left: pos.left, width: pos.width, height: BAR_HEIGHT }}
        onMouseDown={canEdit ? (e) => handleMouseDown(e, activity) : undefined}
        onClick={(e) => { if (!dragInfo && !resizeInfo) { e.stopPropagation(); onEditAttivita?.(activity); } }}
      >
        {canEdit && pos.width > 24 && (
          <>
            <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100" onMouseDown={(e) => handleResizeStart(e, activity, 'start')} />
            <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100" onMouseDown={(e) => handleResizeStart(e, activity, 'end')} />
          </>
        )}
        <div className="h-full rounded-sm shadow-sm border relative overflow-hidden" style={{ backgroundColor: color + '22', borderColor: color }}>
          <div className="absolute top-0 left-0 h-full" style={{ width: `${completion}%`, backgroundColor: color, opacity: 0.35 }} />
          <div className="flex items-center h-full px-2 relative z-10" style={{ color: '#0f172a' }}>
            {pos.width > 24 && <Icon className="w-3.5 h-3.5 mr-1.5" style={{ color: statoInfo.color }} />}
            {showText && <span className="text-xs font-medium truncate">{current.descrizione}</span>}
          </div>
        </div>
      </div>
    );
  };

  const renderTodayLine = () => {
    const idx = timeline.findIndex(d => isToday(d));
    if (idx === -1) return null;
    const left = idx * DAY_WIDTH + DAY_WIDTH / 2;
    return <div className="absolute top-0 bottom-0 w-px bg-red-500 z-20 pointer-events-none" style={{ left }} />;
  };

  if (!cantiere) return <Card className="p-12 text-center text-slate-500">Seleziona un cantiere per visualizzare il cronoprogramma.</Card>;

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-slate-200 p-3 bg-slate-50">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap flex-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cerca attività..." className="pl-9 w-56 h-9 text-sm" />
            </div>
            <Select value={filtroStato} onValueChange={setFiltroStato}>
              <SelectTrigger className="w-36 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tutti">Tutti</SelectItem>
                <SelectItem value="pianificata">Pianificate</SelectItem>
                <SelectItem value="in_corso">In Corso</SelectItem>
                <SelectItem value="completata">Completate</SelectItem>
                <SelectItem value="sospesa">Sospese</SelectItem>
                <SelectItem value="in_ritardo">In Ritardo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={scrollToStart} className="h-9 px-2" title="Vai all'inizio"><Home className="w-4 h-4" /></Button>
            <Button variant="default" size="sm" onClick={scrollToToday} className="h-9 px-3 text-xs" title="Vai a oggi">Oggi</Button>
            <Button variant="ghost" size="sm" onClick={scrollToEnd} className="h-9 px-2" title="Vai alla fine"><CalendarIcon className="w-4 h-4" /></Button>
            {canEdit && (
              <Button onClick={onAddAttivita} size="sm" className="h-9 ml-2 bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-1" />Aggiungi</Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div ref={sidebarRef} className="border-r border-slate-200 bg-slate-50 overflow-auto flex-shrink-0" style={{ width: SIDEBAR_WIDTH }}>
          <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-3 py-2.5 flex items-center justify-center font-semibold text-sm text-slate-700">ATTIVITÀ</div>
          {orderedRows.map((row, index) => {
            if (row.type === 'group') {
              const groupId = row.id.replace('group_', '');
              const isCollapsed = collapsedGroups.has(groupId);
              return (
                <div 
                  key={row.id} 
                  data-row 
                  className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-200 px-3 py-2 cursor-pointer hover:from-indigo-100 hover:to-blue-100 transition-colors flex items-center justify-between" 
                  style={{ height: ROW_HEIGHT }} 
                  onClick={() => toggleGroupCollapse(groupId)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {isCollapsed ? <ChevronRightIcon className="w-4 h-4 text-indigo-600 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-indigo-900 text-xs uppercase tracking-wide truncate">{row.name}</h3>
                      <p className="text-[10px] text-indigo-600 mt-0.5">{row.count} attività</p>
                    </div>
                  </div>
                </div>
              );
            }
            const a = row.data;
            const Info = (statoIcons[a.stato] || statoIcons.pianificata).icon;
            return (
              <div 
                key={a.id} 
                data-row 
                className="border-b border-slate-100 px-3 py-2 hover:bg-white cursor-pointer transition-colors" 
                style={{ height: ROW_HEIGHT }} 
                onClick={() => onEditAttivita?.(a)}
              >
                <div className="flex items-center gap-2 h-full">
                  <Info className="w-4 h-4 shrink-0" style={{ color: (statoIcons[a.stato] || statoIcons.pianificata).color }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 truncate text-xs">{a.descrizione}</div>
                    {a.percentuale_completamento > 0 && (
                      <div className="text-[10px] text-slate-500 mt-0.5">{a.percentuale_completamento}% completato</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Grid and Bars */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div ref={headerRef} className="overflow-x-auto border-b border-slate-200">
            <div style={{ width: `${timeline.length * DAY_WIDTH}px` }}>{renderHeader()}</div>
          </div>
          <div ref={gridRef} className="flex-1 overflow-auto relative bg-slate-50" onMouseUp={() => { setDragInfo(null); setResizeInfo(null); }}>
            <div className="relative" style={{ width: `${timeline.length * DAY_WIDTH}px`, height: Math.max(orderedRows.length * effectiveRowHeight, 200) }}>
              {/* Vertical day lines */}
              {timeline.map((_, index) => (
                <div key={`v-${index}`} className="absolute top-0 bottom-0 w-px bg-slate-200" style={{ left: index * DAY_WIDTH }} />
              ))}
              {/* Horizontal row lines */}
              {orderedRows.map((_, i) => (
                <div key={`h-${i}`} className="absolute left-0 right-0 h-px bg-slate-200" style={{ top: (i + 1) * effectiveRowHeight }} />
              ))}
              {/* Bars */}
              {orderedRows.map((row, index) => row.type === 'activity' ? renderBar(row.data, index) : null)}
              {renderTodayLine()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
