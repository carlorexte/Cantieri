import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, FileText, Calendar, CheckCircle } from "lucide-react";

const alertIcons = {
  scadenza: FileText,
  task_scadenza: Calendar,
};

const alertCardClasses = {
  critico: "bg-gradient-to-br from-red-50 to-rose-50 border-red-200",
  medio: "bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200",
  basso: "bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200"
};

const alertDotClasses = {
  critico: "bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-200",
  medio: "bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-200",
  basso: "bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-200"
};

export default function AlertCard({ alerts }) {
  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
      
      <CardHeader className="pb-4 pt-6">
        <CardTitle className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg">Allarmi e Notifiche</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts && alerts.length > 0 ? (
          <div className="space-y-3">
            {alerts.map((alert, idx) => {
              const Icon = alertIcons[alert.tipo] || AlertTriangle;
              return (
                <div 
                  key={idx} 
                  className={`p-4 rounded-xl border transition-all duration-300 hover:scale-[1.02] cursor-pointer ${alertCardClasses[alert.priorita] || alertCardClasses.medio}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${alertDotClasses[alert.priorita] || alertDotClasses.medio}`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm leading-snug mb-1">
                        {alert.messaggio}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Icon className="w-3 h-3 text-slate-500" />
                        <p className="text-xs text-slate-600 truncate">
                          {alert.cantiere}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-slate-600 font-medium">Nessun allarme attivo</p>
            <p className="text-slate-500 text-sm mt-1">Tutto procede regolarmente</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}