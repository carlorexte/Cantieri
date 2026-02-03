import React, { useState } from 'react';
import { useData } from '@/components/shared/DataContext';
import { usePermissions } from '@/components/shared/PermissionGuard';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, 
  Plus, 
  Search, 
  Filter,
  FileText,
  Truck,
  CheckCircle2,
  Clock
} from 'lucide-react';

export default function OrdiniMateriali() {
  const { hasPermission } = usePermissions();
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Ordini Materiale</h1>
            <p className="text-slate-500 mt-1">Gestione ordini e approvvigionamenti cantiere</p>
          </div>
          
          {(hasPermission('ordini_create') || hasPermission('admin')) && (
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-5 h-5 mr-2" />
              Nuovo Ordine
            </Button>
          )}
        </div>

        {/* Placeholder Content */}
        <div className="grid gap-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Nessun ordine presente</h3>
              <p className="text-slate-600 max-w-md mx-auto">
                La funzionalità di gestione ordini materiali è stata attivata. 
                Qui potrai gestire le richieste di approvvigionamento dai cantieri.
              </p>
              {(hasPermission('ordini_create') || hasPermission('admin')) && (
                <Button className="mt-6 bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Crea il primo ordine
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}