
import React from 'react';
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, FileX, DollarSign } from "lucide-react";

const alertIcons = {
  scadenza: Clock,
  budget: DollarSign,  
  documento: FileX,
  generale: AlertTriangle
};

const alertColors = {
  critico: "border-rose-200 bg-rose-50",
  medio: "border-amber-200 bg-amber-50",
  basso: "border-blue-200 bg-blue-50"
};

const alertDotColors = {
  critico: "bg-rose-500",
  medio: "bg-amber-500",
  basso: "bg-blue-500"
};

const AlertCard = React.memo(({ alerts }) => {
  if (!alerts || alerts.length === 0) {
    return (
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-3">
          <h3 className="text-lg font-semibold text-slate-900">Allarmi e Notifiche</h3>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-slate-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nessun allarme attivo</p>
            <p className="text-sm mt-1">Tutto procede regolarmente</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardHeader className="pb-3">
        <h3 className="text-lg font-semibold text-slate-900">Allarmi e Notifiche</h3>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert, index) => {
          // const Icon = alertIcons[alert.tipo] || AlertTriangle; // Icon is removed in the new design
          return (
            <div 
              key={index} 
              className={`flex items-start gap-3 p-4 rounded-lg border ${alertColors[alert.priorita] || alertColors.medio} transition-all hover:shadow-sm`}
            >
              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${alertDotColors[alert.priorita] || alertDotColors.medio}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 mb-1">{alert.messaggio}</p>
                <p className="text-xs text-slate-600">{alert.cantiere}</p>
              </div>
              {/* Badge is removed in the new design
              <Badge 
                variant="secondary"
                className={alertColors[alert.priorita] || alertColors.medio}
              >
                {alert.priorita}
              </Badge>
              */}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
});

AlertCard.displayName = 'AlertCard';

export default AlertCard;
