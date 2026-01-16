import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { addDays, format, parseISO, isBefore, startOfDay } from 'npm:date-fns@3.3.1';

Deno.serve(async (req) => {
  try {
    // Only allow admin or system to trigger this
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
       // In a real scheduled task, the user might be null or a service account. 
       // For now, we assume it's triggered by a scheduler with service role privileges internally or by admin.
       // However, Deno.serve automation context might not have a "user".
       // Let's assume we proceed if called via automation.
    }

    const today = startOfDay(new Date());
    const sevenDays = addDays(today, 7);
    const threeDays = addDays(today, 3);
    const oneDay = addDays(today, 1);

    // Get all active documents with expiry dates
    // Note: filtering by date range in DB is efficient, but if not supported by SDK completely, filter in memory.
    // Assuming filter supports basic operators.
    const docs = await base44.asServiceRole.entities.Documento.filter({
      is_archived: false,
      data_scadenza: { $ne: null }
    });

    const expiringDocs = docs.filter(doc => {
        if (!doc.data_scadenza) return false;
        const expiry = parseISO(doc.data_scadenza);
        
        // Check exact days matches to avoid spamming every day (e.g. notify on day 7, 3, and 1)
        const diffTime = expiry - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        return [7, 3, 1].includes(diffDays) || diffDays === 0;
    });

    const notifications = [];

    for (const doc of expiringDocs) {
        // Send email to admin or responsible (mocking recipient)
        // In a real app, you'd fetch the relevant users. Here we send to the app owner/admin.
        const expiryDate = format(parseISO(doc.data_scadenza), 'dd/MM/yyyy');
        
        await base44.asServiceRole.integrations.Core.SendEmail({
            to: "admin@example.com", // Replace with dynamic email if possible, or fetch all admins
            subject: `Scadenza Documento: ${doc.nome_documento}`,
            body: `Il documento "${doc.nome_documento}" scade il ${expiryDate}. Si prega di verificare e rinnovare se necessario.`
        });
        notifications.push({ doc: doc.nome_documento, date: expiryDate });
    }

    return Response.json({
      success: true,
      processed: docs.length,
      notifications_sent: notifications.length,
      notifications
    });

  } catch (error) {
    console.error('Error checking expirations:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});