# FormaFit Coach

Quero criar um sistema web responsivo chamado provisoriamente de FormaFit, voltado para planejamento personalizado de dieta e treino.

O sistema deve ter aparência profissional, moderna e premium, evitando um visual genérico ou com “cara de sistema feito por IA”. Quero uma interface limpa, intuitiva e fácil de usar no celular.

Utilize:

React com TypeScript;

Tailwind CSS;

Supabase para banco de dados, autenticação e armazenamento;

componentes reutilizáveis;

layout totalmente responsivo;

interface em português do Brasil;

dados inicialmente simulados quando alguma integração ainda não estiver pronta.

Objetivo do sistema

O usuário deverá cadastrar seus dados físicos, sua rotina, suas preferências e seu objetivo corporal.

Com essas informações, o sistema deverá:

calcular indicadores corporais;

estimar o gasto energético diário;

definir uma meta realista;

gerar uma estratégia nutricional;

montar uma dieta personalizada;

gerar um treino de acordo com o objetivo e a disponibilidade;

acompanhar a evolução;

realizar check-ins semanais;

sugerir ajustes no plano conforme os resultados.

Neste primeiro momento, quero criar um MVP funcional, bem estruturado e preparado para receber inteligência artificial futuramente.

1. Autenticação

Criar as seguintes telas:

login;

cadastro;

recuperação de senha;

primeiro acesso;

logout.

No cadastro inicial, solicitar:

nome;

e-mail;

senha;

data de nascimento;

sexo biológico;

altura;

peso atual.

2. Onboarding inicial

Após o cadastro, o usuário deverá passar por um questionário dividido em etapas, com barra de progresso.

Etapa 1 — Dados pessoais

Solicitar:

nome;

data de nascimento;

sexo biológico;

altura;

peso atual.

Etapa 2 — Rotina

Solicitar:

profissão;

rotina predominantemente sentada, moderada ou ativa;

média de passos diários;

horas de sono;

horário em que normalmente acorda;

horário em que normalmente dorme;

quantidade de dias disponíveis para treino;

duração disponível por treino.

Etapa 3 — Experiência física

Solicitar:

não treino atualmente;

iniciante;

intermediário;

avançado;

academia, casa ou ar livre;

equipamentos disponíveis;

esportes praticados;

limitações físicas;

lesões;

exercícios que causam dor.

Etapa 4 — Objetivo

Permitir escolher:

emagrecer;

reduzir percentual de gordura;

ganhar massa muscular;

ganhar peso;

recomposição corporal;

manter peso;

melhorar condicionamento;

melhorar força.

Depois, solicitar:

peso desejado;

percentual de gordura desejado, se souber;

prazo desejado;

regiões do corpo que deseja priorizar;

nível de prioridade: conforto, equilíbrio ou resultado acelerado.

O sistema deve avisar quando a meta ou o prazo parecerem muito agressivos.

Etapa 5 — Alimentação

Solicitar:

quantidade desejada de refeições por dia;

horários das refeições;

alimentos preferidos;

alimentos que não gosta;

alergias;

intolerâncias;

restrições alimentares;

orçamento para alimentação;

tempo disponível para cozinhar;

se utiliza marmitas;

se costuma comer fora;

uso de suplementos;

consumo de água;

consumo de álcool;

principais dificuldades alimentares.

Etapa 6 — Avaliação corporal avançada

Essa etapa deve ser opcional.

Permitir cadastrar:

percentual de gordura;

massa muscular;

massa magra;

gordura corporal;

gordura visceral;

água corporal;

metabolismo basal informado pelo aparelho;

circunferência abdominal;

cintura;

quadril;

peito;

braço direito;

braço esquerdo;

coxa direita;

coxa esquerda;

panturrilha direita;

panturrilha esquerda;

data da avaliação;

tipo de avaliação: bioimpedância, adipômetro, medidas ou outra.

Também permitir adicionar fotos de evolução:

frente;

lado;

costas.

3. Cálculos corporais

Após finalizar o onboarding, exibir uma tela de resultado contendo:

idade;

peso;

altura;

IMC;

classificação do IMC;

metabolismo basal;

gasto energético diário estimado;

calorias estimadas para manutenção;

relação cintura-quadril, quando houver dados;

massa magra, quando houver dados;

massa de gordura, quando houver dados.

Para o metabolismo basal, utilizar uma fórmula reconhecida e deixar o cálculo isolado em uma função, permitindo alterar a fórmula futuramente.

Para o gasto energético total, aplicar um fator de atividade configurável.

Exibir um aviso informando que os resultados são estimativas e não substituem avaliação profissional.

4. Definição da estratégia

Criar uma tela chamada Minha Estratégia.

Ela deve mostrar:

objetivo principal;

peso inicial;

peso-meta;

prazo estimado;

calorias de manutenção;

meta calórica diária;

diferença entre manutenção e meta;

meta de proteína;

meta de carboidrato;

meta de gorduras;

meta de fibras;

meta de água;

ritmo esperado de evolução semanal.

Criar três cenários:

Confortável

