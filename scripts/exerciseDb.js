const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Initialize Supabase client
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

const API_URL = 'https://exercisedb-api.vercel.app/api/v1';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

async function fetchAndSyncExercises() {
  try {
    // Check last sync timestamp
    const { data: lastSync } = await supabase
      .from('sync_log')
      .select('last_sync')
      .single();

    const now = new Date().getTime();
    if (lastSync && now - new Date(lastSync.last_sync).getTime() < CACHE_DURATION) {
      console.log('Using cached exercises data');
      return;
    }

    // Fetch exercises from API
    console.log('Fetching exercises from API...');
    const response = await axios.get(`${API_URL}/exercises`);
    
    // Ensure response.data is an array
    if (!Array.isArray(response.data)) {
      console.log('API response:', response.data);
      throw new Error('API response is not an array');
    }

    const exercises = response.data;
    console.log(`Fetched ${exercises.length} exercises`);

    // Begin transaction
    const { data: existingExercises, error: fetchError } = await supabase
      .from('exercises')
      .select('name');

    if (fetchError) throw fetchError;

    const existingNames = new Set(existingExercises?.map(e => e.name) || []);
    const newExercises = exercises.filter(e => !existingNames.has(e.name));

    console.log(`Found ${newExercises.length} new exercises to sync`);

    if (newExercises.length > 0) {
      const { error: insertError } = await supabase
        .from('exercises')
        .insert(
          newExercises.map(exercise => ({
            name: exercise.name,
            instructions: exercise.instructions,
            muscle: exercise.muscle,
            equipment: exercise.equipment,
            type: exercise.type,
            difficulty: exercise.difficulty
          }))
        );

      if (insertError) throw insertError;
    }

    // Update sync timestamp
    await supabase
      .from('sync_log')
      .upsert({ id: 1, last_sync: new Date().toISOString() });

    console.log(`Successfully synced ${newExercises.length} new exercises`);
  } catch (error) {
    console.error('Error syncing exercises:', error);
    throw error;
  }
}

module.exports = {
  fetchAndSyncExercises
};