import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle2, Eye, Layers3, Search } from 'lucide-react';

export default function ImportReviewPanel({
  importPackage,
  onSelectCandidate,
  onActivityChange,
  onMacroAreaChange = undefined,
  showSummary = true,
  showActivityTable = true
}) {
  const candidates = importPackage?.candidates || [];
  const selectedKey = importPackage?.selectedCandidateKey;
  const selectedLabel = importPackage?.selectedCandidateLabel;
  const review = importPackage?.canonical?.review;
  const activities = importPackage?.canonical?.activities || [];
  const macroAreas = importPackage?.canonical?.macro_areas || [];
  const project = importPackage?.canonical?.project || null;
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyIssues, setShowOnlyIssues] = useState(false);

  const macroAreaMap = useMemo(
    () => new Map(macroAreas.map((macroArea) => [macroArea.id, macroArea])),
    [macroAreas]
  );

  const filteredActivities = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();

    return activities.filter((activity) => {
      const matchesTerm = !normalizedTerm
        || String(activity.description || '').toLowerCase().includes(normalizedTerm)
        || String(activity.wbs || activity.id || '').toLowerCase().includes(normalizedTerm);

      if (!matchesTerm) return false;
      if (!showOnlyIssues) return true;

      const hasMissingDates = !activity.start_date || !activity.end_date;
      const hasSuspiciousDuration = !activity.duration_days || activity.duration_days <= 0 || activity.duration_days > 365;
      const hasMissingParent = !activity.parent_id || !activity.macro_area_id;
      return hasMissingDates || hasSuspiciousDuration || hasMissingParent;
    });
  }, [activities, searchTerm, showOnlyIssues]);

  if (!importPackage || !review) return null;

  return (
    <div className="space-y-4">
      {showSummary && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers3 className="w-4 h-4 text-indigo-600" />
              Review Multimodale
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {candidates.map((candidate) => (
                <Button
                  key={candidate.key}
                  type="button"
                  variant={candidate.key === selectedKey ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onSelectCandidate(candidate.key)}
                  className="justify-start"
                >
                  {candidate.label}
                  <span className="ml-2 text-xs opacity-80">
                    {candidate.attivitaCount} att. | {candidate.dateCoverage || 0}%
                  </span>
                </Button>
              ))}
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <span className="font-medium text-slate-900">Parser selezionato:</span> {selectedLabel || selectedKey}
              {importPackage?.canonical?.source_summary?.strategy === 'vision' ? (
                <p className="mt-1 text-amber-700">Fonte visiva usata come recupero. Per un flusso professionale conviene Excel strutturato, Google Sheet o JSON normalizzato.</p>
              ) : (
                <p className="mt-1 text-emerald-700">Flusso strutturato: priorita a dati tabellari, poi review mirata e solo dopo salvataggio.</p>
              )}
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 text-sm">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-slate-500">Attivita</div>
                <div className="text-lg font-semibold text-slate-900">{review.totalActivities}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-slate-500">Macro aree</div>
                <div className="text-lg font-semibold text-slate-900">{review.macroAreasCount || macroAreas.length}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-slate-500">Con date</div>
                <div className="text-lg font-semibold text-slate-900">{review.withDates}</div>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="text-amber-700">Date mancanti</div>
                <div className="text-lg font-semibold text-amber-900">{review.missingDatesCount}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 col-span-2 xl:col-span-4">
                <div className="text-slate-500">Range progetto</div>
                <div className="text-sm font-semibold text-slate-900">
                  {(project?.name || 'Cronoprogramma importato')} {' | '} {review.projectStart || '-'} {'->'} {review.projectEnd || '-'}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="text-sm font-medium text-slate-900 mb-3">Struttura rilevata</div>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {macroAreas.map((macroArea) => {
                  const childCount = activities.filter((activity) => activity.macro_area_id === macroArea.id).length;
                  return (
                    <div key={macroArea.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">Macro area</div>
                      <div className="mt-1 font-medium text-slate-900">{macroArea.code || '-'} {macroArea.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {macroArea.start_date || '-'} {'->'} {macroArea.end_date || '-'}
                      </div>
                      <div className="mt-2 text-xs text-slate-600">{childCount} attività collegate</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {review.missingDatesCount > 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <div className="flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4" />
                  Import con dati incompleti
                </div>
                <p className="mt-1">Puoi comunque importare, ma qui conviene correggere prima le righe con date mancanti o durata sospetta.</p>
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Dataset pronto per l'importazione
                </div>
              </div>
            )}

            {review.anomalousStartCluster && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                <div className="flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4" />
                  Anomalia date rilevata
                </div>
                <p className="mt-1">
                  {review.dominantStartCount} attivita su {review.totalActivities} partono da {review.dominantStartDate}. Il parser ha probabilmente ancorato troppe barre alla prima data disponibile.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showActivityTable && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 space-y-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Eye className="w-4 h-4 text-slate-600" />
                Review attivita
              </CardTitle>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cerca WBS o descrizione"
                    className="pl-9 h-9 w-full sm:w-64"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={showOnlyIssues ? 'default' : 'outline'}
                  onClick={() => setShowOnlyIssues((current) => !current)}
                >
                  Solo righe da correggere
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Badge variant="outline">{filteredActivities.length} visibili</Badge>
              <Badge variant="outline">Editabile</Badge>
              Modifica descrizione, durata, date e tipo prima del salvataggio definitivo. I raggruppamenti si gestiscono come macro aree, non come attività.
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[48vh] rounded border border-slate-200">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white">
                  <TableRow>
                    <TableHead className="w-20">WBS</TableHead>
                    <TableHead className="w-48">Macro area</TableHead>
                    <TableHead className="min-w-80">Descrizione</TableHead>
                    <TableHead className="w-24">Durata</TableHead>
                    <TableHead className="w-40">Inizio</TableHead>
                    <TableHead className="w-40">Fine</TableHead>
                    <TableHead className="w-36">Tipo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivities.map((activity) => (
                    <TableRow key={`${activity.id}-${activity.description}`}>
                      <TableCell className="font-mono text-xs">{activity.wbs || activity.id}</TableCell>
                      <TableCell>
                        <Select
                          value={activity.macro_area_id || activity.parent_id || ''}
                          onValueChange={(value) => onActivityChange(activity.id, {
                            macro_area_id: value,
                            parent_id: value
                          })}
                        >
                          <SelectTrigger className="h-8 min-w-40">
                            <SelectValue placeholder="Seleziona macro area" />
                          </SelectTrigger>
                          <SelectContent>
                            {macroAreas.map((macroArea) => (
                              <SelectItem key={macroArea.id} value={macroArea.id}>
                                {macroArea.code ? `${macroArea.code} - ` : ''}{macroArea.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={activity.description || ''}
                          onChange={(e) => onActivityChange(activity.id, { description: e.target.value })}
                          className="h-8 min-w-56"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={activity.duration_days ?? 1}
                          onChange={(e) => onActivityChange(activity.id, { duration_days: Number(e.target.value) || 1 })}
                          className="h-8 w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={activity.start_date || ''}
                          onChange={(e) => onActivityChange(activity.id, { start_date: e.target.value || null })}
                          className="h-8 min-w-36"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={activity.end_date || ''}
                          onChange={(e) => onActivityChange(activity.id, { end_date: e.target.value || null })}
                          className="h-8 min-w-36"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={activity.type || 'task'}
                          onValueChange={(value) => onActivityChange(activity.id, { type: value })}
                        >
                          <SelectTrigger className="h-8 w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="task">task</SelectItem>
                            <SelectItem value="milestone">milestone</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredActivities.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-sm text-slate-500">
                        Nessuna attivita corrisponde al filtro corrente.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
