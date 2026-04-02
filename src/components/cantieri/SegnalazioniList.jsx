import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Trash2, AlertTriangle, ShieldAlert, Star, Tag } from 'lucide-react';
import { supabaseDB } from '@/lib/supabaseClient';
import { toast } from 'sonner';

const TIPO_CONFIG = {
  ritardo:           { label: 'Ritardo',           color: 'bg-amber-100 text-amber-800',  Icon: AlertTriangle },
  problema_sicurezza:{ label: 'Sicurezza',          color: 'bg-red-100 text-red-800',      Icon: ShieldAlert   },
  qualita:           { label: 'Qualità',            color: 'bg-blue-100 text-blue-800',    Icon: Star          },
  altro:             { label: 'Altro',              color: 'bg-slate-100 text-slate-800',  Icon: Tag           },
};

export default function SegnalazioniList({ segnalazioni, currentUser, onRefresh }) {
  const handleDelete = async (id) => {
    if (!confirm('Eliminare questa segnalazione?')) return;
    try {
      await supabaseDB.segnalazioni.delete(id);
      toast.success('Segnalazione eliminata');
      onRefresh();
    } catch (err) {
      toast.error(err.message || 'Errore eliminazione');
    }
  };

  if (!segnalazioni.length) {
    return <p className="text-sm text-slate-500 py-6 text-center">Nessuna segnalazione presente.</p>;
  }

  return (
    <div className="space-y-3">
      {segnalazioni.map(s => {
        const cfg = TIPO_CONFIG[s.tipo] || TIPO_CONFIG.altro;
        const { Icon } = cfg;
        const canDelete = currentUser?.role === 'admin' ||
          currentUser?.ruolo?.permessi?.is_admin === true ||
          s.autore_id === currentUser?.id;

        return (
          <div key={s.id} className="border rounded-lg p-4 bg-white">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge className={cfg.color}>
                    <Icon className="w-3 h-3 mr-1 inline" />
                    {cfg.label}
                  </Badge>
                  {s.attivita && (
                    <span className="text-xs text-slate-500">
                      Attività: {s.attivita.wbs ? `[${s.attivita.wbs}] ` : ''}{s.attivita.descrizione}
                    </span>
                  )}
                </div>
                <p className="font-medium text-slate-900">{s.titolo}</p>
                {s.descrizione && (
                  <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{s.descrizione}</p>
                )}
                {s.foto?.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {s.foto.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer">
                        <img
                          src={url}
                          className="w-16 h-16 object-cover rounded border hover:opacity-80 transition-opacity"
                          alt={`Foto ${i + 1}`}
                        />
                      </a>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                  <span>{s.autore?.full_name || s.autore?.email || 'Sconosciuto'}</span>
                  <span>•</span>
                  <span>{format(new Date(s.created_at), 'd MMM yyyy HH:mm', { locale: it })}</span>
                </div>
              </div>
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-400 hover:text-red-600 shrink-0"
                  onClick={() => handleDelete(s.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
