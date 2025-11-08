import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, SkipBack } from "lucide-react";
import { format, addDays, subDays, isToday, parseISO, addWeeks, subWeeks, max, min, endOfWeek, startOfWeek, eachDayOfInterval, addMonths } from "date-fns";

const DAY_WIDTH = 50;
const ACTIVITY_HEIGHT = 50;

const categoriaColors = {
  preparazione: "#ef4444",
  strutture: "#3b82f6", 
  impianti: "#f59e0b",
  finiture: "#10b981",
  collaudi: "#8b5cf6",
  altro: "#6b7280"
};

export default function GanttView({ attivita, cantiere, onAddAttivita, onEditAttivita }) {
  const [timeRange, setTimeRange] = useState({ days: [], weeks: [] });
  const hasScrolledInitially = useRef(false);

  const dateHeaderScrollRef = useRef(null);
  const activityNamesScrollRef = useRef(null);
  const barsScrollRef = useRef(null);

  useEffect(() => {
    if (!cantiere) {
      setTimeRange({ days: [], weeks: [] });
      return;
    }
    const today = new Date();
    const cantiereStart = cantiere.data_inizio ? parseISO(cantiere.data_inizio) : today;
    const timelineStart = min([subWeeks(today, 8), subWeeks(cantiereStart, 2)]);
    const cantiereEnd = cantiere.data_fine_prevista ? parseISO(cantiere.data_fine_prevista) : addMonths(today, 12);
    const timelineEnd = max([addMonths(today, 6), addWeeks(cantiereEnd, 4)]);
    const start = startOfWeek(timelineStart, { weekStartsOn: 1 });
    const end = endOfWeek(timelineEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    const weeks = [];
    let weekStart = start;
    while (weekStart <= end) {
      weeks.push({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) });
      weekStart = addWeeks(weekStart, 1);
    }
    setTimeRange({ days, weeks });
    hasScrolledInitially.current = false; 
  }, [cantiere]);

  useEffect(() => {
    if (timeRange.days.length > 0 && barsScrollRef.current && !hasScrolledInitially.current) {
      const todayIndex = timeRange.days.findIndex(day => isToday(day));
      if (todayIndex > -1) {
        const scrollPosition = todayIndex * DAY_WIDTH - (barsScrollRef.current.offsetWidth / 2) + (DAY_WIDTH / 2);
        barsScrollRef.current.scrollLeft = Math.max(0, scrollPosition);
        hasScrolledInitially.current = true;
      }
    }
  }, [timeRange]);

  useEffect(() => {
    const barsRef = barsScrollRef.current;
    const dateHeaderRef = dateHeaderScrollRef.current;
    const activityNamesRef = activityNamesScrollRef.current;
    if (!barsRef || !dateHeaderRef || !activityNamesRef) return;

    const handleScroll = (scrollingElement, target1, target2) => {
      if (scrollingElement === barsRef) {
        if (dateHeaderRef.scrollLeft !== barsRef.scrollLeft) dateHeaderRef.scrollLeft = barsRef.scrollLeft;
        if (activityNamesRef.scrollTop !== barsRef.scrollTop) activityNamesRef.scrollTop = barsRef.scrollTop;
      } else if (scrollingElement === dateHeaderRef) {
        if (barsRef.scrollLeft !== dateHeaderRef.scrollLeft) barsRef.scrollLeft = dateHeaderRef.scrollLeft;
      } else if (scrollingElement === activityNamesRef) {
        if (barsRef.scrollTop !== activityNamesRef.scrollTop) barsRef.scrollTop = activityNamesRef.scrollTop;
      }
    };
    
    const onBarsScroll = () => handleScroll(barsRef);
    const onDateHeaderScroll = () => handleScroll(dateHeaderRef);
    const onActivityNamesScroll = () => handleScroll(activityNamesRef);

    barsRef.addEventListener('scroll', onBarsScroll);
    dateHeaderRef.addEventListener('scroll', onDateHeaderScroll);
    activityNamesRef.addEventListener('scroll', onActivityNamesScroll);

    return () => {
      barsRef.removeEventListener('scroll', onBarsScroll);
      dateHeaderRef.removeEventListener('scroll', onDateHeaderScroll);
      activityNamesRef.removeEventListener('scroll', onActivityNamesScroll);
    };
  }, []);

  const getActivityPosition = (startDateStr, endDateStr) => {
    if (!startDateStr || !endDateStr) return null;
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const startIndex = timeRange.days.findIndex(day => format(day, 'yyyy-MM-dd') === format(start, 'yyyy-MM-dd'));
    const endIndex = timeRange.days.findIndex(day => format(day, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd'));
    if (startIndex === -1 || endIndex === -1) return null;
    return { left: startIndex * DAY_WIDTH + 2, width: Math.max((endIndex - startIndex + 1) * DAY_WIDTH - 4, 20) };
  };
  
  const scrollTo = (dateStr) => {
    if (!dateStr || !barsScrollRef.current || timeRange.days.length === 0) return;
    const date = parseISO(dateStr);
    const index = timeRange.days.findIndex(d => format(d, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'));
    if (index > -1) {
      const scrollPosition = index * DAY_WIDTH - (barsScrollRef.current.offsetWidth / 2) + (DAY_WIDTH / 2);
      barsScrollRef.current.scrollTo({ left: Math.max(0, scrollPosition), behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b bg-slate-50 flex-shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-bold text-slate-900">Cronoprogramma</h3>
          <Badge variant="secondary">{attivita.length} attività</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => scrollTo(cantiere?.data_inizio)}><SkipBack className="w-4 h-4 mr-1" />Inizio</Button>
          <Button variant="outline" size="sm" onClick={() => barsScrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => scrollTo(new Date().toISOString())}>Oggi</Button>
          <Button variant="outline" size="sm" onClick={() => barsScrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}><ChevronRight className="w-4 h-4" /></Button>
          <Button onClick={onAddAttivita} size="sm" className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-1" />Attività</Button>
        </div>
      </div>

      <div className="grid grid-cols-[288px,1fr] flex-1 overflow-hidden">
        {/* Header fisso (Angolo e Date) */}
        <div className="bg-slate-100 border-b border-r font-semibold text-sm text-slate-700 flex items-center justify-center">ATTIVITÀ</div>
        <div ref={dateHeaderScrollRef} className="overflow-x-hidden border-b bg-slate-100">
          <div className="flex" style={{ width: `${timeRange.days.length * DAY_WIDTH}px` }}>
            {timeRange.days.map((day, index) => (
              <div key={index} className={`border-r border-slate-200 flex flex-col items-center justify-center text-xs ${isToday(day) ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-600'}`} style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH }}>
                <div>{format(day, 'MMM')}</div>
                <div className="font-bold">{format(day, 'dd')}</div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Corpo scrollabile (Nomi attività e Barre) */}
        <div ref={activityNamesScrollRef} className="overflow-y-hidden border-r bg-slate-50">
          <div style={{ height: Math.max(attivita.length * ACTIVITY_HEIGHT, 1) }}>
            {attivita.map((att, index) => (
              <div key={att.id || index} className="border-b border-slate-200 p-3 text-sm flex flex-col justify-center" style={{ height: ACTIVITY_HEIGHT }}>
                <div className="font-medium text-slate-900 mb-1 leading-tight truncate">{att.descrizione}</div>
                <div className="text-xs text-slate-500 capitalize">{att.stato.replace('_', ' ')} • {att.percentuale_completamento || 0}%</div>
              </div>
            ))}
          </div>
        </div>
        <div ref={barsScrollRef} className="overflow-auto">
          <div className="relative" style={{ width: `${timeRange.days.length * DAY_WIDTH}px`, height: Math.max(attivita.length * ACTIVITY_HEIGHT, 1) }}>
            {timeRange.days.map((day, index) => <div key={index} className="absolute top-0 bottom-0 w-px bg-slate-200" style={{ left: index * DAY_WIDTH }} />)}
            {timeRange.days.findIndex(day => isToday(day)) > -1 && <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20" style={{ left: `${timeRange.days.findIndex(day => isToday(day)) * DAY_WIDTH + DAY_WIDTH/2}px` }} />}
            
            {attivita.map((att, index) => {
              const position = getActivityPosition(att.data_inizio, att.data_fine);
              if (!position) return null;
              return (
                <div key={att.id || index} className="absolute group" style={{ top: index * ACTIVITY_HEIGHT + 10, left: position.left, width: position.width, height: 30 }} onClick={() => onEditAttivita(att)}>
                  <div className="rounded px-2 py-1 text-white text-xs font-medium shadow-sm flex items-center h-full cursor-pointer transition-all duration-200 group-hover:ring-2 group-hover:ring-blue-500 group-hover:ring-offset-2" style={{ backgroundColor: att.colore || categoriaColors[att.categoria] || '#3b82f6' }}>
                    <span className="truncate">{att.descrizione}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}