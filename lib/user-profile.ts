import { supabase } from './supabase';

/**
 * Fetches the current user profile from the database
 * Returns null if no authenticated user exists or if the profile doesn't exist
 */
export async function fetchUserProfile() {
  try {
    // Get the currently authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.warn('No authenticated user found:', userError?.message);
      return null;
    }

    // Fetch the user profile from the users table
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError.message);
      return null;
    }

    return profile;
  } catch (error) {
    console.error('Unexpected error fetching user profile:', error);
    return null;
  }
}

/**
 * Updates the current user profile in the database
 * Returns the updated profile or null if the update failed
 */
export async function updateUserProfile(profileData: any) {
  try {
    // Get the currently authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.warn('No authenticated user found:', userError?.message);
      return null;
    }

    // Prepare the update data with the user ID and current timestamp
    const updates = {
      ...profileData,
      id: user.id,
      updated_at: new Date().toISOString(),
    };

    // Update the user profile in the users table
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user profile:', error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error updating user profile:', error);
    return null;
  }
}