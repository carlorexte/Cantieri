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
    <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 bg-white group">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50/80 via-white to-slate-50/40"></div>
      <div className={`absolute top-0 left-0 right-0 h-1 ${colors.bg}`}></div>
      
      <CardContent className="relative p-7">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">{title}</p>
            <div className="flex items-baseline gap-3 mb-3">
              <p className={`text-4xl font-black ${colors.text} tracking-tight`}>
                {value}
              </p>
              {trend && (
                <div className={`flex items-center gap-1 text-sm font-bold ${
                  trend === 'up' ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {trend === 'up' ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>{trendValue}</span>
                </div>
              )}
            </div>
            <p className="text-xs font-medium text-slate-600">{subtitle}</p>
          </div>
          
          <div className={`relative w-16 h-16 rounded-2xl ${colors.bg} shadow-2xl flex items-center justify-center transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
            <Icon className="w-8 h-8 text-white" strokeWidth={2.5} />
            <div className={`absolute inset-0 rounded-2xl ring-8 ${colors.ring} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

KPICard.displayName = 'KPICard';

export default KPICard;