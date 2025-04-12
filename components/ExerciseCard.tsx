import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Heart, ChevronRight } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type ExerciseProps = {
  id: string;
  name: string;
  muscle: string;
  isFavorite: boolean;
  onPress: () => void;
  onFavoriteToggle?: (id: string, isFavorite: boolean) => void;
};

export default function ExerciseCard({ 
  id, 
  name, 
  muscle, 
  isFavorite, 
  onPress,
  onFavoriteToggle 
}: ExerciseProps) {
  const [favorite, setFavorite] = useState(isFavorite);
  
  // Update local state when prop changes (important for category switching)
  useEffect(() => {
    setFavorite(isFavorite);
  }, [isFavorite]);

  const toggleFavorite = async (e: any) => {
    e.stopPropagation();
    
    try {
      // Optimistic UI update
      setFavorite(!favorite);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No authenticated user found');
        setFavorite(favorite); // Revert on error
        return;
      }
      
      if (!favorite) {
        // Add to favorites
        const { error } = await supabase
          .from('user_favorite_exercises')
          .insert({ 
            user_id: user.id,
            exercise_id: id
          });
        
        if (error) {
          // Revert optimistic update on error
          setFavorite(favorite);
          console.error('Error adding to favorites:', error);
        } else {
          // Notify parent of change
          onFavoriteToggle && onFavoriteToggle(id, true);
        }
      } else {
        // Remove from favorites
        const { error } = await supabase
          .from('user_favorite_exercises')
          .delete()
          .match({ 
            user_id: user.id,
            exercise_id: id
          });
        
        if (error) {
          // Revert optimistic update on error
          setFavorite(favorite);
          console.error('Error removing from favorites:', error);
        } else {
          // Notify parent of change
          onFavoriteToggle && onFavoriteToggle(id, false);
        }
      }
    } catch (error) {
      // Revert optimistic update on error
      setFavorite(favorite);
      console.error('Error toggling favorite:', error);
    }
  };

  // Helper to capitalize first letter
  const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.iconContainer}>
        <Text style={styles.iconText}>{name.charAt(0).toUpperCase()}</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <View style={styles.muscleTag}>
          <Text style={styles.muscleText}>{capitalizeFirstLetter(muscle)}</Text>
        </View>
      </View>
      
      <View style={styles.actions}>
        <Pressable 
          style={styles.favoriteButton} 
          onPress={toggleFavorite}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Heart 
            size={20} 
            color={favorite ? "#FF90B3" : "#5eead4"} 
            fill={favorite ? "#FF90B3" : "transparent"} 
          />
        </Pressable>
        <ChevronRight size={20} color="#5eead4" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#115e59',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#14b8a6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#042f2e',
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ccfbf1',
    marginBottom: 4,
  },
  muscleTag: {
    backgroundColor: '#0f766e',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  muscleText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#5eead4',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  favoriteButton: {
    marginRight: 12,
    padding: 4,
  },
}); 