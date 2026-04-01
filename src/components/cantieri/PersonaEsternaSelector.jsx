import React, { useState, useEffect } from "react";
import { backendClient } from "@/api/backendClient";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PersonaEsternaSelector({ value, onSelect, label = "Seleziona Persona", buttonClassName }) {
  const [open, setOpen] = useState(false);
  const [persone, setPersone] = useState([]);
  const [selectedPersona, setSelectedPersona] = useState(null);

  useEffect(() => {
    loadPersone();
  }, []);

  useEffect(() => {
    if (value && persone.length > 0) {
      const persona = persone.find(p => p.id === value);
      setSelectedPersona(persona);
    } else {
      setSelectedPersona(null);
    }
  }, [value, persone]);

  const loadPersone = async () => {
    try {
      const data = await backendClient.entities.PersonaEsterna.list("nome");
      setPersone(data);
    } catch (error) {
      console.error("Errore caricamento persone:", error);
    }
  };

  const handleSelect = (persona) => {
    if (selectedPersona?.id === persona.id) {
      setSelectedPersona(null);
      onSelect(null);
    } else {
      setSelectedPersona(persona);
      onSelect(persona.id);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", buttonClassName)}
        >
          {selectedPersona ? `${selectedPersona.nome} ${selectedPersona.cognome}${selectedPersona.qualifica ? ` - ${selectedPersona.qualifica}` : ''}` : label}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Cerca persona..." />
          <CommandEmpty>Nessuna persona trovata.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {persone.map((persona) => (
              <CommandItem
                key={persona.id}
                value={`${persona.nome} ${persona.cognome} ${persona.qualifica || ''}`}
                onSelect={() => handleSelect(persona)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedPersona?.id === persona.id ? "opacity-100" : "opacity-0"
                  )}
                />
                <div>
                  <div className="font-medium">{persona.nome} {persona.cognome}</div>
                  {persona.qualifica && (
                    <div className="text-xs text-slate-500">{persona.qualifica}</div>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
