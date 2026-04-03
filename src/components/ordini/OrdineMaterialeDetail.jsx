import React, { useState } from "react";
import { supabaseDB } from "@/lib/supabaseClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileText, Calendar, CheckCircle2, XCircle, Send,
  Building2, Paperclip, Download, CreditCard, Clock,
  Euro, PackageCheck, Upload, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";

const statusConfig = {
  bozza:                  { label: "Bozza",                color: "bg-slate-100 text-slate-700"    },
  in_attesa_approvazione: { label: "In Approvazione",      color: "bg-amber-100 text-amber-700"    },
  approvato:              { label: "Approvato",             color: "bg-green-100 text-green-700"    },
  rifiutato:              { label: "Rifiutato",             color: "bg-red-100 text-red-700"        },
  inviato_fornitore:      { label: "Inviato a Fornitore",  color: "bg-blue-100 text-blue-700"      },
  ricevuto:               { label: "Merce Ricevuta",       color: "bg-emerald-100 text-emerald-700"},
  annullato:              { label: "Annullato",             color: "bg-gray-100 text-gray-500"      }
};

export default function OrdineMaterialeDetail({ ordine, open, onClose, onStatusChange, onRicezione, canApprove = false, canEdit = false }) {
  const [noteApprovazione, setNoteApprovazione] = useState("");
  const [actionDialog, setActionDialog] = useState({ open: false, type: null });
  const [showRicezioneDialog, setShowRicezioneDialog] = useState(false);

  if (!ordine) return null;

  const currentStatus = statusConfig[ordine.stato] || statusConfig.bozza;

  const handleAction = (action) => {
    if (action === "rifiuta" || action === "richiedi_modifica") {
      setActionDialog({ open: true, type: action });
      return;
    }
    if (action === "approva") { onStatusChange(ordine.id, "approvato"); return; }
    if (action === "ricevi") { setShowRicezioneDialog(true); return; }
    onStatusChange(ordine.id, action);
  };

  const closeActionDialog = () => {
    setNoteApprovazione("");
    setActionDialog({ open: false, type: null });
  };

  const confirmActionWithNote = () => {
    const nota = noteApprovazione?.trim();
    if (!nota) return;
    if (actionDialog.type === "rifiuta") onStatusChange(ordine.id, "rifiutato", nota);
    if (actionDialog.type === "richiedi_modifica") onStatusChange(ordine.id, "bozza", nota);
    closeActionDialog();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Badge variant="outline" className="font-mono text-xs">{ordine.numero_ordine}</Badge>
                  <Badge className={`${currentStatus.color} border-0`}>{currentStatus.label}</Badge>
                </div>
                <DialogTitle className="text-xl">{ordine.descrizione}</DialogTitle>
              </div>
              <div className="text-right text-sm text-slate-500">
                <div className="flex items-center gap-1 justify-end">
                  <Calendar className="w-3 h-3" />
                  {ordine.data_ordine ? format(new Date(ordine.data_ordine), "dd/MM/yyyy") : "N/D"}
                </div>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 p-6">
            {/* Società Intestataria */}
            {ordine.societa_intestataria_ragione_sociale && (
              <div className="mb-6 bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                <h4 className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Società Intestataria
                </h4>
                <div className="text-sm text-indigo-900 space-y-1">
                  <p className="font-medium">{ordine.societa_intestataria_ragione_sociale}</p>
                  {(ordine.societa_intestataria_partita_iva || ordine.societa_intestataria_codice_fiscale) && (
                    <p>
                      {ordine.societa_intestataria_partita_iva ? `P.IVA: ${ordine.societa_intestataria_partita_iva}` : ""}
                      {ordine.societa_intestataria_partita_iva && ordine.societa_intestataria_codice_fiscale ? " - " : ""}
                      {ordine.societa_intestataria_codice_fiscale ? `CF: ${ordine.societa_intestataria_codice_fiscale}` : ""}
                    </p>
                  )}
                  {ordine.societa_intestataria_email && <p>Email: {ordine.societa_intestataria_email}</p>}
                  {ordine.societa_intestataria_pec && <p>PEC: {ordine.societa_intestataria_pec}</p>}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" /> Fornitore
                </h4>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                  <p className="font-medium text-slate-800">{ordine.fornitore_ragione_sociale || "Non specificato"}</p>
                  {ordine.fornitore_email && <p className="text-slate-500 mt-1">{ordine.fornitore_email}</p>}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Euro className="w-4 h-4 text-indigo-600" /> Dettagli Economici
                </h4>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Tipo:</span>
                    <span className="font-medium capitalize">{ordine.tipo_operazione || "Acquisto"}</span>
                  </div>
                  {ordine.tipo_operazione === "noleggio" && ordine.durata_noleggio && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Durata:</span>
                      <span className="font-medium">{ordine.durata_noleggio}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-t pt-2 mt-2">
                    <span className="text-slate-500 font-semibold">Totale:</span>
                    <span className="font-bold text-lg text-emerald-600">
                      € {Number(ordine.importo_totale || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

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

            {ordine.note_approvazione && (
              <div className="mb-6 bg-red-50 p-4 rounded-lg border border-red-100 text-sm text-red-800">
                <h5 className="font-semibold mb-1">Note approvatore:</h5>
                {ordine.note_approvazione}
              </div>
            )}

            {/* Dati ricezione */}
            {ordine.stato === 'ricevuto' && (ordine.ddt_numero || ordine.note_ricezione || ordine.data_ricezione) && (
              <div className="mb-6 bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                <h5 className="font-semibold text-emerald-900 mb-2 flex items-center gap-2">
                  <PackageCheck className="w-4 h-4" /> Dati Ricezione
                </h5>
                <div className="text-sm text-emerald-800 space-y-1">
                  {ordine.data_ricezione && <p>Data: {format(new Date(ordine.data_ricezione), 'dd MMMM yyyy', { locale: it })}</p>}
                  {ordine.ddt_numero && <p>N° DDT: {ordine.ddt_numero}</p>}
                  {ordine.note_ricezione && <p>Note: {ordine.note_ricezione}</p>}
                </div>
              </div>
            )}

            <Separator className="my-6" />

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
                  {ordine.dettagli_materiali?.length > 0 ? (
                    ordine.dettagli_materiali.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-3 font-medium text-slate-700">{item.descrizione}</td>
                        <td className="p-3 text-center">{item.quantita}</td>
                        <td className="p-3 text-center text-slate-500">{item.unita_misura}</td>
                        <td className="p-3 text-slate-500 italic">{item.note}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="4" className="p-4 text-center text-slate-500">Nessun articolo</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Allegati */}
            <div className="space-y-2">
              {ordine.file_allegato_uri && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <Paperclip className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-medium text-blue-900 flex-1">Allegato Ordine</p>
                  <Button variant="ghost" size="sm" onClick={() => window.open(ordine.file_allegato_uri, "_blank")}>
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              )}
              {ordine.file_ddt_url && (
                <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                  <PackageCheck className="w-4 h-4 text-emerald-600" />
                  <p className="text-sm font-medium text-emerald-900 flex-1">DDT / Giustificativo Ricezione</p>
                  <Button variant="ghost" size="sm" onClick={() => window.open(ordine.file_ddt_url, "_blank")}>
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="p-4 border-t bg-slate-50 sm:justify-between items-center">
            <div className="flex items-center gap-2 flex-wrap">
              {ordine.stato === "in_attesa_approvazione" && canApprove && (
                <>
                  <Button variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => handleAction("approva")}>
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Approva
                  </Button>
                  <Button variant="destructive" onClick={() => handleAction("rifiuta")}>
                    <XCircle className="w-4 h-4 mr-2" /> Rifiuta
                  </Button>
                  <Button variant="outline" onClick={() => handleAction("richiedi_modifica")}>
                    <Clock className="w-4 h-4 mr-2" /> Richiedi Modifica
                  </Button>
                </>
              )}

              {ordine.stato === "bozza" && canEdit && (
                <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => onStatusChange(ordine.id, "in_attesa_approvazione")}>
                  <Send className="w-4 h-4 mr-2" /> Invia in Approvazione
                </Button>
              )}

              {ordine.stato === "approvato" && canEdit && (
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => onStatusChange(ordine.id, "inviato_fornitore")}>
                  <Send className="w-4 h-4 mr-2" /> Segna come Inviato
                </Button>
              )}

              {ordine.stato === "inviato_fornitore" && canEdit && (
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleAction("ricevi")}>
                  <PackageCheck className="w-4 h-4 mr-2" /> Ricevi Merce
                </Button>
              )}
            </div>
            <Button variant="outline" onClick={onClose}>Chiudi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog rifiuto/modifica */}
      <Dialog open={actionDialog.open} onOpenChange={isOpen => isOpen ? null : closeActionDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === "richiedi_modifica" ? "Richiedi Modifica Ordine" : "Rifiuta Ordine"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-500">
              {actionDialog.type === "richiedi_modifica"
                ? "Inserisci cosa va modificato (prodotto, quantità, prezzo o note)."
                : "Inserisci una motivazione per il rifiuto. Sarà visibile al richiedente."}
            </p>
            <div className="space-y-2">
              <Label>Motivazione / Note</Label>
              <Textarea
                value={noteApprovazione}
                onChange={e => setNoteApprovazione(e.target.value)}
                placeholder="Es. Ridurre quantità articolo 2 da 50 a 30"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeActionDialog}>Annulla</Button>
            <Button
              variant={actionDialog.type === "richiedi_modifica" ? "default" : "destructive"}
              onClick={confirmActionWithNote}
              disabled={!noteApprovazione.trim()}
            >
              {actionDialog.type === "richiedi_modifica" ? "Conferma Richiesta" : "Conferma Rifiuto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog ricezione merce */}
      <RicezioneDialog
        open={showRicezioneDialog}
        onClose={() => setShowRicezioneDialog(false)}
        ordine={ordine}
        onConfirm={(data) => {
          setShowRicezioneDialog(false);
          onRicezione(ordine.id, data);
        }}
      />
    </>
  );
}

function RicezioneDialog({ open, onClose, ordine, onConfirm }) {
  const [form, setForm] = useState({
    ddt_numero: "",
    data_ricezione: new Date().toISOString().split('T')[0],
    note_ricezione: "",
  });
  const [isUploading, setIsUploading] = useState(false);
  const [fileDdtUrl, setFileDdtUrl] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await supabaseDB.ordiniMateriale.uploadFile(ordine?.cantiere_id, file);
      setFileDdtUrl(url);
      toast.success("File DDT caricato");
    } catch (err) {
      toast.error("Errore caricamento file: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirm = () => {
    setIsSaving(true);
    const payload = { ...form };
    if (fileDdtUrl) payload.file_ddt_url = fileDdtUrl;
    onConfirm(payload);
  };

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-emerald-600" />
            Registra Ricezione Merce
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-slate-500">
            Conferma la ricezione della merce per l'ordine <strong>{ordine?.numero_ordine}</strong>.
            Allega il DDT o una foto come giustificativo.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data Ricezione</Label>
              <Input
                type="date"
                className="mt-1"
                value={form.data_ricezione}
                onChange={e => setForm(f => ({ ...f, data_ricezione: e.target.value }))}
              />
            </div>
            <div>
              <Label>N° DDT</Label>
              <Input
                className="mt-1"
                placeholder="Es. DDT-2024-001"
                value={form.ddt_numero}
                onChange={e => setForm(f => ({ ...f, ddt_numero: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label>Note Ricezione</Label>
            <Textarea
              className="mt-1"
              placeholder="Es. Merce ricevuta parzialmente, mancano 5 pezzi articolo 2..."
              rows={3}
              value={form.note_ricezione}
              onChange={e => setForm(f => ({ ...f, note_ricezione: e.target.value }))}
            />
          </div>

          <div>
            <Label>Allega DDT / Foto giustificativo</Label>
            <label className="mt-1 flex items-center gap-2 cursor-pointer border-2 border-dashed border-slate-300 rounded-lg p-3 hover:border-emerald-400 transition-colors">
              <Upload className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-500">
                {isUploading ? "Caricamento..." : fileDdtUrl ? "File caricato ✓" : "Carica DDT o foto"}
              </span>
              <input type="file" accept="image/*,.pdf" onChange={handleUpload} disabled={isUploading} className="hidden" />
              {isUploading && <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />}
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={handleConfirm}
            disabled={isSaving || isUploading}
          >
            <PackageCheck className="w-4 h-4 mr-2" />
            {isSaving ? "Salvataggio..." : "Conferma Ricezione"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
