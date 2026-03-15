import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const caller = await base44.auth.me();

        if (!caller) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json().catch(() => ({}));
        const targetEmail = (payload?.email || caller.email || '').toLowerCase().trim();

        if (!targetEmail) {
            return Response.json({ error: 'Email target mancante' }, { status: 400 });
        }

        const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
        const hasExistingAdmin = admins.length > 0;
        const callerIsAdmin = caller.role === 'admin';

        // Bootstrap sicuro: se esiste gia un admin, solo admin puo promuovere.
        // Se non esiste alcun admin, un utente puo promuovere solo se stesso.
        if (hasExistingAdmin && !callerIsAdmin) {
            return Response.json({ error: 'Solo un admin puo concedere accesso admin' }, { status: 403 });
        }

        if (!hasExistingAdmin && targetEmail !== (caller.email || '').toLowerCase()) {
            return Response.json({ error: 'Bootstrap iniziale consentito solo sul proprio account' }, { status: 403 });
        }

        const users = await base44.asServiceRole.entities.User.filter({ email: targetEmail });
        if (users.length === 0) {
            return Response.json({ error: 'Utente non trovato' }, { status: 404 });
        }

        const target = users[0];
        await base44.asServiceRole.entities.User.update(target.id, { role: 'admin' });

        return Response.json({
            success: true,
            message: `Accesso admin assegnato a ${target.email}`,
            user_id: target.id,
            bootstrap_mode: !hasExistingAdmin
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});

