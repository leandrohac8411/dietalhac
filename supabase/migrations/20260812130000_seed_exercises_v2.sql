-- Seed de exercícios v2 (FormaFit/NEXO)
-- Cobre grupos que faltavam (adutor, abdutor, lombar) e mais variações de glúteo/posterior,
-- refletindo o padrão real de fichas femininas (cadeira adutora/abdutora aparecem quase todo dia).
-- Idempotente: reaplica com segurança (mesma UNIQUE(name) já criada no seed anterior).

INSERT INTO public.exercises (name, muscle_group, equipment, place, difficulty, alternative_name)
VALUES
  -- Adutor (interno da coxa) — hoje inexistente como grupo próprio
  ('Cadeira adutora','adutor','maquina','gym','iniciante','Adutor com elástico'),
  ('Adutor com elástico','adutor','elasticos','home','iniciante','Cadeira adutora'),
  ('Agachamento sumô com halter','adutor','halteres','home','iniciante','Agachamento sumô livre'),
  -- Abdutor (lateral do quadril) — hoje só existia embutido em glúteos
  ('Cadeira abdutora','abdutor','maquina','gym','iniciante','Abdução com elástico deitado'),
  ('Abdução com elástico deitado','abdutor','elasticos','home','iniciante','Cadeira abdutora'),
  ('Caminhada lateral com elástico','abdutor','elasticos','home','iniciante','Cadeira abdutora'),
  -- Lombar
  ('Hiperextensão lombar','lombar','maquina','gym','iniciante','Superman'),
  ('Superman no solo','lombar','peso_corporal','home','iniciante','Hiperextensão lombar'),
  -- Glúteo (mais variações usadas nas fichas femininas)
  ('Frog pump','gluteos','peso_corporal','home','iniciante','Elevação pélvica'),
  ('Elevação pélvica unilateral','gluteos','peso_corporal','home','intermediario','Elevação pélvica'),
  ('Glúteo no cabo em pé','gluteos','maquina','gym','iniciante','Coice na máquina'),
  -- Posterior de coxa (mais variações)
  ('Mesa flexora unilateral','posterior','maquina','gym','intermediario','Mesa flexora'),
  ('Flexor de joelho com halter','posterior','halteres','home','iniciante','Mesa flexora'),
  -- Quadríceps (avanço, comum nas fichas)
  ('Avanço no smith','pernas','maquina','gym','intermediario','Afundo')
ON CONFLICT (name) DO UPDATE SET
  muscle_group = EXCLUDED.muscle_group,
  equipment = EXCLUDED.equipment,
  place = EXCLUDED.place,
  difficulty = EXCLUDED.difficulty,
  alternative_name = EXCLUDED.alternative_name,
  is_active = true;
