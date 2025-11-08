import React, { useState, useEffect } from "react";
import { Impresa } from "@/entities/Impresa";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export default function ImpresaSelector({ label = "Seleziona Impresa dall'Anagrafica", onImpresaSelect }) {
  const [open, setOpen] = useState(false);
  const [imprese, setImprese] = useState([]);
  const [selectedImpresa, setSelectedImpresa] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadImprese();
  }, []);

  const loadImprese = async () => {
    setIsLoading(true);
    try {
      const data = await Impresa.list("ragione_sociale");
      setImprese(data);
    } catch (error) {
      console.error("Errore caricamento imprese:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (impresa) => {
    setSelectedImpresa(impresa);
    setOpen(false);
    if (onImpresaSelect) {
      onImpresaSelect(impresa);
    }
  };

  const handleClear = () => {
    setSelectedImpresa(null);
    if (onImpresaSelect) {
      onImpresaSelect(null);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
        <Building2 className="w-4 h-4" />
        {label}
      </Label>
      
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="flex-1 justify-between"
              disabled={isLoading}
            >
              {isLoading ? (
                "Caricamento..."
              ) : selectedImpresa ? (
                <span className="truncate">
                  {selectedImpresa.ragione_sociale}
                  {selectedImpresa.partita_iva && ` - P.IVA: ${selectedImpresa.partita_iva}`}
                </span>
              ) : (
                "Seleziona un'impresa..."
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Cerca impresa..." />
              <CommandEmpty>
                {isLoading ? "Caricamento..." : "Nessuna impresa trovata."}
              </CommandEmpty>
              <CommandGroup className="max-h-64 overflow-auto">
                {imprese.map((impresa) => (
                  <CommandItem
                    key={impresa.id}
                    value={`${impresa.ragione_sociale} ${impresa.partita_iva || ''}`}
                    onSelect={() => handleSelect(impresa)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedImpresa?.id === impresa.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{impresa.ragione_sociale}</div>
                      <div className="text-xs text-slate-500">
                        {impresa.partita_iva && `P.IVA: ${impresa.partita_iva}`}
                        {impresa.citta_legale && ` • ${impresa.citta_legale}`}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
        
        {selectedImpresa && (
          <Button
            variant="outline"
            onClick={handleClear}
            className="px-3"
          >
            Cancella
          </Button>
        )}
      </div>
      
      {selectedImpresa && (
        <div className="text-sm text-slate-600 bg-blue-50 border border-blue-200 rounded-md p-3">
          <p className="font-medium text-blue-900">Impresa selezionata: {selectedImpresa.ragione_sociale}</p>
          <p className="text-xs text-blue-700 mt-1">
            I campi sottostanti verranno compilati automaticamente. Puoi modificarli se necessario.
          </p>
        </div>
      )}
    </div>
  );
}