-- Preenche vídeo de demonstração para exercícios que nunca tiveram nenhum
-- (adicionados nas expansões de catálogo v2/v3, sem media_url).
-- Fonte: ExerciseDB v1 (oss.exercisedb.dev, gratuito), GIFs 180p. Todos os links
-- testados e confirmados acessíveis antes de aplicar.

UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/oHsrypV.gif' WHERE name='Cadeira adutora';
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/c8f5cSY.gif' WHERE name='Adutor com elástico';
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/yn8yg1r.gif' WHERE name='Agachamento sumô com halter'; -- aproximado: goblet squat (base larga, halter no peito)
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/CHpahtl.gif' WHERE name='Cadeira abdutora';
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/0xDpB4L.gif' WHERE name='Abdução com elástico deitado';
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/O95afRA.gif' WHERE name='Caminhada lateral com elástico';
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/Krmb3cB.gif' WHERE name='Hiperextensão lombar';
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/u0cNiij.gif' WHERE name='Frog pump'; -- aproximado: ponte de glúteo no chão (frog pump exato não existe na base gratuita)
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/rmEukuS.gif' WHERE name='Elevação pélvica unilateral';
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/Kpajagk.gif' WHERE name='Glúteo no cabo em pé';
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/UXpKJoq.gif' WHERE name='Mesa flexora unilateral';
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/FkBIE6a.gif' WHERE name='Flexor de joelho com halter';
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/HsjbB1z.gif' WHERE name='Avanço no smith';
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/DOoWcnA.gif' WHERE name='Supino reto na máquina';
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/GrO65fd.gif' WHERE name='Supino declinado com barra';
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/UKWTJWR.gif' WHERE name='Crossover na polia';
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/yz9nUhF.gif' WHERE name='Crucifixo com halteres';
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/hvV79Si.gif' WHERE name='Remada baixa na polia';
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/eYnzaCm.gif' WHERE name='Puxada aberta na polia';
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/rkg41Fb.gif' WHERE name='Puxada neutra na polia';
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/BgljGjd.gif' WHERE name='Remada cavalinho'; -- aproximado: t-bar row em máquina leverage
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/4U7iLb5.gif' WHERE name='Pullover na polia';
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/Qa55kX1.gif' WHERE name='Agachamento hack';
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/jFtipLl.gif' WHERE name='Agachamento no smith';
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/RRWFUcw.gif' WHERE name='Passada com halteres';
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/my33uHU.gif' WHERE name='Cadeira extensora unilateral';
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/Zg3XY7P.gif' WHERE name='Cadeira flexora';
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/wQ2c4XD.gif' WHERE name='Levantamento terra romeno';
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/UfePqpx.gif' WHERE name='Stiff no smith'; -- aproximado: deadlift no smith (variante stiff-leg específica não existe na base gratuita)
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/Kpajagk.gif' WHERE name='Coice no cabo';
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/myfUsKf.gif' WHERE name='Crucifixo inverso na máquina';
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/3eGE2JC.gif' WHERE name='Elevação frontal com halteres';
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/G61cXLk.gif' WHERE name='Face pull'; -- aproximado: remada pra rosto no cabo com corda (face pull exato não existe na base gratuita)
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/Xy4jlWA.gif' WHERE name='Desenvolvimento Arnold';
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/goJ6ezq.gif' WHERE name='Elevação lateral na polia';
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/b6hQYMb.gif' WHERE name='Rosca Scott';
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/G08RZcQ.gif' WHERE name='Rosca na polia';
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/ae9UoXQ.gif' WHERE name='Rosca inclinada com halteres';
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/dU605di.gif' WHERE name='Tríceps corda na polia';
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/qRZ5S1N.gif' WHERE name='Tríceps unilateral na polia';
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/BRImeP8.gif' WHERE name='Mergulho na máquina';
UPDATE public.exercises SET media_url='https://static.exercisedb.dev/media/ykHcWme.gif' WHERE name='Panturrilha no leg press';

-- Sem equivalente fiel na base gratuita — melhor não mostrar vídeo do que mostrar
-- o exercício errado (mesmo critério usado para "Superman"):
--   'Superman no solo' (bodyweight, chão) — só existe "superman push-up", que é outro exercício.
--   'Elevação pélvica na máquina' (hip thrust em máquina/leverage) — não existe na base gratuita.
