import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button";

const lavoriCategories = [
  { value: "strutture_cemento", label: "Strutture in Cemento Armato" },
  { value: "murature", label: "Murature e Tamponamenti" },
  { value: "impermeabilizzazioni", label: "Impermeabilizzazioni" },
  { value: "coperture", label: "Coperture" },
  { value: "impianti_elettrici", label: "Impianti Elettrici" },
  { value: "impianti_idraulici", label: "Impianti Idraulici e Termici" },
  { value: "finiture_interne", label: "Finiture Interne (pavimenti, intonaci)" },
  { value: "finiture_esterne", label: "Finiture Esterne (facciate)" },
  { value: "infissi", label: "Infissi e Serramenti" },
  { value: "movimento_terra", label: "Movimento Terra e Scavi" },
  { value: "bonifiche", label: "Bonifiche Ambientali" },
  { value: "restauro", label: "Restauro e Risanamento Conservativo" },
  { value: "urbanizzazione", label: "Opere di Urbanizzazione" },
  { value: "demolizioni", label: "Demolizioni" },
  { value: "scavi", label: "Scavi e Fondazioni" },
  { value: "pavimentazioni", label: "Pavimentazioni Stradali e Aree Esterne" },
  { value: "reti_fognarie", label: "Reti Fognarie e Acquedotti" },
  { value: "verde", label: "Sistemazioni a Verde" },
];

function CategorieLavoriSelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Ensure value is always an array
  const safeValue = Array.isArray(value) ? value : [];

  const handleCheckboxChange = (categoryValue) => {
    if (safeValue.includes(categoryValue)) {
      onChange(safeValue.filter((v) => v !== categoryValue));
    } else {
      onChange([...safeValue, categoryValue]);
    }
  };

  const handleRemoveSelected = (categoryValue) => {
    onChange(safeValue.filter((v) => v !== categoryValue));
  };

  const filteredCategories = lavoriCategories.filter(category =>
    category.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {safeValue.length > 0
              ? `${safeValue.length} categorie selezionate`
              : "Seleziona Tipologie Lavori..."}
            {safeValue.length > 0 && (
              <X className="ml-2 h-4 w-4 shrink-0 opacity-50" onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }} />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder="Cerca categoria..."
              className="h-10 w-full border-0 focus-visible:ring-0"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto p-2">
            {filteredCategories.length === 0 && (
              <p className="p-2 text-sm text-muted-foreground">Nessuna categoria trovata.</p>
            )}
            {filteredCategories.map((category) => (
              <div key={category.value} className="pl-1 pr-3 py-1.5 flex items-center">
                <Checkbox
                  id={`lavori-${category.value}`}
                  checked={safeValue.includes(category.value)}
                  onCheckedChange={() => handleCheckboxChange(category.value)}
                />
                <Label htmlFor={`lavori-${category.value}`} className="ml-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {category.label}
                </Label>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Visualizza le tipologie selezionate come badge in colonna */}
      {safeValue.length > 0 && (
        <div className="flex flex-col gap-1 mt-2 p-2 border rounded-md bg-slate-50/50 max-h-48 overflow-y-auto">
          {safeValue.map((selectedVal) => {
            const category = lavoriCategories.find(cat => cat.value === selectedVal);
            return category ? (
              <Badge key={selectedVal} variant="secondary" className="pr-1 flex items-center justify-between">
                <span className="text-sm font-normal">{category.label}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="ml-1 h-5 w-5 p-0.5 rounded-full hover:bg-slate-200"
                  onClick={() => handleRemoveSelected(selectedVal)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

export default CategorieLavoriSelector;