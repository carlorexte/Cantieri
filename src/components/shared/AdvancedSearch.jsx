import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Search, SlidersHorizontal, X, Filter } from "lucide-react";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

export default function AdvancedSearch({ 
  data, 
  searchFields = [], 
  onFilter, 
  placeholder = "Cerca..." 
}) {
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState({}); // { fieldKey: value }
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  // Close suggestions on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Suggestions logic
  const suggestions = useMemo(() => {
    if (!query) return [];
    
    const lastWord = query.split(' ').pop();
    if (!lastWord) return [];

    // Check if typing a field name
    if (!lastWord.includes(':')) {
      return searchFields
        .filter(f => f.label.toLowerCase().startsWith(lastWord.toLowerCase()) || f.key.toLowerCase().startsWith(lastWord.toLowerCase()))
        .map(f => ({ type: 'field', value: `${f.key}:`, label: `Filtra per ${f.label}` }));
    }

    // Check if typing a value for a field
    const [fieldKey, partialValue] = lastWord.split(':');
    const fieldConfig = searchFields.find(f => f.key === fieldKey);
    
    if (fieldConfig) {
      // Get unique values for this field from data
      const uniqueValues = new Set();
      data.forEach(item => {
        const val = String(item[fieldKey] || '');
        if (val && val.toLowerCase().includes(partialValue.toLowerCase())) {
          uniqueValues.add(val);
        }
      });
      return Array.from(uniqueValues).slice(0, 5).map(v => ({ 
        type: 'value', 
        value: `${fieldKey}:${v}`, 
        label: v 
      }));
    }

    return [];
  }, [query, searchFields, data]);

  // Filtering Logic
  useEffect(() => {
    if (!data) return;

    let result = data;

    // 1. Apply active specific filters (from Popover)
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value) {
        result = result.filter(item => {
          const itemVal = String(item[key] || '').toLowerCase();
          return itemVal.includes(value.toLowerCase());
        });
      }
    });

    // 2. Apply Query String
    if (query) {
      const terms = query.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
      
      result = result.filter(item => {
        return terms.every(term => {
          // Handle field:value
          if (term.includes(':') && !term.startsWith('"')) {
            const [key, val] = term.split(':');
            if (searchFields.find(f => f.key === key)) {
              // Handle wildcard in value
              if (val.includes('*')) {
                const regex = new RegExp(val.replace(/\*/g, '.*'), 'i');
                return regex.test(String(item[key] || ''));
              }
              return String(item[key] || '').toLowerCase().includes(val.toLowerCase());
            }
          }

          // Global Search with Wildcard support
          const cleanTerm = term.replace(/"/g, '');
          const isWildcard = cleanTerm.includes('*');
          const regex = isWildcard ? new RegExp(cleanTerm.replace(/\*/g, '.*'), 'i') : null;

          return searchFields.some(field => {
            const val = String(item[field.key] || '');
            if (isWildcard) {
              return regex.test(val);
            }
            return val.toLowerCase().includes(cleanTerm.toLowerCase());
          });
        });
      });
    }

    onFilter(result);
  }, [data, query, activeFilters, searchFields, onFilter]);

  const handleSuggestionClick = (suggestion) => {
    const words = query.split(' ');
    words.pop(); // Remove partial word
    const newQuery = words.join(' ') + (words.length > 0 ? ' ' : '') + suggestion.value + (suggestion.type === 'field' ? '' : ' ');
    setQuery(newQuery);
    inputRef.current?.focus();
    if (suggestion.type !== 'field') setShowSuggestions(false);
  };

  const removeFilter = (key) => {
    const newFilters = { ...activeFilters };
    delete newFilters[key];
    setActiveFilters(newFilters);
  };

  return (
    <div className="w-full space-y-2" ref={wrapperRef}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            ref={inputRef}
            placeholder={placeholder + " (es. nome:*rossi stato:attivo)"}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            className="pl-9"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-50 overflow-hidden">
              <Command>
                <CommandList>
                  <CommandGroup heading="Suggerimenti">
                    {suggestions.map((s, i) => (
                      <CommandItem key={i} onSelect={() => handleSuggestionClick(s)} className="cursor-pointer">
                        <span className="font-medium mr-2">{s.label}</span>
                        {s.type === 'value' && <span className="text-xs text-slate-400">({s.value})</span>}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
          )}
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              Filtri
              {Object.keys(activeFilters).length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1 h-5">{Object.keys(activeFilters).length}</Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="end">
            <h4 className="font-medium mb-3">Filtri Avanzati</h4>
            <div className="space-y-3">
              {searchFields.map(field => (
                <div key={field.key} className="space-y-1">
                  <Label className="text-xs">{field.label}</Label>
                  <Input 
                    value={activeFilters[field.key] || ''}
                    onChange={(e) => setActiveFilters(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={`Filtra per ${field.label.toLowerCase()}...`}
                    className="h-8"
                  />
                </div>
              ))}
              {Object.keys(activeFilters).length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full mt-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => setActiveFilters({})}
                >
                  Rimuovi tutti
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters Display */}
      {Object.entries(activeFilters).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(activeFilters).map(([key, value]) => {
            const field = searchFields.find(f => f.key === key);
            return (
              <Badge key={key} variant="secondary" className="pl-2 pr-1 py-1 gap-1">
                <span className="text-slate-500">{field?.label || key}:</span>
                <span className="font-medium">{value}</span>
                <button 
                  onClick={() => removeFilter(key)}
                  className="ml-1 hover:bg-slate-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}