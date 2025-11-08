import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar, 
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  Home
} from "lucide-react";
import { format, addDays, subDays, isToday, parseISO, addWeeks, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval, differenceInDays, isWithinInterval, addMonths, startOfMonth, endOfMonth, eachWeekOfInterval, eachMonthOfInterval } from "date-fns";
import { it } from "date-fns/locale";

const ZOOM_LEVELS = {
  day: { width: 40, label: 'Settimane' },
  week: { width: 120, label: 'Mesi' },
  month: { width: 200, label: 'Trimestri' }
};

const ACTIVITY_HEIGHT = 56;
const HEADER_HEIGHT = 80;

const categoriaColors = {
  preparazione: { bg: "#fef3c7", border: "#f59e0b", text: "#92400e" },
  strutture: { bg: "#dbeafe", border: "#3b82f6", text: "#1e40af" },
  impianti: { bg: "#fde68a", border: "#f59e0b", text: "#92400e" },
  finiture: { bg: "#d1fae5", border: "#10b981", text: "#065f46" },
  collaudi: { bg: "#e0e7ff", border: "#8b5cf6", text: "#5b21b6" },
  altro: { bg: "#f3f4f6", border: "#6b7280", text: "#374151" }
};

const statoIcons = {
  pianificata: { icon: Clock, color: "#6b7280" },
  in_corso: { icon: Play, color: "#3b82f6" },
  completata: { icon: CheckCircle2, color: "#10b981" },
  sospesa: { icon: Pause, color: "#f59e0b" },
  in_ritardo: { icon: AlertCircle, color: "#ef4444" }
};

