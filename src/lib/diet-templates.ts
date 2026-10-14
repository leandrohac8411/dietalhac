// Refeições-modelo no estilo de um plano de nutricionista: combinações que as
// pessoas realmente comem, com porções-base realistas. O gerador escolhe um
// modelo por refeição, sorteia uma opção por "slot" (ex.: qual proteína) e só
// ajusta as quantidades dentro de limites naturais pra bater as metas.

export type TemplateRole =
  | "carb" // carboidrato principal (arroz, pão, batata...)
  | "bean" // feijão
  | "protein"
  | "veg" // legumes cozidos
  | "salad" // salada à vontade (porção fixa)
  | "fruit"
  | "dairy" // queijo/iogurte/requeijão
  | "fat"
  | "extra";

export type TemplateOption = {
  /** Nome exato do alimento no catálogo. */
  n: string;
  /** Porção-base em g/ml. */
  g: number;
  /** Múltiplos de arredondamento da porção (ex.: ovo = 50 g, fatia de pão = 25 g). */
  step?: number;
  /** Limites absolutos (g/ml); por padrão usa os da função. */
  min?: number;
  max?: number;
  prep?: string;
};

export type TemplateSlot = {
  role: TemplateRole;
  opts: TemplateOption[];
  /** Se não houver nenhuma opção disponível (restrição/alergia), a refeição segue sem esse item. */
  optional?: boolean;
};

export type MealTemplate = {
  id: string;
  /** Só entra em dietas veganas (sem ovo, laticínio nem whey). */
  veganOnly?: boolean;
  /** Refeições principais (almoço/jantar) ou lanches etc. */
  slots: TemplateSlot[];
  /** Só vale pra jantar? (sanduíche, crepioca) */
  dinnerOnly?: boolean;
};

export type MealKind = "breakfast" | "snack" | "lunch" | "dinner" | "supper" | "pre" | "post";

const opt = (n: string, g: number, extra: Partial<TemplateOption> = {}): TemplateOption => ({
  n,
  g,
  ...extra,
});

// ---- Blocos reutilizáveis ----------------------------------------------------

const FRUITS: TemplateOption[] = [
  opt("Banana prata", 100, { step: 50, min: 50, max: 200 }),
  opt("Maçã", 120, { step: 60, min: 60, max: 240 }),
  opt("Mamão", 120, { min: 80, max: 250 }),
  opt("Morango", 100, { min: 70, max: 200 }),
  opt("Laranja", 180, { step: 90, min: 90, max: 270 }),
  opt("Manga", 130, { min: 80, max: 200 }),
  opt("Uva", 80, { min: 60, max: 150 }),
  opt("Pera", 120, { min: 80, max: 200 }),
  opt("Abacaxi", 100, { min: 75, max: 200 }),
  opt("Kiwi", 76, { step: 76, min: 76, max: 152 }),
];

const BANANA_FIRST: TemplateOption[] = [
  opt("Banana prata", 100, { step: 50, min: 50, max: 200 }),
  opt("Maçã", 120, { step: 60, min: 60, max: 240 }),
  opt("Mamão", 120, { min: 80, max: 250 }),
];

const BREADS: TemplateOption[] = [
  opt("Pão francês", 50, { step: 50, min: 50, max: 100, prep: "" }),
  opt("Pão de forma integral", 50, { step: 25, min: 25, max: 100, prep: "" }),
  opt("Pão integral", 50, { step: 25, min: 25, max: 100, prep: "" }),
];

const BREADS_OR_TAPIOCA: TemplateOption[] = [
  ...BREADS,
  opt("Tapioca (goma hidratada)", 60, { step: 10, min: 40, max: 120, prep: "" }),
  opt("Cuscuz de milho cozido", 100, { step: 10, min: 60, max: 200, prep: "" }),
];

const CHEESES: TemplateOption[] = [
  opt("Queijo minas frescal", 30, { step: 10, min: 20, max: 60 }),
  opt("Mussarela fatiada", 20, { step: 10, min: 20, max: 40 }),
  opt("Requeijão light", 30, { step: 10, min: 20, max: 50 }),
  opt("Queijo cottage", 60, { step: 10, min: 50, max: 150 }),
  opt("Ricota", 40, { step: 10, min: 30, max: 80 }),
];

