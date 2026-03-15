
import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Euro, FileText } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function SubappaltoDetail({ subappalto, cantiere, onClose }) {
  const [salList, setSalList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingRow, setEditingRow] = useState(null);
  const [newSal, setNewSal] = useState({
    numero_sal: 1,
    tipo_sal: "sal_progressivo",
    data_sal: "",
    numero_fattura: "",
    imponibile: 0,
    iva_10: 0,
    totale: 0,
    data_pagamento: "",
    importo_pagamento: 0,
    stato_pagamento: "da_pagare"
  });

  const loadSAL = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await base44.entities.SALSubappalto.filter({ subappalto_id: subappalto.id }, "numero_sal");
      setSalList(data);
    } catch (error) {
      console.error("Errore caricamento SAL:", error);
      setSalList([]);
    }
    setIsLoading(false);
  }, [subappalto.id]); // Added subappalto.id as a dependency

  useEffect(() => {
    loadSAL();
  }, [loadSAL]); // Now depends on loadSAL itself

  const handleSaveSAL = async (salData) => {
    try {
      const dataToSave = {
        ...salData,
        subappalto_id: subappalto.id,
        iva_10: salData.imponibile * 0.1,
        totale: salData.imponibile * 1.1
      };

      if (salData.id) {
        await base44.entities.SALSubappalto.update(salData.id, dataToSave);
      } else {
        await base44.entities.SALSubappalto.create(dataToSave);
      }

      // After saving, re-fetch the latest SALs to update the list and get the correct next numero_sal
      const updatedSalList = await base44.entities.SALSubappalto.filter({ subappalto_id: subappalto.id }, "numero_sal");
      setSalList(updatedSalList); // Update the state with the fresh list
      setEditingRow(null);

      // Recalculate the next SAL number based on the fresh updatedSalList
      setNewSal(prevNewSal => ({
        ...prevNewSal,
        numero_sal: Math.max(...updatedSalList.map(s => s.numero_sal || 0), 0) + 1,
        data_sal: "",
        numero_fattura: "",
        imponibile: 0,
        iva_10: 0,
        totale: 0,
        data_pagamento: "",
        importo_pagamento: 0,
        stato_pagamento: "da_pagare"
      }));
    } catch (error) {
      console.error("Errore salvataggio SAL:", error);
    }
  };

  const calculateTotals = useCallback(() => {
    return salList.reduce((totals, sal) => ({
      imponibile: totals.imponibile + (sal.imponibile || 0),
      iva: totals.iva + (sal.iva_10 || 0),
      totale: totals.totale + (sal.totale || 0),
      pagamenti: totals.pagamenti + (sal.importo_pagamento || 0)
    }), { imponibile: 0, iva: 0, totale: 0, pagamenti: 0 });
  }, [salList]); // Depend on salList

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Header Informazioni Subappalto */}
      <Card className="border-0 shadow-sm bg-slate-50">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-slate-700 mb-3">ENTE APPALTANTE:</h3>
              <p className="text-slate-900">{cantiere?.committente_ragione_sociale || "N/D"}</p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-700 mb-3">APPALTO:</h3>
              <p className="text-slate-900">{cantiere?.oggetto_lavori || cantiere?.denominazione}</p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-700 mb-3">Appaltatore:</h3>
              <p className="text-slate-900">{cantiere?.azienda_appaltatrice_ragione_sociale || "CONSORZIO STABILE DEL MEDITERRANEO S.C.A R.L."}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded">
              <h3 className="font-semibold text-slate-700 mb-2">SUBAPPALTATORE:</h3>
              <p className="font-bold text-slate-900">{subappalto.ragione_sociale}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dati Contrattuali */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <h4 className="font-semibold text-slate-700 mb-2">IMPORTO CONTRATTO</h4>
              <p className="text-lg font-bold text-slate-900">€ {subappalto.importo_contratto?.toLocaleString('it-IT') || '0'}</p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-700 mb-2">ONERI SICUREZZA</h4>
              <p className="text-lg font-bold text-slate-900">€ {subappalto.oneri_sicurezza?.toLocaleString('it-IT') || '0'}</p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-700 mb-2">IMPORTO CONTRATTUALE oltre IVA al 10%</h4>
              <p className="text-lg font-bold text-slate-900">€ {subappalto.importo_contrattuale?.toLocaleString('it-IT') || '0'}</p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-700 mb-2">RIBASSO</h4>
              <p className="text-lg font-bold text-slate-900">{subappalto.ribasso_percentuale || 0}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabella SAL */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Stati di Avanzamento Lavori (SAL)
            </CardTitle>
            <Button
              onClick={() => {
                // Ensure the next SAL number is based on the current salList state
                const currentMaxSalNumber = Math.max(...salList.map(s => s.numero_sal || 0), 0);
                setNewSal(prevNewSal => ({
                  ...prevNewSal,
                  numero_sal: currentMaxSalNumber + 1,
                  data_sal: "",
                  numero_fattura: "",
                  imponibile: 0,
                  iva_10: 0,
                  totale: 0,
                  data_pagamento: "",
                  importo_pagamento: 0,
                  stato_pagamento: "da_pagare"
                }));
                setEditingRow('new');
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuovo SAL
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold">SAL n.</TableHead>
                  <TableHead className="font-semibold">DATA</TableHead>
                  <TableHead className="font-semibold">n. fatt.</TableHead>
                  <TableHead className="font-semibold">IMPONIBILE</TableHead>
                  <TableHead className="font-semibold">IVA 10%</TableHead>
                  <TableHead className="font-semibold">TOTALE</TableHead>
                  <TableHead className="font-semibold">DATA</TableHead>
                  <TableHead className="font-semibold">PAGAMENTI</TableHead>
                  <TableHead className="font-semibold">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Riga Anticipazione */}
                <TableRow className="bg-blue-50">
                  <TableCell className="font-medium">Anticipazione</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>€ -</TableCell>
                  <TableCell>€ -</TableCell>
                  <TableCell>€ -</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                </TableRow>

                {/* SAL Esistenti */}
                {salList.map((sal, index) => (
                  <TableRow key={sal.id}>
                    <TableCell className="font-medium">{sal.numero_sal}</TableCell>
                    <TableCell>{sal.data_sal ? new Date(sal.data_sal).toLocaleDateString('it-IT') : '-'}</TableCell>
                    <TableCell>{sal.numero_fattura || '-'}</TableCell>
                    <TableCell>€ {sal.imponibile?.toLocaleString('it-IT') || '0'}</TableCell>
                    <TableCell>€ {sal.iva_10?.toLocaleString('it-IT') || '0'}</TableCell>
                    <TableCell>€ {sal.totale?.toLocaleString('it-IT') || '0'}</TableCell>
                    <TableCell>{sal.data_pagamento ? new Date(sal.data_pagamento).toLocaleDateString('it-IT') : '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>€ {sal.importo_pagamento?.toLocaleString('it-IT') || '0'}</span>
                        <Badge variant={sal.stato_pagamento === 'pagato' ? 'default' : 'secondary'} className="text-xs">
                          {sal.stato_pagamento}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        Modifica
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {/* Form Nuovo SAL */}
                {editingRow === 'new' && (
                  <TableRow className="bg-green-50">
                    <TableCell>
                      <Input
                        type="number"
                        value={newSal.numero_sal}
                        onChange={(e) => setNewSal({ ...newSal, numero_sal: parseInt(e.target.value) })}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={newSal.data_sal}
                        onChange={(e) => setNewSal({ ...newSal, data_sal: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={newSal.numero_fattura}
                        onChange={(e) => setNewSal({ ...newSal, numero_fattura: e.target.value })}
                        placeholder="Num. fattura"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={newSal.imponibile}
                        onChange={(e) => setNewSal({ ...newSal, imponibile: parseFloat(e.target.value) || 0 })}
                        step="0.01"
                      />
                    </TableCell>
                    <TableCell>
                      € {(newSal.imponibile * 0.1).toLocaleString('it-IT')}
                    </TableCell>
                    <TableCell>
                      € {(newSal.imponibile * 1.1).toLocaleString('it-IT')}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={newSal.data_pagamento}
                        onChange={(e) => setNewSal({ ...newSal, data_pagamento: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={newSal.importo_pagamento}
                        onChange={(e) => setNewSal({ ...newSal, importo_pagamento: parseFloat(e.target.value) || 0 })}
                        step="0.01"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => handleSaveSAL(newSal)}>
                          Salva
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setEditingRow(null)}>
                          Annulla
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {/* Riga S.FINALE */}
                <TableRow className="bg-orange-50">
                  <TableCell className="font-bold">S.FINALE</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                </TableRow>

                {/* Riga TOTALE */}
                <TableRow className="bg-slate-100 border-t-2 border-slate-300">
                  <TableCell className="font-bold">TOTALE</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell className="font-bold">€ {totals.imponibile.toLocaleString('it-IT')}</TableCell>
                  <TableCell className="font-bold">€ {totals.iva.toLocaleString('it-IT')}</TableCell>
                  <TableCell className="font-bold">€ {totals.totale.toLocaleString('it-IT')}</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell className="font-bold">€ {totals.pagamenti.toLocaleString('it-IT')}</TableCell>
                  <TableCell>-</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
