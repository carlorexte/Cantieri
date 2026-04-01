import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

const colorSchemes = {
  orange: {
    bg: "bg-gradient-to-br from-orange-500 to-orange-600",
    light: "bg-orange-50",
    text: "text-[#FF902C]",
    ring: "ring-orange-100"
  },
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
    <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-200 bg-white rounded-2xl">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <div className={`w-11 h-11 rounded-xl ${colors.light} flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${colors.text}`} strokeWidth={2.5} />
          </div>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <p className="text-3xl font-bold text-slate-900">
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
        <div className="flex items-center gap-2">
          <div className={`h-1 w-12 rounded-full ${colors.bg}`}></div>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
});

KPICard.displayName = 'KPICard';

export default KPICard;