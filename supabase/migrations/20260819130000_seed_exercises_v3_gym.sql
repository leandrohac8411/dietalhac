-- Amplia o catálogo para fichas completas de musculação em academia.
-- Idempotente: nomes existentes são atualizados, sem duplicação.

INSERT INTO public.exercises
  (name, muscle_group, equipment, place, difficulty, alternative_name)
VALUES
  ('Supino reto na máquina','peito','maquina','gym','iniciante','Supino reto com barra'),
  ('Supino declinado com barra','peito','barra','gym','intermediario','Supino reto com barra'),
  ('Crossover na polia','peito','maquina','gym','iniciante','Crucifixo na máquina'),
  ('Crucifixo com halteres','peito','halteres','gym','iniciante','Crucifixo na máquina'),
  ('Remada baixa na polia','costas','maquina','gym','iniciante','Remada unilateral com halter'),
  ('Puxada aberta na polia','costas','maquina','gym','iniciante','Puxada frontal'),
  ('Puxada neutra na polia','costas','maquina','gym','iniciante','Puxada frontal'),
  ('Remada cavalinho','costas','barra','gym','intermediario','Remada curvada com barra'),
  ('Pullover na polia','costas','maquina','gym','iniciante','Puxada frontal'),
  ('Agachamento hack','pernas','maquina','gym','intermediario','Leg press'),
  ('Agachamento no smith','pernas','maquina','gym','iniciante','Agachamento livre'),
  ('Passada com halteres','pernas','halteres','gym','intermediario','Afundo'),
  ('Cadeira extensora unilateral','pernas','maquina','gym','intermediario','Cadeira extensora'),
  ('Cadeira flexora','posterior','maquina','gym','iniciante','Mesa flexora'),
  ('Levantamento terra romeno','posterior','barra','gym','intermediario','Stiff com barra'),
  ('Stiff no smith','posterior','maquina','gym','iniciante','Stiff com barra'),
  ('Elevação pélvica na máquina','gluteos','maquina','gym','iniciante','Elevação pélvica'),
  ('Coice no cabo','gluteos','maquina','gym','iniciante','Coice na máquina'),
  ('Crucifixo inverso na máquina','ombros','maquina','gym','iniciante','Face pull'),
  ('Elevação frontal com halteres','ombros','halteres','gym','iniciante','Desenvolvimento com halteres'),
  ('Face pull','ombros','maquina','gym','iniciante','Crucifixo inverso na máquina'),
  ('Desenvolvimento Arnold','ombros','halteres','gym','intermediario','Desenvolvimento com halteres'),
  ('Elevação lateral na polia','ombros','maquina','gym','intermediario','Elevação lateral'),
  ('Rosca Scott','biceps','maquina','gym','iniciante','Rosca direta com barra'),
  ('Rosca na polia','biceps','maquina','gym','iniciante','Rosca direta com barra'),
  ('Rosca inclinada com halteres','biceps','halteres','gym','intermediario','Rosca alternada com halteres'),
  ('Tríceps corda na polia','triceps','maquina','gym','iniciante','Tríceps na polia'),
  ('Tríceps unilateral na polia','triceps','maquina','gym','iniciante','Tríceps na polia'),
  ('Mergulho na máquina','triceps','maquina','gym','intermediario','Mergulho no banco'),
  ('Panturrilha no leg press','panturrilha','maquina','gym','iniciante','Panturrilha em pé')
ON CONFLICT (name) DO UPDATE SET
  muscle_group = EXCLUDED.muscle_group,
  equipment = EXCLUDED.equipment,
  place = EXCLUDED.place,
  difficulty = EXCLUDED.difficulty,
  alternative_name = EXCLUDED.alternative_name,
  is_active = true;
