import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  User, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Send,
  Building2,
  Paperclip,
  Download
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

  return (
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

                {/* Info Responsabile */}
                <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <User className="w-4 h-4 text-indigo-600" /> Responsabile
                    </h4>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                        {/* We would typically resolve the ID to a name here, assuming passed or enriched */}
                        <p className="font-medium text-slate-800">
                           {/* Placeholder for User Name resolution if not available in object */}
                           ID: {ordine.responsabile_id ? ordine.responsabile_id.substring(0, 8) + '...' : 'Non assegnato'}
                        </p>
                        <p className="text-slate-500 mt-1">
                            Approvazione richiesta
                        </p>
                    </div>
                </div>
            </div>

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

            {/* Allegati e Note */}
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
                
                {ordine.note && (
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 text-sm text-yellow-800">
                        <p className="font-semibold mb-1">Note:</p>
                        {ordine.note}
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
                            onClick={() => onStatusChange(ordine.id, 'approvato')}
                        >
                            <CheckCircle2 className="w-4 h-4 mr-2" /> Approva
                        </Button>
                        <Button 
                            variant="destructive"
                            onClick={() => onStatusChange(ordine.id, 'rifiutato')}
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
  );
}