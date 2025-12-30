import React from "react";
import { 
  BookOpen, 
  LayoutDashboard, 
  Building2, 
  FileText, 
  Users, 
  Briefcase, 
  DollarSign, 
  BarChart3, 
  Calendar,
  Search,
  Settings,
  HelpCircle,
  Menu,
  Plus,
  Save,
  Edit,
  Trash2
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ManualeUtente() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-indigo-600" />
          Guida all'Uso del Gestionale
        </h1>
        <p className="text-lg text-slate-600">
          Benvenuto nella guida ufficiale. Qui troverai spiegazioni semplici e passo-passo per utilizzare al meglio tutte le funzionalità del gestionale RCS Italia.
        </p>
        
        <Alert className="bg-indigo-50 border-indigo-200">
          <HelpCircle className="h-4 w-4 text-indigo-600" />
          <AlertTitle className="text-indigo-800">Suggerimento per iniziare</AlertTitle>
          <AlertDescription className="text-indigo-700">
            Puoi cliccare sulle sezioni qui sotto per espanderle e leggere i dettagli. Se è la prima volta che accedi, ti consigliamo di leggere la sezione "Primi Passi".
          </AlertDescription>
        </Alert>
      </div>

      <Accordion type="single" collapsible className="w-full space-y-4">
        
        {/* SEZIONE 1: PRIMI PASSI */}
        <AccordionItem value="item-1" className="border rounded-lg bg-white px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3 text-left">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <LayoutDashboard className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-slate-900">1. Primi Passi e Dashboard</h3>
                <p className="text-sm text-slate-500">Come orientarsi appena entrati nell'applicazione</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-6 space-y-4 text-slate-600">
            <p>
              Appena effettuato l'accesso, ti troverai nella <strong>Dashboard</strong> (o "Cruscotto"). Questa è la tua pagina principale che ti offre una panoramica immediata di tutto ciò che sta accadendo.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Menu Laterale (Sinistra):</strong> È il tuo strumento di navigazione principale. Da qui puoi raggiungere tutte le sezioni (Cantieri, Documenti, ecc.). Se sei su uno schermo piccolo o vuoi più spazio, puoi cliccare sull'icona <Menu className="h-4 w-4 inline mx-1" /> per rimpicciolire il menu.</li>
              <li><strong>Widget e Numeri:</strong> Vedrai dei riquadri colorati (chiamati "Widget") che ti mostrano numeri importanti come i cantieri attivi, i compiti da svolgere o i documenti in scadenza.</li>
              <li><strong>Allarmi:</strong> Se ci sono scadenze urgenti o problemi, li vedrai evidenziati in rosso o arancione direttamente in questa pagina.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        {/* SEZIONE 2: CANTIERI */}
        <AccordionItem value="item-2" className="border rounded-lg bg-white px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3 text-left">
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-slate-900">2. Gestione Cantieri</h3>
                <p className="text-sm text-slate-500">Il cuore del sistema: creare e gestire i progetti</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-6 space-y-4 text-slate-600">
            <p>
              La sezione <strong>Cantieri</strong> è dove gestisci tutte le informazioni dei tuoi progetti.
            </p>
            
            <h4 className="font-semibold text-slate-900 mt-4">Creare un Nuovo Cantiere</h4>
            <p>
              Clicca sul pulsante <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800"><Plus className="w-3 h-3 mr-1"/> Nuovo Cantiere</span> in alto a destra. Si aprirà una scheda da compilare.
            </p>

            <h4 className="font-semibold text-slate-900 mt-4">Le Schede del Cantiere</h4>
            <p>I dati sono organizzati in sezioni espandibili per non fare confusione:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Dati Generali:</strong> Nome, indirizzo, codici (CIG, CUP) e referenti.</li>
              <li><strong>Date e Tempistiche:</strong> Qui inserisci quando iniziano i lavori, la consegna dell'area e le eventuali proroghe. Il sistema calcolerà automaticamente le scadenze.</li>
              <li><strong>Importi e Contratto:</strong> Inserisci il valore del contratto, gli oneri di sicurezza e i ribassi.</li>
              <li><strong>Polizze:</strong> Carica qui le assicurazioni (CAR, Definitiva, ecc.) e le loro scadenze per ricevere avvisi automatici.</li>
              <li><strong>Imprese e Partner:</strong> Seleziona chi sta lavorando al cantiere (Impresa principale, consorziati, ecc.).</li>
            </ul>
            
            <div className="bg-slate-50 p-3 rounded-md border text-sm mt-2">
              <strong>Nota Importante:</strong> Ricordati sempre di cliccare su <span className="inline-flex items-center text-blue-600 font-semibold"><Save className="w-3 h-3 mx-1"/> Salva</span> in fondo alla pagina dopo aver fatto modifiche!
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* SEZIONE 3: DOCUMENTI */}
        <AccordionItem value="item-3" className="border rounded-lg bg-white px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3 text-left">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-slate-900">3. Gestione Documentale</h3>
                <p className="text-sm text-slate-500">Archiviare e trovare file, contratti e permessi</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-6 space-y-4 text-slate-600">
            <p>
              Non perdere mai più un documento. Puoi caricare file sia nella sezione generale <strong>Documenti</strong> sia direttamente dentro ogni Cantiere.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Caricare un file:</strong> Usa il pulsante "Nuovo Documento". Puoi trascinare il file o selezionarlo dal computer.</li>
              <li><strong>Categorizzare:</strong> È fondamentale scegliere la <em>Categoria</em> (es. "Contratti", "Sicurezza") e il <em>Tipo</em> corretto. Questo ti aiuterà a ritrovarlo subito usando i filtri.</li>
              <li><strong>Scadenze:</strong> Se il documento ha una scadenza (come un DURC o un'assicurazione), inseriscila! Il sistema ti avviserà prima che scada.</li>
              <li><strong>Ricerca:</strong> Usa la barra di ricerca in alto nella pagina Documenti per trovare file per nome, cantiere o tipo.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        {/* SEZIONE 4: CONTABILITÀ E SAL */}
        <AccordionItem value="item-4" className="border rounded-lg bg-white px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3 text-left">
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <BarChart3 className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-slate-900">4. Contabilità (SAL e Costi)</h3>
                <p className="text-sm text-slate-500">Monitorare l'avanzamento economico</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-6 space-y-4 text-slate-600">
            <p>
              Tieni sotto controllo i soldi del cantiere.
            </p>
            <h4 className="font-semibold text-slate-900 mt-2">SAL (Stato Avanzamento Lavori)</h4>
            <p>
              Registra qui ogni certificato di pagamento approvato. Inserisci l'importo netto, l'IVA e la data. Il grafico nella dashboard si aggiornerà automaticamente mostrando quanto manca alla fine del contratto.
            </p>
            <h4 className="font-semibold text-slate-900 mt-2">Costi</h4>
            <p>
              Nella sezione <strong>Costi</strong> puoi registrare le spese sostenute (materiali, manodopera, ecc.). Puoi collegare ogni costo a un cantiere specifico per vedere a fine progetto se sei stato nel budget.
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* SEZIONE 5: ANAGRAFICHE */}
        <AccordionItem value="item-5" className="border rounded-lg bg-white px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3 text-left">
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-slate-900">5. Imprese e Persone</h3>
                <p className="text-sm text-slate-500">La tua rubrica di contatti e aziende</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-6 space-y-4 text-slate-600">
            <p>
              Prima di poter assegnare un lavoro o un ruolo in un cantiere, devi assicurarti che l'azienda o la persona sia registrata nell'anagrafica.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Imprese:</strong> Qui registri i dati fiscali, PEC e contatti delle aziende con cui collabori (Clienti, Fornitori, Partner).</li>
              <li><strong>Professionisti:</strong> Qui registri Direttori Lavori, RUP, Architetti, ecc.</li>
            </ul>
            <p className="text-sm italic text-slate-500 mt-2">
              Consiglio: Tieni queste sezioni aggiornate e ordinate, ti farà risparmiare molto tempo quando creerai nuovi cantieri.
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* SEZIONE 6: CRONOPROGRAMMA */}
        <AccordionItem value="item-6" className="border rounded-lg bg-white px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3 text-left">
              <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-slate-900">6. Cronoprogramma</h3>
                <p className="text-sm text-slate-500">Pianificazione temporale dei lavori</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-6 space-y-4 text-slate-600">
            <p>
              Visualizza e gestisci le tempistiche dei tuoi cantieri con il diagramma di Gantt.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Puoi importare un cronoprogramma da file (Excel/Project) o crearne uno manualmente.</li>
              <li>Definisci le fasi di lavoro, assegna le date di inizio e fine.</li>
              <li>Monitora visivamente se i lavori sono in ritardo rispetto al piano.</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

      </Accordion>

      <div className="mt-8 p-6 bg-slate-100 rounded-xl border border-slate-200 text-center">
        <h4 className="font-semibold text-slate-900 mb-2">Hai ancora dubbi?</h4>
        <p className="text-slate-600 mb-4">
          Non esitare a contattare l'amministratore del sistema per assistenza specifica o per segnalare problemi.
        </p>
      </div>
    </div>
  );
}