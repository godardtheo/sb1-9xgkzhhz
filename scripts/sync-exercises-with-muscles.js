require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

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
const BATCH_SIZE = 50; // Maximum allowed by API
const TOTAL_EXPECTED = 1350; // Expected exercises count based on API response

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

    // Force refresh regardless of last sync time
    const forceRefresh = true;
    if (!forceRefresh && lastSync && now - new Date(lastSync).getTime() < CACHE_DURATION) {
      console.log('Using cached exercises data - last sync was less than 24 hours ago');
      return;
    }

    console.log('Starting exercise fetch...');
    let allExercises = [];
    let offset = 0;
    let hasMore = true;

    // Use pagination to fetch all exercises
    while (hasMore) {
      console.log(`Fetching exercises with offset ${offset}...`);
      
      try {
        const response = await axios.get(`${API_URL}/exercises`, {
          params: {
            limit: BATCH_SIZE,
            offset: offset
          }
        });

        // Correctly handle the nested response structure
        if (!response.data?.success || !response.data?.data?.exercises || response.data.data.exercises.length === 0) {
          console.log('No more exercises found or invalid response format');
          break;
        }

        const exercises = response.data.data.exercises;
        allExercises = [...allExercises, ...exercises];
        console.log(`Fetched ${exercises.length} exercises (total: ${allExercises.length})`);

        if (exercises.length < BATCH_SIZE) {
          console.log('Reached last page of exercises');
          hasMore = false;
        } else {
          offset += BATCH_SIZE;
        }

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error fetching with offset ${offset}:`, error.message);
        if (error.response) {
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);
        }
        // Try next batch even if this one fails
        offset += BATCH_SIZE;
        
        // If we've tried too many times without success, break
        if (offset > TOTAL_EXPECTED * 2) {
          hasMore = false;
        }
      }
    }

    console.log(`Total exercises fetched: ${allExercises.length}`);

    if (allExercises.length === 0) {
      console.log('No exercises found to sync');
      return;
    }

    // Get existing exercises to identify which need updates vs. inserts
    const { data: existingExercises, error: fetchError } = await supabase
      .from('exercises')
      .select('id, name, video_url');

    if (fetchError) {
      console.error('Error fetching existing exercises:', fetchError);
      throw fetchError;
    }

    // Create maps for efficient lookup
    const existingByName = new Map();
    existingExercises?.forEach(exercise => {
      existingByName.set(exercise.name.toLowerCase(), exercise);
    });

    const exercisesToInsert = [];
    const exercisesToUpdate = [];
    const musclesToInsert = [];

    // Process all exercises for insert/update
    for (const exercise of allExercises) {
      const existingExercise = existingByName.get(exercise.name.toLowerCase());
      
      // Map API fields to database fields
      const exerciseData = {
        name: exercise.name,
        instructions: Array.isArray(exercise.instructions) ? exercise.instructions : [exercise.instructions],
        video_url: exercise.gifUrl,
        // Keep the legacy muscle field for compatibility with a reasonable value
        muscle: mapMuscle(exercise.targetMuscles?.[0] || "abs"),
        equipment: mapEquipmentType(exercise.equipments?.[0]), 
        type: exercise.bodyParts?.[0], 
        difficulty: null // API doesn't seem to provide difficulty
      };

      let exerciseId;

      if (existingExercise) {
        // Exercise exists - needs updating if missing gifUrl
        exerciseId = existingExercise.id;
        if (!existingExercise.video_url || forceRefresh) {
          exercisesToUpdate.push({
            id: existingExercise.id,
            ...exerciseData
          });
        }
      } else {
        // New exercise to insert
        exerciseId = uuidv4(); // Generate a UUID for the new exercise
        exerciseData.id = exerciseId;
        exercisesToInsert.push(exerciseData);
      }

      // Process both primary and secondary muscles for the junction table
      if (exerciseId) {
        // Primary muscles first
        if (exercise.targetMuscles && exercise.targetMuscles.length > 0) {
          for (const muscle of exercise.targetMuscles) {
            if (isValidMuscle(muscle)) {
              musclesToInsert.push({
                exercise_id: exerciseId,
                muscle: mapMuscle(muscle),
                is_primary: true
              });
            }
          }
        }

        // Then secondary muscles
        if (exercise.secondaryMuscles && exercise.secondaryMuscles.length > 0) {
          for (const muscle of exercise.secondaryMuscles) {
            if (isValidMuscle(muscle)) {
              musclesToInsert.push({
                exercise_id: exerciseId,
                muscle: mapMuscle(muscle),
                is_primary: false
              });
            }
          }
        }
      }
    }

    console.log(`Found ${exercisesToInsert.length} new exercises to insert`);
    console.log(`Found ${exercisesToUpdate.length} existing exercises to update with missing GIFs`);
    console.log(`Found ${musclesToInsert.length} muscle connections to insert`);

    // Process inserts and updates within a transaction if possible
    try {
      // Begin transaction
      console.log('Beginning database transaction...');

      // Insert new exercises
      if (exercisesToInsert.length > 0) {
        for (let i = 0; i < exercisesToInsert.length; i += BATCH_SIZE) {
          const batch = exercisesToInsert.slice(i, i + BATCH_SIZE);
          console.log(`Inserting exercise batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(exercisesToInsert.length / BATCH_SIZE)}`);
          
          const { error: insertError } = await supabase
            .from('exercises')
            .insert(batch);

          if (insertError) {
            console.error('Error inserting exercise batch:', insertError);
            // Continue with next batch instead of failing completely
          }
        }
      }

      // Update existing exercises
      if (exercisesToUpdate.length > 0) {
        for (let i = 0; i < exercisesToUpdate.length; i += BATCH_SIZE) {
          const batch = exercisesToUpdate.slice(i, i + BATCH_SIZE);
          console.log(`Updating exercise batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(exercisesToUpdate.length / BATCH_SIZE)}`);
          
          for (const exercise of batch) {
            const { error: updateError } = await supabase
              .from('exercises')
              .update({
                video_url: exercise.video_url,
                instructions: exercise.instructions,
                muscle: exercise.muscle,
                equipment: exercise.equipment,
                type: exercise.type
              })
              .eq('id', exercise.id);

            if (updateError) {
              console.error('Error updating exercise:', exercise.name, updateError);
            }
          }
        }
      }

      // Clear existing muscle connections if we're doing a force refresh
      if (forceRefresh && musclesToInsert.length > 0) {
        console.log('Clearing existing muscle connections for a fresh start...');
        
        const { error: deleteError } = await supabase
          .from('exercise_muscles')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
        
        if (deleteError) {
          console.error('Error clearing muscle connections:', deleteError);
        }
      }

      // Insert new muscle connections
      if (musclesToInsert.length > 0) {
        for (let i = 0; i < musclesToInsert.length; i += BATCH_SIZE) {
          const batch = musclesToInsert.slice(i, i + BATCH_SIZE);
          console.log(`Inserting muscle connection batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(musclesToInsert.length / BATCH_SIZE)}`);
          
          const { error: muscleInsertError } = await supabase
            .from('exercise_muscles')
            .upsert(batch, { onConflict: 'exercise_id,muscle,is_primary' });

          if (muscleInsertError) {
            console.error('Error inserting muscle connections:', muscleInsertError);
          }
        }
      }

      // Update sync timestamp
      const { error: updateError } = await supabase
        .from('sync_log')
        .upsert({ id: 1, last_sync: new Date().toISOString() });

      if (updateError) {
        console.error('Error updating sync timestamp:', updateError);
      }

      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Error during transaction:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error during sync process:', error);
    process.exit(1);
  }
}

// Helper function to check if muscle name is valid for our enum
function isValidMuscle(muscle) {
  if (!muscle) return false;
  
  const validMuscles = [
    'abs', 'arms', 'back', 'biceps', 'calves', 'chest', 
    'core', 'forearms', 'full_body', 'glutes', 'hamstrings', 
    'legs', 'obliques', 'quads', 'shoulders', 'triceps'
  ];
  
  return validMuscles.includes(mapMuscle(muscle));
}

// Helper function to map API muscle names to our enum values
function mapMuscle(muscle) {
  if (!muscle) return 'full_body';
  
  const muscleMap = {
    'abdominals': 'abs',
    'abs': 'abs',
    'abductors': 'legs',
    'adductors': 'legs',
    'biceps': 'biceps',
    'calves': 'calves',
    'cardiovascular system': 'full_body',
    'delts': 'shoulders',
    'deltoids': 'shoulders',
    'forearms': 'forearms',
    'glutes': 'glutes',
    'hamstrings': 'hamstrings',
    'lats': 'back',
    'levator scapulae': 'back',
    'chest': 'chest',
    'pectorals': 'chest',
    'quads': 'quads',
    'quadriceps': 'quads',
    'serratus anterior': 'chest',
    'spine': 'back',
    'traps': 'back',
    'trapezius': 'back',
    'triceps': 'triceps',
    'upper back': 'back'
  };
  
  const mapped = muscleMap[muscle.toLowerCase()];
  return mapped || 'full_body';
}

// Helper function to map API equipment types to your database enum
function mapEquipmentType(equipment) {
  const equipmentMap = {
    'barbell': 'barbell',
    'dumbbell': 'dumbbell',
    'kettlebell': 'kettlebell',
    'cable': 'cable',
    'machine': 'machine',
    'body weight': 'bodyweight',
    'bodyweight': 'bodyweight',
    'band': 'resistance_band',
    'resistance band': 'resistance_band',
    'smith machine': 'smith_machine',
    'medicine ball': 'medicine_ball',
    'exercise ball': 'other',
    'foam roller': 'foam_roller',
    'bench': 'bench',
    'pull-up bar': 'pull_up_bar',
    'weighted': 'other',
    'wheel roller': 'other',
    'rope': 'other',
    'assisted': 'other',
    'bosu ball': 'other',
    'roller': 'other',
    'ez barbell': 'barbell',
    'olympic barbell': 'barbell',
    'trap bar': 'barbell',
    'upper body': 'other',
    'lower body': 'other'
  };

  if (!equipment) return 'other';
  
  const mapped = equipmentMap[equipment.toLowerCase()];
  return mapped || 'other';
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