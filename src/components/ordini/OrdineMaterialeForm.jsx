import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Plus, Upload, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/components/shared/DataContext";

export default function OrdineMaterialeForm({ ordine, onSubmit, onCancel }) {
  const { cantieri } = useData();
  const [users, setUsers] = useState([]);
  const [aziende, setAziende] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingAziende, setLoadingAziende] = useState(false);

  const form = useForm({
    defaultValues: ordine || {
      cantiere_id: "",
      descrizione: "",
      fornitore_ragione_sociale: "",
      fornitore_email: "",
      data_ordine: new Date().toISOString().split('T')[0],
      priorita: "media",
      stato: "bozza",
      responsabile_id: "",
      societa_intestataria_id: "",
      societa_intestataria_ragione_sociale: "",
      societa_intestataria_partita_iva: "",
      societa_intestataria_codice_fiscale: "",
      societa_intestataria_indirizzo: "",
      societa_intestataria_email: "",
      societa_intestataria_pec: "",
      importo_totale: 0,
      tipo_operazione: "acquisto",
      durata_noleggio: "",
      condizioni_ordine: "",
      dettagli_materiali: [{ descrizione: "", quantita: 1, unita_misura: "pz", note: "" }],
      note: ""
    }
  });

  // Load users for "Responsabile" selection
  useEffect(() => {
    const loadDependencies = async () => {
      setLoadingUsers(true);
      setLoadingAziende(true);
      try {
        const [usersList, aziendeList] = await Promise.all([
          base44.entities.User.list(),
          base44.entities.Azienda.list()
        ]);
        setUsers(usersList);
        setAziende(aziendeList);

        if (!ordine && !form.getValues("societa_intestataria_id") && aziendeList.length > 0) {
          const defaultAzienda = aziendeList[0];
          form.setValue("societa_intestataria_id", defaultAzienda.id);
          form.setValue("societa_intestataria_ragione_sociale", defaultAzienda.ragione_sociale || "");
          form.setValue("societa_intestataria_partita_iva", defaultAzienda.partita_iva || "");
          form.setValue("societa_intestataria_codice_fiscale", defaultAzienda.codice_fiscale || "");
          form.setValue("societa_intestataria_indirizzo", defaultAzienda.indirizzo_legale || "");
          form.setValue("societa_intestataria_email", defaultAzienda.email || "");
          form.setValue("societa_intestataria_pec", defaultAzienda.pec || "");
        }
      } catch (e) {
        console.error("Error loading dependencies", e);
      } finally {
        setLoadingUsers(false);
        setLoadingAziende(false);
      }
    };
    loadDependencies();
  }, [ordine, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "dettagli_materiali"
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      form.setValue("file_allegato_uri", file_url);
      toast.success("File caricato con successo");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Errore durante il caricamento del file");
    } finally {
      setIsUploading(false);
    }
  };

  const onFormSubmit = async (data) => {
    // Ensure numbers
    data.dettagli_materiali = data.dettagli_materiali.map(item => ({
      ...item,
      quantita: Number(item.quantita)
    }));
    
    if (data.importo_totale) {
        data.importo_totale = Number(data.importo_totale);
    }

    // Generate numero_ordine if new (simple timestamp/random based for now, ideally backend logic)
    if (!ordine && !data.numero_ordine) {
        data.numero_ordine = `ORD-${Date.now().toString().slice(-6)}`;
        // Set current user as sub_user
        const me = await base44.auth.me();
        data.sub_user_id = me.id;
    }

    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cantiere */}
          <FormField
            control={form.control}
            name="cantiere_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cantiere</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!ordine}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona cantiere" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {cantieri.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.denominazione}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Responsabile Approvazione */}
          <FormField
            control={form.control}
            name="responsabile_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Responsabile Approvazione</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingUsers ? "Caricamento..." : "Seleziona responsabile"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="societa_intestataria_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Societa Intestataria Ordine</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  const aziendaSelezionata = aziende.find(a => a.id === value);
                  form.setValue("societa_intestataria_ragione_sociale", aziendaSelezionata?.ragione_sociale || "");
                  form.setValue("societa_intestataria_partita_iva", aziendaSelezionata?.partita_iva || "");
                  form.setValue("societa_intestataria_codice_fiscale", aziendaSelezionata?.codice_fiscale || "");
                  form.setValue("societa_intestataria_indirizzo", aziendaSelezionata?.indirizzo_legale || "");
                  form.setValue("societa_intestataria_email", aziendaSelezionata?.email || "");
                  form.setValue("societa_intestataria_pec", aziendaSelezionata?.pec || "");
                }}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingAziende ? "Caricamento societa..." : "Seleziona societa intestataria"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {aziende.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.ragione_sociale || "Societa senza nome"}{a.partita_iva ? ` - P.IVA ${a.partita_iva}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                L'ordine verra intestato alla societa selezionata.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Descrizione Generale */}
        <FormField
          control={form.control}
          name="descrizione"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Oggetto Ordine</FormLabel>
              <FormControl>
                <Input placeholder="Es. Materiale per getto solai" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tipo Operazione e Durata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-lg bg-slate-50">
            <FormField
                control={form.control}
                name="tipo_operazione"
                render={({ field }) => (
                    <FormItem className="space-y-3">
                        <FormLabel>Tipo Operazione</FormLabel>
                        <FormControl>
                            <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-col space-y-1"
                            >
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                        <RadioGroupItem value="acquisto" />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                        Acquisto
                                    </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                        <RadioGroupItem value="noleggio" />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                        Noleggio
                                    </FormLabel>
                                </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {form.watch("tipo_operazione") === "noleggio" && (
                <FormField
                    control={form.control}
                    name="durata_noleggio"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Durata Noleggio</FormLabel>
                            <FormControl>
                                <Input placeholder="Es. 30 giorni, 2 mesi..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="fornitore_ragione_sociale"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fornitore</FormLabel>
                <FormControl>
                  <Input placeholder="Ragione Sociale" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fornitore_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Fornitore</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="email@fornitore.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="data_ordine"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data Ordine</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="importo_totale"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Valore Totale (€)</FormLabel>
                        <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="condizioni_ordine"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Condizioni / Pagamento</FormLabel>
                        <FormControl>
                            <Input placeholder="Es. Pagamento 30/60/90 gg..." {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
          </div>

        {/* Lista Materiali */}
        <div className="space-y-3">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-slate-700">Dettaglio Materiali</h3>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ descrizione: "", quantita: 1, unita_misura: "pz" })}>
                    <Plus className="w-4 h-4 mr-2" /> Aggiungi Riga
                </Button>
            </div>
            
            <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                        <tr>
                            <th className="px-4 py-2 text-left font-medium text-slate-500 w-[40%]">Articolo/Descrizione</th>
                            <th className="px-4 py-2 text-left font-medium text-slate-500 w-[15%]">Qtà</th>
                            <th className="px-4 py-2 text-left font-medium text-slate-500 w-[15%]">U.M.</th>
                            <th className="px-4 py-2 text-left font-medium text-slate-500">Note</th>
                            <th className="px-4 py-2 w-[50px]"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {fields.map((field, index) => (
                            <tr key={field.id} className="group hover:bg-slate-50">
                                <td className="p-2">
                                    <Input {...form.register(`dettagli_materiali.${index}.descrizione`)} placeholder="Nome articolo" className="h-8" />
                                </td>
                                <td className="p-2">
                                    <Input type="number" {...form.register(`dettagli_materiali.${index}.quantita`)} className="h-8" />
                                </td>
                                <td className="p-2">
                                    <Input {...form.register(`dettagli_materiali.${index}.unita_misura`)} placeholder="pz, kg..." className="h-8" />
                                </td>
                                <td className="p-2">
                                    <Input {...form.register(`dettagli_materiali.${index}.note`)} placeholder="Opzionale" className="h-8" />
                                </td>
                                <td className="p-2 text-center">
                                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => remove(index)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {fields.length === 0 && (
                    <div className="p-6 text-center text-slate-500 bg-slate-50">
                        Nessun articolo inserito
                    </div>
                )}
            </div>
        </div>

        {/* Footer actions & Upload */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
            <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Note Interne</FormLabel>
                    <FormControl>
                        <Textarea placeholder="Note visibili solo internamente..." className="h-20" {...field} />
                    </FormControl>
                </FormItem>
                )}
            />
            
            <div className="space-y-3">
                <FormLabel>Allegato (Preventivo/Foto)</FormLabel>
                <div className="flex items-center gap-3">
                    <Input 
                        type="file" 
                        onChange={handleFileUpload} 
                        disabled={isUploading}
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" 
                    />
                    {isUploading && <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />}
                </div>
                {form.watch("file_allegato_uri") && (
                    <div className="text-xs text-green-600 flex items-center gap-1">
                        <Save className="w-3 h-3" /> File caricato correttamente
                    </div>
                )}
                
                <FormField
                    control={form.control}
                    name="stato"
                    render={({ field }) => (
                    <FormItem className="mt-4">
                        <FormLabel>Stato Iniziale</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="bozza">Bozza (Privato)</SelectItem>
                            <SelectItem value="in_attesa_approvazione">Invia per Approvazione</SelectItem>
                        </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500 mt-1">
                            Seleziona "Invia per Approvazione" per notificare il responsabile.
                        </p>
                    </FormItem>
                    )}
                />
            </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
                Annulla
            </Button>
            <Button type="submit" disabled={isUploading}>
                {ordine ? "Salva Modifiche" : "Crea Ordine"}
            </Button>
        </div>
      </form>
    </Form>
  );
}
