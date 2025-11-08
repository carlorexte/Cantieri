import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save, ShieldOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const permissionsMap = [
    { key: 'perm_view_cantieri', label: 'Vedi Cantieri' },
    { key: 'perm_edit_cantieri', label: 'Modifica Cantieri' },
    { key: 'perm_view_attivita_interne', label: 'Vedi Attività' },
    { key: 'perm_edit_attivita_interne', label: 'Modifica Attività' },
    { key: 'perm_view_sal', label: 'Vedi SAL' },
    { key: 'perm_edit_sal', label: 'Modifica SAL' },
    { key: 'perm_view_soci', label: 'Vedi Soci' },
    { key: 'perm_edit_soci', label: 'Modifica Soci' },
    { key: 'perm_view_subappalti', label: 'Vedi Subappalti' },
    { key: 'perm_edit_subappalti', label: 'Modifica Subappalti' },
    { key: 'perm_view_documenti', label: 'Vedi Documenti' },
    { key: 'perm_edit_documenti', label: 'Modifica Documenti' },
    { key: 'perm_view_costi', label: 'Vedi Costi' },
    { key: 'perm_edit_costi', label: 'Modifica Costi' },
    { key: 'perm_view_cronoprogramma', label: 'Vedi Cronoprogramma' },
    { key: 'perm_edit_cronoprogramma', label: 'Modifica Cronoprogramma' },
    { key: 'perm_view_report', label: 'Vedi Report' },
    { key: 'perm_manage_users', label: 'Gestisci Utenti' },
];

export default function UserManagementPage() {
    const [users, setUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const checkPermissionsAndLoad = async () => {
            setIsLoading(true);
            try {
                const user = await User.me();
                setCurrentUser(user);
                if (user.role !== 'admin' && !user.perm_manage_users) {
                    toast.error("Accesso negato.");
                    navigate(createPageUrl("Dashboard"));
                    return;
                }
                const usersData = await User.list();
                setUsers(usersData);
            } catch (error) {
                console.error("Errore caricamento utenti:", error);
                toast.error("Impossibile caricare i dati.");
            }
            setIsLoading(false);
        };
        checkPermissionsAndLoad();
    }, [navigate]);

    const handlePermissionChange = (userId, permKey, value) => {
        setUsers(currentUsers =>
            currentUsers.map(user =>
                user.id === userId ? { ...user, [permKey]: value } : user
            )
        );
    };

    const handleSaveChanges = async (userId) => {
        const userToUpdate = users.find(u => u.id === userId);
        if (!userToUpdate) return;

        const permissionsPayload = permissionsMap.reduce((acc, perm) => {
            acc[perm.key] = userToUpdate[perm.key] || false;
            return acc;
        }, {});

        try {
            await User.update(userId, permissionsPayload);
            toast.success(`Permessi per ${userToUpdate.full_name || userToUpdate.email} aggiornati.`);
        } catch (error) {
            console.error("Errore aggiornamento permessi:", error);
            toast.error("Errore durante il salvataggio.");
        }
    };

    if (isLoading) {
        return <div className="p-6">Caricamento in corso...</div>;
    }
    
    if (currentUser?.role !== 'admin' && !currentUser?.perm_manage_users) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6">
                <ShieldOff className="w-16 h-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold">Accesso Negato</h1>
                <p className="text-slate-600">Non hai i permessi per visualizzare questa pagina.</p>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
            <div className="max-w-full mx-auto">
                <h1 className="text-3xl font-bold text-slate-900 mb-8">Gestione Utenti e Permessi</h1>
                <Card className="border-0 shadow-lg">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Utente</TableHead>
                                        <TableHead>Ruolo</TableHead>
                                        {permissionsMap.map(p => <TableHead key={p.key} className="text-center">{p.label}</TableHead>)}
                                        <TableHead className="text-right">Azioni</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map(user => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">{user.full_name || user.email}</TableCell>
                                            <TableCell>{user.role}</TableCell>
                                            {permissionsMap.map(perm => (
                                                <TableCell key={perm.key} className="text-center">
                                                    <Switch
                                                        checked={user[perm.key] || false}
                                                        onCheckedChange={(value) => handlePermissionChange(user.id, perm.key, value)}
                                                        disabled={user.role === 'admin'}
                                                    />
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-right">
                                                <Button size="sm" onClick={() => handleSaveChanges(user.id)} disabled={user.role === 'admin'}>
                                                    <Save className="w-4 h-4 mr-2" /> Salva
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}