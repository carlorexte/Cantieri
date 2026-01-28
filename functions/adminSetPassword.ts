import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { hash } from 'npm:bcryptjs@2.4.3';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Only admin can do this
        const caller = await base44.auth.me();
        if (!caller || caller.role !== 'admin') {
            return Response.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { email, newPassword } = await req.json();

        if (!email || !newPassword) {
            return Response.json({ error: "Email and newPassword are required" }, { status: 400 });
        }

        const users = await base44.asServiceRole.entities.User.filter({ email });
        if (users.length === 0) {
            return Response.json({ error: "User not found" }, { status: 404 });
        }

        const user = users[0];
        const hashedPassword = await hash(newPassword, 10);

        await base44.asServiceRole.entities.User.update(user.id, {
            hashed_password: hashedPassword
        });

        return Response.json({ success: true, message: `Password updated for ${email}` });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});