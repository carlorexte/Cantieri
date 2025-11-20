import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Filter, X } from 'lucide-react';

export default function DashboardFilters({ filters, onFiltersChange, onReset, committenti }) {
  return (
    <Card className="border-0 shadow-lg bg-white" style={{ borderRadius: '16px' }}>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label className="text-sm text-slate-600 mb-2">Stato Cantiere</Label>
            <Select 
              value={filters.stato} 
              onValueChange={(value) => onFiltersChange({ ...filters, stato: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tutti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tutti">Tutti</SelectItem>
                <SelectItem value="attivo">Attivi</SelectItem>
                <SelectItem value="sospeso">Sospesi</SelectItem>
                <SelectItem value="completato">Completati</SelectItem>
                <SelectItem value="in_gara">In Gara</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm text-slate-600 mb-2">Committente</Label>
            <Select 
              value={filters.committente} 
              onValueChange={(value) => onFiltersChange({ ...filters, committente: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tutti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tutti">Tutti</SelectItem>
                {committenti.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm text-slate-600 mb-2">Anno</Label>
            <Select 
              value={filters.anno} 
              onValueChange={(value) => onFiltersChange({ ...filters, anno: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tutti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tutti">Tutti</SelectItem>
                {[2025, 2024, 2023, 2022, 2021].map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm text-slate-600 mb-2">Valore Min (€)</Label>
            <Input
              type="number"
              placeholder="0"
              value={filters.valoreMin || ''}
              onChange={(e) => onFiltersChange({ ...filters, valoreMin: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={onReset}
            className="gap-2"
          >
            <X className="w-4 h-4" />
            Reset Filtri
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}