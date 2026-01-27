import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Shield } from 'lucide-react';

export function usePermissions() {
  const [user, setUser] = useState(null);
  const [ruolo, setRuolo] = useState(null);
  const [permessiCantieri, setPermessiCantieri] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      if (currentUser.ruolo_id) {
        const ruoloData = await base44.entities.Ruolo.filter({ id: currentUser.ruolo_id });
        if (ruoloData.length > 0) {
          setRuolo(ruoloData[0]);
        }
      }

      const permessi = await base44.entities.PermessoCantiereUtente.filter({ 
        utente_id: currentUser.id 
      });
      setPermessiCantieri(permessi);
    } catch (error) {
      console.error("Errore caricamento permessi:", error);
    }
    setIsLoading(false);
  };

  const hasPermission = (permesso) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (permesso === 'all') return true;

    // Check direct permission (flattened on user object by managePermissions)
    if (user[permesso]) return true;

    // Backward compatibility for old keys (perm_*)
    if (user[`perm_${permesso}`]) return true;

    // Check custom role object if loaded
    if (ruolo?.permessi?.[permesso]) return true;

    return false;
  };

  const hasCantierePermission = (cantiereId, permesso) => {
    if (!user) return false;
    if (user.role === 'admin') return true;

    // Se non ci sono cantieri assegnati, l'utente ha accesso a tutti (se ha permessi generali)
    if (!user.cantieri_assegnati || user.cantieri_assegnati.length === 0) {
      return hasPermission(permesso);
    }

    // Controlla se il cantiere è tra quelli assegnati
    if (!user.cantieri_assegnati.includes(cantiereId)) return false;

    // Controlla permessi specifici per il cantiere
    const permessoCantiere = permessiCantieri.find(p => p.cantiere_id === cantiereId);
    if (permessoCantiere?.permessi?.[permesso]) return true;

    // Fallback ai permessi generali
    return hasPermission(permesso);
  };

  const getAccessibleCantieri = () => {
    if (!user) return [];
    if (user.role === 'admin') return null; // null = tutti i cantieri
    return user.cantieri_assegnati || null;
  };

  return {
    user,
    ruolo,
    isLoading,
    hasPermission,
    hasCantierePermission,
    getAccessibleCantieri,
    isAdmin: user?.role === 'admin'
  };
}

export function PermissionGuard({ permission, cantiereId, children, fallback }) {
  const { hasPermission, hasCantierePermission, isLoading } = usePermissions();

  if (isLoading) return null;

  const hasAccess = cantiereId 
    ? hasCantierePermission(cantiereId, permission)
    : hasPermission(permission);

  if (!hasAccess) {
    return fallback || (
      <div className="p-8 text-center">
        <Shield className="w-16 h-16 mx-auto mb-4 text-slate-400" />
        <h2 className="text-xl font-semibold mb-2">Accesso Negato</h2>
        <p className="text-slate-600">Non hai i permessi necessari per questa sezione.</p>
      </div>
    );
  }

  return children;
}