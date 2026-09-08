-- Corrige vídeos de exercícios que mostravam um movimento/equipamento diferente
-- do nome (ex.: "Mesa flexora" mostrava um deadlift em vez de leg curl).
-- Fonte: ExerciseDB v1 (oss.exercisedb.dev, gratuito), GIFs 180p.

UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/qdRxqCj.gif'
  WHERE name='Puxada frontal'; -- era pull-up (barra fixa); agora puxador de polia (cable pulldown)

UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/10Z2DXU.gif'
  WHERE name='Leg press'; -- era goblet squat; agora leg press 45° de verdade

UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/my33uHU.gif'
  WHERE name='Cadeira extensora'; -- era sissy squat; agora extensora de máquina

UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/wdRZISl.gif'
  WHERE name='Desenvolvimento militar com barra'; -- era Arnold press com halteres; agora militar com barra

UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/25GPyDY.gif'
  WHERE name='Rosca direta com barra'; -- era rosca martelo no cabo; agora rosca direta com barra reta

UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/3omWx6P.gif'
  WHERE name='Rosca com elástico'; -- era rosca deitada com toalha; agora rosca com elástico de verdade

UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/VO2qeJg.gif'
  WHERE name='Prancha lateral'; -- era prancha frontal; agora prancha lateral

UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/8xUv4J7.gif'
  WHERE name='Abdominal na máquina'; -- era abdominal no chão; agora abdominal no cabo/máquina sentado

UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/v3xmPAR.gif'
  WHERE name='Crucifixo na máquina'; -- era mergulho no paralelas (chest dip); agora crucifixo em máquina (pec deck)

UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/17lJ1kr.gif'
  WHERE name='Mesa flexora'; -- era deadlift unilateral; agora flexora de máquina deitado

UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/Kpajagk.gif'
  WHERE name='Coice na máquina'; -- era afundo reverso; agora extensão de quadril no cabo (coice)

UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/CHpahtl.gif'
  WHERE name='Abdução na máquina'; -- era agachamento lateral; agora abdutora de máquina sentado

UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/Vvwjz6N.gif'
  WHERE name='Flexão nórdica'; -- era deadlift unilateral; agora glute-ham raise (mesma família de movimento)

-- "Superman" não tem equivalente fiel na base gratuita (só existe "superman push-up",
-- que é outro exercício). Melhor não mostrar vídeo nenhum do que mostrar o errado.
UPDATE public.exercises SET media_url=NULL WHERE name='Superman';
