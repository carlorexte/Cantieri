import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

const colorSchemes = {
  indigo: {
    bg: "bg-gradient-to-br from-indigo-500 to-indigo-600",
    light: "bg-indigo-50",
    text: "text-indigo-600",
    ring: "ring-indigo-100"
  },
  emerald: {
    bg: "bg-gradient-to-br from-emerald-500 to-emerald-600",
    light: "bg-emerald-50",
    text: "text-emerald-600",
    ring: "ring-emerald-100"
  },
  cyan: {
    bg: "bg-gradient-to-br from-cyan-500 to-cyan-600",
    light: "bg-cyan-50",
    text: "text-cyan-600",
    ring: "ring-cyan-100"
  },
  amber: {
    bg: "bg-gradient-to-br from-amber-500 to-amber-600",
    light: "bg-amber-50",
    text: "text-amber-600",
    ring: "ring-amber-100"
  },
  rose: {
    bg: "bg-gradient-to-br from-rose-500 to-rose-600",
    light: "bg-rose-50",
    text: "text-rose-600",
    ring: "ring-rose-100"
  },
  purple: {
    bg: "bg-gradient-to-br from-purple-500 to-purple-600",
    light: "bg-purple-50",
    text: "text-purple-600",
    ring: "ring-purple-100"
  },
  blue: {
    bg: "bg-gradient-to-br from-blue-500 to-blue-600",
    light: "bg-blue-50",
    text: "text-blue-600",
    ring: "ring-blue-100"
  }
};

const KPICard = React.memo(({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  colorScheme = "indigo",
  trend,
  trendValue 
}) => {
  const colors = colorSchemes[colorScheme] || colorSchemes.indigo;
  
  return (
    <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white group">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white opacity-60"></div>
      
      <CardContent className="relative p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-500 mb-2">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className={`text-3xl font-bold ${colors.text} tracking-tight`}>
                {value}
              </p>
              {trend && (
                <div className={`flex items-center gap-1 text-xs font-semibold ${
                  trend === 'up' ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {trend === 'up' ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>{trendValue}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2">{subtitle}</p>
          </div>
          
          <div className={`relative w-14 h-14 rounded-2xl ${colors.bg} shadow-lg flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-7 h-7 text-white" strokeWidth={2} />
            <div className={`absolute inset-0 rounded-2xl ring-4 ${colors.ring} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

KPICard.displayName = 'KPICard';

export default KPICard;