const EGGS: TemplateOption[] = [
  opt("Ovo inteiro", 100, { step: 50, min: 50, max: 200, prep: "Cozido ou mexido" }),
  opt("Ovos mexidos sem óleo", 100, { step: 50, min: 50, max: 200, prep: "" }),
  opt("Ovo cozido", 100, { step: 50, min: 50, max: 200, prep: "" }),
];

const LIGHT_FILLINGS: TemplateOption[] = [
  opt("Peito de frango desfiado", 60, { step: 10, min: 40, max: 120, prep: "Cozido e desfiado" }),
  opt("Atum em água", 60, { step: 10, min: 40, max: 100, prep: "" }),
  opt("Peito de peru fatiado (frios)", 30, { step: 10, min: 20, max: 50, prep: "" }),
  opt("Presunto cozido", 30, { step: 10, min: 20, max: 50, prep: "" }),
];

const WHEY: TemplateOption[] = [
  opt("Whey protein isolado", 30, { step: 10, min: 20, max: 40, prep: "" }),
  opt("Whey protein concentrado", 30, { step: 10, min: 20, max: 40, prep: "" }),
];

const YOGURTS: TemplateOption[] = [
  opt("Iogurte natural desnatado", 165, { step: 5, min: 120, max: 250 }),
  opt("Iogurte grego natural", 120, { step: 5, min: 100, max: 200 }),
];

const VEGAN_POWDER: TemplateOption[] = [
  opt("Proteína vegana (ervilha/arroz)", 30, { step: 10, min: 20, max: 40, prep: "" }),
];

const MAIN_PROTEINS: TemplateOption[] = [
  opt("Tofu firme", 150, { step: 10, min: 100, max: 250, prep: "Grelhado" }),
  opt("Proteína texturizada de soja", 100, {
    step: 10,
    min: 60,
    max: 160,
    prep: "Hidratada e refogada",
  }),
  opt("Peito de frango grelhado", 150, { step: 10, min: 110, max: 230, prep: "Grelhado" }),
  opt("Coxa de frango sem pele assada", 120, { step: 10, min: 90, max: 200, prep: "Assada" }),
  opt("Carne de panela (músculo)", 100, { step: 10, min: 80, max: 160, prep: "Cozida" }),
  opt("Merluza grelhada", 150, { step: 10, min: 100, max: 230, prep: "Grelhada" }),
  opt("Sobrecoxa de frango sem pele", 120, { step: 10, min: 90, max: 200, prep: "Assada" }),
  opt("Patinho moído cozido", 110, { step: 10, min: 80, max: 180, prep: "Refogado" }),
  opt("Alcatra grelhada", 110, { step: 10, min: 80, max: 180, prep: "Grelhada" }),
  opt("Coxão mole grelhado", 110, { step: 10, min: 80, max: 180, prep: "Grelhado" }),
  opt("Filé de tilápia grelhado", 150, { step: 10, min: 100, max: 230, prep: "Grelhado" }),
  opt("Ovos mexidos sem óleo", 150, { step: 50, min: 100, max: 250, prep: "Mexidos" }),
];

const VEGS: TemplateOption[] = [
  opt("Brócolis cozido", 100, { step: 10, min: 80, max: 150 }),
  opt("Cenoura cozida", 80, { step: 10, min: 60, max: 120 }),
  opt("Abobrinha cozida", 100, { step: 10, min: 80, max: 150 }),
  opt("Vagem refogada", 100, { step: 10, min: 80, max: 150 }),
  opt("Couve-flor cozida", 100, { step: 10, min: 80, max: 150 }),
  opt("Chuchu cozido", 100, { step: 10, min: 80, max: 150 }),
  opt("Abóbora cozida", 100, { step: 10, min: 80, max: 150 }),
];

const SALAD: TemplateSlot = {
  role: "salad",
  optional: true,
  opts: [
    opt("Alface", 50, { step: 10, min: 30, max: 80, prep: "Cru" }),
    opt("Tomate", 80, { step: 10, min: 60, max: 100, prep: "Cru" }),
  ],
};

