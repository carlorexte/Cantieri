import { useCallback } from 'react';
import { useData } from '@/components/shared/DataContext';

export function usePermissions() {
  // Use data directly from DataContext instead of fetching it again
  const { 
      currentUser: user, 
      currentRole: ruolo, 
      cantierePermissions: permessiCantieri, 
      isLoading 
  } = useData();

  // Mapping to map module+action to flattened user field
  const getPermissionField = (module, action) => {
    const map = {
        'cantieri': { 'view': 'cantieri_view', 'edit': 'cantieri_edit', 'create': 'cantieri_create', 'delete': 'cantieri_delete', 'archive': 'cantieri_archive' },
        'sal': { 'view': 'sal_view', 'edit': 'sal_edit', 'create': 'sal_create', 'delete': 'sal_delete', 'approve': 'sal_approve' },
        'costi': { 'view': 'costi_view', 'edit': 'costi_edit', 'create': 'costi_create', 'delete': 'costi_delete' },
        'documenti': { 'view': 'documenti_view', 'edit': 'documenti_edit', 'create': 'documenti_create', 'delete': 'documenti_delete', 'archive': 'documenti_archive' },
        'imprese': { 'view': 'imprese_view', 'edit': 'imprese_edit', 'create': 'imprese_create', 'delete': 'imprese_delete' },
        'persone': { 'view': 'persone_view', 'edit': 'persone_edit', 'create': 'persone_create', 'delete': 'persone_delete' },
        'subappalti': { 'view': 'subappalti_view', 'edit': 'subappalti_edit', 'create': 'subappalti_create', 'delete': 'subappalti_delete' },
        'attivita_interne': { 'view': 'attivita_view', 'edit': 'attivita_edit', 'create': 'attivita_create', 'delete': 'attivita_delete' },
        'ordini_materiale': { 'view': 'ordini_view', 'edit': 'ordini_edit', 'create': 'ordini_create', 'delete': 'ordini_delete', 'accept': 'ordini_accept' },
        'cronoprogramma': { 'view': 'cronoprogramma_view', 'edit': 'cronoprogramma_edit' },
        'profilo_azienda': { 'view': 'profilo_azienda_view', 'edit': 'profilo_azienda_edit' },
        'user_management': { 'view': 'utenti_view', 'manage_users': 'utenti_manage', 'manage_roles': 'utenti_manage_roles', 'manage_cantiere_permissions': 'utenti_manage_cantiere_permissions' },
        'dashboard': { 'view': 'dashboard_view' },
        'ai_assistant': { 'view': 'ai_assistant_view' },
        'teams': { 'view': 'perm_view_teams', 'edit': 'perm_manage_teams' }
    };
    return map[module]?.[action];
  };

  const hasPermission = useCallback((module, action = 'view') => {
    if (!user) return false;
    if (user.role === 'admin') return true;

    // 1. Check Flattened User Permissions (Priority)
    const field = getPermissionField(module, action);
    if (field && user[field] === true) return true;

    // 2. Fallback to Ruolo entity (Legacy)
    if (ruolo && ruolo.permessi) {
        const modulePerms = ruolo.permessi[module];
        if (!modulePerms) return false;
        
        // Direct check
        if (modulePerms[action] === true) return true;
        // Admin sub-object check
        if (modulePerms.admin && modulePerms.admin[action] === true) return true;
    }
    
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

  const hasCantiereObjectPermission = useCallback((cantiere, module, action = 'view') => {
      if (!cantiere) return false;
      
      // 1. Check ID-based permission (Direct assignment, Override, Global Role)
      const idCheck = hasCantierePermission(cantiere.id, module, action);
      if (idCheck) return true;

      // 2. Check Team Assignment
      if (user && user.team_ids && cantiere.team_assegnati) {
          const hasTeamAccess = cantiere.team_assegnati.some(tid => user.team_ids.includes(tid));
          
          if (hasTeamAccess) {
              // If user is in a team assigned to this cantiere:
              // Check if their Global Role allows the action.
              return hasPermission(module, action);
          }
      }

      return false;
  }, [user, hasCantierePermission, hasPermission]);

  const getAccessibleCantieri = useCallback(() => {
    // This is mostly for debugging or legacy support, prefer using getMyCantieri backend function
    return user?.cantieri_assegnati || [];
  }, [user]);

  return {
    user,
    ruolo,
    isLoading,
    hasPermission,
    hasCantierePermission,
    hasCantiereObjectPermission,
    getAccessibleCantieri,
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