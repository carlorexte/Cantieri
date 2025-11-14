import React from "react";
import { Building2, Euro, TrendingUp, AlertTriangle } from "lucide-react";
import KPICard from "../KPICard";

export default function KPIWidget({ type, dashboardData }) {
  const { kpis } = dashboardData || {};

  const getKPIConfig = () => {
    switch (type) {
      case "cantieri":
        return {
          title: "Cantieri Attivi",
          value: kpis?.cantieriAttivi || 0,
          subtitle: "In corso di esecuzione",
          icon: Building2,
          colorScheme: "indigo"
        };
      case "valore":
        return {
          title: "Valore Portafoglio",
          value: `€ ${((kpis?.valorePortafoglio || 0) / 1000000).toFixed(1)}M`,
          subtitle: "Totale contratti",
          icon: Euro,
          colorScheme: "emerald"
        };
      case "avanzamento":
        return {
          title: "Avanzamento Medio",
          value: `${kpis?.avanzamentoMedio || 0}%`,
          subtitle: "Media ponderata",
          icon: TrendingUp,
          colorScheme: "cyan"
        };
      case "documenti":
        return {
          title: "Documenti in Scadenza",
          value: kpis?.documentiInScadenza || 0,
          subtitle: "Prossimi 30 giorni",
          icon: AlertTriangle,
          colorScheme: "amber"
        };
      default:
        return null;
    }
  };

  const config = getKPIConfig();
  if (!config) return null;

  return <KPICard {...config} />;
}