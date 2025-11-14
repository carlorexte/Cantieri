import React from 'react';
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

const KPICard = React.memo(({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendDirection, 
  colorScheme = "indigo" 
}) => {
  const colorSchemes = {
    indigo: {
      iconBg: "bg-indigo-50",
      iconColor: "text-indigo-600",
      valueColor: "text-slate-900",
    },
    cyan: {
      iconBg: "bg-cyan-50",
      iconColor: "text-cyan-600",
      valueColor: "text-slate-900",
    },
    emerald: {
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      valueColor: "text-slate-900",
    },
    amber: {
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      valueColor: "text-slate-900",
    },
    rose: {
      iconBg: "bg-rose-50",
      iconColor: "text-rose-600",
      valueColor: "text-slate-900",
    }
  };

  const currentScheme = colorSchemes[colorScheme] || colorSchemes.indigo;

  return (
    <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-white">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
            <div className="flex items-baseline gap-2">
              <div className={`text-3xl font-bold ${currentScheme.valueColor}`}>
                {value}
              </div>
              {trend && (
                <div className={`flex items-center text-sm font-medium ${
                  trendDirection === 'up' ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {trendDirection === 'up' ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 mr-1" />
                  )}
                  {trend}
                </div>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-slate-600 mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`${currentScheme.iconBg} p-3 rounded-xl`}>
            <Icon className={`w-6 h-6 ${currentScheme.iconColor}`} />
          </div>
        </div>
      </div>
    </Card>
  );
});

KPICard.displayName = 'KPICard';

export default KPICard;