const OIL: TemplateSlot = {
  role: "fat",
  optional: true,
  opts: [opt("Azeite de oliva", 5, { step: 5, min: 0, max: 15, prep: "Para temperar" })],
};

const RICE: TemplateOption[] = [
  opt("Arroz branco cozido", 200, { step: 10, min: 120, max: 300, prep: "Cozido" }),
  opt("Arroz integral cozido", 200, { step: 10, min: 120, max: 300, prep: "Cozido" }),
  opt("Arroz parboilizado cozido", 200, { step: 10, min: 120, max: 300, prep: "Cozido" }),
];

const BEANS: TemplateOption[] = [
  opt("Feijão carioca cozido", 140, { step: 10, min: 80, max: 200, prep: "Cozido" }),
  opt("Feijão preto cozido", 140, { step: 10, min: 80, max: 200, prep: "Cozido" }),
];

const OTHER_CARBS: TemplateOption[] = [
  opt("Batata doce cozida", 200, { step: 10, min: 100, max: 320, prep: "Cozida" }),
  opt("Mandioca cozida", 150, { step: 10, min: 80, max: 250, prep: "Cozida" }),
  opt("Batata inglesa cozida", 250, { step: 10, min: 120, max: 380, prep: "Cozida" }),
  opt("Macarrão cozido", 150, { step: 10, min: 80, max: 250, prep: "Cozido" }),
  opt("Inhame cozido", 150, { step: 10, min: 80, max: 250, prep: "Cozido" }),
];

const JUICES: TemplateOption[] = [
  opt("Suco de uva integral", 200, { step: 50, min: 100, max: 300, prep: "" }),
  opt("Suco de laranja integral", 200, { step: 50, min: 100, max: 300, prep: "" }),
  opt("Suco de maçã integral", 200, { step: 50, min: 100, max: 300, prep: "" }),
];

// ---- Modelos por tipo de refeição ---------------------------------------------

