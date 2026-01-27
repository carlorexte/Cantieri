import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import TaskPersonali from "@/components/dashboard/TaskPersonali";
import AlertCard from "@/components/dashboard/AlertCard";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [cantieri, setCantieri] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);

      const [tasksData, cantieriData] = await Promise.all([
        base44.entities.AttivitaInterna.filter({ assigned_to: user.id, status: { $ne: 'completed' } }),
        base44.entities.Cantiere.list(),
      ]);

      setTasks(tasksData || []);
      setCantieri(cantieriData || []);
      
      // Mock alerts for now or fetch from backend
      setAlerts([
        { tipo: 'scadenza', priorita: 'critico', messaggio: 'DURC in scadenza - Impresa Rossi', cantiere: 'Cantiere A' }
      ]);

    } catch (error) {
      console.error("Errore caricamento dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">I Miei Compiti</h1>
          <p className="text-slate-500">Benvenuto {currentUser?.full_name || 'Utente'}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="md:col-span-2">
              <TaskPersonali tasks={tasks} cantieri={cantieri} isLoading={isLoading} />
           </div>
           <div>
              <AlertCard alerts={alerts} />
           </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-0 shadow-sm">
                <CardContent className="p-6 flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Attività Completate</p>
                        <p className="text-2xl font-bold text-slate-900">0</p>
                    </div>
                </CardContent>
            </Card>
             <Card className="border-0 shadow-sm">
                <CardContent className="p-6 flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">In Corso</p>
                        <p className="text-2xl font-bold text-slate-900">{tasks.length}</p>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}