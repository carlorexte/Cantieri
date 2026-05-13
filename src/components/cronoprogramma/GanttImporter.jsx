import React, { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, FileText, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { importScheduleFromFile } from '@/lib/gantt-importer';

const ACCEPTED_TYPES = '.xlsx,.xls,.csv,.pdf';
const ACCEPTED_MIME = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/pdf',
];

function getFileIcon(file) {
  if (!file) return Upload;
  const ext = file.name.split('.').pop().toLowerCase();
  if (['xlsx', 'xls', 'csv'].includes(ext)) return FileSpreadsheet;
  return FileText;
}

/**
 * @param {{ onImport: (tasks: import('@/types/gantt').GanttTask[]) => void, disabled?: boolean }} props
 */
export default function GanttImporter({ onImport, disabled = false }) {
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const validateFile = (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    const validExts = ['xlsx', 'xls', 'csv', 'pdf'];
    if (!validExts.includes(ext) && !ACCEPTED_MIME.includes(file.type)) {
      return `Formato non supportato: ${file.name}. Usa Excel (.xlsx, .xls), CSV o PDF.`;
    }
    if (file.size > 15 * 1024 * 1024) {
      return `File troppo grande: ${(file.size / 1024 / 1024).toFixed(1)}MB. Massimo 15MB.`;
    }
    return null;
  };

  const handleFile = useCallback((file) => {
    if (!file) return;
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSelectedFile(file);
    setError(null);
    setSuccess(null);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }, [handleFile]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleInputChange = (e) => {
    handleFile(e.target.files[0]);
    e.target.value = '';
  };

  const handleAnalyze = async () => {
    if (!selectedFile || loading || disabled) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const tasks = await importScheduleFromFile(selectedFile);
      setSuccess(`${tasks.length} attività importate da "${selectedFile.name}"`);
      onImport(tasks);
    } catch (err) {
      setError(err.message || 'Errore durante l\'analisi del file.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setError(null);
    setSuccess(null);
  };

  const FileIcon = getFileIcon(selectedFile);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <Upload className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Importa da file con AI</h3>
          <p className="text-xs text-slate-500">Analisi automatica tramite Claude AI — Excel, CSV o PDF</p>
        </div>
      </div>

      {/* Drop zone */}
      <label
        className={`flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 text-center cursor-pointer transition-colors
          ${dragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}
          ${disabled ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <FileIcon className={`w-7 h-7 ${selectedFile ? 'text-indigo-500' : 'text-slate-400'}`} />
        {selectedFile ? (
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-slate-900">{selectedFile.name}</p>
            <p className="text-xs text-slate-400">{(selectedFile.size / 1024).toFixed(0)} KB</p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-sm text-slate-600">
              <span className="font-medium text-indigo-600">Clicca</span> o trascina un file qui
            </p>
            <p className="text-xs text-slate-400">Excel (.xlsx, .xls), CSV, PDF — max 15MB</p>
          </div>
        )}
        <input
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />
      </label>

      {/* Messaggi */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-800">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2.5 text-sm text-green-800">
          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Azioni */}
      {selectedFile && !success && (
        <div className="flex items-center gap-2">
          <Button
            onClick={handleAnalyze}
            disabled={loading || disabled}
            size="sm"
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analisi AI in corso...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Analizza con AI
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {success && (
        <Button variant="outline" size="sm" onClick={handleReset} className="w-full">
          Importa un altro file
        </Button>
      )}
    </div>
  );
}