export const MEAL_TEMPLATES: Record<MealKind, MealTemplate[]> = {
  breakfast: [
    {
      id: "cafe-pao-requeijao-peru",
      slots: [
        { role: "carb", opts: BREADS },
        { role: "dairy", opts: CHEESES.slice(1, 5) },
        { role: "protein", opts: LIGHT_FILLINGS.slice(2) },
        { role: "fruit", opts: FRUITS },
      ],
    },
    {
      id: "cafe-cuscuz-ovo",
      slots: [
        {
          role: "carb",
          opts: [opt("Cuscuz de milho cozido", 100, { step: 10, min: 60, max: 200, prep: "" })],
        },
        { role: "protein", opts: EGGS },
        { role: "dairy", opts: CHEESES, optional: true },
        { role: "fruit", opts: BANANA_FIRST },
      ],
    },
    {
      id: "cafe-vitamina",
      slots: [
        {
          role: "dairy",
          opts: [
            opt("Leite desnatado", 200, { step: 50, min: 150, max: 300 }),
            opt("Leite desnatado sem lactose", 200, { step: 50, min: 150, max: 300 }),
          ],
        },
        { role: "fruit", opts: [opt("Banana prata", 100, { step: 50, min: 50, max: 200 })] },
        {
          role: "carb",
          opts: [opt("Aveia em flocos", 30, { step: 5, min: 20, max: 50, prep: "" })],
        },
        { role: "protein", opts: WHEY, optional: true },
      ],
    },
    {
      id: "cafe-vegano",
      veganOnly: true,
      slots: [
        { role: "carb", opts: BREADS },
        {
          role: "protein",
          opts: [opt("Tofu firme", 100, { step: 10, min: 80, max: 180, prep: "Mexido" })],
        },
        { role: "fruit", opts: BANANA_FIRST },
        {
          role: "fat",
          optional: true,
          opts: [opt("Pasta de amendoim", 15, { step: 5, min: 10, max: 20, prep: "" })],
        },
      ],
    },
    {
      id: "cafe-pao-ovo-queijo-fruta",
      slots: [
        { role: "carb", opts: BREADS },
        { role: "protein", opts: EGGS },
        { role: "dairy", opts: CHEESES },
        { role: "fruit", opts: BANANA_FIRST },
      ],
    },
    {
      id: "cafe-tapioca-recheada",
      slots: [
        {
          role: "carb",
          opts: [
            opt("Tapioca (goma hidratada)", 60, { step: 10, min: 40, max: 120, prep: "" }),
            opt("Cuscuz de milho cozido", 100, { step: 10, min: 60, max: 200, prep: "" }),
          ],
        },
        { role: "protein", opts: [...EGGS, ...LIGHT_FILLINGS.slice(0, 2)] },
        { role: "dairy", opts: CHEESES },
        { role: "fruit", opts: BANANA_FIRST },
      ],
    },
    {
      id: "cafe-iogurte-aveia-fruta",
      slots: [
        { role: "dairy", opts: YOGURTS },
        {
          role: "carb",
          opts: [
            opt("Aveia em flocos", 30, { step: 5, min: 20, max: 50, prep: "" }),
            opt("Granola sem açúcar", 30, { step: 5, min: 20, max: 50, prep: "" }),
          ],
        },
        { role: "fruit", opts: FRUITS },
        { role: "protein", opts: WHEY, optional: true },
      ],
    },
  ],
  snack: [
    {
      id: "lanche-vegano",
      veganOnly: true,
      slots: [
        { role: "fruit", opts: FRUITS },
        { role: "protein", opts: VEGAN_POWDER },
        {
          role: "fat",
          opts: [
            opt("Castanha de caju", 20, { step: 5, min: 10, max: 40, prep: "" }),
            opt("Amêndoas", 20, { step: 5, min: 10, max: 40, prep: "" }),
            opt("Pasta de amendoim", 15, { step: 5, min: 10, max: 30, prep: "" }),
            opt("Abacate", 80, { step: 10, min: 50, max: 150, prep: "" }),
          ],
        },
        {
          role: "carb",
          optional: true,
          opts: [opt("Aveia em flocos", 20, { step: 5, min: 15, max: 40, prep: "" })],
        },
      ],
    },
    {
      id: "lanche-fruta-iogurte",
      slots: [
        { role: "fruit", opts: FRUITS },
        { role: "dairy", opts: YOGURTS },
        {
          role: "extra",
          optional: true,
          opts: [opt("Aveia em flocos", 20, { step: 5, min: 15, max: 40, prep: "" })],
        },
      ],
    },
    {
      id: "lanche-sanduiche",
      slots: [
        { role: "carb", opts: BREADS },
        { role: "protein", opts: LIGHT_FILLINGS },
        { role: "dairy", opts: CHEESES.slice(0, 4), optional: true },
        { role: "fruit", opts: BANANA_FIRST, optional: true },
      ],
    },
    {
      id: "lanche-iogurte-whey-fruta",
      slots: [
        { role: "dairy", opts: YOGURTS },
        { role: "protein", opts: WHEY },
        { role: "fruit", opts: BANANA_FIRST },
        {
          role: "fat",
          optional: true,
          opts: [opt("Pasta de amendoim", 15, { step: 5, min: 10, max: 20, prep: "" })],
        },
      ],
    },
    {
      id: "lanche-pao-pasta-amendoim",
      slots: [
        { role: "carb", opts: BREADS.slice(1) },
        {
          role: "fat",
          opts: [opt("Pasta de amendoim", 15, { step: 5, min: 10, max: 20, prep: "" })],
        },
        { role: "fruit", opts: BANANA_FIRST },
        { role: "dairy", opts: YOGURTS, optional: true },
      ],
    },
  ],
  lunch: [], // preenchido abaixo (compartilha modelos com o jantar)
  dinner: [],
  supper: [
    {
      id: "ceia-banana-aveia",
      slots: [
        { role: "fruit", opts: BANANA_FIRST },
        {
          role: "carb",
          opts: [opt("Aveia em flocos", 15, { step: 5, min: 10, max: 30, prep: "" })],
        },
        { role: "dairy", opts: YOGURTS, optional: true },
      ],
    },
    {
      id: "ceia-iogurte-fruta",
      slots: [
        { role: "dairy", opts: YOGURTS },
        { role: "fruit", opts: FRUITS },
        {
          role: "carb",
          optional: true,
          opts: [opt("Aveia em flocos", 15, { step: 5, min: 10, max: 30, prep: "" })],
        },
      ],
    },
    {
      id: "ceia-cottage-fruta",
      slots: [
        {
          role: "dairy",
          opts: [
            opt("Queijo cottage", 100, { step: 10, min: 60, max: 180 }),
            opt("Ricota", 60, { step: 10, min: 40, max: 120 }),
          ],
        },
        { role: "fruit", opts: [opt("Mamão", 120, { min: 80, max: 250 }), ...FRUITS.slice(1, 3)] },
      ],
    },
  ],
  pre: [
    {
      id: "pre-pao-fruta",
      slots: [
        { role: "carb", opts: BREADS },
        { role: "dairy", opts: CHEESES.slice(0, 4), optional: true },
        { role: "fruit", opts: BANANA_FIRST },
        { role: "extra", opts: JUICES, optional: true },
      ],
    },
    {
      id: "pre-pao-pasta-suco",
      slots: [
        { role: "carb", opts: BREADS },
        {
          role: "fat",
          opts: [opt("Pasta de amendoim", 15, { step: 5, min: 10, max: 20, prep: "" })],
        },
        { role: "extra", opts: JUICES },
      ],
    },
    {
      id: "pre-banana-aveia",
      slots: [
        { role: "fruit", opts: [opt("Banana prata", 120, { step: 60, min: 60, max: 240 })] },
        {
          role: "carb",
          opts: [opt("Aveia em flocos", 40, { step: 5, min: 20, max: 60, prep: "" })],
        },
        {
          role: "protein",
          optional: true,
          opts: [
            opt("Whey protein isolado", 20, { step: 10, min: 20, max: 30, prep: "" }),
            opt("Whey protein concentrado", 20, { step: 10, min: 20, max: 30, prep: "" }),
          ],
        },
      ],
    },
    {
      id: "pre-tapioca-fruta",
      slots: [
        {
          role: "carb",
          opts: [
            opt("Tapioca (goma hidratada)", 60, { step: 10, min: 40, max: 120, prep: "" }),
            opt("Cuscuz de milho cozido", 100, { step: 10, min: 60, max: 200, prep: "" }),
          ],
        },
        { role: "dairy", opts: CHEESES.slice(2, 5) },
        { role: "fruit", opts: BANANA_FIRST },
      ],
    },
    {
      id: "pre-iogurte-granola",
      slots: [
        { role: "dairy", opts: YOGURTS },
        {
          role: "carb",
          opts: [
            opt("Granola sem açúcar", 30, { step: 5, min: 20, max: 50, prep: "" }),
            opt("Aveia em flocos", 30, { step: 5, min: 20, max: 50, prep: "" }),
          ],
        },
        { role: "fruit", opts: FRUITS },
      ],
    },
  ],
  post: [
    {
      id: "pos-ovos-pao-fruta",
      slots: [
        { role: "protein", opts: EGGS },
        { role: "carb", opts: BREADS },
        { role: "fruit", opts: [opt("Mamão", 120, { min: 80, max: 250 }), ...BANANA_FIRST] },
      ],
    },
    {
      id: "pos-whey-banana",
      slots: [
        { role: "protein", opts: WHEY },
        { role: "fruit", opts: BANANA_FIRST },
        {
          role: "carb",
          optional: true,
          opts: [opt("Aveia em flocos", 20, { step: 5, min: 15, max: 40, prep: "" })],
        },
      ],
    },
    {
      id: "pos-iogurte-whey-fruta",
      slots: [
        { role: "dairy", opts: YOGURTS },
        { role: "protein", opts: WHEY },
        { role: "fruit", opts: FRUITS },
        {
          role: "carb",
          optional: true,
          opts: [
            opt("Aveia em flocos", 20, { step: 5, min: 15, max: 40, prep: "" }),
            opt("Granola sem açúcar", 20, { step: 5, min: 15, max: 40, prep: "" }),
          ],
        },
      ],
    },
    {
      id: "pos-recheado",
      slots: [
        { role: "carb", opts: BREADS_OR_TAPIOCA },
        { role: "protein", opts: LIGHT_FILLINGS.slice(0, 2) },
        { role: "dairy", opts: CHEESES.slice(2, 4) },
        { role: "fruit", opts: BANANA_FIRST, optional: true },
      ],
    },
    {
      id: "pos-omelete-batata",
      slots: [
        {
          role: "protein",
          opts: [opt("Omelete simples", 100, { step: 50, min: 100, max: 200, prep: "" })],
        },
        {
          role: "carb",
          opts: [
            opt("Batata doce cozida", 120, { step: 10, min: 80, max: 250, prep: "Cozida" }),
            opt("Mandioca cozida", 100, { step: 10, min: 60, max: 200, prep: "Cozida" }),
          ],
        },
        { role: "fruit", opts: BANANA_FIRST, optional: true },
      ],
    },
    {
      id: "pos-crepioca",
      slots: [
        {
          role: "carb",
          opts: [opt("Tapioca (goma hidratada)", 40, { step: 10, min: 30, max: 90, prep: "" })],
        },
        {
          role: "protein",
          opts: [opt("Ovo inteiro", 50, { step: 50, min: 50, max: 100, prep: "" })],
        },
        {
          role: "extra",
          opts: [
            opt("Peito de frango desfiado", 60, {
              step: 10,
              min: 40,
              max: 120,
              prep: "Cozido e desfiado",
            }),
          ],
        },
        { role: "dairy", opts: CHEESES.slice(2, 4), optional: true },
        { role: "fruit", opts: BANANA_FIRST, optional: true },
      ],
    },
  ],
};

