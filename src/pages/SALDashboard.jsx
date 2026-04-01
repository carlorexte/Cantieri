import React, { useState, useEffect } from 'react';
import { backendClient } from '@/api/backendClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, FileText, Calendar, Euro, Building2, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from "sonner";
import DocumentiSALManager from '../components/sal/DocumentiSALManager';
import SalForm from '../components/sal/SalForm';

const DetailField = ({ label, value, icon: Icon }) => (
  <div className="flex items-start gap-3">
    {Icon && <Icon className="w-5 h-5 text-indigo-600 mt-0.5" />}
    <div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="font-medium text-slate-800">{value || 'N/D'}</p>
    </div>
  </div>
);

export default function SALDashboardPage() {
  const [sal, setSal] = useState(null);
  const [cantiere, setCantiere] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (id) {
      loadData(id);
    } else {
      setIsLoading(false);
    }
    
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const user = await backendClient.auth.me();
      setCurrentUser(user);
    } catch (error) {
      console.error("Errore caricamento utente:", error);
    }
  };

  const loadData = async (salId) => {
    setIsLoading(true);
    try {
      const salData = await backendClient.entities.SAL.get(salId);
      setSal(salData);

      if (salData.cantiere_id) {
        const cantiereData = await backendClient.entities.Cantiere.get(salData.cantiere_id);
        setCantiere(cantiereData);
      }
    } catch (error) {
      console.error("Errore nel caricamento dei dati del SAL:", error);
      toast.error("Errore durante il caricamento del SAL");
    }
    setIsLoading(false);
  };

  const handleUpdateSal = async (salData) => {
    try {
      await backendClient.entities.SAL.update(sal.id, salData);
      toast.success("SAL aggiornato con successo!");
      setShowEditForm(false);
      loadData(sal.id);
    } catch (error) {
      console.error("Errore aggiornamento SAL:", error);
      toast.error("Errore durante l'aggiornamento del SAL");
    }
  };

  if (isLoading) {
    return <div className="p-6">Caricamento...</div>;
  }

  if (!sal) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl">SAL non trovato.</h2>
        <Link to={createPageUrl('SAL')}>
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna ai SAL
          </Button>
        </Link>
      </div>
    );
  }

  const isAnticipazione = sal.tipo_sal_dettaglio === 'anticipazione';
  
  const tipoSalLabels = {
    anticipazione: "Anticipazione",
    sal_progressivo: "SAL Progressivo",
    sal_finale: "SAL Finale"
  };

  const tipoPrestazioneLabels = {
    lavori: "Lavori",
    progettazione: "Progettazione"
  };

  const statoPagamentoColors = {
    da_fatturare: "bg-blue-50 text-blue-700 border-blue-200",
    fatturato: "bg-amber-50 text-amber-700 border-amber-200",
    incassato: "bg-emerald-50 text-emerald-700 border-emerald-200"
  };

  const canEdit = currentUser?.role === 'admin' || currentUser?.perm_edit_sal;

  return (
    <div className="p-6 bg-slate-50 min-h-full">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Link to={createPageUrl(`SAL${cantiere ? `?cantiere_id=${cantiere.id}` : ''}`)}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Torna ai SAL
            </Button>
          </Link>
          {canEdit && (
            <Button 
              onClick={() => setShowEditForm(true)}
              className=""
            >
              <Edit className="w-4 h-4 mr-2" />
              Modifica SAL
            </Button>
          )}
        </div>

        {/* Card principale SAL */}
        <Card className="mb-6 shadow-lg border-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <FileText className="w-8 h-8 text-indigo-600" />
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-3xl">
                      {isAnticipazione ? 'Anticipazione' : `SAL n. ${sal.numero_sal || 'N/D'}`}
                    </CardTitle>
                    <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200">
                      {tipoSalLabels[sal.tipo_sal_dettaglio]}
                    </Badge>
                  </div>
                  <p className="text-slate-500">
                    {format(new Date(sal.data_sal), 'dd MMMM yyyy', { locale: it })}
                  </p>
                </div>
              </div>
              
              {!isAnticipazione && sal.stato_pagamento && (
                <Badge 
                  variant="secondary" 
                  className={`${statoPagamentoColors[sal.stato_pagamento]} border text-base px-4 py-2`}
                >
                  {sal.stato_pagamento.replace('_', ' ')}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Cantiere collegato */}
            {cantiere && (
              <div className="pt-4 border-t">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  Cantiere
                </h3>
                <Link 
                  to={createPageUrl(`CantiereDashboard?id=${cantiere.id}`)}
                  className="block p-4 border rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                >
                  <p className="font-medium text-indigo-600">{cantiere.denominazione}</p>
                  {cantiere.codice_cig && (
                    <p className="text-sm text-slate-500 mt-1">CIG: {cantiere.codice_cig}</p>
                  )}
                </Link>
              </div>
            )}

            {/* Tipo prestazione e descrizione */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
              <DetailField
                label="Tipo Prestazione"
                value={tipoPrestazioneLabels[sal.tipo_prestazione]}
                icon={FileText}
              />
              {sal.descrizione && (
                <div className="md:col-span-2">
                  <DetailField
                    label="Descrizione"
                    value={sal.descrizione}
                    icon={FileText}
                  />
                </div>
              )}
            </div>

            {/* Dati economici - Anticipazione */}
            {isAnticipazione && (
              <div className="pt-4 border-t">
                <h3 className="font-semibold text-slate-900 mb-4">Dati Anticipazione</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailField
                    label="Importo Anticipo Erogato"
                    value={sal.importo_anticipo_erogato ? `€ ${sal.importo_anticipo_erogato.toLocaleString('it-IT')}` : 'N/D'}
                    icon={Euro}
                  />
                  <DetailField
                    label="Data Erogazione"
                    value={sal.data_anticipo_erogato ? format(new Date(sal.data_anticipo_erogato), 'dd/MM/yyyy') : 'N/D'}
                    icon={Calendar}
                  />
                </div>
              </div>
            )}

            {/* Dati economici - SAL Progressivo/Finale */}
            {!isAnticipazione && (
              <>
                <div className="pt-4 border-t">
                  <h3 className="font-semibold text-slate-900 mb-4">Dati Economici</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <DetailField
                      label="Imponibile"
                      value={sal.imponibile ? `€ ${sal.imponibile.toLocaleString('it-IT')}` : 'N/D'}
                      icon={Euro}
                    />
                    <DetailField
                      label="IVA"
                      value={sal.iva_importo ? `€ ${sal.iva_importo.toLocaleString('it-IT')} (${sal.iva_percentuale}%)` : 'N/D'}
                      icon={Euro}
                    />
                    <DetailField
                      label="Totale Fattura"
                      value={sal.totale_fattura ? `€ ${sal.totale_fattura.toLocaleString('it-IT')}` : 'N/D'}
                      icon={Euro}
                    />
                  </div>
                </div>

                {/* Dati fatturazione */}
                <div className="pt-4 border-t">
                  <h3 className="font-semibold text-slate-900 mb-4">Dati Fatturazione</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DetailField
                      label="Numero Fattura"
                      value={sal.numero_fattura}
                      icon={FileText}
                    />
                    <DetailField
                      label="Data Fattura"
                      value={sal.data_fattura ? format(new Date(sal.data_fattura), 'dd/MM/yyyy') : 'N/D'}
                      icon={Calendar}
                    />
                  </div>
                </div>

                {/* Dati pagamento */}
                <div className="pt-4 border-t">
                  <h3 className="font-semibold text-slate-900 mb-4">Dati Pagamento</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DetailField
                      label="Importo Pagato"
                      value={sal.importo_pagato ? `€ ${sal.importo_pagato.toLocaleString('it-IT')}` : 'N/D'}
                      icon={Euro}
                    />
                    <DetailField
                      label="Data Pagamento"
                      value={sal.data_pagamento ? format(new Date(sal.data_pagamento), 'dd/MM/yyyy') : 'N/D'}
                      icon={Calendar}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Note */}
            {sal.note && (
              <div className="pt-4 border-t">
                <h3 className="font-semibold text-slate-900 mb-2">Note</h3>
                <p className="text-slate-700 whitespace-pre-wrap">{sal.note}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sezione Documenti SAL */}
        <DocumentiSALManager salId={sal.id} cantiereId={sal.cantiere_id} />

        {/* Dialog Modifica SAL */}
        <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifica SAL</DialogTitle>
            </DialogHeader>
            <SalForm 
              sal={sal}
              cantiereId={sal.cantiere_id}
              onSubmit={handleUpdateSal}
              onCancel={() => setShowEditForm(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}