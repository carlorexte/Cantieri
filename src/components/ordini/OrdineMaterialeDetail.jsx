import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  FileText, 
  User, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Send,
  Building2,
  Paperclip,
  Download,
  CreditCard,
  Clock,
  Euro
} from "lucide-react";
import { format } from "date-fns";

const statusConfig = {
  bozza: { label: "Bozza", color: "bg-slate-100 text-slate-700" },
  in_attesa_approvazione: { label: "In Approvazione", color: "bg-amber-100 text-amber-700" },
  approvato: { label: "Approvato", color: "bg-green-100 text-green-700" },
  rifiutato: { label: "Rifiutato", color: "bg-red-100 text-red-700" },
  inviato_fornitore: { label: "Inviato a Fornitore", color: "bg-blue-100 text-blue-700" },
  ricevuto: { label: "Merce Ricevuta", color: "bg-emerald-100 text-emerald-700" },
  annullato: { label: "Annullato", color: "bg-gray-100 text-gray-500" }
};

export default function OrdineMaterialeDetail({ ordine, open, onClose, onStatusChange }) {
  if (!ordine) return null;

  const currentStatus = statusConfig[ordine.stato] || statusConfig.bozza;
  const isManager = true; // TODO: Check actual permissions from context if needed to hide/show buttons
  
  const [noteApprovazione, setNoteApprovazione] = React.useState("");
  const [showRejectDialog, setShowRejectDialog] = React.useState(false);

  const handleAction = (action) => {
      if (action === 'rifiuta') {
          setShowRejectDialog(true);
      } else {
          // Pass note if approving too? For now only rejection usually needs mandatory reason
          onStatusChange(ordine.id, action === 'approva' ? 'approvato' : action);
      }
  };

  const confirmReject = () => {
      onStatusChange(ordine.id, 'rifiutato', noteApprovazione);
      setShowRejectDialog(false);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex justify-between items-start">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <Badge variant="outline" className="font-mono text-xs">
                        {ordine.numero_ordine}
                    </Badge>
                    <Badge className={currentStatus.color + " border-0 hover:bg-opacity-80"}>
                        {currentStatus.label}
                    </Badge>
                </div>
                <DialogTitle className="text-xl">{ordine.descrizione}</DialogTitle>
            </div>
            <div className="text-right text-sm text-slate-500">
                <div className="flex items-center gap-1 justify-end">
                    <Calendar className="w-3 h-3" />
                    {ordine.data_ordine ? format(new Date(ordine.data_ordine), 'dd/MM/yyyy') : 'N/D'}
                </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Info Fornitore */}
                <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-600" /> Fornitore
                    </h4>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                        <p className="font-medium text-slate-800">{ordine.fornitore_ragione_sociale || "Non specificato"}</p>
                        {ordine.fornitore_email && (
                            <p className="text-slate-500 mt-1">{ordine.fornitore_email}</p>
                        )}
                    </div>
                </div>

                {/* Info Economiche e Condizioni */}
                <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <Euro className="w-4 h-4 text-indigo-600" /> Dettagli Economici
                    </h4>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500">Tipo:</span>
                            <span className="font-medium capitalize">{ordine.tipo_operazione || 'Acquisto'}</span>
                        </div>
                        {ordine.tipo_operazione === 'noleggio' && (
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500">Durata:</span>
                                <span className="font-medium">{ordine.durata_noleggio || '-'}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center border-t pt-2 mt-2">
                            <span className="text-slate-500 font-semibold">Totale:</span>
                            <span className="font-bold text-lg text-emerald-600">
                                € {Number(ordine.importo_totale || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Condizioni e Note */}
            {(ordine.condizioni_ordine || ordine.note) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                     {ordine.condizioni_ordine && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
                            <h5 className="font-semibold mb-1 flex items-center gap-2">
                                <CreditCard className="w-3 h-3" /> Condizioni:
                            </h5>
                            {ordine.condizioni_ordine}
                        </div>
                     )}
                     {ordine.note && (
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 text-sm text-yellow-800">
                            <h5 className="font-semibold mb-1 flex items-center gap-2">
                                <FileText className="w-3 h-3" /> Note Interne:
                            </h5>
                            {ordine.note}
                        </div>
                     )}
                </div>
            )}
            
            {/* Note Approvazione (se rifiutato o approvato con note) */}
            {ordine.note_approvazione && (
                <div className="mb-6 bg-red-50 p-4 rounded-lg border border-red-100 text-sm text-red-800">
                    <h5 className="font-semibold mb-1">Note Responsabile:</h5>
                    {ordine.note_approvazione}
                </div>
            )}

            <Separator className="my-6" />

            {/* Tabella Materiali */}
            <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" /> Lista Materiali
            </h4>
            <div className="border rounded-lg overflow-hidden mb-6">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                        <tr>
                            <th className="px-4 py-2 text-left font-medium text-slate-500">Articolo</th>
                            <th className="px-4 py-2 text-center font-medium text-slate-500">Q.tà</th>
                            <th className="px-4 py-2 text-center font-medium text-slate-500">U.M.</th>
                            <th className="px-4 py-2 text-left font-medium text-slate-500">Note</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {ordine.dettagli_materiali && ordine.dettagli_materiali.length > 0 ? (
                            ordine.dettagli_materiali.map((item, idx) => (
                                <tr key={idx}>
                                    <td className="p-3 font-medium text-slate-700">{item.descrizione}</td>
                                    <td className="p-3 text-center">{item.quantita}</td>
                                    <td className="p-3 text-center text-slate-500">{item.unita_misura}</td>
                                    <td className="p-3 text-slate-500 italic">{item.note}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" className="p-4 text-center text-slate-500">Nessun articolo</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Allegati */}
            <div className="grid grid-cols-1 gap-4">
                {ordine.file_allegato_uri && (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                        <Paperclip className="w-4 h-4 text-blue-600" />
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium text-blue-900 truncate">Allegato Ordine</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => window.open(ordine.file_allegato_uri, '_blank')}>
                            <Download className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </div>

        </ScrollArea>

        <DialogFooter className="p-4 border-t bg-slate-50 sm:justify-between items-center">
            <div className="flex items-center gap-2">
                {ordine.stato === 'in_attesa_approvazione' && (
                    <>
                        <Button 
                            variant="default" 
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleAction('approva')}
                        >
                            <CheckCircle2 className="w-4 h-4 mr-2" /> Approva
                        </Button>
                        <Button 
                            variant="destructive"
                            onClick={() => handleAction('rifiuta')}
                        >
                            <XCircle className="w-4 h-4 mr-2" /> Rifiuta
                        </Button>
                    </>
                )}
                
                {ordine.stato === 'approvato' && (
                     <Button 
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => onStatusChange(ordine.id, 'inviato_fornitore')}
                    >
                        <Send className="w-4 h-4 mr-2" /> Segna come Inviato
                    </Button>
                )}
            </div>
            
            <Button variant="outline" onClick={onClose}>Chiudi</Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>

    {/* Dialog Rifiuto */}
    <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-md">
            <DialogHeader>
                <DialogTitle>Rifiuta Ordine</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
                <p className="text-sm text-slate-500">
                    Inserisci una motivazione per il rifiuto. Sarà visibile al richiedente.
                </p>
                <div className="space-y-2">
                    <Label>Motivazione / Note</Label>
                    <Textarea 
                        value={noteApprovazione} 
                        onChange={(e) => setNoteApprovazione(e.target.value)}
                        placeholder="Es. Manca preventivo, importo errato..."
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Annulla</Button>
                <Button variant="destructive" onClick={confirmReject}>Conferma Rifiuto</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}