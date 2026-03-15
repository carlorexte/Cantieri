import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StickyNote, Save, Edit2, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function QuickNotes({ cantiere, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [note, setNote] = useState(cantiere?.note || "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setNote(cantiere?.note || "");
  }, [cantiere?.note]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await base44.entities.Cantiere.update(cantiere.id, { note });
      toast.success("Note aggiornate");
      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Errore salvataggio note:", error);
      toast.error("Impossibile salvare le note");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="shadow-lg border-0 bg-yellow-50/50 h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg text-yellow-800">
            <StickyNote className="w-5 h-5" />
            Note Rapide Team
          </CardTitle>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="text-yellow-700 hover:text-yellow-900 hover:bg-yellow-100"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {isEditing ? (
          <div className="space-y-3 h-full flex flex-col">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Scrivi qui note importanti, promemoria o aggiornamenti per il team..."
              className="flex-1 min-h-[150px] bg-white border-yellow-200 focus-visible:ring-yellow-400"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNote(cantiere?.note || "");
                  setIsEditing(false);
                }}
                className="bg-white hover:bg-slate-50"
              >
                <X className="w-4 h-4 mr-1" /> Annulla
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                <Save className="w-4 h-4 mr-1" /> Salva
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap cursor-pointer h-full min-h-[100px]"
            onClick={() => setIsEditing(true)}
          >
            {note ? note : <span className="text-slate-400 italic">Clicca per aggiungere una nota...</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}