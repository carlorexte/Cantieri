import { useEffect, useState, useCallback } from 'react';
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
      
      // Fetch full user details (custom fields)
      let fullUser = currentUser;
      try {
        // We might need to fetch the entity directly if auth.me doesn't have custom fields yet (depending on SDK version/cache)
        // Usually auth.me returns standard fields. Let's ensure we have custom fields.
        // But for safety, let's assume currentUser has them or we fetch them if missing.
        // Actually, PermissionGuard usually runs inside the app where DataContext might have fetched it.
        // But to be standalone:
        const userEntity = await base44.entities.User.get(currentUser.id);
        fullUser = { ...currentUser, ...userEntity }; // Merge
      } catch (e) {
        console.log("Could not fetch extra user details", e);
      }
      
      setUser(fullUser);

      if (fullUser.ruolo_id) {
        const ruoloData = await base44.entities.Ruolo.get(fullUser.ruolo_id);
        setRuolo(ruoloData);
      }

      const permessi = await base44.entities.PermessoCantiereUtente.filter({ 
        utente_id: currentUser.id 
      });
      setPermessiCantieri(permessi);
    } catch (error) {
      console.error("Errore caricamento permessi:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // module: 'cantieri', 'sal', 'costi', etc.
  // action: 'view', 'edit', 'admin' (which returns object), or specific like 'approve'
  // For simplicity, we support checking specific leaf permissions:
  // hasPermission('sal', 'view') -> true/false
  // hasPermission('sal', 'approve') -> checks sal.admin.approve
  const hasPermission = useCallback((module, action = 'view') => {
    if (!user) return false;
    if (user.role === 'admin') return true;

    if (!ruolo || !ruolo.permessi) return false;

    const modulePerms = ruolo.permessi[module];
    if (!modulePerms) return false;

    // Direct check: view, edit
    if (modulePerms[action] === true) return true;

    // Admin check: if action is 'delete', 'approve', 'archive', etc., it's inside 'admin' object
    if (modulePerms.admin && modulePerms.admin[action] === true) return true;
    
    return false;
  }, [user, ruolo]);

  const hasCantierePermission = useCallback((cantiereId, module, action = 'view') => {
    if (!user) return false;
    if (user.role === 'admin') return true;

    // 1. SCOPE CHECK
    // Is user allowed to access this cantiere?
    const canSeeCantiere = 
        user.force_all_cantieri_view || 
        (user.cantieri_assegnati && user.cantieri_assegnati.includes(cantiereId)) ||
        // Check permissions override existence implies visibility/access
        permessiCantieri.some(p => p.cantiere_id === cantiereId);
        // Note: Team check is harder here without cantiere object. 
        // We assume if they are calling this, they might have access. 
        // Strict scope check is done by getMyCantieri.
        
    // For specific action check, we proceed.
    
    // 2. CAPABILITY CHECK
    
    // Check Override
    const override = permessiCantieri.find(p => p.cantiere_id === cantiereId);
    if (override && override.permessi && override.permessi[module]) {
        const mod = override.permessi[module];
        if (mod[action] === true) return true;
        if (mod.admin && mod.admin[action] === true) return true;
        
        // If override exists for the module but value is false, IT BLOCKS even if global role says true?
        // Usually Overrides are additive or replacements. 
        // Let's assume Replacement for that module. 
        // If the module object exists in override, we respect it.
        // If the specific key is undefined/false in override, it's denied (if we treat it as replacement).
        // BUT, usually "Override" means "Specific settings". 
        // Let's implement: If module is defined in override, USE IT. Ignore Global.
        return false; 
    }

    // Fallback to Global Role
    return hasPermission(module, action);

  }, [user, permessiCantieri, hasPermission]);

  return {
    user,
    ruolo,
    isLoading,
    hasPermission,
    hasCantierePermission,
    isAdmin: user?.role === 'admin'
  };
}

export function PermissionGuard({ module, action = 'view', cantiereId, children, fallback }) {
  const { hasPermission, hasCantierePermission, isLoading } = usePermissions();

  if (isLoading) return null;

  const hasAccess = cantiereId 
    ? hasCantierePermission(cantiereId, module, action)
    : hasPermission(module, action);

  if (!hasAccess) {
    return fallback || null; 
    // Default fallback null is better for UI elements that should just disappear. 
    // Page level guards should provide specific fallback.
  }

  return children;
}