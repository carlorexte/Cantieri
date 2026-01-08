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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const soaCategories = [
  { value: "OG1", label: "OG1 - Edifici civili e industriali" },
  { value: "OG2", label: "OG2 - Restauro e manutenzione beni immobili sottoposti a tutela" },
  { value: "OG3", label: "OG3 - Strade, autostrade, ponti, viadotti, ferrovie, metropolitane" },
  { value: "OG4", label: "OG4 - Opere d'arte nel sottosuolo" },
  { value: "OG5", label: "OG5 - Dighe" },
  { value: "OG6", label: "OG6 - Acquedotti, gasdotti, oleodotti, opere di irrigazione e di evacuazione" },
  { value: "OG7", label: "OG7 - Opere marittime e lavori di dragaggio" },
  { value: "OG8", label: "OG8 - Opere fluviali, di difesa, di sistemazione idraulica e di bonifica" },
  { value: "OG9", label: "OG9 - Impianti per la produzione di energia elettrica" },
  { value: "OG10", label: "OG10 - Impianti per la trasformazione ad alta/media tensione e per la distribuzione di energia elettrica in corrente alternata e continua ed impianti di pubblica illuminazione" },
  { value: "OG11", label: "OG11 - Impianti tecnologici" },
  { value: "OG12", label: "OG12 - Opere ed impianti di bonifica e protezione ambientale" },
  { value: "OG13", label: "OG13 - Opere di ingegneria naturalistica" },
  { value: "OS1", label: "OS1 - Lavori in terra" },
  { value: "OS2-A", label: "OS2-A - Superfici decorate di beni immobili del patrimonio culturale e beni culturali mobili di interesse storico, artistico, archeologico ed etnoantropologico" },
  { value: "OS2-B", label: "OS2-B - Beni culturali mobili di interesse archivistico e librario" },
  { value: "OS3", label: "OS3 - Impianti idrico-sanitario, cucine, lavanderie" },
  { value: "OS4", label: "OS4 - Impianti elettromeccanici trasportatori" },
  { value: "OS5", label: "OS5 - Impianti pneumatici e antintrusione" },
  { value: "OS6", label: "OS6 - Finiture di opere generali in materiali lignei, plastici, metallici e vetrosi" },
  { value: "OS7", label: "OS7 - Finiture di opere generali di natura edile e tecnica" },
  { value: "OS8", label: "OS8 - Opere di impermeabilizzazione" },
  { value: "OS9", label: "OS9 - Impianti per la segnaletica luminosa e la sicurezza del traffico" },
  { value: "OS10", label: "OS10 - Segnaletica stradale non luminosa" },
  { value: "OS11", label: "OS11 - Apparecchiature strutturali speciali" },
  { value: "OS12-A", label: "OS12-A - Barriere stradali di sicurezza" },
  { value: "OS12-B", label: "OS12-B - Barriere paramassi, fermaneve e simili" },
  { value: "OS13", label: "OS13 - Strutture prefabbricate in cemento armato" },
  { value: "OS14", label: "OS14 - Impianti di smaltimento e recupero rifiuti" },
  { value: "OS15", label: "OS15 - Pulizia di acque marine, lacustri, fluviali" },
  { value: "OS16", label: "OS16 - Impianti per centrali produzione energia elettrica" },
  { value: "OS17", label: "OS17 - Linee telefoniche ed impianti di telefonia" },
  { value: "OS18-A", label: "OS18-A - Componenti strutturali in acciaio" },
  { value: "OS18-B", label: "OS18-B - Componenti per facciate continue" },
  { value: "OS19", label: "OS19 - Impianti di reti di telecomunicazione e di trasmissioni e trattamento" },
  { value: "OS20-A", label: "OS20-A - Rilevamenti topografici" },
  { value: "OS20-B", label: "OS20-B - Indagini geognostiche" },
  { value: "OS21", label: "OS21 - Opere strutturali speciali" },
  { value: "OS22", label: "OS22 - Impianti di potabilizzazione e depurazione" },
  { value: "OS23", label: "OS23 - Demolizione di opere" },
  { value: "OS24", label: "OS24 - Verde e arredo urbano" },
  { value: "OS25", label: "OS25 - Scavi archeologici" },
  { value: "OS26", label: "OS26 - Pavimentazioni e sovrastrutture speciali" },
  { value: "OS27", label: "OS27 - Impianti per la trazione elettrica" },
  { value: "OS28", label: "OS28 - Impianti termici e di condizionamento" },
  { value: "OS29", label: "OS29 - Armamento ferroviario" },
  { value: "OS30", label: "OS30 - Impianti interni elettrici, telefonici, radiotelefonici e televisivi" },
  { value: "OS31", label: "OS31 - Impianti per trasporto a fune" },
  { value: "OS32", label: "OS32 - Strutture in legno" },
  { value: "OS33", label: "OS33 - Coperture speciali" },
  { value: "OS34", label: "OS34 - Sistema edificio" },
  { value: "OS35", label: "OS35 - Interventi a basso impatto ambientale" }
];

const classificheSOA = ["I", "II", "III", "III-bis", "IV", "IV-bis", "V", "VI", "VII", "VIII"];

function CategorieSOASelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Ensure value is always an array of objects
  const safeValue = Array.isArray(value) ? value.map(v => 
    typeof v === 'string' ? { categoria: v, classifica: "" } : v
  ) : [];

  const handleCheckboxChange = (categoryValue) => {
    const exists = safeValue.find(v => v.categoria === categoryValue);
    if (exists) {
      onChange(safeValue.filter((v) => v.categoria !== categoryValue));
    } else {
      onChange([...safeValue, { categoria: categoryValue, classifica: "" }]);
    }
  };

  const handleClassificaChange = (categoryValue, classifica) => {
    const updated = safeValue.map(v => 
      v.categoria === categoryValue ? { ...v, classifica } : v
    );
    onChange(updated);
  };

  const handleRemoveSelected = (categoryValue) => {
    onChange(safeValue.filter((v) => v.categoria !== categoryValue));
  };

  const filteredCategories = soaCategories.filter(category =>
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
              : "Seleziona Categorie SOA..."}
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
                  id={`soa-${category.value}`}
                  checked={safeValue.some(v => v.categoria === category.value)}
                  onCheckedChange={() => handleCheckboxChange(category.value)}
                />
                <Label htmlFor={`soa-${category.value}`} className="ml-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {category.label}
                </Label>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Visualizza le categorie selezionate con classifica */}
      {safeValue.length > 0 && (
        <div className="flex flex-col gap-2 mt-2 p-3 border rounded-md bg-slate-50/50 max-h-64 overflow-y-auto">
          {safeValue.map((item) => {
            const category = soaCategories.find(cat => cat.value === item.categoria);
            return category ? (
              <div key={item.categoria} className="flex items-center gap-2 p-2 bg-white rounded border">
                <div className="flex-1 text-sm">{category.label}</div>
                <Select 
                  value={item.classifica} 
                  onValueChange={(classifica) => handleClassificaChange(item.categoria, classifica)}
                >
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue>{item.classifica || "Classifica..."}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {classificheSOA.map(cl => (
                      <SelectItem key={cl} value={cl}>{cl} Classifica</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-red-50 hover:text-red-600"
                  onClick={() => handleRemoveSelected(item.categoria)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

export default CategorieSOASelector;