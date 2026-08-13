ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS training_time TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_preferences_training_time_format'
  ) THEN
    ALTER TABLE public.user_preferences
      ADD CONSTRAINT user_preferences_training_time_format
      CHECK (
        training_time IS NULL
        OR training_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      );
  END IF;
END
$$;
