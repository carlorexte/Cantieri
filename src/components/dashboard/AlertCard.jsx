import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, FileText, Calendar, CheckCircle, ExternalLink } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "react-router-dom";

const alertIcons = {
  scadenza: FileText,
  task_scadenza: Calendar,
};

const alertCardClasses = {
  critico: "bg-red-50 border-red-200",
  medio: "bg-amber-50 border-amber-200",
  basso: "bg-blue-50 border-blue-200"
};

const alertDotClasses = {
  critico: "bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-200",
  medio: "bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-200",
  basso: "bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-200"
};

export default function AlertCard({ alerts }) {
  return (
    <Card className="border-0 shadow-md bg-white rounded-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-bold text-slate-900">Allarmi e Notifiche</CardTitle>
      </CardHeader>
      <CardContent>
        {alerts && alerts.length > 0 ? (
          <div className="space-y-3">
            {alerts.map((alert, idx) => {
              const Icon = alertIcons[alert.tipo] || AlertTriangle;
              
              const alertContent = (
                <div 
                  className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-sm cursor-pointer group relative ${alertCardClasses[alert.priorita] || alertCardClasses.medio}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${alertDotClasses[alert.priorita] || alertDotClasses.medio}`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm leading-snug mb-1">
                        {alert.messaggio}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Icon className="w-3.5 h-3.5 text-slate-400" />
                        <p className="text-xs text-slate-500 truncate">
                          {alert.cantiere}
                        </p>
                      </div>
                    </div>
                    {alert.link && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 top-4">
                            <ExternalLink className="w-4 h-4 text-slate-400" />
                        </div>
                    )}
                  </div>
                </div>
              );

              return (
                <TooltipProvider key={idx}>
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <div>
                        {alert.link ? (
                            <Link to={alert.link}>{alertContent}</Link>
                        ) : (
                            alertContent
                        )}
                      </div>
                    </TooltipTrigger>
                    {alert.details && (
                        <TooltipContent side="right" className="max-w-xs bg-slate-900 text-white border-slate-800">
                          <p className="whitespace-pre-line text-xs font-medium">{alert.details}</p>
                        </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
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