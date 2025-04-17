import { supabase } from '@/lib/supabase';

/**
 * Logs a new weight entry for the user
 * If an entry already exists for the selected date, it will be updated
 * If an existingId is provided, that entry will be updated instead of checking for date conflicts
 */
export async function logWeight(weight: number, notes: string = '', customDate?: Date, existingId?: string): Promise<boolean> {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    
    // Use the provided date or current date
    const entryDate = customDate || new Date();
    
    // Set time to noon to avoid timezone issues
    const formattedDate = new Date(entryDate);
    formattedDate.setHours(12, 0, 0, 0);
    
    // Format date for database operations (keep only date part for comparison)
    const dateOnly = formattedDate.toISOString().split('T')[0];
    
    console.log('[DEBUG] logWeight - saving date:', formattedDate.toISOString());
    console.log('[DEBUG] logWeight - date only for comparison:', dateOnly);
    
    let result;
    
    // If an existing ID is provided, update that specific entry
    if (existingId) {
      console.log('[DEBUG] Updating specific entry ID:', existingId);
      
      result = await supabase
        .from('weight_logs')
        .update({
          weight,
          notes,
          date: formattedDate.toISOString() // Use formatted date with noon time
        })
        .eq('id', existingId);
    } 
    // Otherwise check if an entry exists for this date
    else {
      const { data: existingEntries, error: fetchError } = await supabase
        .from('weight_logs')
        .select('id')
        .eq('user_id', user.id)
        .gte('date', `${dateOnly}T00:00:00`) // Start of day
        .lt('date', `${dateOnly}T23:59:59`)  // End of day
        .order('created_at', { ascending: false });
      
      if (fetchError) {
        console.error('Error checking for existing weight logs:', fetchError);
        return false;
      }
      
      // If entry exists for this date, update it
      if (existingEntries && existingEntries.length > 0) {
        const existingId = existingEntries[0].id;
        
        result = await supabase
          .from('weight_logs')
          .update({
            weight,
            notes,
            date: formattedDate.toISOString() // Use formatted date with noon time
          })
          .eq('id', existingId);

        // Clean up any additional entries for the same day (if multiple exist)
        if (existingEntries.length > 1) {
          const idsToDelete = existingEntries.slice(1).map(entry => entry.id);
          await supabase
            .from('weight_logs')
            .delete()
            .in('id', idsToDelete);
        }
      } 
      // Otherwise, create a new entry
      else {
        result = await supabase
          .from('weight_logs')
          .insert({
            user_id: user.id,
            weight,
            date: formattedDate.toISOString(), // Use formatted date with noon time
            notes,
            created_at: new Date().toISOString()
          });
      }
    }
    
    if (result.error) {
      console.error('Error saving weight log:', result.error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in logWeight:', error);
    return false;
  }
}

/**
 * Gets the latest weight log for a user
 * Returns null if no weight logs exist
 */
export async function getLatestWeight(): Promise<number | null> {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    // Get the most recent weight log
    // Removed .single() to handle empty results gracefully
    const { data, error } = await supabase
      .from('weight_logs')
      .select('weight')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('Error fetching latest weight:', error);
      return null;
    }
    
    // Check if any data was returned
    if (!data || data.length === 0) {
      return null;
    }
    
    // Return the weight from the first (and only) element
    return data[0].weight;
  } catch (error) {
    console.error('Error in getLatestWeight:', error);
    return null;
  }
}

/**
 * Gets all weight logs for a user (or logs for the specified number of days)
 */
export async function getWeightHistory(days?: number): Promise<Array<{ id: string; date: string; weight: number; notes?: string }>> {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    
    // Base query
    let query = supabase
      .from('weight_logs')
      .select('id, weight, date, notes')
      .eq('user_id', user.id)
      .order('date');
    
    // Apply date filter only if days parameter is specified
    if (days) {
      // Calculate the start date
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      // Add date filter
      query = query.gte('date', startDate.toISOString());
    }
    
    // Execute the query
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching weight history:', error);
      return [];
    }
    
    console.log(`Retrieved ${data?.length || 0} weight logs`);
    
    // Transform the data
    return (data || []).map(log => ({
      id: log.id,
      date: new Date(log.date).toISOString().split('T')[0],
      weight: log.weight,
      notes: log.notes
    }));
  } catch (error) {
    console.error('Error in getWeightHistory:', error);
    return [];
  }
}