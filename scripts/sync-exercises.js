require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key for admin access
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    }
  }
);

const API_URL = 'https://exercisedb-api.vercel.app/api/v1';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const MAX_PAGES = 30;
const BATCH_SIZE = 50;

async function fetchAndSyncExercises() {
  try {
    console.log('Checking last sync timestamp...');
    
    // Check last sync timestamp - handle case where no sync record exists
    const { data: syncLogs, error: syncError } = await supabase
      .from('sync_log')
      .select('last_sync')
      .order('last_sync', { ascending: false })
      .limit(1);

    if (syncError) {
      console.error('Error checking sync log:', syncError);
      throw syncError;
    }

    const lastSync = syncLogs?.[0]?.last_sync;
    const now = new Date().getTime();

    if (lastSync && now - new Date(lastSync).getTime() < CACHE_DURATION) {
      console.log('Using cached exercises data - last sync was less than 24 hours ago');
      return;
    }

    console.log('Starting exercise fetch...');
    let allExercises = [];
    let page = 1;

    while (page <= MAX_PAGES) {
      console.log(`Fetching page ${page}...`);
      
      try {
        const response = await axios.get(`${API_URL}/exercises`, {
          params: {
            page,
            limit: BATCH_SIZE
          }
        });

        if (!response.data?.data?.exercises || response.data.data.exercises.length === 0) {
          console.log('No more exercises found');
          break;
        }

        const { exercises } = response.data.data;
        allExercises = [...allExercises, ...exercises];
        console.log(`Fetched ${exercises.length} exercises from page ${page}`);

        if (exercises.length < BATCH_SIZE) {
          console.log('Reached last page of exercises');
          break;
        }

        page++;
      } catch (error) {
        console.error(`Error fetching page ${page}:`, error.message);
        break;
      }
    }

    console.log(`Total exercises fetched: ${allExercises.length}`);

    if (allExercises.length === 0) {
      console.log('No exercises found to sync');
      return;
    }

    // Get existing exercises to avoid duplicates
    const { data: existingExercises, error: fetchError } = await supabase
      .from('exercises')
      .select('name');

    if (fetchError) {
      console.error('Error fetching existing exercises:', fetchError);
      throw fetchError;
    }

    const existingNames = new Set(existingExercises?.map(e => e.name) || []);
    const newExercises = allExercises.filter(e => !existingNames.has(e.name));

    console.log(`Found ${newExercises.length} new exercises to sync`);

    if (newExercises.length > 0) {
      // Insert exercises in batches
      for (let i = 0; i < newExercises.length; i += BATCH_SIZE) {
        const batch = newExercises.slice(i, i + BATCH_SIZE);
        console.log(`Inserting batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(newExercises.length / BATCH_SIZE)}`);
        
        const { error: insertError } = await supabase
          .from('exercises')
          .insert(
            batch.map(exercise => ({
              name: exercise.name,
              instructions: exercise.instructions,
              muscle: exercise.muscle,
              equipment: exercise.equipment,
              type: exercise.type,
              difficulty: exercise.difficulty
            }))
          );

        if (insertError) {
          console.error('Error inserting batch:', insertError);
          throw insertError;
        }
      }
    }

    // Update sync timestamp
    const { error: updateError } = await supabase
      .from('sync_log')
      .upsert({ id: 1, last_sync: new Date().toISOString() });

    if (updateError) {
      console.error('Error updating sync timestamp:', updateError);
      throw updateError;
    }

    console.log('Sync completed successfully');
  } catch (error) {
    console.error('Error during sync process:', error);
    process.exit(1);
  }
}

// Run the sync
console.log('Starting exercise database sync...');
fetchAndSyncExercises()
  .then(() => {
    console.log('Sync process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Sync failed:', error);
    process.exit(1);
  });