import { create } from 'zustand';

type Exercise = {
  id: string;
  name: string;
  muscle: string;
  equipment?: string | string[] | undefined;
  instructions?: string;
  video_url?: string;
  type?: string;
  difficulty?: string;
  sets: {
    id: string;
    weight: string;
    reps: string;
    completed: boolean;
    previousWeight?: string;
    previousReps?: string;
  }[];
};

type WorkoutProgressState = {
  isWorkoutInProgress: boolean;
  workoutName: string;
  templateId: string | null;
  exercises: Exercise[];
  workoutDuration: number;
  restTime: number;
  activeRestTime: number;
  isRestTimerActive: boolean;
  startTime: number | null; // Store the timestamp when workout was started
  
  // Actions
  startWorkout: (name: string, templateId: string | null, exercises: Exercise[]) => void;
  updateWorkout: (data: Partial<Omit<WorkoutProgressState, 'startTime' | 'workoutDuration'>>) => void;
  updateExercises: (exercises: Exercise[]) => void;
  endWorkout: () => void;
  getCurrentDuration: () => number; // Calculate current duration based on startTime
};

// Helper to get current duration based on start time
const calculateDuration = (startTime: number | null): number => {
  if (!startTime) return 0;
  
  const now = Date.now();
  return Math.floor((now - startTime) / 1000); // Convert ms to seconds
};

export const useWorkoutProgressStore = create<WorkoutProgressState>((set, get) => ({
  isWorkoutInProgress: false,
  workoutName: 'Workout',
  templateId: null,
  exercises: [],
  workoutDuration: 0,
  restTime: 120,
  activeRestTime: 0,
  isRestTimerActive: false,
  startTime: null,
  
  startWorkout: (name, templateId, exercises) => set({
    isWorkoutInProgress: true,
    workoutName: name,
    templateId,
    exercises,
    workoutDuration: 0,
    isRestTimerActive: false,
    activeRestTime: 0,
    startTime: Date.now(),
  }),
  
  updateWorkout: (data) => set((state) => ({
    ...state,
    ...data,
  })),
  
  updateExercises: (exercises) => set((state) => ({
    ...state,
    exercises,
  })),
  
  getCurrentDuration: () => {
    const { startTime } = get();
    return calculateDuration(startTime);
  },
  
  endWorkout: () => set({
    isWorkoutInProgress: false,
    workoutName: 'Workout',
    templateId: null,
    exercises: [],
    workoutDuration: 0,
    restTime: 120,
    activeRestTime: 0,
    isRestTimerActive: false,
    startTime: null,
  }),
}));