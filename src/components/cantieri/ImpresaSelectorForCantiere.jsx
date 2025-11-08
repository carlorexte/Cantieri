import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Building2, X } from "lucide-react";

export default function ImpresaSelectorForCantiere({ label, currentValues, onImpresaSelect }) {
  const [imprese, setImprese] = useState([]);
  const [selectedImpresaId, setSelectedImpresaId] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadImprese();
  }, []);

  const loadImprese = async () => {
    setIsLoading(true);
    try {
      const data = await base44.entities.Impresa.list();
      setImprese(data);
    } catch (error) {
      console.error("Errore caricamento imprese:", error);
    }
    setIsLoading(false);
  };

  const handleSelect = (impresaId) => {
    setSelectedImpresaId(impresaId);
    const impresa = imprese.find(i => i.id === impresaId);
    console.log("Impresa selezionata:", impresa);
    if (impresa && onImpresaSelect) {
      onImpresaSelect(impresa);
    }
  };

  const handleClear = () => {
    setSelectedImpresaId("");
    console.log("Selezione impresa cancellata");
    if (onImpresaSelect) {
      onImpresaSelect(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Label className="text-sm font-medium text-slate-700 mb-2 block">
            <Building2 className="w-4 h-4 inline mr-1" />
            {label || "Seleziona da Anagrafica Imprese"}
          </Label>
          <Select value={selectedImpresaId} onValueChange={handleSelect} disabled={isLoading}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={isLoading ? "Caricamento..." : "Seleziona un'impresa dall'anagrafica..."} />
            </SelectTrigger>
            <SelectContent>
              {imprese.map(impresa => (
                <SelectItem key={impresa.id} value={impresa.id}>
                  {impresa.ragione_sociale} {impresa.partita_iva ? `- P.IVA: ${impresa.partita_iva}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedImpresaId && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="mt-7"
            title="Cancella selezione"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
      {currentValues?.ragione_sociale && (
        <div className="text-sm text-slate-600 bg-blue-50 border border-blue-200 rounded-md p-3">
          <p className="font-medium text-blue-900">Impresa selezionata: {currentValues.ragione_sociale}</p>
          <p className="text-xs text-blue-700 mt-1">I campi sottostanti sono stati compilati automaticamente. Puoi modificarli se necessario.</p>
        </div>
      )}
    </div>
  );
}