import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

const colorSchemes = {
  indigo: {
    gradient: 'from-indigo-500 to-purple-600',
    bg: 'bg-gradient-to-br from-indigo-500/10 to-purple-600/10',
    icon: 'bg-gradient-to-br from-indigo-500 to-purple-600',
    text: 'text-indigo-700',
    light: 'text-indigo-500'
  },
  cyan: {
    gradient: 'from-cyan-400 to-blue-500',
    bg: 'bg-gradient-to-br from-cyan-400/10 to-blue-500/10',
    icon: 'bg-gradient-to-br from-cyan-400 to-blue-500',
    text: 'text-cyan-700',
    light: 'text-cyan-500'
  },
  emerald: {
    gradient: 'from-emerald-400 to-green-600',
    bg: 'bg-gradient-to-br from-emerald-400/10 to-green-600/10',
    icon: 'bg-gradient-to-br from-emerald-400 to-green-600',
    text: 'text-emerald-700',
    light: 'text-emerald-500'
  },
  amber: {
    gradient: 'from-amber-400 to-orange-500',
    bg: 'bg-gradient-to-br from-amber-400/10 to-orange-500/10',
    icon: 'bg-gradient-to-br from-amber-400 to-orange-500',
    text: 'text-amber-700',
    light: 'text-amber-500'
  },
  rose: {
    gradient: 'from-rose-400 to-pink-600',
    bg: 'bg-gradient-to-br from-rose-400/10 to-pink-600/10',
    icon: 'bg-gradient-to-br from-rose-400 to-pink-600',
    text: 'text-rose-700',
    light: 'text-rose-500'
  }
};

const KPICard = React.memo(({ 
  title, 
  value, 
  subtitle, 
  icon: Icon,
  trend,
  colorScheme = 'indigo'
}) => {
  const colors = colorSchemes[colorScheme];

  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm rounded-3xl overflow-hidden group">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
            <h3 className={`text-3xl font-bold ${colors.text} tracking-tight`}>
              {value}
            </h3>
          </div>
          <div className={`w-14 h-14 rounded-2xl ${colors.icon} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">{subtitle}</p>
          
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-semibold ${
              trend.direction === 'up' ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {trend.direction === 'up' ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{trend.value}%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

KPICard.displayName = 'KPICard';

export default KPICard;