import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

const colorSchemes = {
  orange: {
    bg: "from-[#FF8C42] to-[#FF6B6B]",
    light: "bg-[#FF8C42]/10",
    text: "text-[#FF8C42]",
    border: "#FF8C42"
  },
  emerald: {
    bg: "from-[#2ECC71] to-[#27AE60]",
    light: "bg-[#2ECC71]/10",
    text: "text-[#2ECC71]",
    border: "#2ECC71"
  },
  cyan: {
    bg: "from-[#4ECDC4] to-[#3ABDB3]",
    light: "bg-[#4ECDC4]/10",
    text: "text-[#4ECDC4]",
    border: "#4ECDC4"
  },
  amber: {
    bg: "from-[#FF6B6B] to-[#EE5A5A]",
    light: "bg-[#FF6B6B]/10",
    text: "text-[#FF6B6B]",
    border: "#FF6B6B"
  },
  indigo: {
    bg: "from-indigo-500 to-indigo-600",
    light: "bg-indigo-50",
    text: "text-indigo-600",
    border: "#6366f1"
  },
  rose: {
    bg: "from-rose-500 to-rose-600",
    light: "bg-rose-50",
    text: "text-rose-600",
    border: "#f43f5e"
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
    <Card 
      className="border-0 bg-white transition-all duration-300 hover:scale-[1.02] hover:shadow-xl group"
      style={{ 
        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
        borderRadius: '16px',
        borderTop: `3px solid ${colors.border}`
      }}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div 
            className={`rounded-full ${colors.light} transition-transform duration-300 group-hover:scale-110`}
            style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon className={`w-6 h-6 ${colors.text}`} strokeWidth={2} />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
              trend === 'up' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
            }`}>
              {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {trendValue && <span>{trendValue}</span>}
            </div>
          )}
        </div>
        
        <div>
          <h3 
            className={`text-[42px] font-bold leading-none mb-2 ${colors.text}`}
            style={{ fontWeight: 700 }}
          >
            {value}
          </h3>
          <p 
            className="text-[14px] font-medium uppercase mb-1" 
            style={{ 
              color: '#6C757D',
              letterSpacing: '0.5px'
            }}
          >
            {title}
          </p>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
});

KPICard.displayName = 'KPICard';

export default KPICard;