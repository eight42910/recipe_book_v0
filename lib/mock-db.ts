import { Recipe, RecipeDraft } from './types';

// Initial Mock Data
const MOCK_RECIPES: Recipe[] = [
  {
    id: '1',
    title: 'Speedy Keema Curry',
    description: 'A quick and delicious curry using minced meat.',
    servings: 2,
    prep_min: 5,
    cook_min: 10,
    total_min: 15,
    ingredients: [
      { name: 'Minced Meat (Pork/Beef)', quantity: '200', unit: 'g' },
      { name: 'Onion', quantity: '1/2', unit: 'pc' },
      { name: 'Curry Roux', quantity: '2', unit: 'cubes' },
      { name: 'Ketchup', quantity: '1', unit: 'tbsp' },
      { name: 'Water', quantity: '150', unit: 'ml' }
    ],
    steps: [
      { order: 1, text: 'Chop the onion finely.' },
      { order: 2, text: 'Stir-fry the minced meat and onion in a pan until browned.' },
      { order: 3, text: 'Add water and bring to a boil. Turn off heat and dissolve curry roux.', timer_sec: 180 },
      { order: 4, text: 'Add ketchup and simmer for 2-3 minutes until thickened.' }
    ],
    tags: ['時短', '主菜', '洋食'],
    memo: 'Add a fried egg on top for extra richness!',
    images: ['https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80'],
    visibility: 'private',
    share_slug: null,
    is_favorite: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Refreshing Cucumber Salad',
    description: 'Perfect side dish for summer.',
    servings: 2,
    prep_min: 5,
    cook_min: 0,
    total_min: 5,
    ingredients: [
      { name: 'Cucumber', quantity: '2', unit: 'pcs' },
      { name: 'Sesame Oil', quantity: '1', unit: 'tbsp' },
      { name: 'Salt', quantity: '1/2', unit: 'tsp' },
      { name: 'Garlic (Grated)', quantity: '1', unit: 'tsp' }
    ],
    steps: [
      { order: 1, text: 'Smash the cucumbers with a rolling pin and break into bite-sized pieces.' },
      { order: 2, text: 'Mix cucumbers with salt, sesame oil, and garlic in a bowl.' },
      { order: 3, text: 'Serve immediately or chill for better flavor.' }
    ],
    tags: ['副菜', '時短', 'おつまみ'],
    memo: null,
    images: ['https://images.unsplash.com/photo-1606850831628-6623512a9eb7?auto=format&fit=crop&w=800&q=80'],
    visibility: 'private',
    share_slug: null,
    is_favorite: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// LocalStorage Helper
const getStoredRecipes = (): Recipe[] => {
  const stored = localStorage.getItem('flash_recipes');
  if (stored) return JSON.parse(stored);
  localStorage.setItem('flash_recipes', JSON.stringify(MOCK_RECIPES));
  return MOCK_RECIPES;
};

const saveRecipes = (recipes: Recipe[]) => {
  localStorage.setItem('flash_recipes', JSON.stringify(recipes));
};

const saveRecipe = (recipe: Recipe) => {
  const recipes = getStoredRecipes();
  const index = recipes.findIndex(r => r.id === recipe.id);
  if (index >= 0) {
    recipes[index] = recipe;
  } else {
    recipes.unshift(recipe);
  }
  saveRecipes(recipes);
  return recipe;
};

// Mock API Methods
export const api = {
  getRecipes: async (query: string = ''): Promise<Recipe[]> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    const recipes = getStoredRecipes();
    if (!query) return recipes;
    
    const lowerQ = query.toLowerCase();
    return recipes.filter(r => 
      r.title.toLowerCase().includes(lowerQ) || 
      r.ingredients.some(i => i.name.toLowerCase().includes(lowerQ)) ||
      r.tags.some(t => t.toLowerCase().includes(lowerQ))
    );
  },

  getRecipeById: async (id: string): Promise<Recipe | undefined> => {
    const recipes = getStoredRecipes();
    return recipes.find(r => r.id === id);
  },

  saveRecipe: async (draft: RecipeDraft): Promise<Recipe> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const existing = draft.id ? getStoredRecipes().find(r => r.id === draft.id) : null;
    
    const newRecipe: Recipe = {
      id: draft.id || crypto.randomUUID(),
      title: draft.title || 'Untitled',
      description: draft.description || null,
      servings: draft.servings || 2,
      prep_min: draft.prep_min || 0,
      cook_min: draft.cook_min || 0,
      total_min: (draft.prep_min || 0) + (draft.cook_min || 0),
      ingredients: draft.ingredients || [],
      steps: draft.steps || [],
      tags: draft.tags || [],
      memo: draft.memo || null,
      images: draft.images || (existing?.images || []),
      visibility: draft.visibility || 'private',
      share_slug: draft.share_slug || null,
      is_favorite: draft.is_favorite ?? (existing?.is_favorite ?? false),
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...draft
    } as Recipe;
    return saveRecipe(newRecipe);
  },

  toggleFavorite: async (id: string): Promise<Recipe | undefined> => {
    const recipes = getStoredRecipes();
    const recipe = recipes.find(r => r.id === id);
    if (recipe) {
      recipe.is_favorite = !recipe.is_favorite;
      saveRecipes(recipes);
      return recipe;
    }
    return undefined;
  },

  deleteRecipe: async (id: string): Promise<void> => {
    const recipes = getStoredRecipes();
    const filtered = recipes.filter(r => r.id !== id);
    saveRecipes(filtered);
  },

  parseRecipe: async (mode: 'image' | 'text', data: any): Promise<RecipeDraft> => {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate AI processing
    
    // Mock AI Response
    return {
      title: "Imported Recipe (Mock)",
      servings: 4,
      prep_min: 15,
      cook_min: 30,
      ingredients: [
        { name: "Sample Ingredient 1", quantity: "200", unit: "g" },
        { name: "Sample Ingredient 2", quantity: "1", unit: "tbsp" }
      ],
      steps: [
        { order: 1, text: "This is a mocked step from AI parsing." },
        { order: 2, text: "Review and edit this information." }
      ],
      tags: ["Imported"],
      memo: "Check the original source for accuracy."
    };
  }
};