evolução mais lenta;

maior flexibilidade;

menor restrição;

maior facilidade de adesão.

Equilibrado

evolução moderada;

equilíbrio entre resultado e flexibilidade.

Acelerado

evolução mais rápida;

maior controle;

somente quando os dados permitirem;

deve mostrar avisos de segurança.

O usuário poderá visualizar os três cenários, mas deverá escolher um como estratégia ativa.

5. Plano alimentar

Criar uma página chamada Minha Dieta.

A dieta deve ser organizada por refeições:

café da manhã;

lanche da manhã;

almoço;

lanche da tarde;

jantar;

ceia.

A quantidade de refeições deverá respeitar o que o usuário informou.

Cada refeição deverá conter:

nome da refeição;

horário;

alimentos;

quantidade;

unidade de medida;

calorias;

proteínas;

carboidratos;

gorduras;

fibras;

modo de preparo;

observações.

Exibir também o total diário de:

calorias;

proteína;

carboidrato;

gordura;

fibras.

Criar um botão Substituir alimento.

Ao clicar, abrir um modal com alternativas equivalentes. Neste primeiro momento, utilizar substituições cadastradas no banco.

Exemplo:

arroz pode ser substituído por batata, macarrão ou mandioca;

frango pode ser substituído por carne magra, peixe ou ovos;

pão pode ser substituído por tapioca, cuscuz ou aveia.

A substituição deve atualizar automaticamente os totais nutricionais da refeição e do dia.

Permitir:

marcar refeição como realizada;

editar alimento;

alterar quantidade;

adicionar alimento;

remover alimento;

salvar dieta;

duplicar dieta;

imprimir;

gerar uma visualização em formato de relatório.

6. Banco de alimentos

Criar uma estrutura para cadastro de alimentos contendo:

nome;

categoria;

porção padrão;

unidade;

calorias;

proteínas;

carboidratos;

gorduras;

fibras;

sódio;

custo estimado;

observação;

ativo ou inativo.

Categorias:

proteínas;

carboidratos;

frutas;

verduras;

legumes;

laticínios;

gorduras;

bebidas;

suplementos;

outros.

Criar inicialmente alguns alimentos fictícios para demonstração.

7. Lista de compras

Criar uma página chamada Lista de Compras.

O sistema deverá somar os alimentos utilizados na dieta semanal e gerar uma lista agrupada por categoria.

Exibir:

alimento;

quantidade semanal;

unidade;

categoria;

custo estimado;

checkbox de item comprado.

Permitir:

alterar quantidade;

adicionar item;

remover item;

imprimir lista;

marcar todos como comprados;

limpar lista.

8. Plano de treino

Criar uma página chamada Meu Treino.

O sistema deverá gerar uma divisão de treino de acordo com:

objetivo;

experiência;

dias disponíveis;

tempo disponível;

local de treino;

equipamentos;

limitações;

regiões prioritárias.

Criar modelos iniciais para:

treino de corpo inteiro;

treino AB;

treino ABC;

treino ABCD;

treino superior e inferior;

treino em casa;

treino de academia.

Cada treino deverá conter:

nome do treino;

grupo muscular;

dia da semana;

duração estimada;

exercício;

séries;

repetições;

intervalo;

carga;

observações;

nível de dificuldade;

vídeo ou imagem demonstrativa;

exercício alternativo.

Permitir:

iniciar treino;

marcar série como concluída;

registrar carga;

registrar repetições realizadas;

registrar dificuldade percebida de 1 a 10;

registrar dor;

substituir exercício;

finalizar treino.

9. Execução do treino

Criar uma tela específica para o treino em andamento.

Exibir um exercício por vez, com:

nome;

imagem demonstrativa;

séries;

repetições;

carga anterior;

carga atual;

cronômetro de descanso;

botão para concluir série;

botão para pular;

botão para substituir;

campo de observação.

Ao concluir o treino, exibir um resumo:

duração;

exercícios realizados;

séries concluídas;

volume total;

dificuldade média;

observações;

evolução em comparação ao treino anterior.

10. Check-in semanal

Criar uma página chamada Check-in Semanal.

Solicitar:

peso atual;

média de peso da semana;

medida abdominal;

aderência à dieta de 0 a 100%;

quantidade de treinos realizados;

nível de fome de 1 a 10;

energia de 1 a 10;

sono de 1 a 10;

estresse de 1 a 10;

desempenho no treino de 1 a 10;

dificuldade para seguir a dieta;

observações;

fotos opcionais.

Após o envio, gerar um resumo com regras simples.

Exemplos:

se o usuário estiver emagrecendo dentro do esperado, manter o plano;

se não houver evolução por duas ou mais semanas e a adesão estiver alta, sugerir pequeno ajuste;

se a adesão estiver baixa, não reduzir calorias automaticamente;

se o peso estiver subindo muito rapidamente em ganho de massa, sugerir redução do superávit;

se houver dor ou relato preocupante, exibir orientação para buscar avaliação profissional.

Neste primeiro momento, utilizar regras condicionais tradicionais. Não utilizar inteligência artificial ainda.

