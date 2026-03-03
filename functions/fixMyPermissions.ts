import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Quick function to check and restore current user's permissions
 * Call via: base44.functions.invoke('fixMyPermissions')
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Get the requesting user
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized - Not logged in' }, { status: 401 });
        }

        // Get full user data
        const fullUser = await base44.asServiceRole.entities.User.get(user.id);
        
        const issues = [];
        const fixes = [];

        // Check 1: Ensure user has a role
        if (!fullUser.ruolo_id) {
            issues.push('User has no role assigned');
            
            // Try to assign admin role if user email matches admin pattern or is the creator
            const adminRole = await base44.asServiceRole.entities.Ruolo.filter({ nome: 'Amministratore' });
            
            if (adminRole.length > 0) {
                await base44.asServiceRole.entities.User.update(user.id, {
                    ruolo_id: adminRole[0].id
                });
                fixes.push('Assigned Admin role');
            }
        }

        // Check 2: Ensure user has admin role if they should
        if (fullUser.role === 'admin' && !fullUser.ruolo_id) {
            const adminRole = await base44.asServiceRole.entities.Ruolo.filter({ nome: 'Amministratore' });
            if (adminRole.length > 0) {
                await base44.asServiceRole.entities.User.update(user.id, {
                    ruolo_id: adminRole[0].id
                });
                fixes.push('Linked admin role entity');
            }
        }

        // Check 3: Ensure force_all_cantieri_view is true for admins
        if (fullUser.role === 'admin' && !fullUser.force_all_cantieri_view) {
            await base44.asServiceRole.entities.User.update(user.id, {
                force_all_cantieri_view: true
            });
            fixes.push('Enabled force_all_cantieri_view');
        }

        // Check 4: Ensure basic permissions are set
        const requiredPerms = [
            'cantieri_view', 'cantieri_edit', 'dashboard_view',
            'imprese_view', 'persone_view', 'documenti_view'
        ];
        
        const missingPerms = requiredPerms.filter(p => !fullUser[p]);
        if (missingPerms.length > 0) {
            const permUpdate: any = {};
            missingPerms.forEach(p => permUpdate[p] = true);
            await base44.asServiceRole.entities.User.update(user.id, permUpdate);
            fixes.push(`Added missing permissions: ${missingPerms.join(', ')}`);
        }

        // Check 5: Clear any restrictive PermessoCantiereUtente for admins
        if (fullUser.role === 'admin') {
            const existingPerms = await base44.asServiceRole.entities.PermessoCantiereUtente.filter({ 
                utente_id: user.id 
            });
            
            if (existingPerms.length > 0) {
                for (const perm of existingPerms) {
                    await base44.asServiceRole.entities.PermessoCantiereUtente.delete(perm.id);
                }
                fixes.push(`Removed ${existingPerms.length} restrictive permission overrides`);
            }
        }

        // Refresh user data
        const updatedUser = await base44.asServiceRole.entities.User.get(user.id);

        return Response.json({
            success: true,
            issues_found: issues,
            fixes_applied: fixes,
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                full_name: updatedUser.full_name,
                role: updatedUser.role,
                ruolo_id: updatedUser.ruolo_id,
                force_all_cantieri_view: updatedUser.force_all_cantieri_view,
                cantieri_assegnati: updatedUser.cantieri_assegnati
            }
        });

    } catch (error) {
        console.error('Error fixing permissions:', error);
        return Response.json({ 
            error: 'Failed to fix permissions',
            details: error.message 
        }, { status: 500 });
    }
});
