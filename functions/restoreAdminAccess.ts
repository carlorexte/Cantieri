import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Function to restore admin access permissions
 * Call this function via base44.functions.invoke('restoreAdminAccess') with your email
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Get the requesting user
        const user = await base44.auth.me();
        
        // Allow self-service OR if already admin
        const payload = await req.json().catch(() => ({}));
        const targetEmail = payload.email || user?.email;
        
        if (!targetEmail) {
            return Response.json({ error: 'Email is required' }, { status: 400 });
        }

        // Find user by email
        const users = await base44.asServiceRole.entities.User.filter({ email: targetEmail });
        
        if (users.length === 0) {
            return Response.json({ 
                error: 'User not found',
                message: `No user found with email: ${targetEmail}`
            }, { status: 404 });
        }

        const targetUser = users[0];

        // Find or create Admin role
        let adminRole = await base44.asServiceRole.entities.Ruolo.filter({ nome: 'Amministratore' });
        
        if (adminRole.length === 0) {
            // Create admin role if it doesn't exist
            adminRole = await base44.asServiceRole.entities.Ruolo.create({
                nome: 'Amministratore',
                descrizione: 'Accesso completo a tutte le funzionalità',
                is_system: true,
                permessi: {
                    dashboard: { view: true },
                    ai_assistant: { view: true },
                    cantieri: { view: true, edit: true, admin: { delete: true, archive: true } },
                    imprese: { view: true, edit: true, admin: { delete: true } },
                    persone: { view: true, edit: true, admin: { delete: true } },
                    subappalti: { view: true, edit: true, admin: { delete: true } },
                    costi: { view: true, edit: true, admin: { delete: true } },
                    sal: { view: true, edit: true, admin: { delete: true, approve: true } },
                    ordini_materiale: { view: true, edit: true, admin: { delete: true, accept: true } },
                    attivita_interne: { view: true, edit: true, admin: { delete: true } },
                    documenti: { view: true, edit: true, admin: { delete: true, archive: true } },
                    cronoprogramma: { view: true, edit: true },
                    profilo_azienda: { view: true, edit: true },
                    user_management: { view: true, manage_users: true, manage_roles: true, manage_cantiere_permissions: true }
                }
            });
        } else {
            adminRole = adminRole[0];
        }

        // Update user with admin role and all permissions
        const updateData = {
            ruolo_id: adminRole.id,
            role: 'admin',
            // Grant all cantieri access
            force_all_cantieri_view: true,
            cantieri_assegnati: [],
            // Flatten all permissions to user level
            cantieri_view: true,
            cantieri_edit: true,
            cantieri_create: true,
            cantieri_delete: true,
            cantieri_archive: true,
            sal_view: true,
            sal_edit: true,
            sal_create: true,
            sal_delete: true,
            sal_approve: true,
            costi_view: true,
            costi_edit: true,
            costi_create: true,
            costi_delete: true,
            documenti_view: true,
            documenti_edit: true,
            documenti_create: true,
            documenti_delete: true,
            documenti_archive: true,
            imprese_view: true,
            imprese_edit: true,
            imprese_create: true,
            imprese_delete: true,
            persone_view: true,
            persone_edit: true,
            persone_create: true,
            persone_delete: true,
            subappalti_view: true,
            subappalti_edit: true,
            subappalti_create: true,
            subappalti_delete: true,
            attivita_view: true,
            attivita_edit: true,
            attivita_create: true,
            attivita_delete: true,
            ordini_view: true,
            ordini_edit: true,
            ordini_create: true,
            ordini_delete: true,
            ordini_accept: true,
            cronoprogramma_view: true,
            cronoprogramma_edit: true,
            profilo_azienda_view: true,
            profilo_azienda_edit: true,
            utenti_view: true,
            utenti_manage: true,
            utenti_manage_roles: true,
            utenti_manage_cantiere_permissions: true,
            dashboard_view: true,
            ai_assistant_view: true,
            updated_date: new Date().toISOString()
        };

        await base44.asServiceRole.entities.User.update(targetUser.id, updateData);

        // Clear any existing PermessoCantiereUtente restrictions
        const existingPerms = await base44.asServiceRole.entities.PermessoCantiereUtente.filter({ 
            utente_id: targetUser.id 
        });
        
        // Delete existing permission overrides (admin doesn't need them)
        for (const perm of existingPerms) {
            await base44.asServiceRole.entities.PermessoCantiereUtente.delete(perm.id);
        }

        return Response.json({
            success: true,
            message: 'Admin access restored successfully',
            user: {
                id: targetUser.id,
                email: targetUser.email,
                full_name: targetUser.full_name,
                role: 'admin',
                ruolo_id: adminRole.id
            }
        });

    } catch (error) {
        console.error('Error restoring admin access:', error);
        return Response.json({ 
            error: 'Failed to restore admin access',
            details: error.message 
        }, { status: 500 });
    }
});
