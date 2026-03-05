import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight as ChevronRightIcon, Plus, Layers } from "lucide-react";
import { format, addDays, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isWithinInterval, parseISO, isValid, differenceInDays, addMonths, startOfMonth, endOfMonth, getWeek } from "date-fns";
import { it } from "date-fns/locale";

// Costanti di stile
const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 60;
const SIDEBAR_WIDTH = 500; // Larghezza pannello sinistro

export default function PrimusGantt({ attivita, sals, cantiere, onAddAttivita, onEditAttivita }) {
  const [timeRange, setTimeRange] = useState({ start: new Date(), end: new Date() });
  const [expandedGroups, setExpandedGroups] = useState({});
  const [viewMode, setViewMode] = useState('day'); // 'day', 'week', 'month'
  const scrollContainerRef = useRef(null);
  const sidebarRef = useRef(null);
  const [hoveredRow, setHoveredRow] = useState(null);

  const config = useMemo(() => {
    switch(viewMode) {
      case 'week': return { colWidth: 40, daysPerCol: 7 };
      case 'month': return { colWidth: 60, daysPerCol: 30.44 };
      case 'day': default: return { colWidth: 40, daysPerCol: 1 };
    }
  }, [viewMode]);

  const isGroupExpanded = (nodeId, level) => {
    if (expandedGroups[nodeId] !== undefined) return expandedGroups[nodeId];
    return level < 2;
  };

  // Elaborazione dati gerarchici (WBS)
  const processedData = useMemo(() => {
    if (!attivita) return [];

    // 1. Costruisci mappa e albero
    const map = {};
    const roots = [];
    
    // Clona e inizializza
    const nodes = attivita.map(a => ({ 
      ...a, 
      children: [], 
      level: 0,
      wbs: '',
      _startDate: a.data_inizio ? parseISO(a.data_inizio) : null,
      _endDate: a.data_fine ? parseISO(a.data_fine) : null,
      _duration: a.durata_giorni || 0,
      _amount: a.importo_previsto || 0,
    }));

    nodes.forEach(node => { map[node.id] = node; });

    // Collega padri-figli
    nodes.forEach(node => {
      if (node.parent_id && map[node.parent_id]) {
        map[node.parent_id].children.push(node);
      } else {
        roots.push(node); // È una radice (o orfano)
      }
    });

    // 2. Funzione ricorsiva per appiattire la lista (ordine visualizzazione) e calcolare WBS
    const flatList = [];
    
    const traverse = (node, level, prefix) => {
      node.level = level;
      node.wbs = prefix;
      
      flatList.push(node);

      if (isGroupExpanded(node.id, level)) {
        node.children.sort((a, b) => (a._startDate || 0) - (b._startDate || 0)); // Ordina per data
        node.children.forEach((child, index) => {
           traverse(child, level + 1, `${prefix}.${index + 1}`);
        });
      }
    };

    // Ordina radici per data
    roots.sort((a, b) => (a._startDate || 0) - (b._startDate || 0));
    roots.forEach((root, index) => traverse(root, 0, `${index + 1}`));

    // 3. Calcolo Post-Order per aggregare date e importi sui padri
    // Ripercorriamo la lista al contrario per propagare dai figli ai padri
    // O meglio, usiamo la mappa originale e una funzione ricorsiva di calcolo
    const calculateTotals = (node) => {
      if (!node.children || node.children.length === 0) return {
        start: node._startDate,
        end: node._endDate,
        amount: node._amount || 0
      };

      let minS = null;
      let maxE = null;
      let totA = 0;

      node.children.forEach(child => {
        const res = calculateTotals(child);
        if (res.start && (!minS || res.start < minS)) minS = res.start;
        if (res.end && (!maxE || res.end > maxE)) maxE = res.end;
        totA += res.amount;
      });

      // Se è raggruppamento, sovrascrivi
      if (node.tipo_attivita === 'raggruppamento') {
        node._startDate = minS;
        node._endDate = maxE;
        node._amount = totA;
        // Ricalcola durata
        if (minS && maxE) {
          node._duration = differenceInDays(maxE, minS) + 1;
        }
      }
      
      return { start: node._startDate, end: node._endDate, amount: node._amount };
    };

    roots.forEach(root => calculateTotals(root));

    return flatList;
  }, [attivita, expandedGroups]);

  // Calcolo range temporale totale
  useEffect(() => {
    if (!processedData.length) return;
    
    const dates = processedData
      .map(n => [n._startDate, n._endDate])
      .flat()
      .filter(d => d && isValid(d));

    if (dates.length > 0) {
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));
      
      // Buffer di 15 giorni
      setTimeRange({
        start: addDays(minDate, -15),
        end: addDays(maxDate, 15)
      });
    }
  }, [attivita]); // Dipende da attivita raw, non processed che cambia con expand

  // Generazione colonne temporali
  const timeColumns = useMemo(() => {
    if (!timeRange.start || !timeRange.end) return [];
    
    if (viewMode === 'day') {
       return eachDayOfInterval({ start: timeRange.start, end: timeRange.end });
    } else if (viewMode === 'week') {
       return eachWeekOfInterval({ start: timeRange.start, end: timeRange.end }, { weekStartsOn: 1 });
    } else if (viewMode === 'month') {
       return eachMonthOfInterval({ start: timeRange.start, end: timeRange.end });
    }
    return [];
  }, [timeRange, viewMode]);

  // Scroll Sync
  const handleScroll = (e) => {
    if (sidebarRef.current) {
      sidebarRef.current.scrollTop = e.target.scrollTop;
    }
  };

  const toggleGroup = (id) => {
    setExpandedGroups(prev => {
      const current = prev[id];
      return {
        ...prev,
        [id]: current === undefined ? false : !current
      };
    });
  };

  // Funzione per calcolare posizione barra
  const getBarPosition = (start, end) => {
    if (!start || !end || !timeRange.start) return null;
    
    const offsetDays = differenceInDays(start, timeRange.start);
    const durationDays = differenceInDays(end, start) + 1;
    
    const pxPerDay = config.colWidth / config.daysPerCol;
    
    return {
      left: offsetDays * pxPerDay,
      width: durationDays * pxPerDay
    };
  };

  // Cash Flow Mensile
  const cashFlow = useMemo(() => {
      // Raggruppa per mese
      const months = {};
      // Inizializza mesi nel range
      let curr = startOfMonth(timeRange.start);
      const end = endOfMonth(timeRange.end);
      
      while (curr <= end) {
          months[format(curr, 'yyyy-MM')] = 0;
          curr = addMonths(curr, 1);
      }

      processedData.forEach(item => {
          if (item.tipo_attivita === 'task' && item._amount > 0 && item._startDate && item._endDate) {
              // Distribuzione lineare (semplificata) dell'importo sui giorni
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

  // SAL Markers
  const salMarkers = useMemo(() => {
    if (!sals) return [];
    return sals.map(sal => ({
      id: sal.id,
      date: parseISO(sal.data_sal),
      amount: sal.imponibile || 0,
      description: sal.descrizione || `SAL ${sal.numero_sal || ''}`,
      type: sal.tipo_sal_dettaglio
    })).filter(s => isValid(s.date) && isWithinInterval(s.date, {start: timeRange.start, end: timeRange.end}));
  }, [sals, timeRange]);

  useEffect(() => {
    const handleScrollToday = () => {
      if (!scrollContainerRef.current || !timeRange.start || !timeRange.end) return;
      const today = new Date();
      if (!isWithinInterval(today, { start: timeRange.start, end: timeRange.end })) return;

      const pxPerDay = config.colWidth / config.daysPerCol;
      const offset = differenceInDays(today, timeRange.start) * pxPerDay + (pxPerDay / 2);
      const containerWidth = scrollContainerRef.current.clientWidth;
      const target = Math.max(0, offset - (containerWidth / 2));
      scrollContainerRef.current.scrollLeft = target;
    };

    window.addEventListener('gantt-scroll-today', handleScrollToday);
    return () => window.removeEventListener('gantt-scroll-today', handleScrollToday);
  }, [timeRange, config]);


  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden select-none">
      {/* Toolbar */}
      <div className="h-14 border-b border-slate-200 flex items-center justify-between px-4 bg-slate-50">
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
                    onClick={() => setViewMode('day')}
                >
                    Giornaliero
                </Button>
                <Button 
                    variant={viewMode === 'week' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    className={`h-7 text-xs px-2 ${viewMode === 'week' ? 'bg-slate-100 font-medium' : 'text-slate-600'}`} 
                    onClick={() => setViewMode('week')}
                >
                    Settimanale
                </Button>
                <Button 
                    variant={viewMode === 'month' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    className={`h-7 text-xs px-2 ${viewMode === 'month' ? 'bg-slate-100 font-medium' : 'text-slate-600'}`} 
                    onClick={() => setViewMode('month')}
                >
                    Mensile
                </Button>
            </div>
        </div>
        
        {/* Totali Cantiere */}
        <div className="flex items-center gap-4 bg-indigo-50 px-3 py-1 rounded-md border border-indigo-100 mr-4">
             <div className="text-xs text-indigo-800">
                <span className="font-semibold">Totale Lavori:</span> € {processedData.reduce((acc, item) => item.level === 0 ? acc + (item._amount || 0) : acc, 0).toLocaleString('it-IT', {maximumFractionDigits: 0})}
             </div>
        </div>
        <div className="flex items-center gap-2">
            <Button size="sm" onClick={onAddAttivita} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Aggiungi Voce
            </Button>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Left Sidebar (Grid/Tree) */}
        <div 
            ref={sidebarRef}
            className="flex-shrink-0 border-r border-slate-200 overflow-hidden bg-white z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)]"
            style={{ width: SIDEBAR_WIDTH }}
        >
            {/* Sidebar Header */}
            <div className="flex border-b border-slate-200 bg-slate-100 font-semibold text-xs text-slate-600 uppercase tracking-wider" style={{ height: HEADER_HEIGHT }}>
                <div className="w-16 p-3 border-r border-slate-200 flex items-center justify-center">WBS</div>
                <div className="flex-1 p-3 border-r border-slate-200 flex items-center">Descrizione Lavori</div>
                <div className="w-24 p-3 border-r border-slate-200 flex items-center justify-end">Importo</div>
                <div className="w-16 p-3 flex items-center justify-center">GG</div>
            </div>

            {/* Sidebar Rows */}
            <div>
                {processedData.map((item, index) => (
                    <div 
                        key={item.id} 
                        className={`flex border-b border-slate-100 text-sm hover:bg-indigo-50 transition-colors cursor-pointer ${hoveredRow === item.id ? 'bg-indigo-50' : ''}`}
                        style={{ height: ROW_HEIGHT }}
                        onMouseEnter={() => setHoveredRow(item.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                        onClick={() => onEditAttivita(item)}
                    >
                        <div className="w-16 p-2 border-r border-slate-200 flex items-center justify-center font-mono text-slate-500 text-xs truncate">
                            {item.wbs}
                        </div>
                        <div className="flex-1 p-2 border-r border-slate-200 flex items-center overflow-hidden">
                            <div style={{ paddingLeft: `${item.level * 16}px` }} className="flex items-center gap-1 truncate w-full">
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
                            </div>
                        </div>
                        <div className="w-24 p-2 border-r border-slate-200 flex items-center justify-end font-mono text-xs">
                           {item._amount > 0 ? `€ ${item._amount.toLocaleString('it-IT', {maximumFractionDigits: 0})}` : '-'}
                        </div>
                        <div className="w-16 p-2 flex items-center justify-center text-xs text-slate-500">
                            {item._duration}
                        </div>
                    </div>
                ))}
                
                {/* Filler per Cash Flow Row alignment */}
                <div className="border-t-2 border-slate-300 bg-slate-50 p-3 text-right font-bold text-xs flex items-center justify-end" style={{ height: 100 }}>
                    TOTALE MENSILE
                </div>
            </div>
        </div>

        {/* Right Content (Gantt Chart) */}
        <div 
            className="flex-1 overflow-auto bg-white" 
            ref={scrollContainerRef}
            data-gantt-grid
            onScroll={handleScroll}
        >
            <div style={{ width: timeColumns.length * config.colWidth }}>
                {/* Timeline Header */}
                <div className="sticky top-0 z-10 bg-white" style={{ height: HEADER_HEIGHT }}>
                    {/* First Header Row (Month or Year) */}
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
                    {/* Second Header Row (Days, Weeks, or Months) */}
                    <div className="flex h-7 border-b border-slate-200">
                        {timeColumns.map((colDate, i) => {
                             let label = '';
                             if (viewMode === 'day') label = format(colDate, 'dd');
                             else if (viewMode === 'week') label = `Set ${getWeek(colDate)}`;
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
                            if (isWithinInterval(today, {start: timeRange.start, end: timeRange.end})) {
                                const pxPerDay = config.colWidth / config.daysPerCol;
                                const offset = differenceInDays(today, timeRange.start) * pxPerDay + (pxPerDay/2);
                                return (
                                    <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10" style={{ left: offset }}>
                                        <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full" />
                                    </div>
                                );
                            }
                        })()}
                    </div>

                    {/* Activity Rows */}
                    {processedData.map((item) => {
                        const pos = getBarPosition(item._startDate, item._endDate);
                        
                        return (
                            <div 
                                key={item.id} 
                                className={`relative border-b border-slate-100 hover:bg-indigo-50/30 transition-colors ${hoveredRow === item.id ? 'bg-indigo-50/50' : ''}`}
                                style={{ height: ROW_HEIGHT }}
                                onMouseEnter={() => setHoveredRow(item.id)}
                                onMouseLeave={() => setHoveredRow(null)}
                            >
                                {pos && (
                                    item.tipo_attivita === 'raggruppamento' ? (
                                        // Barra Raggruppamento (stile parentesi graffa nera o barra spezzata)
                                        <div 
                                            className="absolute h-3 top-3 bg-slate-800 opacity-80"
                                            style={{ left: pos.left, width: pos.width }}
                                        >
                                            <div className="absolute -left-1 top-3 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-800"></div>
                                            <div className="absolute -right-1 top-3 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-800"></div>
                                        </div>
                                    ) : (
                                        // Barra Attività Normale
                                        <div 
                                            className="absolute h-5 top-2 rounded shadow-sm border border-black/10 cursor-pointer hover:shadow-md transition-all group"
                                            style={{ 
                                                left: pos.left, 
                                                width: pos.width,
                                                backgroundColor: item.colore || '#3b82f6'
                                            }}
                                            onClick={() => onEditAttivita(item)}
                                        >
                                            {/* Progress Bar */}
                                            <div 
                                                className="h-full bg-black/20" 
                                                style={{ width: `${item.percentuale_completamento}%` }}
                                            />
                                            {/* Label on bar if wide enough */}
                                            {pos.width > 100 && (
                                                <span className="absolute left-2 top-0.5 text-[10px] text-white font-medium truncate w-full pr-2 drop-shadow-md">
                                                    {item.descrizione}
                                                </span>
                                            )}
                                        </div>
                                    )
                                )}
                            </div>
                        );
                    })}

                    {/* SAL Markers & Cash Flow Row */}
                    <div className="border-t-2 border-slate-300 bg-slate-50 relative" style={{ height: 120 }}>
                        {/* Background Grid for this row too */}
                        <div className="absolute inset-0 flex pointer-events-none">
                            {timeColumns.map((day, i) => (
                                <div key={i} className="border-r border-slate-100 h-full" style={{ width: config.colWidth }} />
                            ))}
                        </div>

                        {/* SAL Markers */}
                        {salMarkers.map(sal => {
                            const pxPerDay = config.colWidth / config.daysPerCol;
                            const offset = differenceInDays(sal.date, timeRange.start) * pxPerDay + (pxPerDay/2);
                            return (
                                <div 
                                    key={sal.id}
                                    className="absolute top-0 bottom-0 z-10 flex flex-col items-center group"
                                    style={{ left: offset }}
                                >
                                    <div className="h-full w-0.5 bg-red-400 border-l border-dashed border-red-400"></div>
                                    <div className="absolute top-2 bg-red-100 border border-red-300 text-red-800 text-[10px] px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap z-20 hover:scale-110 transition-transform cursor-pointer">
                                        <div className="font-bold">SAL {sal.date.getDate()}/{sal.date.getMonth()+1}</div>
                                        <div>€ {(sal.amount/1000).toFixed(1)}k</div>
                                    </div>
                                    <div className="absolute bottom-0 w-3 h-3 bg-red-500 rotate-45 translate-y-1.5"></div>
                                </div>
                            );
                        })}

                        {/* Planned Cash Flow Bars */}
                        {Object.entries(cashFlow).map(([monthStr, amount]) => {
                             const monthDate = parseISO(monthStr + '-01');
                             if (amount <= 0 || !isValid(monthDate)) return null;
                             
                             if (!isWithinInterval(monthDate, {start: startOfMonth(timeRange.start), end: endOfMonth(timeRange.end)})) return null;

                             const startPos = getBarPosition(monthDate, endOfMonth(monthDate));
                             if (!startPos) return null;

                             return (
                                 <div 
                                    key={monthStr}
                                    className="absolute bottom-0 border-l border-slate-200 flex flex-col justify-end pb-0 px-1 pointer-events-none"
                                    style={{ left: startPos.left, width: startPos.width, height: '60%' }}
                                 >
                                     <div className="text-center w-full h-full flex flex-col justify-end">
                                         <div className="text-[9px] text-slate-400 font-bold mb-0.5 uppercase tracking-tighter">Budget</div>
                                         <div className="flex-1 bg-indigo-100 w-full mx-auto rounded-t flex items-end justify-center border-b-2 border-indigo-400 opacity-80">
                                            <div className="text-[10px] font-bold text-indigo-700 mb-1">
                                                € {(amount/1000).toFixed(0)}k
                                            </div>
                                         </div>
                                     </div>
                                 </div>
                             );
                        })}
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
