export type Ingredient = {
  name: string;
  quantity: string;
  unit: string;
  note?: string;
};

export type Step = {
  order: number;
  text: string;
  timer_sec?: number;
};

export type Recipe = {
  id: string;
  title: string;
  description: string | null;
  servings: number;
  prep_min: number;
  cook_min: number;
  total_min: number;
  ingredients: Ingredient[];
  steps: Step[];
  tags: string[];
  memo: string | null;
  images: string[];
  visibility: 'private' | 'unlisted' | 'public';
  share_slug: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
};

export type RecipeDraft = Partial<Omit<Recipe, 'created_at' | 'updated_at'>>;