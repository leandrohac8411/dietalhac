-- Seed do catálogo de exercícios (FormaFit)
-- Idempotente: pode ser reaplicado. place = 'gym' (academia) ou 'home' (casa/peso do corpo).

DO $$ BEGIN
  ALTER TABLE public.exercises ADD CONSTRAINT exercises_name_key UNIQUE (name);
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_table THEN NULL;
END $$;

INSERT INTO public.exercises (name, muscle_group, equipment, place, difficulty, alternative_name)
VALUES
  -- Peito
  ('Supino reto com barra','peito','barra','gym','intermediario','Flexão de braço'),
  ('Supino inclinado com halteres','peito','halteres','gym','intermediario','Flexão inclinada'),
  ('Crucifixo na máquina','peito','maquina','gym','iniciante','Crucifixo com halteres'),
  ('Flexão de braço','peito','peso_corporal','home','iniciante','Flexão com joelhos'),
  ('Flexão inclinada','peito','peso_corporal','home','iniciante','Flexão na parede'),
  -- Costas
  ('Puxada frontal','costas','maquina','gym','iniciante','Remada com elástico'),
  ('Remada curvada com barra','costas','barra','gym','intermediario','Remada com halteres'),
  ('Remada unilateral com halter','costas','halteres','gym','iniciante','Remada no banco'),
  ('Barra fixa','costas','barra','gym','avancado','Remada invertida'),
  ('Remada com elástico','costas','elasticos','home','iniciante','Remada na toalha'),
  ('Superman','costas','peso_corporal','home','iniciante','Extensão lombar'),
  -- Pernas
  ('Agachamento livre','pernas','barra','gym','intermediario','Agachamento no peso do corpo'),
  ('Leg press','pernas','maquina','gym','iniciante','Agachamento na parede'),
  ('Cadeira extensora','pernas','maquina','gym','iniciante','Agachamento isométrico'),
  ('Agachamento no peso do corpo','pernas','peso_corporal','home','iniciante','Agachamento na cadeira'),
  ('Afundo','pernas','peso_corporal','home','iniciante','Passada'),
  ('Agachamento búlgaro','pernas','halteres','home','intermediario','Afundo'),
  -- Posterior de coxa
  ('Stiff com barra','posterior','barra','gym','intermediario','Stiff com halteres'),
  ('Mesa flexora','posterior','maquina','gym','iniciante','Flexora deitada'),
  ('Stiff com halteres','posterior','halteres','gym','iniciante','Good morning'),
  ('Good morning','posterior','barra','gym','intermediario','Stiff'),
  ('Flexão nórdica','posterior','peso_corporal','home','avancado','Elevação pélvica'),
  -- Glúteos
  ('Elevação pélvica','gluteos','barra','home','iniciante','Ponte de glúteo'),
  ('Ponte de glúteo unilateral','gluteos','peso_corporal','home','iniciante','Ponte de glúteo'),
  ('Agachamento sumô','gluteos','halteres','home','iniciante','Agachamento sumô livre'),
  ('Coice na máquina','gluteos','maquina','gym','iniciante','Coice com caneleira'),
  ('Abdução na máquina','gluteos','maquina','gym','iniciante','Abdução com elástico'),
  -- Ombros
  ('Desenvolvimento com halteres','ombros','halteres','gym','iniciante','Desenvolvimento sentado'),
  ('Desenvolvimento militar com barra','ombros','barra','gym','intermediario','Desenvolvimento com halteres'),
  ('Elevação lateral','ombros','halteres','gym','iniciante','Elevação lateral com elástico'),
  ('Elevação lateral com elástico','ombros','elasticos','home','iniciante','Elevação lateral com garrafa'),
  ('Pike push-up','ombros','peso_corporal','home','intermediario','Flexão pique'),
  -- Bíceps
  ('Rosca direta com barra','biceps','barra','gym','iniciante','Rosca com halteres'),
  ('Rosca alternada com halteres','biceps','halteres','gym','iniciante','Rosca com elástico'),
  ('Rosca martelo','biceps','halteres','gym','iniciante','Rosca martelo com garrafa'),
  ('Rosca com elástico','biceps','elasticos','home','iniciante','Rosca com mochila'),
  -- Tríceps
  ('Tríceps na polia','triceps','maquina','gym','iniciante','Tríceps com elástico'),
  ('Tríceps testa','triceps','barra','gym','intermediario','Tríceps francês'),
  ('Tríceps francês com halter','triceps','halteres','gym','iniciante','Tríceps testa'),
  ('Mergulho no banco','triceps','peso_corporal','home','iniciante','Tríceps no banco'),
  ('Flexão diamante','triceps','peso_corporal','home','intermediario','Flexão fechada'),
  -- Abdômen
  ('Abdominal supra','abdomen','peso_corporal','home','iniciante','Abdominal curto'),
  ('Prancha','abdomen','peso_corporal','home','iniciante','Prancha nos joelhos'),
  ('Elevação de pernas','abdomen','peso_corporal','home','iniciante','Elevação de joelhos'),
  ('Prancha lateral','abdomen','peso_corporal','home','iniciante','Prancha lateral nos joelhos'),
  ('Abdominal na máquina','abdomen','maquina','gym','iniciante','Abdominal supra'),
  -- Panturrilha
  ('Panturrilha em pé','panturrilha','maquina','gym','iniciante','Panturrilha no degrau'),
  ('Panturrilha sentado','panturrilha','maquina','gym','iniciante','Panturrilha unilateral'),
  ('Panturrilha no degrau','panturrilha','peso_corporal','home','iniciante','Panturrilha no chão'),
  -- Cardio
  ('Corrida','cardio','peso_corporal','home','iniciante','Caminhada rápida'),
  ('Pular corda','cardio','peso_corporal','home','iniciante','Corrida no lugar'),
  ('Polichinelo','cardio','peso_corporal','home','iniciante','Marcha no lugar'),
  ('Burpee','cardio','peso_corporal','home','intermediario','Agachamento com salto'),
  ('Bike ergométrica','cardio','maquina','gym','iniciante','Corrida')
ON CONFLICT (name) DO UPDATE SET
  muscle_group = EXCLUDED.muscle_group,
  equipment = EXCLUDED.equipment,
  place = EXCLUDED.place,
  difficulty = EXCLUDED.difficulty,
  alternative_name = EXCLUDED.alternative_name,
  is_active = true;
