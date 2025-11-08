import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar, Plus, SkipBack } from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subWeeks, addWeeks, parseISO, isToday } from "date-fns";

const categoriaColors = {
  preparazione: "#ef4444",
  strutture: "#3b82f6", 
  impianti: "#f59e0b",
  finiture: "#10b981",
  collaudi: "#8b5cf6",
  altro: "#6b7280"
};

const statoColors = {
  pianificata: "bg-gray-100 text-gray-800",
  in_corso: "bg-blue-100 text-blue-800",
  completata: "bg-green-100 text-green-800", 
  sospesa: "bg-yellow-100 text-yellow-800",
  in_ritardo: "bg-red-100 text-red-800"
};

const DAY_WIDTH = 40;
const ACTIVITY_HEIGHT = 60;

export default function GanttChart({ attivita, cantiere, onAddAttivita }) {
  const [timeRange, setTimeRange] = useState({ days: [], weeks: [] });
  const timelineRef = useRef(null);
  const hasScrolledToToday = useRef(false);

  // Genera timeline che include sempre oggi
  useEffect(() => {
    const today = new Date();
    
    // Punto di inizio: 3 mesi prima di oggi
    const timelineStart = startOfWeek(subWeeks(today, 12), { weekStartsOn: 1 });
    
    // Punto di fine: 6 mesi dopo oggi
    const timelineEnd = endOfWeek(addWeeks(today, 24), { weekStartsOn: 1 });

    const days = eachDayOfInterval({ start: timelineStart, end: timelineEnd });
    
    // Genera settimane per l'header
    const weeks = [];
    let weekStart = timelineStart;
    while (weekStart <= timelineEnd) {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      weeks.push({ start: weekStart, end: weekEnd });
      weekStart = addWeeks(weekStart, 1);
    }
    
    setTimeRange({ days, weeks });
    hasScrolledToToday.current = false;
  }, [cantiere]);

  // Scroll automatico a oggi
  useEffect(() => {
    if (timeRange.days.length > 0 && timelineRef.current && !hasScrolledToToday.current) {
      const todayIndex = timeRange.days.findIndex(day => isToday(day));
      if (todayIndex > -1) {
        const scrollPosition = todayIndex * DAY_WIDTH - 200; // Offset per centrare
        timelineRef.current.scrollLeft = Math.max(0, scrollPosition);
        hasScrolledToToday.current = true;
      }
    }
  }, [timeRange]);

  const navigateToToday = () => {
    if (!timelineRef.current || timeRange.days.length === 0) return;
    const todayIndex = timeRange.days.findIndex(day => isToday(day));
    if (todayIndex > -1) {
      const scrollPosition = todayIndex * DAY_WIDTH - 200;
      timelineRef.current.scrollTo({ left: Math.max(0, scrollPosition), behavior: 'smooth' });
    }
  };

  const navigateToCantiereStart = () => {
    if (!cantiere?.data_inizio || !timelineRef.current || timeRange.days.length === 0) return;
    const startDate = parseISO(cantiere.data_inizio);
    const startIndex = timeRange.days.findIndex(day => 
      format(day, 'yyyy-MM-dd') === format(startDate, 'yyyy-MM-dd')
    );
    if (startIndex > -1) {
      const scrollPosition = startIndex * DAY_WIDTH - 200;
      timelineRef.current.scrollTo({ left: Math.max(0, scrollPosition), behavior: 'smooth' });
    }
  };

  const scrollPrevious = () => timelineRef.current?.scrollBy({ left: -300, behavior: 'smooth' });
  const scrollNext = () => timelineRef.current?.scrollBy({ left: 300, behavior: 'smooth' });

  const getActivityPosition = (startDate, endDate) => {
    if (!startDate || !endDate) return null;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const startIndex = timeRange.days.findIndex(day => 
      format(day, 'yyyy-MM-dd') === format(start, 'yyyy-MM-dd')
    );
    const endIndex = timeRange.days.findIndex(day => 
      format(day, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')
    );

    if (startIndex === -1 || endIndex === -1) return null;

    return {
      left: startIndex * DAY_WIDTH + 2,
      width: Math.max((endIndex - startIndex + 1) * DAY_WIDTH - 4, 20)
    };
  };

  const todayLinePosition = timeRange.days.findIndex(day => isToday(day)) * DAY_WIDTH + (DAY_WIDTH / 2);

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      {/* Header fisso */}
      <CardHeader className="flex-shrink-0 border-b bg-white z-20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-bold text-slate-900">Cronoprogramma Gantt</h3>
            <Badge variant="secondary">{attivita.length} attività</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={navigateToCantiereStart}>
              <SkipBack className="w-4 h-4 mr-2" />
              Inizio Cantiere
            </Button>
            <Button variant="outline" size="icon" onClick={scrollPrevious}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={navigateToToday}>
              Oggi
            </Button>
            <Button variant="outline" size="icon" onClick={scrollNext}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button onClick={onAddAttivita} className="bg-blue-600 hover:bg-blue-700 ml-4">
              <Plus className="w-4 h-4 mr-2" />
              Nuova Attività
            </Button>
          </div>
        </div>
        
        {/* Legenda */}
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <div className="text-sm font-medium text-slate-700">Legenda:</div>
          {Object.entries(categoriaColors).map(([categoria, colore]) => (
            <div key={categoria} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colore }}></div>
              <span className="text-xs text-slate-600 capitalize">{categoria}</span>
            </div>
          ))}
        </div>
      </CardHeader>

      {/* Contenuto principale */}
      <CardContent className="flex-1 p-0 flex overflow-hidden">
        {/* Colonna attività (fissa) */}
        <div className="w-80 bg-slate-50 border-r border-slate-200 flex-shrink-0 overflow-y-auto">
          {/* Header colonna attività */}
          <div className="h-16 border-b-2 border-slate-300 bg-slate-100 p-3 font-semibold flex items-center sticky top-0 z-10">
            ATTIVITÀ
          </div>
          
          {/* Lista attività */}
          <div>
            {attivita.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nessuna attività pianificata.</p>
                <p className="text-sm mt-1">Clicca "Nuova Attività" per iniziare.</p>
              </div>
            ) : (
              attivita.map((att, index) => (
                <div 
                  key={att.id || index} 
                  className="border-b border-slate-200 p-3 bg-white hover:bg-slate-50"
                  style={{ height: ACTIVITY_HEIGHT }}
                >
                  <div className="font-medium text-slate-900 mb-1 leading-tight line-clamp-2 text-sm">
                    {att.descrizione}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className={`${statoColors[att.stato]} text-xs`}>
                      {att.stato?.replace(/_/g, ' ')}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {att.percentuale_completamento || 0}%
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Area timeline (scrollabile) */}
        <div className="flex-1 overflow-x-auto" ref={timelineRef}>
          <div style={{ width: `${timeRange.days.length * DAY_WIDTH}px`, height: '100%' }} className="relative">
            
            {/* Header timeline fisso */}
            <div className="sticky top-0 z-10 bg-white border-b-2 border-slate-300">
              {/* Riga mesi */}
              <div className="flex h-8 border-b border-slate-200">
                {timeRange.weeks.map((week, index) => {
                  const daysInWeek = timeRange.days.filter(d => 
                    d >= week.start && d <= week.end
                  ).length;
                  const monthYear = format(week.start, 'MMM yyyy');
                  return (
                    <div 
                      key={index} 
                      className="text-center py-1 border-r border-slate-200 bg-slate-50 flex items-center justify-center text-xs font-semibold text-slate-800" 
                      style={{ width: `${daysInWeek * DAY_WIDTH}px`, minWidth: `${daysInWeek * DAY_WIDTH}px` }}
                    >
                      {monthYear}
                    </div>
                  );
                })}
              </div>
              
              {/* Riga giorni */}
              <div className="flex h-8">
                {timeRange.days.map((day, index) => (
                  <div 
                    key={index} 
                    className={`text-center py-1 border-r border-slate-200 bg-slate-50 flex flex-col justify-center text-xs ${
                      isToday(day) ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-600'
                    }`} 
                    style={{ width: `${DAY_WIDTH}px`, minWidth: `${DAY_WIDTH}px` }}
                  >
                    <div className="text-xs">{format(day, 'EEE')}</div>
                    <div className="text-xs font-bold">{format(day, 'dd')}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Area barre attività */}
            <div className="relative" style={{ minHeight: `${Math.max(attivita.length * ACTIVITY_HEIGHT, 200)}px` }}>
              {/* Linea del giorno corrente */}
              {todayLinePosition >= 0 && (
                <div 
                  className="absolute top-0 bottom-0 border-l-2 border-red-500 z-20 pointer-events-none"
                  style={{ left: `${todayLinePosition}px` }}
                />
              )}

              {/* Barre delle attività */}
              {attivita.map((att, index) => {
                const position = getActivityPosition(att.data_inizio, att.data_fine);
                if (!position) return null;
                
                return (
                  <div 
                    key={att.id || index} 
                    className="absolute border-b border-slate-200"
                    style={{ 
                      top: `${index * ACTIVITY_HEIGHT}px`, 
                      height: `${ACTIVITY_HEIGHT}px`,
                      left: 0,
                      right: 0
                    }}
                  >
                    <div 
                      className="absolute rounded-md flex items-center px-2 text-white text-xs font-medium shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                      style={{
                        backgroundColor: att.colore || categoriaColors[att.categoria] || '#3b82f6',
                        left: `${position.left}px`,
                        width: `${position.width}px`,
                        height: '24px',
                        top: '18px'
                      }}
                      title={`${att.descrizione} (${att.percentuale_completamento || 0}%)`}
                    >
                      <div className="truncate flex-1">{att.descrizione}</div>
                      {/* Barra di completamento */}
                      <div 
                        className="absolute top-0 left-0 h-full bg-black bg-opacity-20 rounded-md pointer-events-none"
                        style={{ width: `${att.percentuale_completamento || 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}