import React, { useState } from 'react';
import { supabaseDB, supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { X, Upload } from 'lucide-react';

const TIPO_OPTIONS = [
  { value: 'ritardo', label: 'Ritardo' },
  { value: 'problema_sicurezza', label: 'Problema Sicurezza' },
  { value: 'qualita', label: 'Qualità' },
  { value: 'altro', label: 'Altro' },
];

export default function SegnalazioneForm({ cantiereId, attivitaList = [], preselectedAttivitaId, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    tipo: 'ritardo',
    titolo: '',
    descrizione: '',
    attivita_id: preselectedAttivitaId || '',
  });
  const [foto, setFoto] = useState([]);
  const [fotoPreviews, setFotoPreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFotoChange = (e) => {
    const files = Array.from(e.target.files);
    setFoto(prev => [...prev, ...files]);
    setFotoPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
  };

  const removeFoto = (idx) => {
    URL.revokeObjectURL(fotoPreviews[idx]);
    setFoto(prev => prev.filter((_, i) => i !== idx));
    setFotoPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titolo.trim()) {
      toast.error('Il titolo è obbligatorio');
      return;
    }
    setIsSubmitting(true);
    try {
      const fotoUrls = [];
      for (const file of foto) {
        const url = await supabaseDB.segnalazioni.uploadFoto(cantiereId, file);
        fotoUrls.push(url);
      }

      const { data: { user } } = await supabase.auth.getUser();
      await supabaseDB.segnalazioni.create({
        cantiere_id: cantiereId,
        attivita_id: form.attivita_id || null,
        tipo: form.tipo,
        titolo: form.titolo.trim(),
        descrizione: form.descrizione.trim() || null,
        foto: fotoUrls.length ? fotoUrls : null,
        autore_id: user?.id || null,
      });
      toast.success('Segnalazione aggiunta');
      onSuccess();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Errore durante il salvataggio');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Tipo *</Label>
          <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIPO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {attivitaList.length > 0 && (
          <div>
            <Label>Attività correlata</Label>
            <Select
              value={form.attivita_id || '__none__'}
              onValueChange={v => setForm(f => ({ ...f, attivita_id: v === '__none__' ? '' : v }))}
            >
              <SelectTrigger className="mt-1"><SelectValue placeholder="Nessuna" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nessuna</SelectItem>
                {attivitaList.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.wbs ? `[${a.wbs}] ` : ''}{a.descrizione}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div>
        <Label>Titolo *</Label>
        <Input
          className="mt-1"
          value={form.titolo}
          onChange={e => setForm(f => ({ ...f, titolo: e.target.value }))}
          placeholder="Breve descrizione del problema"
          required
        />
      </div>

      <div>
        <Label>Descrizione</Label>
        <Textarea
          className="mt-1"
          value={form.descrizione}
          onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))}
          placeholder="Descrivi la segnalazione in dettaglio..."
          rows={3}
        />
      </div>

      <div>
        <Label>Foto</Label>
        <label className="mt-1 flex items-center gap-2 cursor-pointer border-2 border-dashed border-slate-300 rounded-lg p-3 hover:border-orange-400 transition-colors">
          <Upload className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-500">Carica foto (jpg, png)</span>
          <input type="file" accept="image/*" multiple onChange={handleFotoChange} className="hidden" />
        </label>
        {fotoPreviews.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {fotoPreviews.map((src, i) => (
              <div key={i} className="relative">
                <img src={src} className="w-20 h-20 object-cover rounded-lg border" alt="" />
                <button
                  type="button"
                  onClick={() => removeFoto(i)}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Annulla</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvataggio...' : 'Salva Segnalazione'}
        </Button>
      </div>
    </form>
  );
}
