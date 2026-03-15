import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Trash2, AlertCircle, RefreshCw } from "lucide-react";

export default function TestData() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState("");

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const generateTestData = async () => {
    setIsGenerating(true);
    setMessage("Generazione dati di prova in corso... Questo potrebbe richiedere qualche minuto.");

    try {
      // 1. Fetch prerequisite data
      setProgress("Caricamento dati preliminari (Cantieri, Utenti)...");
      const cantieri = await base44.entities.Cantiere.list();
      if (cantieri.length === 0) {
        setMessage("Errore: Nessun cantiere trovato. Crea prima alcuni cantieri.");
        setIsGenerating(false);
        return;
      }
      const utenti = await base44.entities.User.list();
      if (utenti.length === 0) {
        setMessage("Errore: Nessun utente trovato. Assicurati che ci siano utenti nel sistema.");
        setIsGenerating(false);
        return;
      }

      // Helper functions for random data - CORREZIONE: DATE 2025
      const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
      const getRandomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

      // CORREZIONE: Date per il 2025
      const currentYear = 2025; // FORZATO AL 2025
      const startOfYear = new Date(currentYear, 0, 1);
      const endOfYear = new Date(currentYear, 11, 31);
      const today = new Date(); // Data di oggi

      // 2. Generate SAL for main contract
      setProgress("Generazione SAL contratto principale...");
      for (const cantiere of cantieri) {
        // Verifica che il cantiere abbia un importo contratto valido
        if (!cantiere.importo_contratto || cantiere.importo_contratto <= 0) {
          console.warn(`Saltato cantiere ${cantiere.id}: importo_contratto mancante o zero`);
          continue;
        }

        let totaleImportoPrecedente = 0;
        let totalePercentualePrecedente = 0;
        const numSal = Math.floor(Math.random() * 4) + 2; // 2 to 5 SALs
        for (let i = 1; i <= numSal; i++) {
          const incrementoPercentuale = Math.floor(Math.random() * (95 / numSal)) + 5;
          let nuovaPercentuale = Math.min(totalePercentualePrecedente + incrementoPercentuale, 95);
          if (i === numSal) nuovaPercentuale = Math.min(nuovaPercentuale, 95);

          const nuovoImportoTotale = (cantiere.importo_contratto * nuovaPercentuale) / 100;
          const importoSalCorrente = nuovoImportoTotale - totaleImportoPrecedente;

          if (importoSalCorrente > 0) {
            const dataInizio = cantiere.data_inizio ? new Date(cantiere.data_inizio) : startOfYear;
            await base44.entities.SAL.create({
              cantiere_id: cantiere.id,
              numero_sal: i,
              data_sal: getRandomDate(dataInizio, endOfYear).toISOString().split('T')[0],
              importo_sal: Math.round(importoSalCorrente),
              percentuale_avanzamento: nuovaPercentuale,
              stato_pagamento: getRandomItem(["da_fatturare", "fatturato", "incassato"]),
              note: `SAL di prova n.${i}`
            });
            totaleImportoPrecedente = nuovoImportoTotale;
            totalePercentualePrecedente = nuovaPercentuale;
            await delay(150);
          }
        }
      }

      // 3. Generate Costs
      setProgress("Generazione Costi...");
      const categorieCosto = ["manodopera", "materiali", "noli", "subappalti", "spese_generali", "sicurezza"];
      const fornitori = ["Fornitore A Srl", "B Edilizia S.p.A.", "Materiali C Snc", "Noleggi D"];
      for (const cantiere of cantieri) {
        const numCosti = Math.floor(Math.random() * 15) + 5; // 5 to 20 costs per site
        for (let i = 0; i < numCosti; i++) {
          const dataInizio = cantiere.data_inizio ? new Date(cantiere.data_inizio) : startOfYear;
          await base44.entities.Costo.create({
            cantiere_id: cantiere.id,
            categoria: getRandomItem(categorieCosto),
            descrizione: `Costo di prova ${i + 1} per ${cantiere.denominazione || cantiere.oggetto_lavori}`,
            importo: Math.floor(Math.random() * 5000) + 100,
            data_sostenimento: getRandomDate(dataInizio, endOfYear).toISOString().split('T')[0],
            fornitore: getRandomItem(fornitori),
            stato_pagamento: getRandomItem(["da_pagare", "pagato", "in_contenzioso"])
          });
          await delay(150);
        }
      }

      // 4. Generate Subcontracts and their SALs
      setProgress("Generazione Subappalti e relativi SAL...");
      const subappaltatori = ["Impianti Veloci Srl", "Finiture Perfette S.p.A.", "Scavi Profondi Snc"];
      const categorieLavoriSub = ["impianti_elettrici", "finiture", "strutture"];
      for (const cantiere of cantieri) {
        // Verifica che il cantiere abbia importi validi per calcolare i subappalti
        const importoBase = cantiere.importo_lavori || cantiere.importo_contratto || 100000; // Fallback a 100k
        if (!importoBase || importoBase <= 0) {
          console.warn(`Saltato cantiere ${cantiere.id} per subappalti: importo non valido`);
          continue;
        }

        const numSub = Math.floor(Math.random() * 2) + 1; // 1 to 2 subs per site
        for (let i = 0; i < numSub; i++) {
          const percentuale = Math.random() * 0.1 + 0.05; // 5-15%
          const importoSub = Math.round(importoBase * percentuale);

          if (importoSub <= 0) {
            console.warn(`Saltato subappalto: importo calcolato non valido (${importoSub})`);
            continue;
          }

          const dataInizio = cantiere.data_inizio ? new Date(cantiere.data_inizio) : startOfYear;
          const subappalto = await base44.entities.Subappalto.create({
            cantiere_id: cantiere.id,
            ragione_sociale: getRandomItem(subappaltatori),
            importo_contratto: importoSub,
            categoria_lavori: getRandomItem(categorieLavoriSub),
            stato: 'attivo',
            durc_scadenza: getRandomDate(today, new Date(currentYear + 1, 11, 31)).toISOString().split('T')[0],
          });
          await delay(150);

          const numSalSub = Math.floor(Math.random() * 3) + 1;
          for (let j = 1; j <= numSalSub; j++) {
            const imponibileSAL = Math.round(importoSub / numSalSub);
            if (imponibileSAL > 0) {
              await base44.entities.SALSubappalto.create({
                subappalto_id: subappalto.id,
                numero_sal: j,
                imponibile: imponibileSAL,
                data_sal: getRandomDate(dataInizio, endOfYear).toISOString().split('T')[0],
                stato_pagamento: getRandomItem(["da_pagare", "pagato"]),
              });
              await delay(150);
            }
          }
        }
      }

      // 5. Generate Consortium Partners and their SALs
      setProgress("Generazione Soci Consorzio e relativi SAL...");
      const soci = ["Socio Esecutore 1 Srl", "Socio Esecutore 2 S.p.A."];
      for (const cantiere of cantieri) {
        const importoBase = cantiere.importo_lavori || cantiere.importo_contratto || 100000;
        if (!importoBase || importoBase <= 0) {
          console.warn(`Saltato cantiere ${cantiere.id} per soci: importo non valido`);
          continue;
        }

        const numSoci = Math.floor(Math.random() * 2) + 1;
        for (let i = 0; i < numSoci; i++) {
          const percentuale = Math.random() * 0.2 + 0.1; // 10-30%
          const importoComputo = Math.round(importoBase * percentuale);

          if (importoComputo <= 0) {
            console.warn(`Saltato socio: importo calcolato non valido (${importoComputo})`);
            continue;
          }

          const socio = await base44.entities.SocioConsorzio.create({
            cantiere_id: cantiere.id,
            ragione_sociale: getRandomItem(soci),
            importo_computo: importoComputo,
            ribasso_percentuale: parseFloat((Math.random() * 5 + 15).toFixed(2)), // 15-20%
            stato: 'attivo'
          });
          await delay(150);

          const numSalSocio = Math.floor(Math.random() * 3) + 1;
          for (let j = 1; j <= numSalSocio; j++) {
            const imponibileSAL = Math.round(importoComputo / numSalSocio);
            if (imponibileSAL > 0) {
              const dataInizio = cantiere.data_inizio ? new Date(cantiere.data_inizio) : startOfYear;
              await base44.entities.SALSocio.create({
                socio_id: socio.id,
                numero_sal: j,
                imponibile: imponibileSAL,
                data_sal: getRandomDate(dataInizio, endOfYear).toISOString().split('T')[0],
                stato_pagamento: getRandomItem(["da_pagare", "pagato"]),
              });
              await delay(150);
            }
          }
        }
      }

      // 6. Generate Internal Activities
      setProgress("Generazione Attività Interne...");
      const descrizioniInterne = ["Preparare documentazione per gara", "Verifica contabilità cantiere", "Riunione di coordinamento", "Controllo sicurezza"];
      for (let i = 0; i < 10; i++) {
        await base44.entities.AttivitaInterna.create({
          descrizione: getRandomItem(descrizioniInterne),
          cantiere_id: getRandomItem(cantieri).id,
          assegnatario_id: getRandomItem(utenti).id,
          data_assegnazione: today.toISOString().split('T')[0],
          data_scadenza: getRandomDate(today, new Date(currentYear, 11, 31)).toISOString().split('T')[0],
          priorita: getRandomItem(["bassa", "media", "alta", "critica"]),
          stato: getRandomItem(["da_fare", "in_corso", "completato"])
        });
        await delay(150);
      }

      // 7. Generate Gantt Activities - DATE CORRETTE 2025
      setProgress("Generazione Attività Cronoprogramma (Gantt)...");
      const descrizioniGantt = ["Fase di Progettazione", "Scavi e Fondamenta", "Realizzazione Strutture", "Installazione Impianti", "Finiture Interne", "Collaudo Finale"];
      for (const cantiere of cantieri) {
        const cantiereStart = cantiere.data_inizio ? new Date(cantiere.data_inizio) : new Date(currentYear, 0, 15);
        let lastEndDate = new Date(cantiereStart);

        for (const desc of descrizioniGantt) {
          const startDate = new Date(lastEndDate);
          startDate.setDate(startDate.getDate() + 1);
          const duration = Math.floor(Math.random() * 20) + 10; // 10-30 days
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + duration);

          await base44.entities.Attivita.create({
            cantiere_id: cantiere.id,
            descrizione: desc,
            data_inizio: startDate.toISOString().split('T')[0],
            data_fine: endDate.toISOString().split('T')[0],
            durata_giorni: duration,
            percentuale_completamento: Math.floor(Math.random() * 101),
            categoria: getRandomItem(["preparazione", "strutture", "impianti", "finiture", "collaudi"]),
            stato: getRandomItem(["pianificata", "in_corso", "completata", "in_ritardo"])
          });
          lastEndDate = endDate;
          await delay(150);
        }
      }

      setProgress("");
      setMessage("✅ Dati di prova generati con successo per tutte le entità!");

    } catch (error) {
      console.error("Errore generazione dati:", error);
      const errorMessage = error.response?.data?.message || error.message;
      setMessage(errorMessage.includes("Rate limit")
        ? "⚠️ Limite di velocità raggiunto. Riprova tra qualche minuto."
        : "❌ Errore durante la generazione dei dati: " + errorMessage);
    }

    setIsGenerating(false);
    setProgress("");
  };

  const clearAllData = async () => {
    if (!confirm("ATTENZIONE: Questa azione eliminerà TUTTI i dati (SAL, Costi, Subappalti, Soci, Attività) da TUTTI i cantieri. Sei sicuro di voler procedere?")) {
      return;
    }
    setIsDeleting(true);
    setMessage("Cancellazione di tutti i dati in corso...");
    try {
      const entitiesToDelete = [
        base44.entities.SAL,
        base44.entities.Costo,
        base44.entities.Subappalto,
        base44.entities.SALSocio,
        base44.entities.SALSubappalto,
        base44.entities.SocioConsorzio,
        base44.entities.Attivita,
        base44.entities.AttivitaInterna
      ];
      for (const entity of entitiesToDelete) {
        setProgress(`Cancellazione ${entity.name || 'entità'}...`);
        const records = await entity.list();
        for (const record of records) {
          await entity.delete(record.id);
          await delay(100);
        }
      }
      setMessage("✅ Tutti i dati di prova sono stati cancellati. Ora puoi generarne di nuovi.");
    } catch (error) {
      console.error("Errore cancellazione dati:", error);
      setMessage("❌ Errore durante la cancellazione dei dati: " + error.message);
    }
    setIsDeleting(false);
    setProgress("");
  };

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Database className="w-6 h-6 text-blue-600" />
              Generazione Dati di Prova
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-800">Attenzione</h3>
                  <p className="text-yellow-700 text-sm">
                    Questa funzione popolerà l'applicazione con dati casuali per testare le funzionalità. Le date generate saranno del 2025. Si consiglia di cancellare i dati vecchi prima di generarne di nuovi per evitare duplicati.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={generateTestData}
                disabled={isGenerating || isDeleting}
                className="bg-blue-600 hover:bg-blue-700 flex-1"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? "Generazione..." : "Genera Nuovi Dati (2025)"}
              </Button>

              <Button
                onClick={clearAllData}
                disabled={isDeleting || isGenerating}
                variant="destructive"
                className="flex-1"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isDeleting ? "Cancellazione..." : "Cancella Dati Esistenti"}
              </Button>
            </div>

            {(progress || message) && (
              <div className="p-4 bg-slate-100 rounded-lg border border-slate-200">
                {progress && <p className="text-sm font-medium text-blue-800 animate-pulse">{progress}</p>}
                {message && <p className="text-sm font-semibold mt-2">{message}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}