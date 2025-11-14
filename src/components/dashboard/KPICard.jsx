import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

const colorSchemes = {
  indigo: {
    icon: 'bg-[#6c5ce7]',
    text: 'text-slate-700',
  },
  cyan: {
    icon: 'bg-[#00cec9]',
    text: 'text-slate-700',
  },
  emerald: {
    icon: 'bg-[#00b894]',
    text: 'text-slate-700',
  },
  amber: {
    icon: 'bg-[#fdcb6e]',
    text: 'text-slate-700',
  },
  rose: {
    icon: 'bg-[#fd79a8]',
    text: 'text-slate-700',
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
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
            <h3 className={`text-3xl font-bold ${colors.text}`}>
              {value}
            </h3>
          </div>
          <div className={`w-12 h-12 rounded-xl ${colors.icon} flex items-center justify-center shadow-sm`}>
            <Icon className="w-6 h-6 text-white" />
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