export default function ModernGanttChart({ attivita, cantiere, onAddAttivita, onEditAttivita }) {
  const [zoomLevel, setZoomLevel] = useState('day');
  const [viewRange, setViewRange] = useState({ start: null, end: null, timeline: [] });
  const [hoveredActivity, setHoveredActivity] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  const ganttRef = useRef(null);
  const headerRef = useRef(null);
  const activitiesRef = useRef(null);

  // Calcola il range temporale e la timeline
  const calculateTimeRange = useMemo(() => {
    if (!cantiere || !cantiere.data_inizio) {
      return { start: new Date(), end: addMonths(new Date(), 6), timeline: [] };
    }

    const today = new Date();
    const cantiereStart = parseISO(cantiere.data_inizio);
    const cantiereEnd = cantiere.data_fine_prevista ? parseISO(cantiere.data_fine_prevista) : addMonths(today, 12);
    
    // Estendi il range per mostrare il contesto
    const rangeStart = new Date(Math.min(
      subWeeks(cantiereStart, 4).getTime(),
      subWeeks(today, 8).getTime()
    ));
    const rangeEnd = new Date(Math.max(
      addWeeks(cantiereEnd, 4).getTime(),
      addWeeks(today, 12).getTime()
    ));

    let timeline = [];
    
    if (zoomLevel === 'day') {
      const start = startOfWeek(rangeStart, { weekStartsOn: 1 });
      const end = endOfWeek(rangeEnd, { weekStartsOn: 1 });
      timeline = eachDayOfInterval({ start, end });
    } else if (zoomLevel === 'week') {
      timeline = eachWeekOfInterval({ start: rangeStart, end: rangeEnd }, { weekStartsOn: 1 });
    } else {
      timeline = eachMonthOfInterval({ start: startOfMonth(rangeStart), end: endOfMonth(rangeEnd) });
    }

    return { start: rangeStart, end: rangeEnd, timeline };
  }, [cantiere, zoomLevel]);

  useEffect(() => {
    setViewRange(calculateTimeRange);
  }, [calculateTimeRange]);

  // MODIFICATO: Auto-scroll che parte sempre da oggi al centro
  useEffect(() => {
    const scrollToTodayCenter = () => {
      if (viewRange.timeline.length > 0 && ganttRef.current) {
        const today = new Date();
        let todayIndex = -1;
        
        if (zoomLevel === 'day') {
          todayIndex = viewRange.timeline.findIndex(day => isToday(day));
        } else if (zoomLevel === 'week') {
          todayIndex = viewRange.timeline.findIndex(week => 
            isWithinInterval(today, { start: week, end: endOfWeek(week, { weekStartsOn: 1 }) })
          );
        } else {
          todayIndex = viewRange.timeline.findIndex(month => 
            format(month, 'yyyy-MM') === format(today, 'yyyy-MM')
          );
        }
        
        if (todayIndex > -1) {
          // SEMPRE centra oggi nella vista
          const scrollPosition = todayIndex * ZOOM_LEVELS[zoomLevel].width - (ganttRef.current.offsetWidth / 2);
          ganttRef.current.scrollLeft = Math.max(0, scrollPosition);
        }
      }
    };

    // Timeout per assicurarsi che il DOM sia pronto
    setTimeout(scrollToTodayCenter, 200);
  }, [viewRange, zoomLevel]);

  // Sync scroll tra header e gantt
  useEffect(() => {
    const gantt = ganttRef.current;
    const header = headerRef.current;
    if (!gantt || !header) return;

    const handleGanttScroll = () => {
      header.scrollLeft = gantt.scrollLeft;
    };

    gantt.addEventListener('scroll', handleGanttScroll);
    return () => gantt.removeEventListener('scroll', handleGanttScroll);
  }, []);

  const getActivityPosition = (activity) => {
    if (!activity.data_inizio || !activity.data_fine || viewRange.timeline.length === 0) return null;

    const start = parseISO(activity.data_inizio);
    const end = parseISO(activity.data_fine);
    
    let startIndex = -1;
    let endIndex = -1;

    if (zoomLevel === 'day') {
      startIndex = viewRange.timeline.findIndex(day => 
        format(day, 'yyyy-MM-dd') === format(start, 'yyyy-MM-dd')
      );
      endIndex = viewRange.timeline.findIndex(day => 
        format(day, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')
      );
    } else if (zoomLevel === 'week') {
      startIndex = viewRange.timeline.findIndex(week => 
        isWithinInterval(start, { start: week, end: endOfWeek(week, { weekStartsOn: 1 }) })
      );
      endIndex = viewRange.timeline.findIndex(week => 
        isWithinInterval(end, { start: week, end: endOfWeek(week, { weekStartsOn: 1 }) })
      );
    } else {
      startIndex = viewRange.timeline.findIndex(month => 
        format(month, 'yyyy-MM') === format(start, 'yyyy-MM')
      );
      endIndex = viewRange.timeline.findIndex(month => 
        format(month, 'yyyy-MM') === format(end, 'yyyy-MM')
      );
    }

    if (startIndex === -1 || endIndex === -1) return null;

    const unitWidth = ZOOM_LEVELS[zoomLevel].width;
    const left = startIndex * unitWidth + 4;
    const width = Math.max((endIndex - startIndex + 1) * unitWidth - 8, 24);

    return { left, width };
  };

  const handleActivityHover = (activity, event) => {
    setHoveredActivity(activity);
    setTooltipPosition({
      x: event.clientX + 10,
      y: event.clientY - 10
    });
  };

  const scrollToToday = () => {
    if (!ganttRef.current || viewRange.timeline.length === 0) return;
    
    const today = new Date();
    let todayIndex = -1;
    
    if (zoomLevel === 'day') {
      todayIndex = viewRange.timeline.findIndex(day => isToday(day));
    } else if (zoomLevel === 'week') {
      todayIndex = viewRange.timeline.findIndex(week => 
        isWithinInterval(today, { start: week, end: endOfWeek(week, { weekStartsOn: 1 }) })
      );
    }
    
    if (todayIndex > -1) {
      const scrollPosition = todayIndex * ZOOM_LEVELS[zoomLevel].width - (ganttRef.current.offsetWidth / 2);
      ganttRef.current.scrollTo({ left: Math.max(0, scrollPosition), behavior: 'smooth' });
    }
  };

  const scrollToStart = () => {
    if (ganttRef.current) {
      ganttRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };

  const renderTimelineHeader = () => {
    if (zoomLevel === 'day') {
      const weeks = {};
      viewRange.timeline.forEach((day, index) => {
        const weekStart = startOfWeek(day, { weekStartsOn: 1 });
        const weekKey = format(weekStart, 'yyyy-ww');
        if (!weeks[weekKey]) {
          weeks[weekKey] = { start: index, days: [], weekStart };
        }
        weeks[weekKey].days.push({ day, index });
      });

      return (
        <div className="border-b border-slate-200">
          {/* Week headers */}
          <div className="flex bg-slate-100 border-b" style={{ height: '32px' }}>
            {Object.values(weeks).map(({ weekStart, start, days }) => (
              <div
                key={format(weekStart, 'yyyy-ww')}
                className="flex items-center justify-center border-r border-slate-200 text-xs font-medium text-slate-600 bg-slate-50"
                style={{ 
                  width: `${days.length * ZOOM_LEVELS.day.width}px`,
                  minWidth: `${days.length * ZOOM_LEVELS.day.width}px`
                }}
              >
                {format(weekStart, 'dd MMM yyyy', { locale: it })}
              </div>
            ))}
          </div>
          
          {/* Day headers */}
          <div className="flex bg-white" style={{ height: '48px' }}>
            {viewRange.timeline.map((day, index) => (
              <div
                key={index}
                className={`flex flex-col items-center justify-center border-r border-slate-200 text-xs ${
                  isToday(day) 
                    ? 'bg-blue-50 text-blue-700 font-bold border-blue-200' 
                    : 'text-slate-600'
                }`}
                style={{ 
                  width: ZOOM_LEVELS.day.width,
                  minWidth: ZOOM_LEVELS.day.width
                }}
              >
                <div className="font-medium">{format(day, 'EEE', { locale: it })}</div>
                <div className="font-bold">{format(day, 'dd')}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="flex bg-white border-b" style={{ height: HEADER_HEIGHT }}>
        {viewRange.timeline.map((period, index) => (
          <div
            key={index}
            className="flex items-center justify-center border-r border-slate-200 text-sm font-medium text-slate-700"
            style={{ 
              width: ZOOM_LEVELS[zoomLevel].width,
              minWidth: ZOOM_LEVELS[zoomLevel].width
            }}
          >
            {zoomLevel === 'week' 
              ? format(period, 'dd MMM', { locale: it })
              : format(period, 'MMM yyyy', { locale: it })
            }
          </div>
        ))}
      </div>
    );
  };

  const renderActivityBar = (activity, index) => {
    const position = getActivityPosition(activity);
    if (!position) return null;

    const categoria = categoriaColors[activity.categoria] || categoriaColors.altro;
    const statoInfo = statoIcons[activity.stato] || statoIcons.pianificata;
    const Icon = statoInfo.icon;
    const completion = activity.percentuale_completamento || 0;

    return (
      <div
        key={activity.id || index}
        className="absolute group cursor-pointer transition-all duration-200 hover:z-10"
        style={{
          top: index * ACTIVITY_HEIGHT + 12,
          left: position.left,
          width: position.width,
          height: 32
        }}
        onClick={() => onEditAttivita(activity)}
        onMouseEnter={(e) => handleActivityHover(activity, e)}
        onMouseLeave={() => setHoveredActivity(null)}
        onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 10, y: e.clientY - 10 })}
      >
        <div 
          className="h-full rounded-lg shadow-sm border-2 group-hover:shadow-md transition-all duration-200 relative overflow-hidden"
          style={{ 
            backgroundColor: categoria.bg,
            borderColor: categoria.border
          }}
        >
          {/* Progress bar */}
          <div 
            className="absolute top-0 left-0 h-full rounded-md transition-all duration-300"
            style={{ 
              width: `${completion}%`,
              backgroundColor: categoria.border,
              opacity: 0.3
            }}
          />
          
          {/* Content */}
          <div className="flex items-center h-full px-3 relative z-10">
            <Icon 
              className="w-4 h-4 mr-2 flex-shrink-0" 
              style={{ color: statoInfo.color }} 
            />
            <span 
              className="text-xs font-medium truncate flex-1"
              style={{ color: categoria.text }}
            >
              {activity.descrizione}
            </span>
            {completion > 0 && (
              <span className="text-xs font-bold ml-2" style={{ color: categoria.text }}>
                {completion}%
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTodayLine = () => {
    if (zoomLevel !== 'day') return null;
    
    const todayIndex = viewRange.timeline.findIndex(day => isToday(day));
    if (todayIndex === -1) return null;

    const left = todayIndex * ZOOM_LEVELS.day.width + (ZOOM_LEVELS.day.width / 2);
    
    return (
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
        style={{ left }}
      >
        <div className="absolute -top-2 -left-2 w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-sm" />
      </div>
    );
  };

  if (!cantiere) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-12 text-center">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Nessun cantiere selezionato</h3>
          <p className="text-slate-600">Seleziona un cantiere per visualizzare il cronoprogramma</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Card className="border-0 shadow-lg flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          
          {/* CONTROLLI SPOSTATI SOPRA IL GANTT (come richiesto) */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 p-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              {/* Info cantiere */}
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {cantiere.oggetto_lavori || cantiere.denominazione}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-slate-600 mt-1">
                    <span>CIG: {cantiere.codice_cig}</span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {attivita.length} attività
                    </Badge>
                  </div>
                </div>
              </div>
              
              {/* Controlli navigazione */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Zoom Controls */}
                <div className="flex items-center gap-1 bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
                  {Object.entries(ZOOM_LEVELS).map(([level, config]) => (
                    <Button
                      key={level}
                      size="sm"
                      variant={zoomLevel === level ? "default" : "ghost"}
                      onClick={() => setZoomLevel(level)}
                      className="text-xs px-3 h-8"
                    >
                      {config.label}
                    </Button>
                  ))}
                </div>

                {/* Navigation Controls */}
                <div className="flex items-center gap-1 bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={scrollToStart} 
                    title="Inizio cantiere"
                    className="h-8"
                  >
                    <Home className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={scrollToToday} 
                    title="Vai a oggi"
                    className="h-8 bg-blue-600 hover:bg-blue-700 text-white px-3"
                  >
                    Oggi
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => ganttRef.current?.scrollBy({ left: -400, behavior: 'smooth' })} 
                    title="Indietro"
                    className="h-8"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => ganttRef.current?.scrollBy({ left: 400, behavior: 'smooth' })} 
                    title="Avanti"
                    className="h-8"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Add Activity Button */}
                <Button 
                  onClick={onAddAttivita} 
                  className="bg-blue-600 hover:bg-blue-700 shadow-md h-8"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Aggiungi Attività
                </Button>
              </div>
            </div>
          </div>

          {/* Headers */}
          <div className="flex bg-slate-50 border-b">
            <div className="w-80 border-r bg-white flex items-center justify-center font-semibold text-slate-700 text-sm" style={{ height: HEADER_HEIGHT }}>
              ATTIVITÀ
            </div>
            <div ref={headerRef} className="flex-1 overflow-x-hidden">
              <div style={{ width: `${viewRange.timeline.length * ZOOM_LEVELS[zoomLevel].width}px` }}>
                {renderTimelineHeader()}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Activity Names */}
            <div ref={activitiesRef} className="w-80 border-r bg-slate-50 overflow-y-auto">
              {attivita.map((activity, index) => {
                const categoria = categoriaColors[activity.categoria] || categoriaColors.altro;
                const statoInfo = statoIcons[activity.stato] || statoIcons.pianificata;
                const Icon = statoInfo.icon;
                
                return (
                  <div
                    key={activity.id || index}
                    className="border-b border-slate-200 p-4 hover:bg-white transition-colors cursor-pointer"
                    style={{ height: ACTIVITY_HEIGHT }}
                    onClick={() => onEditAttivita(activity)}
                  >
                    <div className="flex items-center gap-3 h-full">
                      <Icon className="w-5 h-5 flex-shrink-0" style={{ color: statoInfo.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 truncate text-sm">
                          {activity.descrizione}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant="secondary" 
                            className="text-xs"
                            style={{ 
                              backgroundColor: categoria.bg,
                              color: categoria.text,
                              borderColor: categoria.border
                            }}
                          >
                            {activity.categoria}
                          </Badge>
                          {activity.percentuale_completamento > 0 && (
                            <span className="text-xs text-slate-500">
                              {activity.percentuale_completamento}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Gantt Area */}
            <div ref={ganttRef} className="flex-1 overflow-auto relative">
              <div 
                className="relative bg-white"
                style={{ 
                  width: `${viewRange.timeline.length * ZOOM_LEVELS[zoomLevel].width}px`,
                  height: Math.max(attivita.length * ACTIVITY_HEIGHT, 200)
                }}
              >
                {/* Grid Lines */}
                {viewRange.timeline.map((_, index) => (
                  <div
                    key={index}
                    className="absolute top-0 bottom-0 w-px bg-slate-200"
                    style={{ left: index * ZOOM_LEVELS[zoomLevel].width }}
                  />
                ))}
                
                {/* Activity Bars */}
                {attivita.map((activity, index) => renderActivityBar(activity, index))}
                
                {/* Today Line */}
                {renderTodayLine()}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tooltip */}
      {hoveredActivity && (
        <div
          className="fixed z-50 bg-slate-900 text-white text-xs rounded-lg p-3 shadow-xl max-w-xs pointer-events-none"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="font-semibold mb-1">{hoveredActivity.descrizione}</div>
          <div className="space-y-1 text-slate-300">
            <div>Inizio: {hoveredActivity.data_inizio ? format(parseISO(hoveredActivity.data_inizio), 'dd/MM/yyyy') : 'N/D'}</div>
            <div>Fine: {hoveredActivity.data_fine ? format(parseISO(hoveredActivity.data_fine), 'dd/MM/yyyy') : 'N/D'}</div>
            <div>Stato: {hoveredActivity.stato}</div>
            <div>Progresso: {hoveredActivity.percentuale_completamento || 0}%</div>
            {hoveredActivity.responsabile && <div>Responsabile: {hoveredActivity.responsabile}</div>}
          </div>
        </div>
      )}
    </div>
  );
}