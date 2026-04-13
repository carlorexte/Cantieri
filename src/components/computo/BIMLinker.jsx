import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Boxes, 
  Search, 
  Plus, 
  Trash2, 
  Loader2, 
  Info,
  CheckCircle2,
  Table as TableIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { backendClient } from '@/api/backendClient';
import { Badge } from '@/components/ui/badge';

export default function BIMLinker({ 
  isOpen, 
  onOpenChange, 
  activity, 
  vociComputo, 
  existingLinks, 
  onLinksUpdated 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [localLinks, setLocalLinks] = useState([]);

  useEffect(() => {
    if (isOpen && existingLinks) {
      setLocalLinks([...existingLinks]);
    }
  }, [isOpen, existingLinks]);

  const filteredVoci = useMemo(() => {
    return vociComputo.filter(v => 
      v.descrizione.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.codice_elenco_prezzi.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [vociComputo, searchTerm]);

  const handleAddLink = async (voce) => {
    const alreadyLinked = localLinks.find(l => l.voce_computo_id === voce.id);
    if (alreadyLinked) {
      toast.info("Voce già collegata");
      return;
    }

    try {
      setIsLinking(true);
      const newLink = await backendClient.entities.AttivitaVoceComputo.link(
        activity.id, 
        voce.id, 
        voce.quantita_prevista // Default alloca tutto per semplicità iniziale
      );
      
      const linkWithData = { ...newLink, voci_computo: voce };
      const updated = [...localLinks, linkWithData];
      setLocalLinks(updated);
      onLinksUpdated(updated);
      toast.success("Voce collegata all'attività");
    } catch (error) {
      toast.error("Errore nel collegamento");
    } finally {
      setIsLinking(false);
    }
  };

  const handleRemoveLink = async (linkId) => {
    try {
      setIsLinking(true);
      await backendClient.entities.AttivitaVoceComputo.unlink(linkId);
      const updated = localLinks.filter(l => l.id !== linkId);
      setLocalLinks(updated);
      onLinksUpdated(updated);
      toast.success("Voce scollegata");
    } catch (error) {
      toast.error("Errore nello scollegamento");
    } finally {
      setIsLinking(false);
    }
  };

  const currentTotal = useMemo(() => {
    return localLinks.reduce((sum, l) => sum + (l.quantita_allocata * (l.voci_computo?.prezzo_unitario || 0)), 0);
  }, [localLinks]);

  if (!activity) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 overflow-hidden bg-slate-50 border-none shadow-2xl">
        <DialogHeader className="p-6 bg-white border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <Boxes className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">Gestione BIM 5D</DialogTitle>
                <p className="text-sm text-slate-500 mt-0.5">Collega le voci del computo all'attività: <span className="font-bold text-slate-700">{activity.descrizione}</span></p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Importo Totale Collegato</p>
              <p className="text-2xl font-black text-indigo-600">€ {currentTotal.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Left: Search & Available Voci */}
          <div className="w-1/2 border-r border-slate-200 flex flex-col bg-white">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Cerca nel computo metrico..." 
                  className="pl-10 bg-white border-slate-200 focus-visible:ring-indigo-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-0">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="sticky top-0 bg-white border-b border-slate-200 z-10 shadow-sm">
                    <tr>
                      <th className="px-4 py-2 font-bold text-slate-400 uppercase tracking-tight">Codice/Descrizione</th>
                      <th className="px-4 py-2 font-bold text-slate-400 uppercase tracking-tight text-right">Prezzo</th>
                      <th className="px-4 py-2 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredVoci.map((voce) => {
                      const isLinked = localLinks.some(l => l.voce_computo_id === voce.id);
                      return (
                        <tr key={voce.id} className={`group hover:bg-indigo-50/30 transition-colors ${isLinked ? 'bg-indigo-50/20' : ''}`}>
                          <td className="px-4 py-3">
                            <div className="font-mono text-[10px] text-slate-400 mb-0.5">{voce.codice_elenco_prezzi || 'SENZA CODICE'}</div>
                            <div className={`font-medium text-slate-800 leading-snug line-clamp-2 ${isLinked ? 'text-indigo-900' : ''}`}>{voce.descrizione}</div>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-600">
                            € {voce.prezzo_unitario.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button 
                              size="icon" 
                              variant={isLinked ? "ghost" : "outline"} 
                              className={`h-7 w-7 ${isLinked ? 'text-emerald-500' : 'hover:border-indigo-400 hover:text-indigo-600'}`}
                              onClick={() => handleAddLink(voce)}
                              disabled={isLinking || isLinked}
                            >
                              {isLinked ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          </div>

          {/* Right: Existing Links */}
          <div className="w-1/2 flex flex-col bg-slate-50/50">
            <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Voci Collegate
              </h3>
              <Badge variant="outline" className="bg-white">{localLinks.length} voci</Badge>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              {localLinks.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                  <TableIcon className="w-12 h-12 mb-3" />
                  <p className="text-sm font-medium">Nessuna voce collegata</p>
                  <p className="text-xs">Seleziona le voci dal pannello di sinistra per associarle a questa attività del cronoprogramma.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {localLinks.map((link) => (
                    <div key={link.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 group hover:border-indigo-200 transition-all">
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <div className="flex-1">
                          <div className="text-[10px] font-mono text-slate-400 uppercase mb-1">{link.voci_computo?.codice_elenco_prezzi}</div>
                          <p className="text-xs font-semibold text-slate-900 leading-tight">{link.voci_computo?.descrizione}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-300 hover:text-red-600 hover:bg-red-50 -mt-2 -mr-2"
                          onClick={() => handleRemoveLink(link.id)}
                          disabled={isLinking}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                        <div className="flex items-center gap-3">
                          <div className="text-[10px]">
                            <p className="text-slate-400 font-bold uppercase tracking-tighter">Quantità</p>
                            <p className="text-slate-900 font-black">{link.quantita_allocata} {link.voci_computo?.unita_misura}</p>
                          </div>
                          <div className="text-[10px]">
                            <p className="text-slate-400 font-bold uppercase tracking-tighter">Prezzo Un.</p>
                            <p className="text-slate-900 font-bold">€ {link.voci_computo?.prezzo_unitario.toLocaleString('it-IT')}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-slate-400 font-bold uppercase">Subtotale</p>
                          <p className="text-sm font-black text-indigo-600">€ {(link.quantita_allocata * (link.voci_computo?.prezzo_unitario || 0)).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="p-4 bg-white border-t border-slate-200 shadow-inner">
          <div className="flex items-center gap-3 text-slate-400 text-xs mr-auto ml-2">
            <Info className="w-4 h-4" />
            <span>Collega le voci di computo per avere una stima reale 5D del costo dell'attività</span>
          </div>
          <Button onClick={() => onOpenChange(false)} className="bg-slate-900 hover:bg-slate-800 px-8">
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
