// Example script showing how to use the new user-specific favorites implementation

import { createClient } from '@supabase/supabase-js';

// You'll need to replace these with your actual values
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFavorites() {
  console.log('Testing user-specific favorites implementation...');
  
  // 1. Get authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    console.error('Error getting authenticated user:', userError);
    return;
  }
  
  console.log(`Authenticated as user: ${user.id}`);
  
  // 2. Get all exercises
  const { data: exercises, error: exercisesError } = await supabase
    .from('exercises')
    .select('id, name, muscle')
    .order('name')
    .limit(5);
  
  if (exercisesError) {
    console.error('Error fetching exercises:', exercisesError);
    return;
  }
  
  console.log(`Fetched ${exercises.length} exercises`);
  
  // 3. Get user's favorites
  const { data: favorites, error: favoritesError } = await supabase
    .from('user_favorite_exercises')
    .select('exercise_id')
    .eq('user_id', user.id);
  
  if (favoritesError) {
    console.error('Error fetching user favorites:', favoritesError);
    return;
  }
  
  // Create a set of favorite IDs for easy lookup
  const favoriteIds = new Set(favorites?.map(f => f.exercise_id) || []);
  console.log(`User has ${favoriteIds.size} favorite exercises`);
  
  // 4. Add a favorite if user has none
  if (favoriteIds.size === 0 && exercises.length > 0) {
    const exerciseToFavorite = exercises[0];
    console.log(`Adding exercise "${exerciseToFavorite.name}" to favorites...`);
    
    const { error: addError } = await supabase
      .from('user_favorite_exercises')
      .insert({
        user_id: user.id,
        exercise_id: exerciseToFavorite.id
      });
    
    if (addError) {
      console.error('Error adding favorite:', addError);
    } else {
      console.log('Successfully added favorite');
      favoriteIds.add(exerciseToFavorite.id);
    }
  }
  
  // 5. Display exercises with favorite status
  console.log('\nExercises with favorite status:');
  exercises.forEach(exercise => {
    const isFavorite = favoriteIds.has(exercise.id);
    console.log(`- ${exercise.name} (${exercise.muscle}): ${isFavorite ? '❤️ Favorite' : '🤍 Not favorite'}`);
  });
  
  // 6. Toggle favorite for the first exercise
  if (exercises.length > 0) {
    const firstExercise = exercises[0];
    const isFavorite = favoriteIds.has(firstExercise.id);
    
    console.log(`\nToggling favorite status for "${firstExercise.name}"...`);
    
    if (isFavorite) {
      // Remove from favorites
      const { error: removeError } = await supabase
        .from('user_favorite_exercises')
        .delete()
        .match({
          user_id: user.id,
          exercise_id: firstExercise.id
        });
      
      if (removeError) {
        console.error('Error removing favorite:', removeError);
      } else {
        console.log('Successfully removed from favorites');
      }
    } else {
      // Add to favorites
      const { error: addError } = await supabase
        .from('user_favorite_exercises')
        .insert({
          user_id: user.id,
          exercise_id: firstExercise.id
        });
      
      if (addError) {
        console.error('Error adding favorite:', addError);
      } else {
        console.log('Successfully added to favorites');
      }
    }
  }
}

// Run the test
testFavorites().catch(console.error); 