import { supabase } from '../supabase';

export async function getActiveProgram() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Get all active programs and order by most recently updated
    const { data, error } = await supabase
      .from('programs')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    
    // Return the most recently updated active program, or null if none exists
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error fetching active program:', error);
    return null;
  }
}

export async function updateProgramActiveState(programId: string, isActive: boolean, previousProgramId?: string) {
  try {
    // Start a batch of updates
    if (isActive && previousProgramId) {
      // Deactivate previous program
      const { error: deactivateError } = await supabase
        .from('programs')
        .update({ is_active: false })
        .eq('id', previousProgramId);

      if (deactivateError) throw deactivateError;
    }

    // Update new program state
    const { error: updateError } = await supabase
      .from('programs')
      .update({ is_active: isActive })
      .eq('id', programId);

    if (updateError) throw updateError;

    return true;
  } catch (error) {
    console.error('Error updating program active state:', error);
    return false;
  }
}