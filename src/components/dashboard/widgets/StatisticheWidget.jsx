import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function StatisticheWidget({ dashboardData }) {
  const { statistiche } = dashboardData || {};

  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"></div>
      
      <CardHeader className="pb-4 pt-6">
        <CardTitle className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg">Statistiche Mensili</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <p className="text-sm text-blue-600 font-medium mb-1">Cantieri Aperti</p>
            <p className="text-2xl font-bold text-blue-900">{statistiche?.nuoviCantieri || 0}</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
            <p className="text-sm text-emerald-600 font-medium mb-1">Cantieri Completati</p>
            <p className="text-2xl font-bold text-emerald-900">{statistiche?.cantieriCompletati || 0}</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200">
            <p className="text-sm text-purple-600 font-medium mb-1">SAL Emessi</p>
            <p className="text-2xl font-bold text-purple-900">{statistiche?.salEmessi || 0}</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200">
            <p className="text-sm text-amber-600 font-medium mb-1">Documenti Caricati</p>
            <p className="text-2xl font-bold text-amber-900">{statistiche?.documentiCaricati || 0}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}