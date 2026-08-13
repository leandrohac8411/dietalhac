export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      body_assessments: {
        Row: {
          assessed_at: string;
          assessment_type: string | null;
          body_fat_pct: number | null;
          body_water_pct: number | null;
          created_at: string;
          device_bmr: number | null;
          fat_mass_kg: number | null;
          id: string;
          lean_mass_kg: number | null;
          muscle_mass_kg: number | null;
          notes: string | null;
          updated_at: string;
          user_id: string;
          visceral_fat: number | null;
          weight_kg: number | null;
        };
        Insert: {
          assessed_at?: string;
          assessment_type?: string | null;
          body_fat_pct?: number | null;
          body_water_pct?: number | null;
          created_at?: string;
          device_bmr?: number | null;
          fat_mass_kg?: number | null;
          id?: string;
          lean_mass_kg?: number | null;
          muscle_mass_kg?: number | null;
          notes?: string | null;
          updated_at?: string;
          user_id: string;
          visceral_fat?: number | null;
          weight_kg?: number | null;
        };
        Update: {
          assessed_at?: string;
          assessment_type?: string | null;
          body_fat_pct?: number | null;
          body_water_pct?: number | null;
          created_at?: string;
          device_bmr?: number | null;
          fat_mass_kg?: number | null;
          id?: string;
          lean_mass_kg?: number | null;
          muscle_mass_kg?: number | null;
          notes?: string | null;
          updated_at?: string;
          user_id?: string;
          visceral_fat?: number | null;
          weight_kg?: number | null;
        };
        Relationships: [];
      };
      body_measurements: {
        Row: {
          abdomen_cm: number | null;
          arm_left_cm: number | null;
          arm_right_cm: number | null;
          assessment_id: string | null;
          calf_left_cm: number | null;
          calf_right_cm: number | null;
          chest_cm: number | null;
          created_at: string;
          hip_cm: number | null;
          id: string;
          measured_at: string;
          thigh_left_cm: number | null;
          thigh_right_cm: number | null;
          user_id: string;
          waist_cm: number | null;
        };
        Insert: {
          abdomen_cm?: number | null;
          arm_left_cm?: number | null;
          arm_right_cm?: number | null;
          assessment_id?: string | null;
          calf_left_cm?: number | null;
          calf_right_cm?: number | null;
          chest_cm?: number | null;
          created_at?: string;
          hip_cm?: number | null;
          id?: string;
          measured_at?: string;
          thigh_left_cm?: number | null;
          thigh_right_cm?: number | null;
          user_id: string;
          waist_cm?: number | null;
        };
        Update: {
          abdomen_cm?: number | null;
          arm_left_cm?: number | null;
          arm_right_cm?: number | null;
          assessment_id?: string | null;
          calf_left_cm?: number | null;
          calf_right_cm?: number | null;
          chest_cm?: number | null;
          created_at?: string;
          hip_cm?: number | null;
          id?: string;
          measured_at?: string;
          thigh_left_cm?: number | null;
          thigh_right_cm?: number | null;
          user_id?: string;
          waist_cm?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "body_measurements_assessment_id_fkey";
            columns: ["assessment_id"];
            isOneToOne: false;
            referencedRelation: "body_assessments";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_food_logs: {
        Row: {
          calories: number | null;
          carbs_g: number | null;
          completed: boolean;
          created_at: string;
          fat_g: number | null;
          id: string;
          log_date: string;
          meal_id: string | null;
          meal_name: string | null;
          notes: string | null;
          protein_g: number | null;
          user_id: string;
        };
        Insert: {
          calories?: number | null;
          carbs_g?: number | null;
          completed?: boolean;
          created_at?: string;
          fat_g?: number | null;
          id?: string;
          log_date?: string;
          meal_id?: string | null;
          meal_name?: string | null;
          notes?: string | null;
          protein_g?: number | null;
          user_id: string;
        };
        Update: {
          calories?: number | null;
          carbs_g?: number | null;
          completed?: boolean;
          created_at?: string;
          fat_g?: number | null;
          id?: string;
          log_date?: string;
          meal_id?: string | null;
          meal_name?: string | null;
          notes?: string | null;
          protein_g?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_food_logs_meal_id_fkey";
            columns: ["meal_id"];
            isOneToOne: false;
            referencedRelation: "meals";
            referencedColumns: ["id"];
          },
        ];
      };
      exercises: {
        Row: {
          alternative_name: string | null;
          created_at: string;
          difficulty: string | null;
          equipment: string | null;
          id: string;
          instructions: string | null;
          is_active: boolean;
          media_url: string | null;
          muscle_group: string;
          name: string;
          place: string | null;
        };
        Insert: {
          alternative_name?: string | null;
          created_at?: string;
          difficulty?: string | null;
          equipment?: string | null;
          id?: string;
          instructions?: string | null;
          is_active?: boolean;
          media_url?: string | null;
          muscle_group?: string;
          name: string;
          place?: string | null;
        };
        Update: {
          alternative_name?: string | null;
          created_at?: string;
          difficulty?: string | null;
          equipment?: string | null;
          id?: string;
          instructions?: string | null;
          is_active?: boolean;
          media_url?: string | null;
          muscle_group?: string;
          name?: string;
          place?: string | null;
        };
        Relationships: [];
      };
      food_items: {
        Row: {
          calories: number;
          carbs_g: number;
          category: string;
          created_at: string;
          estimated_cost: number | null;
          fat_g: number;
          fiber_g: number;
          id: string;
          is_active: boolean;
          name: string;
          notes: string | null;
          portion: number;
          protein_g: number;
          sodium_mg: number;
          tags: string[];
          unit: string;
          updated_at: string;
        };
        Insert: {
          calories?: number;
          carbs_g?: number;
          category?: string;
          created_at?: string;
          estimated_cost?: number | null;
          fat_g?: number;
          fiber_g?: number;
          id?: string;
          is_active?: boolean;
          name: string;
          notes?: string | null;
          portion?: number;
          protein_g?: number;
          sodium_mg?: number;
          tags?: string[];
          unit?: string;
          updated_at?: string;
        };
        Update: {
          calories?: number;
          carbs_g?: number;
          category?: string;
          created_at?: string;
          estimated_cost?: number | null;
          fat_g?: number;
          fiber_g?: number;
          id?: string;
          is_active?: boolean;
          name?: string;
          notes?: string | null;
          portion?: number;
          protein_g?: number;
          sodium_mg?: number;
          tags?: string[];
          unit?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      food_substitutions: {
        Row: {
          created_at: string;
          food_item_id: string;
          id: string;
          substitute_id: string;
        };
        Insert: {
          created_at?: string;
          food_item_id: string;
          id?: string;
          substitute_id: string;
        };
        Update: {
          created_at?: string;
          food_item_id?: string;
          id?: string;
          substitute_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "food_substitutions_food_item_id_fkey";
            columns: ["food_item_id"];
            isOneToOne: false;
            referencedRelation: "food_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "food_substitutions_substitute_id_fkey";
            columns: ["substitute_id"];
            isOneToOne: false;
            referencedRelation: "food_items";
            referencedColumns: ["id"];
          },
        ];
      };
      health_screening: {
        Row: {
          breastfeeding: boolean | null;
          created_at: string;
          diabetes: boolean | null;
          eating_disorder: boolean | null;
          heart_condition: boolean | null;
          hypertension: boolean | null;
          id: string;
          injuries: string | null;
          kidney_disease: boolean | null;
          liver_disease: boolean | null;
          medical_followup: boolean | null;
          medications: string | null;
          persistent_pain: boolean | null;
          pregnant: boolean | null;
          recent_surgery: boolean | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          breastfeeding?: boolean | null;
          created_at?: string;
          diabetes?: boolean | null;
          eating_disorder?: boolean | null;
          heart_condition?: boolean | null;
          hypertension?: boolean | null;
          id?: string;
          injuries?: string | null;
          kidney_disease?: boolean | null;
          liver_disease?: boolean | null;
          medical_followup?: boolean | null;
          medications?: string | null;
          persistent_pain?: boolean | null;
          pregnant?: boolean | null;
          recent_surgery?: boolean | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          breastfeeding?: boolean | null;
          created_at?: string;
          diabetes?: boolean | null;
          eating_disorder?: boolean | null;
          heart_condition?: boolean | null;
          hypertension?: boolean | null;
          id?: string;
          injuries?: string | null;
          kidney_disease?: boolean | null;
          liver_disease?: boolean | null;
          medical_followup?: boolean | null;
          medications?: string | null;
          persistent_pain?: boolean | null;
          pregnant?: boolean | null;
          recent_surgery?: boolean | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      meal_items: {
        Row: {
          calories: number;
          carbs_g: number;
          created_at: string;
          fat_g: number;
          fiber_g: number;
          food_item_id: string | null;
          food_name: string;
          id: string;
          meal_id: string;
          notes: string | null;
          preparation: string | null;
          protein_g: number;
          quantity: number;
          unit: string;
          user_id: string;
        };
        Insert: {
          calories?: number;
          carbs_g?: number;
          created_at?: string;
          fat_g?: number;
          fiber_g?: number;
          food_item_id?: string | null;
          food_name: string;
          id?: string;
          meal_id: string;
          notes?: string | null;
          preparation?: string | null;
          protein_g?: number;
          quantity?: number;
          unit?: string;
          user_id: string;
        };
        Update: {
          calories?: number;
          carbs_g?: number;
          created_at?: string;
          fat_g?: number;
          fiber_g?: number;
          food_item_id?: string | null;
          food_name?: string;
          id?: string;
          meal_id?: string;
          notes?: string | null;
          preparation?: string | null;
          protein_g?: number;
          quantity?: number;
          unit?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meal_items_food_item_id_fkey";
            columns: ["food_item_id"];
            isOneToOne: false;
            referencedRelation: "food_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meal_items_meal_id_fkey";
            columns: ["meal_id"];
            isOneToOne: false;
            referencedRelation: "meals";
            referencedColumns: ["id"];
          },
        ];
      };
      meal_plans: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          target_calories: number | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          target_calories?: number | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          target_calories?: number | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      meals: {
        Row: {
          created_at: string;
          id: string;
          meal_plan_id: string;
          name: string;
          notes: string | null;
          scheduled_time: string | null;
          sort_order: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          meal_plan_id: string;
          name: string;
          notes?: string | null;
          scheduled_time?: string | null;
          sort_order?: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          meal_plan_id?: string;
          name?: string;
          notes?: string | null;
          scheduled_time?: string | null;
          sort_order?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meals_meal_plan_id_fkey";
            columns: ["meal_plan_id"];
            isOneToOne: false;
            referencedRelation: "meal_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          read: boolean;
          title: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          read?: boolean;
          title: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          read?: boolean;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          biological_sex: string | null;
          birth_date: string | null;
          created_at: string;
          current_weight_kg: number | null;
          full_name: string;
          height_cm: number | null;
          id: string;
          onboarding_completed: boolean;
          onboarding_step: number;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          biological_sex?: string | null;
          birth_date?: string | null;
          created_at?: string;
          current_weight_kg?: number | null;
          full_name?: string;
          height_cm?: number | null;
          id: string;
          onboarding_completed?: boolean;
          onboarding_step?: number;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          biological_sex?: string | null;
          birth_date?: string | null;
          created_at?: string;
          current_weight_kg?: number | null;
          full_name?: string;
          height_cm?: number | null;
          id?: string;
          onboarding_completed?: boolean;
          onboarding_step?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      progress_photos: {
        Row: {
          angle: string;
          created_at: string;
          id: string;
          storage_path: string;
          taken_at: string;
          user_id: string;
        };
        Insert: {
          angle?: string;
          created_at?: string;
          id?: string;
          storage_path: string;
          taken_at?: string;
          user_id: string;
        };
        Update: {
          angle?: string;
          created_at?: string;
          id?: string;
          storage_path?: string;
          taken_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_activities: {
        Row: {
          created_at: string;
          duration_min: number;
          id: string;
          intensity: string;
          name: string;
          user_id: string;
          weekdays: number[];
        };
        Insert: {
          created_at?: string;
          duration_min?: number;
          id?: string;
          intensity?: string;
          name: string;
          user_id: string;
          weekdays?: number[];
        };
        Update: {
          created_at?: string;
          duration_min?: number;
          id?: string;
          intensity?: string;
          name?: string;
          user_id?: string;
          weekdays?: number[];
        };
        Relationships: [];
      };
      user_goals: {
        Row: {
          active_scenario: string | null;
          carbs_g: number | null;
          created_at: string;
          deadline_weeks: number | null;
          fat_g: number | null;
          fiber_g: number | null;
          goal_type: string;
          id: string;
          is_active: boolean;
          maintenance_calories: number | null;
          priority_areas: string[] | null;
          priority_level: string | null;
          protein_g: number | null;
          start_weight_kg: number | null;
          target_body_fat: number | null;
          target_calories: number | null;
          target_weight_kg: number | null;
          updated_at: string;
          user_id: string;
          water_ml: number | null;
          weekly_rate_kg: number | null;
        };
        Insert: {
          active_scenario?: string | null;
          carbs_g?: number | null;
          created_at?: string;
          deadline_weeks?: number | null;
          fat_g?: number | null;
          fiber_g?: number | null;
          goal_type: string;
          id?: string;
          is_active?: boolean;
          maintenance_calories?: number | null;
          priority_areas?: string[] | null;
          priority_level?: string | null;
          protein_g?: number | null;
          start_weight_kg?: number | null;
          target_body_fat?: number | null;
          target_calories?: number | null;
          target_weight_kg?: number | null;
          updated_at?: string;
          user_id: string;
          water_ml?: number | null;
          weekly_rate_kg?: number | null;
        };
        Update: {
          active_scenario?: string | null;
          carbs_g?: number | null;
          created_at?: string;
          deadline_weeks?: number | null;
          fat_g?: number | null;
          fiber_g?: number | null;
          goal_type?: string;
          id?: string;
          is_active?: boolean;
          maintenance_calories?: number | null;
          priority_areas?: string[] | null;
          priority_level?: string | null;
          protein_g?: number | null;
          start_weight_kg?: number | null;
          target_body_fat?: number | null;
          target_calories?: number | null;
          target_weight_kg?: number | null;
          updated_at?: string;
          user_id?: string;
          water_ml?: number | null;
          weekly_rate_kg?: number | null;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          alcohol_intake: string | null;
          allergies: string | null;
          cooking_time: string | null;
          created_at: string;
          daily_steps: number | null;
          dietary_restrictions: string[] | null;
          disliked_foods: string | null;
          eats_out: boolean | null;
          equipment: string[] | null;
          experience_level: string | null;
          food_budget: string | null;
          food_difficulties: string | null;
          id: string;
          injuries: string | null;
          intolerances: string | null;
          liked_foods: string | null;
          meal_times: string[] | null;
          meals_per_day: number | null;
          occupation: string | null;
          painful_exercises: string | null;
          physical_limitations: string | null;
          routine_level: string | null;
          sleep_hours: number | null;
          sleep_time: string | null;
          sports: string | null;
          supplements: string | null;
          training_days: number | null;
          training_duration_min: number | null;
          training_place: string | null;
          updated_at: string;
          user_id: string;
          uses_meal_prep: boolean | null;
          wake_time: string | null;
          water_intake_ml: number | null;
          workout_split_preference: string;
        };
        Insert: {
          alcohol_intake?: string | null;
          allergies?: string | null;
          cooking_time?: string | null;
          created_at?: string;
          daily_steps?: number | null;
          dietary_restrictions?: string[] | null;
          disliked_foods?: string | null;
          eats_out?: boolean | null;
          equipment?: string[] | null;
          experience_level?: string | null;
          food_budget?: string | null;
          food_difficulties?: string | null;
          id?: string;
          injuries?: string | null;
          intolerances?: string | null;
          liked_foods?: string | null;
          meal_times?: string[] | null;
          meals_per_day?: number | null;
          occupation?: string | null;
          painful_exercises?: string | null;
          physical_limitations?: string | null;
          routine_level?: string | null;
          sleep_hours?: number | null;
          sleep_time?: string | null;
          sports?: string | null;
          supplements?: string | null;
          training_days?: number | null;
          training_duration_min?: number | null;
          training_place?: string | null;
          updated_at?: string;
          user_id: string;
          uses_meal_prep?: boolean | null;
          wake_time?: string | null;
          water_intake_ml?: number | null;
          workout_split_preference?: string;
        };
        Update: {
          alcohol_intake?: string | null;
          allergies?: string | null;
          cooking_time?: string | null;
          created_at?: string;
          daily_steps?: number | null;
          dietary_restrictions?: string[] | null;
          disliked_foods?: string | null;
          eats_out?: boolean | null;
          equipment?: string[] | null;
          experience_level?: string | null;
          food_budget?: string | null;
          food_difficulties?: string | null;
          id?: string;
          injuries?: string | null;
          intolerances?: string | null;
          liked_foods?: string | null;
          meal_times?: string[] | null;
          meals_per_day?: number | null;
          occupation?: string | null;
          painful_exercises?: string | null;
          physical_limitations?: string | null;
          routine_level?: string | null;
          sleep_hours?: number | null;
          sleep_time?: string | null;
          sports?: string | null;
          supplements?: string | null;
          training_days?: number | null;
          training_duration_min?: number | null;
          training_place?: string | null;
          updated_at?: string;
          user_id?: string;
          uses_meal_prep?: boolean | null;
          wake_time?: string | null;
          water_intake_ml?: number | null;
          workout_split_preference?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      water_logs: {
        Row: {
          amount_ml: number;
          created_at: string;
          id: string;
          log_date: string;
          user_id: string;
        };
        Insert: {
          amount_ml?: number;
          created_at?: string;
          id?: string;
          log_date?: string;
          user_id: string;
        };
        Update: {
          amount_ml?: number;
          created_at?: string;
          id?: string;
          log_date?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      weekly_checkins: {
        Row: {
          abdomen_cm: number | null;
          avg_weight_kg: number | null;
          checkin_date: string;
          created_at: string;
          diet_adherence: number | null;
          diet_difficulty: string | null;
          energy: number | null;
          hunger: number | null;
          id: string;
          notes: string | null;
          performance: number | null;
          recommendation: string | null;
          sleep: number | null;
          stress: number | null;
          user_id: string;
          weight_kg: number | null;
          workouts_done: number | null;
        };
        Insert: {
          abdomen_cm?: number | null;
          avg_weight_kg?: number | null;
          checkin_date?: string;
          created_at?: string;
          diet_adherence?: number | null;
          diet_difficulty?: string | null;
          energy?: number | null;
          hunger?: number | null;
          id?: string;
          notes?: string | null;
          performance?: number | null;
          recommendation?: string | null;
          sleep?: number | null;
          stress?: number | null;
          user_id: string;
          weight_kg?: number | null;
          workouts_done?: number | null;
        };
        Update: {
          abdomen_cm?: number | null;
          avg_weight_kg?: number | null;
          checkin_date?: string;
          created_at?: string;
          diet_adherence?: number | null;
          diet_difficulty?: string | null;
          energy?: number | null;
          hunger?: number | null;
          id?: string;
          notes?: string | null;
          performance?: number | null;
          recommendation?: string | null;
          sleep?: number | null;
          stress?: number | null;
          user_id?: string;
          weight_kg?: number | null;
          workouts_done?: number | null;
        };
        Relationships: [];
      };
      weight_logs: {
        Row: {
          created_at: string;
          id: string;
          log_date: string;
          user_id: string;
          weight_kg: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          log_date?: string;
          user_id: string;
          weight_kg: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          log_date?: string;
          user_id?: string;
          weight_kg?: number;
        };
        Relationships: [];
      };
      workout_exercises: {
        Row: {
          alternative_name: string | null;
          created_at: string;
          difficulty: string | null;
          exercise_id: string | null;
          exercise_name: string;
          id: string;
          load_kg: number | null;
          media_url: string | null;
          notes: string | null;
          reps: string;
          rest_seconds: number;
          sets: number;
          sort_order: number;
          user_id: string;
          workout_id: string;
        };
        Insert: {
          alternative_name?: string | null;
          created_at?: string;
          difficulty?: string | null;
          exercise_id?: string | null;
          exercise_name: string;
          id?: string;
          load_kg?: number | null;
          media_url?: string | null;
          notes?: string | null;
          reps?: string;
          rest_seconds?: number;
          sets?: number;
          sort_order?: number;
          user_id: string;
          workout_id: string;
        };
        Update: {
          alternative_name?: string | null;
          created_at?: string;
          difficulty?: string | null;
          exercise_id?: string | null;
          exercise_name?: string;
          id?: string;
          load_kg?: number | null;
          media_url?: string | null;
          notes?: string | null;
          reps?: string;
          rest_seconds?: number;
          sets?: number;
          sort_order?: number;
          user_id?: string;
          workout_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_exercises_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_exercises_workout_id_fkey";
            columns: ["workout_id"];
            isOneToOne: false;
            referencedRelation: "workouts";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_plans: {
        Row: {
          created_at: string;
          days_per_week: number;
          duration_min: number;
          id: string;
          is_active: boolean;
          name: string;
          place: string | null;
          split_type: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          days_per_week?: number;
          duration_min?: number;
          id?: string;
          is_active?: boolean;
          name?: string;
          place?: string | null;
          split_type?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          days_per_week?: number;
          duration_min?: number;
          id?: string;
          is_active?: boolean;
          name?: string;
          place?: string | null;
          split_type?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      workout_session_sets: {
        Row: {
          created_at: string;
          difficulty: number | null;
          exercise_name: string;
          id: string;
          load_kg: number | null;
          notes: string | null;
          pain: boolean | null;
          reps_done: number | null;
          session_id: string;
          set_number: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          difficulty?: number | null;
          exercise_name: string;
          id?: string;
          load_kg?: number | null;
          notes?: string | null;
          pain?: boolean | null;
          reps_done?: number | null;
          session_id: string;
          set_number?: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          difficulty?: number | null;
          exercise_name?: string;
          id?: string;
          load_kg?: number | null;
          notes?: string | null;
          pain?: boolean | null;
          reps_done?: number | null;
          session_id?: string;
          set_number?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_session_sets_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "workout_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_sessions: {
        Row: {
          avg_difficulty: number | null;
          created_at: string;
          duration_min: number | null;
          finished_at: string | null;
          had_pain: boolean | null;
          id: string;
          notes: string | null;
          started_at: string;
          total_volume: number | null;
          user_id: string;
          workout_id: string | null;
          workout_name: string | null;
        };
        Insert: {
          avg_difficulty?: number | null;
          created_at?: string;
          duration_min?: number | null;
          finished_at?: string | null;
          had_pain?: boolean | null;
          id?: string;
          notes?: string | null;
          started_at?: string;
          total_volume?: number | null;
          user_id: string;
          workout_id?: string | null;
          workout_name?: string | null;
        };
        Update: {
          avg_difficulty?: number | null;
          created_at?: string;
          duration_min?: number | null;
          finished_at?: string | null;
          had_pain?: boolean | null;
          id?: string;
          notes?: string | null;
          started_at?: string;
          total_volume?: number | null;
          user_id?: string;
          workout_id?: string | null;
          workout_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "workout_sessions_workout_id_fkey";
            columns: ["workout_id"];
            isOneToOne: false;
            referencedRelation: "workouts";
            referencedColumns: ["id"];
          },
        ];
      };
      workouts: {
        Row: {
          created_at: string;
          estimated_min: number | null;
          id: string;
          muscle_groups: string | null;
          name: string;
          sort_order: number;
          user_id: string;
          weekday: number | null;
          workout_plan_id: string;
        };
        Insert: {
          created_at?: string;
          estimated_min?: number | null;
          id?: string;
          muscle_groups?: string | null;
          name: string;
          sort_order?: number;
          user_id: string;
          weekday?: number | null;
          workout_plan_id: string;
        };
        Update: {
          created_at?: string;
          estimated_min?: number | null;
          id?: string;
          muscle_groups?: string | null;
          name?: string;
          sort_order?: number;
          user_id?: string;
          weekday?: number | null;
          workout_plan_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workouts_workout_plan_id_fkey";
            columns: ["workout_plan_id"];
            isOneToOne: false;
            referencedRelation: "workout_plans";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      consume_diet_generation_quota: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "user" | "admin" | "nutritionist" | "trainer";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "admin", "nutritionist", "trainer"],
    },
  },
} as const;
