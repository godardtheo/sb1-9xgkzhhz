import { supabase } from '@/lib/supabase';

/**
 * Logs a new weight entry for the user
 */
export async function logWeight(weight: number, notes: string = ''): Promise<boolean> {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    
    // Insert new weight log
    const { error } = await supabase
      .from('weight_logs')
      .insert({
        user_id: user.id,
        weight,
        date: new Date().toISOString(),
        notes,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error logging weight:', error);
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
 */
export async function getLatestWeight(): Promise<number | null> {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    // Get the most recent weight log
    const { data, error } = await supabase
      .from('weight_logs')
      .select('weight')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(1)
      .single();
    
    if (error) {
      console.error('Error fetching latest weight:', error);
      return null;
    }
    
    return data ? data.weight : null;
  } catch (error) {
    console.error('Error in getLatestWeight:', error);
    return null;
  }
}

/**
 * Gets weight logs for the past n days
 */
export async function getWeightHistory(days: number = 30): Promise<Array<{ date: string; weight: number }>> {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    
    // Calculate the start date
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get weight logs since the start date
    const { data, error } = await supabase
      .from('weight_logs')
      .select('weight, date')
      .eq('user_id', user.id)
      .gte('date', startDate.toISOString())
      .order('date');
    
    if (error) {
      console.error('Error fetching weight history:', error);
      return [];
    }
    
    // Transform the data
    return (data || []).map(log => ({
      date: new Date(log.date).toISOString().split('T')[0],
      weight: log.weight
    }));
  } catch (error) {
    console.error('Error in getWeightHistory:', error);
    return [];
  }
}