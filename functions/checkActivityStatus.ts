import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { differenceInDays, parseISO } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // This function should be called by a scheduled automation
        // It checks for overdue activities and updates their status
        
        const today = new Date().toISOString().split('T')[0];
        
        // Find activities that are not completed and have end date before today
        // Note: This filter is simplified, might need to iterate if complex query not supported
        const overdueActivities = await base44.asServiceRole.entities.Attivita.filter({
            data_fine: { $lt: today },
            stato: { $in: ["pianificata", "in_corso"] }
        });
        
        const updatedCount = 0;
        
        for (const activity of overdueActivities) {
            await base44.asServiceRole.entities.Attivita.update(activity.id, {
                stato: "in_ritardo"
            });
            updatedCount++;
        }
        
        // Also check for upcoming deadlines (e.g. next 3 days) to maybe trigger notifications (mock for now)
        // const upcomingActivities = await base44.asServiceRole.entities.Attivita.filter({ ... });
        
        return Response.json({ 
            success: true, 
            checked_date: today,
            updated_activities: updatedCount 
        });
        
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});