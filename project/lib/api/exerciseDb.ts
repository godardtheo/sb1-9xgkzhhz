import { supabase } from '../supabase';
import axios from 'axios';

const API_URL = 'https://exercisedb-api.vercel.app/api/v1';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export async function searchExercises(query: string) {
  try {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(20);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error searching exercises:', error);
    throw error;
  }
}

export async function getExercisesByMuscleGroup(muscleGroup: string) {
  try {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('muscle', muscleGroup)
      .order('name');

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching exercises by muscle group:', error);
    throw error;
  }
}

export async function fetchAndSyncExercises() {
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

    // Fetch exercises from API with pagination
    console.log('Fetching exercises from API...');
    let allExercises = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await axios.get(`${API_URL}/exercises`, {
        params: {
          page,
          limit: 50
        }
      });

      if (!response.data?.data?.exercises) {
        throw new Error('Invalid API response format');
      }

      const { exercises, nextPage } = response.data.data;
      allExercises = [...allExercises, ...exercises];
      
      if (!nextPage) {
        hasMore = false;
      } else {
        page++;
      }
    }

    // Get existing exercises to avoid duplicates
    const { data: existingExercises, error: fetchError } = await supabase
      .from('exercises')
      .select('name');

    if (fetchError) throw fetchError;

    const existingNames = new Set(existingExercises?.map(e => e.name) || []);
    const newExercises = allExercises.filter(e => !existingNames.has(e.name));

    if (newExercises.length > 0) {
      // Insert exercises in batches
      const batchSize = 50;
      for (let i = 0; i < newExercises.length; i += batchSize) {
        const batch = newExercises.slice(i, i + batchSize);
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

        if (insertError) throw insertError;
      }
    }

    // Update sync timestamp
    await supabase
      .from('sync_log')
      .upsert({ id: 1, last_sync: new Date().toISOString() });

  } catch (error) {
    console.error('Error syncing exercises:', error);
    throw error;
  }
}