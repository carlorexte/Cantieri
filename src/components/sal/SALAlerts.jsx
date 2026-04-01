/**
 * SALAlerts - Componente per notifiche scadenze SAL e ritardi lavori
 *
 * Funzionalità:
 * - Alert per SAL in scadenza (mancano 15 giorni)
 * - Alert per SAL scaduti non fatturati
 * - Alert per ritardo avanzamento lavori rispetto alla data SAL
 */

import React, { useState, useEffect, useMemo } from 'react';
import { backendClient } from '@/api/backendClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  TrendingDown,
  FileText,
  Bell,
  X,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { format, differenceInDays, parseISO, isValid } from 'date-fns';
import { it } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Soglie di alert
const DAYS_BEFORE_ALERT = 15; // Alert quando mancano 15 giorni

export default function SALAlerts({ cantiereId, onAlertClick }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState(() => {
    const saved = localStorage.getItem('sal_alerts_dismissed');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    loadAlerts();
  }, [cantiereId]);

  const saveDismissedAlerts = (newDismissed) => {
    setDismissedAlerts(newDismissed);
    localStorage.setItem('sal_alerts_dismissed', JSON.stringify(newDismissed));
  };

  const loadAlerts = async () => {
    setLoading(true);
    try {
      // Carica SAL
      const sals = await backendClient.entities.SAL.list({
        filters: cantiereId ? { cantiere_id: cantiereId } : {}
      });

      // Carica attività per calcolo avanzamento
      let attivita = [];
      if (cantiereId) {
        attivita = await backendClient.entities.Attivita.list({
          filters: { cantiere_id: cantiereId }
        });
      }

      const generatedAlerts = [];
      const today = new Date();

      for (const sal of sals) {
        // Salta anticipazioni (non hanno data scadenza lavori)
        if (sal.tipo_sal_dettaglio === 'anticipazione') continue;

        const salDate = sal.data_sal ? parseISO(sal.data_sal) : null;
        if (!salDate || !isValid(salDate)) continue;

        const daysUntilSal = differenceInDays(salDate, today);

        // ALERT 1: SAL in scadenza (mancano 15 giorni)
        if (daysUntilSal > 0 && daysUntilSal <= DAYS_BEFORE_ALERT) {
          generatedAlerts.push({
            id: `sal-warning-${sal.id}`,
            type: 'warning',
            title: `SAL ${sal.numero_sal || 'N/D'} in scadenza`,
            description: `Mancano ${daysUntilSal} ${daysUntilSal === 1 ? 'giorno' : 'giorni'} alla data SAL (${format(salDate, 'dd MMMM yyyy', { locale: it })})`,
            sal,
            daysUntil: daysUntilSal,
            icon: Clock
          });
        }

        // ALERT 2: SAL scaduto oggi
        if (daysUntilSal === 0) {
          generatedAlerts.push({
            id: `sal-today-${sal.id}`,
            type: 'urgent',
            title: `SAL ${sal.numero_sal || 'N/D'} scade OGGI`,
            description: `Il SAL scade oggi ${format(salDate, 'dd MMMM yyyy', { locale: it })}`,
            sal,
            daysUntil: 0,
            icon: AlertCircle
          });
        }

        // ALERT 3: SAL scaduto non fatturato
        if (daysUntilSal < 0) {
          if (sal.stato_pagamento === 'da_fatturare' || !sal.numero_fattura) {
            generatedAlerts.push({
              id: `sal-overdue-${sal.id}`,
              type: 'error',
              title: `SAL ${sal.numero_sal || 'N/D'} scaduto e non fatturato`,
              description: `Scaduto il ${format(salDate, 'dd MMMM yyyy', { locale: it })} - ancora da fatturare`,
              sal,
              daysUntil: daysUntilSal,
              icon: AlertTriangle
            });
          }
        }

        // ALERT 4: Ritardo avanzamento lavori
        const avanzamentoAlert = checkLavoriRitardo(sal, salDate, attivita, daysUntilSal);
        if (avanzamentoAlert) {
          generatedAlerts.push(avanzamentoAlert);
        }
      }

      // Filtra alert dismissi
      const filteredAlerts = generatedAlerts.filter(
        alert => !dismissedAlerts.includes(alert.id)
      );

      setAlerts(filteredAlerts);
    } catch (error) {
      console.error('Errore caricamento alert SAL:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkLavoriRitardo = (sal, salDate, attivita, daysUntilSal) => {
    if (!attivita || attivita.length === 0) return null;

    // Filtra attività che dovrebbero essere completate entro la data SAL
    const attivitaEntroSal = attivita.filter(att => {
      if (!att.data_fine) return false;
      const dataFine = parseISO(att.data_fine);
      return isValid(dataFine) && dataFine <= salDate;
    });

    if (attivitaEntroSal.length === 0) return null;

    // Calcola % completamento attesa (basata sui giorni mancanti)
    const oggi = new Date();
    const primaAttivita = attivitaEntroSal.reduce((min, att) => {
      const data = parseISO(att.data_inizio);
      return data < min ? data : min;
    }, parseISO(attivitaEntroSal[0].data_inizio));

    const giorniTotali = differenceInDays(salDate, primaAttivita);
    const giorniTrascorsi = differenceInDays(oggi, primaAttivita);
    const percentualeAttesa = giorniTotali > 0 ? (giorniTrascorsi / giorniTotali) * 100 : 100;

    // Calcola % completamento reale
    const completamentoReale = attivitaEntroSal.reduce((acc, att) => {
      return acc + (att.percentuale_completamento || 0);
    }, 0) / attivitaEntroSal.length;

    // Se ritardo > 10%, genera alert
    const ritardo = percentualeAttesa - completamentoReale;
    if (ritardo > 10) {
      return {
        id: `sal-ritardo-${sal.id}`,
        type: ritardo > 30 ? 'error' : 'warning',
        title: `Ritardo lavori per SAL ${sal.numero_sal || 'N/D'}`,
        description: `Completamento: ${Math.round(completamentoReale)}% (atteso: ${Math.round(percentualeAttesa)}%)`,
        sal,
        ritardo,
        completamentoReale,
        percentualeAttesa,
        icon: TrendingDown
      };
    }

    return null;
  };

  const dismissAlert = (alertId) => {
    const newDismissed = [...dismissedAlerts, alertId];
    saveDismissedAlerts(newDismissed);
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'urgent': return 'border-red-500 bg-red-50';
      case 'error': return 'border-orange-500 bg-orange-50';
      case 'warning': return 'border-amber-500 bg-amber-50';
      default: return 'border-blue-500 bg-blue-50';
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'urgent': return AlertCircle;
      case 'error': return AlertTriangle;
      case 'warning': return Clock;
      default: return AlertCircle;
    }
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            Caricamento alert...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-green-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-900">Tutto nella norma</p>
              <p className="text-sm text-emerald-700">Nessun SAL in scadenza o ritardo lavori</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="pb-3 border-b bg-gradient-to-r from-amber-50 to-orange-50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 text-amber-900">
            <Bell className="w-5 h-5" />
            Alert SAL ({alerts.length})
          </CardTitle>
          {dismissedAlerts.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDismissedAlerts([]);
                localStorage.removeItem('sal_alerts_dismissed');
                loadAlerts();
              }}
              className="text-xs text-amber-700"
            >
              Ripristina tutti
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {alerts.map((alert) => {
            const Icon = alert.icon || getAlertIcon(alert.type);
            return (
              <div
                key={alert.id}
                className={`p-4 ${getAlertColor(alert.type)} transition-colors`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    alert.type === 'urgent' ? 'text-red-600' :
                    alert.type === 'error' ? 'text-orange-600' :
                    'text-amber-600'
                  }`} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{alert.title}</p>
                        <p className="text-sm text-slate-700 mt-1">{alert.description}</p>
                        
                        {/* Dettagli aggiuntivi per ritardo lavori */}
                        {alert.ritardo !== undefined && (
                          <div className="mt-2">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-slate-600">Avanzamento:</span>
                              <div className="flex-1 max-w-[200px] h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    alert.completamentoReale < 50 ? 'bg-red-500' :
                                    alert.completamentoReale < 75 ? 'bg-amber-500' :
                                    'bg-green-500'
                                  }`}
                                  style={{ width: `${alert.completamentoReale}%` }}
                                />
                              </div>
                              <span className="font-medium">{Math.round(alert.completamentoReale)}%</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              Ritardo: {Math.round(alert.ritardo)}% rispetto al previsto
                            </p>
                          </div>
                        )}

                        {/* Info SAL */}
                        {alert.sal && (
                          <div className="flex items-center gap-3 mt-2 text-xs">
                            <span className="text-slate-600">
                              € {alert.sal.imponibile?.toLocaleString('it-IT') || 'N/D'}
                            </span>
                            {alert.sal.stato_pagamento && (
                              <Badge variant="secondary" className="text-xs">
                                {alert.sal.stato_pagamento.replace('_', ' ')}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Bottone dismiss */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => dismissAlert(alert.id)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </Button>

                        {/* Link al SAL */}
                        {alert.sal && (
                          <Link to={createPageUrl(`SALDashboard?id=${alert.sal.id}`)}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs bg-white hover:bg-slate-50"
                            >
                              Vedi
                              <ChevronRight className="w-3 h-3 ml-1" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Hook per ottenere gli alert SAL in qualsiasi componente
 */
export function useSALAlerts(cantiereId) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasUrgentAlerts, setHasUrgentAlerts] = useState(false);

  useEffect(() => {
    const loadAlerts = async () => {
      setLoading(true);
      try {
        const sals = await backendClient.entities.SAL.list({
          filters: cantiereId ? { cantiere_id: cantiereId } : {}
        });

        const generatedAlerts = [];
        const today = new Date();

        for (const sal of sals) {
          if (sal.tipo_sal_dettaglio === 'anticipazione') continue;

          const salDate = sal.data_sal ? parseISO(sal.data_sal) : null;
          if (!salDate || !isValid(salDate)) continue;

          const daysUntilSal = differenceInDays(salDate, today);

          if (daysUntilSal > 0 && daysUntilSal <= DAYS_BEFORE_ALERT) {
            generatedAlerts.push({
              type: 'warning',
              daysUntil: daysUntilSal,
              sal
            });
          }

          if (daysUntilSal < 0 && (sal.stato_pagamento === 'da_fatturare' || !sal.numero_fattura)) {
            generatedAlerts.push({
              type: 'error',
              daysUntil: daysUntilSal,
              sal
            });
          }
        }

        setAlerts(generatedAlerts);
        setHasUrgentAlerts(generatedAlerts.some(a => a.type === 'error' || a.daysUntil <= 3));
      } catch (error) {
        console.error('Errore caricamento alert SAL:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAlerts();
  }, [cantiereId]);

  return { alerts, loading, hasUrgentAlerts };
}
