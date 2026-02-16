import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Download, Upload, Database, AlertTriangle, CheckCircle2 } from "lucide-react";
import { base44 } from '@/api/base44Client';
import { usePermissions } from '@/components/shared/PermissionGuard';
import { format } from 'date-fns';

export default function AdminDataPage() {
    const { isAdmin } = usePermissions();
    const [isLoadingBackup, setIsLoadingBackup] = useState(false);
    const [isLoadingRestore, setIsLoadingRestore] = useState(false);
    const [restoreStatus, setRestoreStatus] = useState(null);
    const [fileToUpload, setFileToUpload] = useState(null);

    const handleBackup = async () => {
        setIsLoadingBackup(true);
        try {
            // Invoke backend function
            const response = await base44.functions.invoke('backupData');
            const data = response.data;
            
            // Create download link
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `base44_backup_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (error) {
            console.error("Backup failed:", error);
            alert("Backup fallito: " + error.message);
        } finally {
            setIsLoadingBackup(false);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFileToUpload(e.target.files[0]);
            setRestoreStatus(null);
        }
    };

    const handleRestore = async () => {
        if (!fileToUpload) return;
        
        if (!confirm("ATTENZIONE: Stai per importare dati nel database. Assicurati che non ci siano conflitti di ID (duplicati). Vuoi procedere?")) {
            return;
        }

        setIsLoadingRestore(true);
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                const jsonContent = JSON.parse(e.target.result);
                
                // Validate structure roughly
                if (!jsonContent.data && !jsonContent.timestamp) {
                    throw new Error("Formato file non valido. Manca l'oggetto 'data'.");
                }

                const payload = {
                    data: jsonContent.data || jsonContent // Handle both wrapped and unwrapped
                };

                const response = await base44.functions.invoke('restoreData', payload);
                setRestoreStatus({ success: true, details: response.data.results });
            } catch (error) {
                console.error("Restore failed:", error);
                setRestoreStatus({ success: false, message: error.message });
            } finally {
                setIsLoadingRestore(false);
            }
        };

        reader.onerror = () => {
            setRestoreStatus({ success: false, message: "Errore nella lettura del file" });
            setIsLoadingRestore(false);
        };

        reader.readAsText(fileToUpload);
    };

    if (!isAdmin) {
        return (
            <div className="p-8 flex justify-center text-red-500 font-bold">
                Accesso Negato. Richiesti privilegi di Amministratore.
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <Database className="w-8 h-8 text-indigo-600" />
                Gestione Dati e Backup
            </h1>

            <div className="grid md:grid-cols-2 gap-6">
                {/* BACKUP SECTION */}
                <Card className="border-indigo-100 shadow-md">
                    <CardHeader className="bg-indigo-50/50 pb-4">
                        <CardTitle className="text-indigo-700 flex items-center gap-2">
                            <Download className="w-5 h-5" />
                            Esporta Dati (Snapshot)
                        </CardTitle>
                        <CardDescription>
                            Crea un file JSON contenente tutti i dati attuali del database. 
                            Utile per backup o migrazione.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            <Alert className="bg-blue-50 text-blue-800 border-blue-200">
                                <CheckCircle2 className="h-4 w-4" />
                                <AlertTitle>Info</AlertTitle>
                                <AlertDescription>
                                    Include: Cantieri, Imprese, Costi, SAL, Documenti, etc.
                                </AlertDescription>
                            </Alert>
                            
                            <Button 
                                onClick={handleBackup} 
                                disabled={isLoadingBackup}
                                className="w-full bg-indigo-600 hover:bg-indigo-700"
                            >
                                {isLoadingBackup ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Esportazione in corso...
                                    </>
                                ) : (
                                    <>
                                        <Download className="mr-2 h-4 w-4" />
                                        Scarica Backup Completo
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* RESTORE SECTION */}
                <Card className="border-orange-100 shadow-md">
                    <CardHeader className="bg-orange-50/50 pb-4">
                        <CardTitle className="text-orange-700 flex items-center gap-2">
                            <Upload className="w-5 h-5" />
                            Importa Dati
                        </CardTitle>
                        <CardDescription>
                            Ripristina i dati da un file di backup precedente.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            <Alert variant="destructive" className="bg-orange-50 text-orange-800 border-orange-200">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Attenzione</AlertTitle>
                                <AlertDescription>
                                    L'importazione aggiungerà i record al database. Se gli ID esistono già, l'operazione potrebbe fallire per quei record.
                                </AlertDescription>
                            </Alert>

                            <div className="flex flex-col gap-2">
                                <input 
                                    type="file" 
                                    accept=".json"
                                    onChange={handleFileChange}
                                    className="block w-full text-sm text-slate-500
                                        file:mr-4 file:py-2 file:px-4
                                        file:rounded-full file:border-0
                                        file:text-sm file:font-semibold
                                        file:bg-indigo-50 file:text-indigo-700
                                        hover:file:bg-indigo-100
                                    "
                                />
                            </div>

                            <Button 
                                onClick={handleRestore} 
                                disabled={isLoadingRestore || !fileToUpload}
                                variant="outline"
                                className="w-full border-orange-200 hover:bg-orange-50 text-orange-700"
                            >
                                {isLoadingRestore ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Importazione in corso...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Avvia Importazione
                                    </>
                                )}
                            </Button>

                            {restoreStatus && (
                                <div className={`mt-4 p-3 rounded text-sm ${restoreStatus.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                    {restoreStatus.success ? (
                                        <div>
                                            <strong>Importazione completata!</strong>
                                            <ul className="mt-2 list-disc pl-4 max-h-40 overflow-y-auto">
                                                {Object.entries(restoreStatus.details).map(([entity, res]) => (
                                                    <li key={entity}>
                                                        {entity}: {res.status === 'success' ? `${res.count} record` : res.status}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : (
                                        <div>
                                            <strong>Errore:</strong> {restoreStatus.message}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}