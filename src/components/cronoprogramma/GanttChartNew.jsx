import React, { useState, useEffect, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, Plus, SkipBack } from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subDays, parseISO, isToday, addWeeks, subWeeks, max, min } from "date-fns";
import { Badge } from "@/components/ui/badge";

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

export default function GanttChartNew({ attivita, cantiere, onAddAttivita }) {
  const [timeRange, setTimeRange] = useState({ days: [], weeks: [] });
  const ganttRef = useRef(null);
  const hasScrolledInitially = useRef(false);

  // Genera la timeline che include SEMPRE la data odierna e la data di inizio cantiere
  useEffect(() => {
    if (!cantiere) {
      setTimeRange({ days: [], weeks: [] });
      return;
    }

    const today = new Date();
    
    // Calcolo il punto di inizio: il più lontano nel passato tra oggi-8 settimane e inizio cantiere-2 settimane
    const todayMinus8Weeks = subWeeks(today, 8);
    let cantiereStart = today; // Default se non c'è data inizio
    
    if (cantiere.data_inizio) {
      cantiereStart = parseISO(cantiere.data_inizio);
    }
    
    const cantiereStartMinus2Weeks = subWeeks(cantiereStart, 2);
    const timelineStart = min([todayMinus8Weeks, cantiereStartMinus2Weeks]);
    
    // Calcolo il punto di fine: il più lontano nel futuro tra oggi+6 mesi e fine cantiere+4 settimane
    const todayPlus6Months = addMonths(today, 6);
    let cantiereEnd = addMonths(today, 12); // Default 1 anno da oggi se non c'è data fine
    
    if (cantiere.data_fine_prevista) {
      cantiereEnd = parseISO(cantiere.data_fine_prevista);
    }
    
    const cantiereEndPlus4Weeks = addWeeks(cantiereEnd, 4);
    const timelineEnd = max([todayPlus6Months, cantiereEndPlus4Weeks]);

    // Genero la timeline da inizio a fine
    const start = startOfWeek(timelineStart, { weekStartsOn: 1 });
    const end = endOfWeek(timelineEnd, { weekStartsOn: 1 });

    const days = eachDayOfInterval({ start, end });
    
    const weeks = [];
    let weekStart = start;
    while (weekStart <= end) {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      weeks.push({ start: weekStart, end: weekEnd });
      weekStart = addWeeks(weekStart, 1);
    }
    
    setTimeRange({ days, weeks });
    // Reset dello scroll flag quando il cantiere cambia
    hasScrolledInitially.current = false; 
  }, [cantiere]);

  // Esegue lo scroll automatico a "oggi" dopo che la timeline è stata generata
  useEffect(() => {
    if (timeRange.days.length > 0 && ganttRef.current && !hasScrolledInitially.current) {
      const todayIndex = timeRange.days.findIndex(day => isToday(day));
      if (todayIndex > -1) {
        // Centro "oggi" nella visuale
        const scrollPosition = todayIndex * DAY_WIDTH - (ganttRef.current.offsetWidth / 2) + (DAY_WIDTH / 2);
        ganttRef.current.scrollLeft = Math.max(0, scrollPosition);
        hasScrolledInitially.current = true;
      }
    }
  }, [timeRange]);

  // Funzione per navigare a una data specifica
  const navigateToDate = (date) => {
    if (!ganttRef.current || timeRange.days.length === 0) return;
    const targetIndex = timeRange.days.findIndex(day => 
      format(day, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
    if (targetIndex > -1) {
      const scrollPosition = targetIndex * DAY_WIDTH - (ganttRef.current.offsetWidth / 2) + (DAY_WIDTH / 2);
      ganttRef.current.scrollTo({ left: Math.max(0, scrollPosition), behavior: 'smooth' });
    }
  };

  const goToToday = () => navigateToDate(new Date());
  
  const goToCantiereStart = () => {
    if (cantiere && cantiere.data_inizio) {
      navigateToDate(parseISO(cantiere.data_inizio));
    }
  };
  
  // Navigazione manuale con scroll
  const navigatePrevious = () => ganttRef.current?.scrollBy({ left: -300, behavior: 'smooth' });
  const navigateNext = () => ganttRef.current?.scrollBy({ left: 300, behavior: 'smooth' });

  const getActivityPosition = (startDate, endDate) => {
    const startIndex = timeRange.days.findIndex(day => 
      format(day, 'yyyy-MM-dd') === format(new Date(startDate), 'yyyy-MM-dd')
    );
    const endIndex = timeRange.days.findIndex(day => 
      format(day, 'yyyy-MM-dd') === format(new Date(endDate), 'yyyy-MM-dd')
    );

    if (startIndex === -1 || endIndex === -1) return null;

    return {
      left: startIndex * DAY_WIDTH + 2,
      width: (endIndex - startIndex + 1) * DAY_WIDTH - 4
    };
  };

  const timelineWidth = timeRange.days.length * DAY_WIDTH;

  return (
    <div className="border-0 shadow-lg bg-white h-full flex flex-col rounded-lg overflow-hidden">
      {/* Header fisso */}
      <div className="bg-white border-b p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-bold text-slate-900">Cronoprogramma Gantt</h3>
            <Badge variant="secondary">{attivita.length} attività</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToCantiereStart}>
              <SkipBack className="w-4 h-4 mr-2" />
              Inizio Cantiere
            </Button>
            <Button variant="outline" size="icon" onClick={navigatePrevious}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={goToToday}>
              Oggi
            </Button>
            <Button variant="outline" size="icon" onClick={navigateNext}>
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
      </div>

      {/* Contenuto principale */}
      <div className="flex flex-1 overflow-hidden">
        {/* Colonna attività (fissa) */}
        <div className="w-80 bg-slate-50 border-r border-slate-200 flex-shrink-0">
          <div className="h-24 border-b-2 border-slate-300 bg-slate-100 p-3 font-semibold flex items-center">
            ATTIVITÀ
          </div>
          <div className="overflow-y-auto" style={{ height: 'calc(100% - 96px)' }}>
            {attivita.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nessuna attività pianificata.</p>
                <p className="text-sm mt-1">Clicca "Nuova Attività" per iniziare.</p>
              </div>
            ) : (
              attivita.map((att, index) => (
                <div key={att.id || index} className="h-20 border-b border-slate-200 p-3 flex flex-col justify-center bg-white hover:bg-slate-50">
                  <div className="font-medium text-slate-900 mb-1 leading-tight line-clamp-2">
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
        <div className="flex-1 overflow-x-auto" ref={ganttRef}>
          <div style={{ width: `${timelineWidth}px` }} className="relative h-full">
            {/* Header timeline */}
            <div className="sticky top-0 z-10 bg-white">
              {/* Riga mesi */}
              <div className="flex border-b border-slate-200 h-10">
                {timeRange.weeks.map((week, index) => {
                  const daysInWeek = timeRange.days.filter(d => 
                    d >= week.start && d <= week.end
                  ).length;
                  return (
                    <div 
                      key={index} 
                      className="text-center py-1 border-r border-slate-200 bg-slate-50 flex items-center justify-center text-sm font-semibold text-slate-800" 
                      style={{width: `${daysInWeek * DAY_WIDTH}px`}}
                    >
                      {format(week.start, 'MMM yyyy')}
                    </div>
                  );
                })}
              </div>
              
              {/* Riga giorni */}
              <div className="flex border-b-2 border-slate-300 h-14">
                {timeRange.days.map((day, index) => (
                  <div 
                    key={index} 
                    className={`text-center p-1 bg-slate-50 border-r border-slate-200 flex flex-col justify-center ${
                      isToday(day) ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-600'
                    }`} 
                    style={{width: `${DAY_WIDTH}px`}}
                  >
                    <div className="text-xs">{format(day, 'EEE')}</div>
                    <div className="text-sm font-bold">{format(day, 'dd')}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Area attività */}
            <div className="relative">
              {/* Linea del giorno corrente */}
              {timeRange.days.map((day, index) => {
                if (isToday(day)) {
                  return (
                    <div 
                      key="today-line" 
                      className="absolute top-0 bottom-0 border-l-2 border-red-500 z-20"
                      style={{ left: `${index * DAY_WIDTH + (DAY_WIDTH / 2)}px` }}
                    />
                  );
                }
                return null;
              })}

              {/* Barre delle attività */}
              {attivita.map((att, index) => {
                const position = getActivityPosition(att.data_inizio, att.data_fine);
                if (!position) return null;
                
                return (
                  <div key={att.id || index} className="h-20 border-b border-slate-200 relative">
                    <div 
                      className="absolute h-10 rounded-md flex items-center px-2 text-white text-xs font-medium shadow-md"
                      style={{
                        backgroundColor: att.colore || categoriaColors[att.categoria] || '#3b82f6',
                        left: `${position.left}px`,
                        width: `${position.width}px`,
                        top: '1.25rem'
                      }}
                    >
                      <div className="truncate flex-1">{att.descrizione}</div>
                      {/* Barra di completamento */}
                      <div 
                        className="absolute top-0 left-0 h-full bg-black bg-opacity-20 rounded-md"
                        style={{ width: `${att.percentuale_completamento || 0}%` }}
                      />
                    </div>
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