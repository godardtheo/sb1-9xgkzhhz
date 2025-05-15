-- Met à jour la fonction trigger production.update_workout_total_weight_after_exercise_delete
-- pour qu'elle calcule et applique directement la mise à jour du total_weight_lifted
-- sur la table production.workouts en utilisant la fonction existante
-- production.calculate_workout_total_weight_lifted.
-- Cela corrige un bug où le trigger essayait d'appeler une fonction 
-- production.update_workout_total_weight_lifted(uuid) qui n'existait pas.

CREATE OR REPLACE FUNCTION production.update_workout_total_weight_after_exercise_delete()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Vérifie si parent_workout_id existe pour éviter les erreurs si la donnée est manquante
  IF OLD.parent_workout_id IS NOT NULL THEN
    -- Met à jour le total_weight_lifted du workout parent
    UPDATE production.workouts
    SET total_weight_lifted = production.calculate_workout_total_weight_lifted(OLD.parent_workout_id)
    WHERE id = OLD.parent_workout_id;
  END IF;
  -- Pour un trigger AFTER DELETE, la valeur de retour est généralement ignorée.
  -- Retourner OLD est une pratique courante mais n'a pas d'effet direct sur l'opération DELETE.
  RETURN OLD;
END;
$function$; 