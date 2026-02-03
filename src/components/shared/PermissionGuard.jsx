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

    // Default permissions for standard 'user' role based on revised policy
    const DEFAULT_USER_PERMISSIONS = {
      // Visibility permissions (Menu/Pages)
      'dashboard_view': true,
      'cantieri_view': true,
      'imprese_view': true,
      'persone_view': true,
      'subappalti_view': true,
      'costi_view': true,
      'sal_view': true,
      'attivita_view': true,
      'documenti_view': true,
      'cronoprogramma_view': true,
      'profilo_azienda_view': false, // Usually admin
      'utenti_view': false,          // Admin
      'utenti_manage': false         // Admin
    };

    if (user.role === 'user') {
       // If permission is explicitly granted/denied in user object or role, respect it.
       // Otherwise, fallback to default policy.
       if (user[permesso] !== undefined) return user[permesso];
       if (ruolo?.permessi?.[permesso] !== undefined) return ruolo?.permessi?.[permesso];
       
       // Fallback to defaults
       if (DEFAULT_USER_PERMISSIONS[permesso] !== undefined) {
         return DEFAULT_USER_PERMISSIONS[permesso];
       }
    }

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

    // 1. PRIORITY: Global Permission Check
    // If the user has the global permission (e.g., 'cantieri_view' is true on their profile),
    // they have access regardless of specific assignments.
    // This allows "Managers" to see everything while still having an assigned list for convenience.
    if (hasPermission(permesso)) return true;

    // 2. Assignment Check
    // If they don't have global permission, we check if they are assigned to this specific cantiere.
    const isAssigned = user.cantieri_assegnati && user.cantieri_assegnati.includes(cantiereId);
    
    if (isAssigned) {
        // If assigned, check if there are specific granular permissions (PermessoCantiereUtente)
        // Or if the basic assignment implies read access (usually assignment = read at least)
        const permessoCantiere = permessiCantieri.find(p => p.cantiere_id === cantiereId);
        
        // If they have a specific override for this cantiere
        if (permessoCantiere?.permessi?.[permesso]) return true;
        
        // Default: If assigned, they usually have 'view' access implicitly.
        // For 'edit' or others, they need the explicit permission or the global one checked above.
        if (permesso === 'cantieri_view' || permesso === 'dashboard_view') return true;
    }

    // 3. Ownership Check (Frontend side approximation of RLS created_by)
    // Note: RLS handles the real security. This is just for UI hiding.
    // We can't easily check created_by here without the record, so we rely on the above.

    return false;
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