11. Dashboard

Criar um dashboard moderno com:

saudação ao usuário;

objetivo atual;

calorias do dia;

proteína consumida;

água consumida;

refeições concluídas;

treino do dia;

peso atual;

evolução semanal;

próxima avaliação;

sequência de dias ativos;

resumo do último check-in.

Criar gráficos para:

evolução do peso;

evolução da cintura;

percentual de gordura;

massa magra;

frequência de treino;

evolução de cargas;

aderência à dieta.

No dashboard, incluir atalhos para:

registrar peso;

registrar água;

visualizar dieta;

iniciar treino;

realizar check-in;

consultar evolução.

12. Registro diário

Criar uma página chamada Meu Dia.

Exibir:

refeições programadas;

refeições realizadas;

calorias consumidas;

macronutrientes;

água;

treino;

passos;

sono;

peso;

observações.

Permitir registrar rapidamente:

copos de água;

peso;

refeição concluída;

alimento extra;

treino realizado;

horas de sono.

13. Evolução

Criar uma página chamada Minha Evolução.

Exibir:

peso inicial;

peso atual;

peso-meta;

percentual de evolução;

fotos comparativas;

medidas corporais;

composição corporal;

cargas dos principais exercícios;

frequência de treinos;

aderência nutricional.

Permitir escolher duas datas para comparar.

Criar comparações de fotos lado a lado:

frente;

lado;

costas.

14. Perfil e configurações

Criar uma página de perfil contendo:

dados pessoais;

objetivo;

dados físicos;

preferências alimentares;

rotina;

experiência de treino;

equipamentos disponíveis;

restrições;

notificações;

privacidade;

alteração de senha;

exclusão de conta.

15. Área administrativa

Criar uma área administrativa separada.

O administrador poderá:

visualizar usuários;

cadastrar alimentos;

editar alimentos;

cadastrar substituições;

cadastrar exercícios;

cadastrar modelos de treino;

visualizar check-ins;

gerenciar conteúdos;

ativar ou desativar registros;

visualizar indicadores básicos da plataforma.

Criar controle de acesso por perfil:

usuário;

administrador;

futuramente nutricionista;

futuramente personal trainer.

16. Estrutura de banco de dados

Criar no Supabase tabelas semelhantes a:

profiles;

user_goals;

body_assessments;

body_measurements;

progress_photos;

user_preferences;

food_items;

food_substitutions;

meal_plans;

meals;

meal_items;

daily_food_logs;

workout_plans;

workouts;

exercises;

workout_exercises;

workout_sessions;

workout_session_sets;

weekly_checkins;

water_logs;

weight_logs;

notifications.

Utilizar chaves estrangeiras, datas de criação, datas de atualização e políticas de segurança RLS.

Cada usuário deve acessar apenas seus próprios dados.

17. Segurança

Antes de gerar planos, incluir uma triagem de segurança.

Perguntar sobre:

gestação;

amamentação;

diabetes;

hipertensão;

doença renal;

doença hepática;

condição cardíaca;

transtorno alimentar;

uso de medicamentos;

cirurgia recente;

lesões;

dores persistentes;

acompanhamento médico.

Quando houver situações de risco, o sistema deverá mostrar um alerta e não recomendar estratégias agressivas.

Incluir avisos claros de que:

o sistema não substitui médico, nutricionista ou profissional de educação física;

os cálculos são estimativas;

dores e sintomas devem ser avaliados por um profissional;

o usuário não deve realizar exercícios que provoquem dor.

18. Design

Quero uma identidade visual premium, esportiva e moderna.

Utilizar:

bastante espaço em branco;

cartões elegantes;

tipografia forte e legível;

cantos moderadamente arredondados;

ícones consistentes;

gráficos modernos;

boa hierarquia visual;

navegação simples;

design mobile-first.

Não utilizar excesso de degradês, sombras exageradas, emojis ou elementos infantis.

No desktop, utilizar menu lateral.

No celular, utilizar uma barra inferior com:

início;

dieta;

treino;

evolução;

perfil.

Criar estados visuais para:

carregamento;

ausência de dados;

erro;

sucesso;

formulário incompleto;

plano ainda não gerado.

19. Primeira versão a ser construída

Nesta primeira entrega, implemente:

autenticação;

onboarding;

cálculos corporais;

dashboard;

estratégia nutricional;

dieta com dados simulados;

treino com dados simulados;

registro de peso;

registro de água;

check-in semanal;

evolução;

banco de dados no Supabase.

Não tente implementar integrações com inteligência artificial, relógios ou reconhecimento de alimentos por foto neste momento.

Crie primeiro toda a arquitetura, as páginas, o banco de dados e os fluxos principais.

Comece apresentando:

o mapa de páginas;

o fluxo do usuário;

a estrutura do banco de dados;

a identidade visual sugerida;

depois implemente o sistema.

Não faça apenas uma landing page. Quero um sistema autenticado e funcional.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://dietalhac.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/dda1c9ca-f9af-4b0b-bdc7-03a3d5cddf6d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
