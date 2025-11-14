import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, AlertCircle, ListTodo } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const prioritaColors = {
  bassa: "bg-blue-100 text-blue-700 border-blue-200",
  media: "bg-amber-100 text-amber-700 border-amber-200",
  alta: "bg-orange-100 text-orange-700 border-orange-200",
  critica: "bg-red-100 text-red-700 border-red-200"
};

const statoConfig = {
  da_fare: { 
    label: "Da fare", 
    icon: Clock, 
    color: "text-slate-600",
    bgColor: "bg-slate-100"
  },
  in_corso: { 
    label: "In corso", 
    icon: Clock, 
    color: "text-blue-600",
    bgColor: "bg-blue-100"
  },
  completato: { 
    label: "Completato", 
    icon: CheckCircle2, 
    color: "text-emerald-600",
    bgColor: "bg-emerald-100"
  },
  bloccato: { 
    label: "Bloccato", 
    icon: AlertCircle, 
    color: "text-red-600",
    bgColor: "bg-red-100"
  },
  in_revisione: { 
    label: "In revisione", 
    icon: Clock, 
    color: "text-purple-600",
    bgColor: "bg-purple-100"
  }
};

export default function TaskPersonali({ tasks, cantieri, isLoading }) {
  const getCantiereNome = (cantiereId) => {
    if (!cantiereId) return "Generale";
    const cantiere = cantieri.find(c => c.id === cantiereId);
    return cantiere?.denominazione || "N/D";
  };

  const isScaduto = (task) => {
    if (!task.data_scadenza || task.stato === 'completato') return false;
    return new Date(task.data_scadenza) < new Date();
  };

  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500"></div>
      
      <CardHeader className="pb-4 pt-6">
        <CardTitle className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-200">
            <ListTodo className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg">Le Mie Attività</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-6 bg-slate-200 rounded-lg w-2/3 mb-3"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-slate-600 font-medium">Nessuna attività assegnata</p>
            <p className="text-slate-500 text-sm mt-1">Le tue attività appariranno qui</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.slice(0, 5).map((task) => {
              const stato = statoConfig[task.stato] || statoConfig.da_fare;
              const StatoIcon = stato.icon;
              const scaduto = isScaduto(task);
              
              return (
                <div 
                  key={task.id} 
                  className="p-4 rounded-xl border border-slate-200 hover:border-purple-200 transition-all duration-300 hover:shadow-md bg-gradient-to-br from-white to-slate-50 group cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-slate-900 group-hover:text-purple-600 transition-colors line-clamp-2 flex-1">
                      {task.descrizione}
                    </h4>
                    <Badge variant="secondary" className={`${prioritaColors[task.priorita]} border ml-2 text-xs`}>
                      {task.priorita}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-3 flex-wrap text-xs text-slate-600 mb-2">
                    <span className={`flex items-center gap-1.5 px-2 py-1 rounded-lg font-medium ${stato.bgColor} ${stato.color}`}>
                      <StatoIcon className="w-3 h-3" />
                      {stato.label}
                    </span>
                    
                    {task.data_scadenza && (
                      <span className={`flex items-center gap-1.5 ${scaduto ? 'text-red-600 font-semibold' : ''}`}>
                        <Clock className="w-3 h-3" />
                        {new Date(task.data_scadenza).toLocaleDateString('it-IT')}
                        {scaduto && ' (Scaduto)'}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-slate-500">
                    {getCantiereNome(task.cantiere_id)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}