const MAIN_MEALS: MealTemplate[] = [
  {
    id: "principal-arroz-feijao",
    slots: [
      { role: "carb", opts: RICE },
      { role: "bean", opts: BEANS },
      { role: "protein", opts: MAIN_PROTEINS },
      { role: "veg", opts: VEGS },
      SALAD,
      OIL,
    ],
  },
  {
    id: "principal-arroz-feijao-2",
    slots: [
      { role: "carb", opts: RICE },
      { role: "bean", opts: BEANS },
      { role: "protein", opts: MAIN_PROTEINS },
      { role: "veg", opts: VEGS },
      SALAD,
    ],
  },
  {
    id: "principal-sem-feijao",
    slots: [
      { role: "carb", opts: OTHER_CARBS },
      { role: "protein", opts: MAIN_PROTEINS },
      { role: "veg", opts: VEGS },
      SALAD,
      OIL,
    ],
  },
];

const DINNER_ONLY: MealTemplate[] = [
  {
    id: "jantar-sanduiche-natural",
    dinnerOnly: true,
    slots: [
      { role: "carb", opts: BREADS.slice(1) },
      {
        role: "protein",
        opts: [
          opt("Peito de frango desfiado", 80, {
            step: 10,
            min: 60,
            max: 150,
            prep: "Cozido e desfiado",
          }),
          opt("Atum em água", 60, { step: 10, min: 40, max: 120, prep: "" }),
          ...EGGS.slice(1, 2),
        ],
      },
      { role: "dairy", opts: CHEESES.slice(2, 4), optional: true },
      {
        role: "veg",
        opts: [
          opt("Tomate", 80, { step: 10, min: 60, max: 120, prep: "Cru" }),
          opt("Alface", 40, { step: 10, min: 20, max: 80, prep: "Cru" }),
        ],
      },
      { role: "fruit", opts: BANANA_FIRST, optional: true },
    ],
  },
  {
    id: "jantar-crepioca",
    dinnerOnly: true,
    slots: [
      {
        role: "carb",
        opts: [opt("Tapioca (goma hidratada)", 40, { step: 10, min: 30, max: 90, prep: "" })],
      },
      {
        role: "protein",
        opts: [opt("Ovo inteiro", 50, { step: 50, min: 50, max: 100, prep: "" })],
      },
      {
        role: "extra",
        opts: [
          opt("Peito de frango desfiado", 60, {
            step: 10,
            min: 40,
            max: 120,
            prep: "Cozido e desfiado",
          }),
        ],
      },
      { role: "dairy", opts: CHEESES.slice(2, 4), optional: true },
      {
        role: "veg",
        opts: [opt("Tomate", 80, { step: 10, min: 60, max: 120, prep: "Cru" })],
      },
    ],
  },
];

MEAL_TEMPLATES.lunch = MAIN_MEALS;
MEAL_TEMPLATES.dinner = [...MAIN_MEALS, ...DINNER_ONLY];
