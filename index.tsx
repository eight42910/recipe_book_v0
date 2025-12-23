import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Input, Card, Badge, cn } from './components/ui';
import { api } from './lib/mock-db';
import { Recipe, RecipeDraft, Ingredient, Step } from './lib/types';
import { 
  Search, Plus, ChefHat, Clock, Camera, ArrowLeft, Heart, 
  Share2, Play, X, ChevronLeft, ChevronRight, Check, Save, Loader2, 
  Pause, RotateCcw, Trash2, Edit, Home, Settings, LogOut, Sparkles,
  Utensils
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// --- Mock Routing System ---
type Route = 
  | { name: 'home' }
  | { name: 'detail'; id: string }
  | { name: 'cook'; id: string }
  | { name: 'new'; mode?: 'import'; editId?: string }
  | { name: 'import' };

const RouterContext = React.createContext<{
  route: Route;
  navigate: (route: Route) => void;
  back: () => void;
}>({ route: { name: 'home' }, navigate: () => {}, back: () => {} });

// --- Components ---

// Sidebar for Desktop
const Sidebar = () => {
  const { route, navigate } = React.useContext(RouterContext);
  
  const NavItem = ({ icon: Icon, label, active, onClick }: any) => (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all font-medium text-sm",
        active 
          ? "bg-orange-100 text-orange-700 shadow-sm" 
          : "text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm"
      )}
    >
      <Icon className={cn("w-5 h-5", active ? "text-orange-600" : "text-gray-400")} />
      {label}
    </button>
  );

  return (
    <div className="hidden md:flex flex-col w-64 h-full bg-white/90 backdrop-blur-md border-r border-orange-100 p-6 fixed left-0 top-0 z-40">
      <div className="flex items-center gap-2 mb-10 px-2 cursor-pointer" onClick={() => navigate({name: 'home'})}>
        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white shadow-orange-200 shadow-lg">
          <ChefHat className="w-5 h-5" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-gray-900">Flash Recipe</h1>
      </div>

      <nav className="flex-1 space-y-2">
        <NavItem 
          icon={Home} 
          label="Home" 
          active={route.name === 'home'} 
          onClick={() => navigate({ name: 'home' })} 
        />
        <NavItem 
          icon={Plus} 
          label="New Recipe" 
          active={route.name === 'new' && !route.mode} 
          onClick={() => navigate({ name: 'new' })} 
        />
        <NavItem 
          icon={Camera} 
          label="Import from AI" 
          active={route.name === 'import'} 
          onClick={() => navigate({ name: 'import' })} 
        />
      </nav>

      <div className="pt-6 border-t border-gray-100">
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-2xl mb-4 border border-orange-200/50">
          <div className="flex items-center gap-2 text-orange-800 font-bold text-sm mb-1">
            <Sparkles className="w-4 h-4" /> Pro Tip
          </div>
          <p className="text-xs text-orange-700/80 leading-relaxed">
            Use "Import" to snap a photo of a cookbook page!
          </p>
        </div>
        <NavItem icon={Settings} label="Settings" onClick={() => {}} />
      </div>
    </div>
  );
};

// Timer Component
const StepTimer = ({ seconds }: { seconds: number }) => {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [isActive, setIsActive] = useState(false);
  const [endTime, setEndTime] = useState<number | null>(null);

  useEffect(() => {
    let interval: any = null;
    if (isActive && endTime) {
      interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0) {
          setIsActive(false);
        }
      }, 200);
    } else if (!isActive) {
      if (interval) clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, endTime]);

  const toggle = () => {
    if (!isActive) {
      const target = Date.now() + (timeLeft * 1000);
      setEndTime(target);
      setIsActive(true);
    } else {
      setIsActive(false);
      setEndTime(null);
    }
  };

  const reset = () => {
    setIsActive(false);
    setTimeLeft(seconds);
    setEndTime(null);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mt-8 p-6 bg-gray-800/50 rounded-2xl border border-gray-700 w-full max-w-xs backdrop-blur animate-in fade-in slide-in-from-bottom-4 shadow-2xl">
      <div className={cn("text-5xl font-mono mb-6 transition-colors font-bold tracking-wider", timeLeft === 0 ? "text-green-400" : "text-white")}>
        {timeLeft === 0 ? "DONE" : formatTime(timeLeft)}
      </div>
      <div className="flex gap-3">
        <Button onClick={toggle} variant={isActive ? "outline" : "primary"} className={cn("flex-1 h-12 rounded-lg font-bold", isActive ? "border-gray-500 text-white hover:bg-gray-700" : "bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/30")}>
          {isActive ? <><Pause className="mr-2 w-4 h-4"/> Pause</> : <><Play className="mr-2 w-4 h-4"/> Start</>}
        </Button>
        <Button onClick={reset} variant="ghost" className="text-gray-400 hover:text-white hover:bg-gray-700">
          <RotateCcw className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

// --- Pages ---

// 1. Home Page
const HomePage = () => {
  const { navigate } = React.useContext(RouterContext);
  const [query, setQuery] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [recents, setRecents] = useState<Recipe[]>([]);

  useEffect(() => {
    api.getRecipes('').then(all => setRecents(all.slice(0, 3)));
  }, []);

  useEffect(() => {
    const search = async () => {
      setLoading(true);
      const data = await api.getRecipes(query);
      setRecipes(data);
      setLoading(false);
    };
    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="flex flex-col h-full">
      {/* Search Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md p-4 md:p-6 border-b border-orange-100 shadow-sm transition-all">
        <div className="max-w-6xl mx-auto w-full">
            <div className="relative">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
            <Input 
                className="pl-12 h-12 bg-gray-50/50 border-gray-200 focus:bg-white focus:border-orange-300 transition-all rounded-2xl shadow-sm" 
                placeholder="Search by recipe, ingredient, or tag..." 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            </div>
            <div className="flex gap-2 mt-4 overflow-x-auto pb-2 no-scrollbar">
            {['Favorites', 'Fast (<15m)', 'Main', 'Side', 'Chicken', 'Healthy'].map(tag => (
                <Badge 
                key={tag} 
                className="whitespace-nowrap cursor-pointer active:scale-95 px-4 py-1.5 rounded-full hover:bg-orange-200 transition-colors border border-transparent hover:border-orange-200" 
                onClick={() => setQuery(tag === 'Favorites' ? '' : tag)} 
                >
                {tag}
                </Badge>
            ))}
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
        <div className="max-w-6xl mx-auto w-full space-y-10 pb-24">
            
            {/* Recents */}
            {!query && recents.length > 0 && (
            <section>
                <div className="flex items-center gap-2 mb-4 px-1">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Recently Viewed</h2>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 no-scrollbar">
                {recents.map(recipe => (
                    <div key={recipe.id} onClick={() => navigate({ name: 'detail', id: recipe.id })} className="flex-shrink-0 w-40 md:w-56 cursor-pointer group">
                    <div className="aspect-[4/3] bg-gray-200 rounded-2xl mb-3 overflow-hidden shadow-sm relative border border-gray-100 group-hover:shadow-md transition-all">
                        {recipe.images?.[0] ? (
                        <img src={recipe.images[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50"><ChefHat /></div>
                        )}
                        {recipe.is_favorite && <div className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow-sm"><Heart className="w-3 h-3 text-red-500 fill-current"/></div>}
                    </div>
                    <p className="text-sm md:text-base font-bold text-gray-800 truncate group-hover:text-orange-600 transition-colors px-1">{recipe.title}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 px-1 mt-0.5"><Clock className="w-3 h-3"/> {recipe.total_min} min</p>
                    </div>
                ))}
                </div>
            </section>
            )}

            {/* List */}
            <section>
                <div className="flex items-center gap-2 mb-4 px-1">
                   <Utensils className="w-4 h-4 text-orange-500" />
                   <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{query ? 'Results' : 'All Recipes'}</h2>
                </div>
                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-500 w-8 h-8" /></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                        {recipes.map(recipe => (
                        <Card key={recipe.id} onClick={() => navigate({ name: 'detail', id: recipe.id })} className="group cursor-pointer border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-row md:flex-col h-28 md:h-full overflow-hidden bg-white">
                            <div className="w-28 md:w-full md:aspect-[16/10] bg-gray-100 flex-shrink-0 relative overflow-hidden">
                            {recipe.images?.[0] ? 
                                <img src={recipe.images[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> :
                                <div className="w-full h-full flex items-center justify-center text-gray-300"><ChefHat className="w-8 h-8"/></div>
                            }
                            {recipe.is_favorite && <div className="absolute top-3 right-3 bg-white/90 p-1.5 rounded-full shadow-sm hidden md:block"><Heart className="w-4 h-4 text-red-500 fill-current"/></div>}
                            </div>
                            <div className="flex-1 p-3 md:p-5 flex flex-col">
                            <h3 className="font-bold text-lg text-gray-900 line-clamp-1 md:line-clamp-2 mb-2 group-hover:text-orange-600 transition-colors leading-tight">{recipe.title}</h3>
                            <div className="flex items-center gap-3 text-xs text-gray-500 font-medium mb-auto">
                                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {recipe.total_min} min</span>
                                <span>•</span>
                                <span>{recipe.ingredients.length} ings</span>
                            </div>
                            <div className="flex gap-1 flex-wrap mt-3">
                                {recipe.tags?.slice(0, 3).map(t => (
                                <span key={t} className="text-[10px] bg-orange-50 text-orange-700 px-2 py-0.5 rounded-md font-medium border border-orange-100">{t}</span>
                                ))}
                            </div>
                            </div>
                        </Card>
                        ))}
                    </div>
                )}
            </section>
        </div>
      </div>

      {/* FABs for Mobile Only */}
      <div className="md:hidden fixed bottom-6 right-6 flex flex-col gap-4 z-40">
        <Button 
          className="rounded-full w-14 h-14 shadow-lg bg-white text-blue-600 border border-blue-100 active:bg-blue-50 p-0"
          onClick={() => navigate({ name: 'import' })}
        >
          <Camera className="w-6 h-6" />
        </Button>
        <Button 
          className="rounded-full w-14 h-14 shadow-xl shadow-orange-500/30 p-0 bg-orange-500 active:bg-orange-600"
          onClick={() => navigate({ name: 'new' })}
        >
          <Plus className="w-7 h-7" />
        </Button>
      </div>
    </div>
  );
};

// 2. Detail Page
const RecipeDetailPage = ({ id }: { id: string }) => {
  const { back, navigate } = React.useContext(RouterContext);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [activeTab, setActiveTab] = useState<'ingredients' | 'steps' | 'memo'>('ingredients');
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  useEffect(() => {
    api.getRecipeById(id).then(r => setRecipe(r || null));
  }, [id]);

  const toggleFavorite = async () => {
    if (recipe) {
      const updated = await api.toggleFavorite(recipe.id);
      if (updated) setRecipe({...updated});
    }
  };

  const toggleCheck = (idx: number) => {
    const next = new Set(checkedItems);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setCheckedItems(next);
  };

  if (!recipe) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex flex-col h-full bg-white md:bg-transparent">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur shadow-sm md:bg-white md:border-b md:shadow-sm">
        <div className="max-w-5xl mx-auto w-full">
            <div className="flex items-center justify-between p-2 md:py-4">
            <button onClick={back} className="p-3 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"><ArrowLeft className="w-6 h-6" /></button>
            <div className="flex gap-1">
                <button onClick={toggleFavorite} className="p-3 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors">
                <Heart className={cn("w-6 h-6 transition-colors", recipe.is_favorite ? "text-red-500 fill-current" : "")} />
                </button>
                <button onClick={() => navigate({ name: 'new', editId: recipe.id })} className="p-3 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"><Edit className="w-6 h-6" /></button>
            </div>
            </div>
            <div className="px-5 pb-4 md:flex md:justify-between md:items-end md:pb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold leading-tight mb-2 text-gray-900">{recipe.title}</h1>
                    <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
                        <div className="flex items-center gap-1"><Clock className="w-4 h-4"/> {recipe.total_min} min</div>
                        <div className="bg-orange-50 text-orange-700 px-3 py-0.5 rounded-full border border-orange-100">{recipe.servings} servings</div>
                        {recipe.tags.map(tag => <span key={tag} className="hidden md:inline-block text-gray-400">#{tag}</span>)}
                    </div>
                </div>
                {/* Desktop Play Button */}
                <Button onClick={() => navigate({ name: 'cook', id: recipe.id })} className="hidden md:flex shadow-lg shadow-orange-500/20 gap-2 px-8 hover:scale-105 transition-transform">
                    <Play className="w-5 h-5 fill-current" /> Start Cooking
                </Button>
            </div>
            
            {/* Tabs for Mobile */}
            <div className="flex px-4 gap-6 border-b border-gray-100 md:hidden">
            {(['ingredients', 'steps', 'memo'] as const).map(tab => (
                <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                    "pb-3 text-sm font-bold border-b-2 transition-all capitalize",
                    activeTab === tab ? "border-orange-500 text-orange-600" : "border-transparent text-gray-400 hover:text-gray-600"
                )}
                >
                {tab}
                </button>
            ))}
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 pb-32 md:p-8">
        <div className="max-w-5xl mx-auto w-full">
            {/* Desktop Split View - Changed to lg:grid-cols-2 */}
            <div className="hidden md:block space-y-8 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-10">
                {/* Left Col: Ingredients */}
                <Card className="p-6 md:p-8 bg-white border-none shadow-sm h-fit">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3 border-b border-gray-100 pb-4 mb-6">
                        <span className="w-8 h-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center text-sm font-bold">{recipe.ingredients.length}</span> Ingredients
                    </h2>
                    <div className="space-y-3">
                        {recipe.ingredients.map((ing, i) => (
                        <div 
                            key={i} 
                            onClick={() => toggleCheck(i)}
                            className={cn(
                            "flex justify-between items-center p-4 rounded-xl border cursor-pointer transition-all hover:border-orange-200 hover:shadow-sm hover:bg-orange-50/30",
                            checkedItems.has(i) ? "bg-gray-50 border-gray-100 opacity-60" : "bg-white border-gray-100"
                            )}
                        >
                            <div className="flex items-center gap-4">
                            <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0", checkedItems.has(i) ? "bg-orange-500 border-orange-500" : "border-gray-300")}>
                                {checkedItems.has(i) && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                            </div>
                            <span className={cn("font-medium text-gray-800", checkedItems.has(i) && "line-through text-gray-400")}>{ing.name}</span>
                            </div>
                            <span className="text-gray-500 font-bold text-sm bg-gray-50 px-2 py-1 rounded whitespace-nowrap ml-2">{ing.quantity} {ing.unit}</span>
                        </div>
                        ))}
                    </div>
                </Card>

                {/* Right Col: Steps */}
                <Card className="p-6 md:p-8 bg-white border-none shadow-sm h-fit">
                     <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3 border-b border-gray-100 pb-4 mb-6">
                        <span className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center text-sm font-bold">{recipe.steps.length}</span> Preparation
                    </h2>
                    <div className="space-y-8">
                        {recipe.steps.map((step, i) => (
                        <div key={i} className="flex gap-4 group">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm group-hover:bg-orange-500 group-hover:text-white transition-colors mt-0.5">
                            {i + 1}
                            </div>
                            <div className="flex-1">
                            <p className="text-gray-800 leading-relaxed text-base">{step.text}</p>
                            {step.timer_sec && (
                                <div className="mt-3 inline-flex items-center gap-2 bg-orange-50 px-4 py-1.5 rounded-full text-xs font-bold text-orange-700 border border-orange-100">
                                <Clock className="w-3 h-3" /> {Math.floor(step.timer_sec / 60)}:00 Timer
                                </div>
                            )}
                            </div>
                        </div>
                        ))}
                    </div>
                    {recipe.memo && (
                        <div className="mt-8 p-6 bg-yellow-50 rounded-2xl text-gray-700 leading-relaxed border border-yellow-100 relative">
                             <div className="absolute -top-3 left-4 bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-0.5 rounded">Chef's Note</div>
                            {recipe.memo}
                        </div>
                    )}
                </Card>
            </div>

            {/* Mobile View (Tabbed) */}
            <div className="md:hidden">
                {activeTab === 'ingredients' && (
                <div className="space-y-3">
                    {recipe.ingredients.map((ing, i) => (
                    <div 
                        key={i} 
                        onClick={() => toggleCheck(i)}
                        className={cn(
                        "flex justify-between items-center p-3.5 rounded-xl border cursor-pointer transition-all active:scale-[0.99]",
                        checkedItems.has(i) ? "bg-gray-50 border-gray-100 opacity-50" : "bg-white border-gray-100 shadow-sm"
                        )}
                    >
                        <div className="flex items-center gap-3.5">
                        <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors", checkedItems.has(i) ? "bg-orange-500 border-orange-500" : "border-gray-300")}>
                            {checkedItems.has(i) && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                        </div>
                        <span className={cn("font-medium text-base", checkedItems.has(i) && "line-through text-gray-400")}>{ing.name}</span>
                        </div>
                        <span className="text-gray-500 font-medium text-sm">{ing.quantity} {ing.unit}</span>
                    </div>
                    ))}
                </div>
                )}

                {activeTab === 'steps' && (
                <div className="space-y-6">
                    {recipe.steps.map((step, i) => (
                    <div key={i} className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                        {i + 1}
                        </div>
                        <div className="flex-1 pt-1">
                        <p className="text-gray-800 leading-relaxed text-base">{step.text}</p>
                        {step.timer_sec && (
                            <div className="mt-2 inline-flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full text-xs font-bold text-gray-600">
                            <Clock className="w-3 h-3" /> {Math.floor(step.timer_sec / 60)}:00
                            </div>
                        )}
                        </div>
                    </div>
                    ))}
                </div>
                )}
                
                {activeTab === 'memo' && (
                <div className="p-4 bg-yellow-50 rounded-xl text-gray-700 leading-relaxed border border-yellow-100">
                    {recipe.memo || 'No memo available.'}
                </div>
                )}
            </div>
        </div>
      </div>

      <div className="fixed bottom-6 left-0 right-0 px-6 max-w-md mx-auto md:hidden">
        <Button onClick={() => navigate({ name: 'cook', id: recipe.id })} className="w-full h-14 rounded-full text-lg shadow-xl shadow-orange-200 gap-2">
          <Play className="w-5 h-5 fill-current" /> Start Cooking
        </Button>
      </div>
    </div>
  );
};

// 3. Cooking Mode
const CookingModePage = ({ id }: { id: string }) => {
  const { back } = React.useContext(RouterContext);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    api.getRecipeById(id).then(r => setRecipe(r || null));
  }, [id]);

  if (!recipe) return <div className="h-full bg-black"></div>;

  const currentStep = recipe.steps[stepIndex];
  const isLast = stepIndex === recipe.steps.length - 1;

  return (
    <div className="h-full bg-gray-900 text-white flex flex-col relative overflow-hidden z-[100] fixed inset-0">
      <div className="absolute top-0 left-0 h-1.5 bg-orange-500 transition-all duration-300" style={{ width: `${((stepIndex + 1) / recipe.steps.length) * 100}%` }} />

      <div className="flex items-center justify-between p-6">
        <span className="text-gray-400 font-mono tracking-wider flex items-center gap-2">
            <span className="bg-gray-800 px-2 py-1 rounded text-xs">STEP {stepIndex + 1}/{recipe.steps.length}</span>
            <span className="hidden md:inline text-gray-500 text-sm">| {recipe.title}</span>
        </span>
        <button onClick={back} className="p-3 bg-gray-800 rounded-full hover:bg-gray-700 active:scale-95 transition-all group">
            <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-300 max-w-4xl mx-auto w-full" key={stepIndex}>
        <div className="mb-10 w-24 h-24 rounded-2xl bg-gray-800 flex items-center justify-center text-4xl font-bold text-gray-500 shadow-inner">
          {stepIndex + 1}
        </div>
        <h2 className="text-2xl md:text-5xl font-bold leading-normal md:leading-tight text-gray-100 max-w-3xl">
          {currentStep.text}
        </h2>
        {currentStep.timer_sec && (
          <StepTimer seconds={currentStep.timer_sec} />
        )}
      </div>

      <div className="p-6 md:p-12 pb-10 flex gap-6 bg-gradient-to-t from-black via-gray-900/80 to-transparent max-w-4xl mx-auto w-full">
        <Button 
          variant="outline" 
          onClick={() => setStepIndex(Math.max(0, stepIndex - 1))}
          disabled={stepIndex === 0}
          className="flex-1 border-gray-700 text-gray-300 bg-gray-800/50 hover:bg-gray-800 h-16 text-lg rounded-2xl"
        >
          <ChevronLeft className="mr-2" /> Back
        </Button>
        <Button 
          onClick={() => isLast ? back() : setStepIndex(Math.min(recipe.steps.length - 1, stepIndex + 1))}
          className={cn(
              "flex-[2] text-xl font-bold shadow-2xl shadow-orange-900/50 h-16 rounded-2xl transition-all", 
              isLast ? "bg-green-600 hover:bg-green-700" : "bg-orange-500 hover:bg-orange-600 hover:scale-[1.02]"
            )}
        >
          {isLast ? <><Check className="mr-2 w-6 h-6" /> Finish Cooking</> : <><span className="mr-2">Next Step</span> <ChevronRight className="w-6 h-6" /></>}
        </Button>
      </div>
    </div>
  );
};

// 4. Import Page (AI)
const ImportPage = () => {
  const { navigate, back } = React.useContext(RouterContext);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleImport = async (type: 'text' | 'image', file?: File) => {
    setLoading(true);
    let imageBase64: string | undefined = undefined;

    if (type === 'image' && file) {
      imageBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            resolve(base64.split(',')[1]);
        };
        reader.readAsDataURL(file);
      });
    }
    
    if (process.env.API_KEY) {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const model = "gemini-3-flash-preview";
            const parts: any[] = [];
            const SYSTEM_PROMPT = `Parse the input into this JSON structure: { "title": "string", "servings": number, "prep_min": number, "cook_min": number, "ingredients": [{"name": "string", "quantity": "string", "unit": "string"}], "steps": [{"text": "string", "timer_sec": number}] }. Output ONLY raw JSON.`;
            parts.push({ text: SYSTEM_PROMPT });
            
            if (imageBase64) {
                parts.push({ inlineData: { mimeType: file?.type || 'image/jpeg', data: imageBase64 } });
            }
            if (text) {
                parts.push({ text: `Recipe Text: ${text}` });
            }

            const response = await ai.models.generateContent({ model, contents: { parts } });
            const json = response.text.replace(/```json|```/g, '').trim();
            const draft = JSON.parse(json);
            localStorage.setItem('recipe_draft', JSON.stringify(draft));
            navigate({ name: 'new', mode: 'import' });
            return;
        } catch (e) {
            console.error("Gemini Error:", e);
            alert("Failed to parse with Gemini. Please try again.");
            setLoading(false);
            return;
        }
    }

    const draft = await api.parseRecipe(type, text);
    localStorage.setItem('recipe_draft', JSON.stringify(draft));
    navigate({ name: 'new', mode: 'import' });
  };

  return (
    <div className="flex flex-col h-full bg-white md:bg-transparent p-6 md:p-12 overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full bg-white md:rounded-3xl md:shadow-xl md:p-8 flex flex-col md:h-[calc(100vh-6rem)] md:min-h-[600px] border border-gray-100">
        <div className="flex items-center mb-8">
            <button onClick={back} className="p-2 -ml-2 hover:bg-gray-100 rounded-full md:hidden"><ArrowLeft /></button>
            <h1 className="text-2xl font-bold ml-2 md:ml-0">Import Recipe</h1>
        </div>

        <div className="flex-1 space-y-8 overflow-y-auto pr-2">
            <Card className="p-8 text-center space-y-6 border-dashed border-2 border-orange-200 bg-orange-50/30 hover:bg-orange-50/80 transition-colors cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
            <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm group-hover:scale-110 transition-transform">
                <Camera className="w-10 h-10" />
            </div>
            <div>
                <h2 className="font-bold text-xl text-gray-800">Scan from Photo</h2>
                <p className="text-sm text-gray-500 mt-1">Take a photo of a cookbook or handwritten note.</p>
            </div>
            <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={(e) => {
                    if (e.target.files?.[0]) handleImport('image', e.target.files[0]);
                }}
            />
            <Button disabled={loading} className="w-full max-w-xs">
                {loading ? <Loader2 className="animate-spin mr-2" /> : null} {loading ? 'Analyzing...' : 'Select Photo'}
            </Button>
            </Card>

            <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                <div className="relative flex justify-center"><span className="px-4 bg-white text-sm text-gray-400 font-medium">OR</span></div>
            </div>

            <Card className="p-6 space-y-4 shadow-sm border-gray-200">
            <h2 className="font-bold text-lg flex items-center gap-2"><Edit className="w-4 h-4"/> Paste Text</h2>
            <textarea 
                className="w-full border border-gray-200 rounded-xl p-4 min-h-[120px] focus:ring-2 focus:ring-orange-200 focus:outline-none resize-none"
                placeholder="Paste recipe text here from a website or chat..."
                value={text}
                onChange={e => setText(e.target.value)}
            />
            <Button onClick={() => handleImport('text')} disabled={!text || loading} variant="outline" className="w-full border-gray-300 hover:bg-gray-50">
                Parse Text
            </Button>
            </Card>
        </div>
        
        <div className="text-center mt-6 pt-4 border-t border-gray-100">
            <Button variant="ghost" onClick={() => navigate({ name: 'new' })} className="text-gray-500">Skip to manual entry</Button>
        </div>
      </div>
    </div>
  );
};

// 5. Edit/Create Page
const RecipeFormPage = ({ mode, editId }: { mode?: 'import'; editId?: string }) => {
  const { back, navigate } = React.useContext(RouterContext);
  const [form, setForm] = useState<RecipeDraft>({
    title: '', servings: 2, prep_min: 10, cook_min: 15,
    ingredients: [{ name: '', quantity: '', unit: '' }],
    steps: [{ order: 1, text: '' }]
  });

  useEffect(() => {
    if (editId) {
       api.getRecipeById(editId).then(r => {
           if (r) setForm(r);
       });
    } else if (mode === 'import') {
      const draft = localStorage.getItem('recipe_draft');
      if (draft) {
        setForm(JSON.parse(draft));
        localStorage.removeItem('recipe_draft');
      }
    }
  }, [mode, editId]);

  const save = async () => {
    await api.saveRecipe(form);
    navigate({ name: 'home' });
  };

  const deleteRecipe = async () => {
      if (editId && confirm('Are you sure you want to delete this recipe?')) {
          await api.deleteRecipe(editId);
          navigate({ name: 'home' });
      }
  };

  const updateIng = (i: number, f: keyof Ingredient, v: string) => {
    const ings = [...(form.ingredients || [])];
    ings[i] = { ...ings[i], [f]: v };
    setForm({ ...form, ingredients: ings });
  };

  const updateStep = (i: number, f: keyof Step, v: any) => {
    const s = [...(form.steps || [])];
    s[i] = { ...s[i], [f]: v };
    setForm({ ...form, steps: s });
  };

  return (
    <div className="flex flex-col h-full bg-white md:bg-transparent md:p-8 overflow-hidden">
      <div className="md:max-w-4xl md:mx-auto w-full bg-white md:rounded-2xl md:shadow-lg flex flex-col h-full md:h-[calc(100vh-4rem)] overflow-hidden border border-gray-100">
        <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
            <div className="flex items-center gap-4">
                <button onClick={back} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft /></button>
                <h1 className="text-lg font-bold">{editId ? 'Edit Recipe' : (mode === 'import' ? 'Review Import' : 'New Recipe')}</h1>
            </div>
            {editId && <button onClick={deleteRecipe} className="text-red-500 hover:bg-red-50 p-2 rounded-full"><Trash2 className="w-5 h-5" /></button>}
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 pb-24">
            <section className="space-y-6">
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Title</label>
                <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Recipe Name" className="text-xl md:text-2xl font-bold h-14 border-gray-300" />
            </div>
            <div className="flex gap-4">
                <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Servings</label>
                <Input type="number" value={form.servings} onChange={e => setForm({...form, servings: +e.target.value})} />
                </div>
                <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time (min)</label>
                <Input type="number" value={(form.prep_min||0) + (form.cook_min||0)} onChange={e => setForm({...form, cook_min: +e.target.value})} />
                </div>
            </div>
            </section>

            <div className="grid lg:grid-cols-2 gap-8">
                <section>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-bold text-gray-800 flex items-center gap-2"><div className="w-2 h-6 bg-orange-500 rounded-full"></div> Ingredients</h2>
                    </div>
                    <div className="space-y-3">
                        {form.ingredients?.map((ing, i) => (
                            <div key={i} className="flex gap-2">
                                <Input className="flex-[2]" placeholder="Name" value={ing.name} onChange={e => updateIng(i, 'name', e.target.value)} />
                                <Input className="flex-1" placeholder="Qty" value={ing.quantity} onChange={e => updateIng(i, 'quantity', e.target.value)} />
                                <button onClick={() => {
                                    const newIng = form.ingredients?.filter((_, idx) => idx !== i);
                                    setForm({...form, ingredients: newIng});
                                }} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                            </div>
                        ))}
                        <Button variant="ghost" onClick={() => setForm({...form, ingredients: [...(form.ingredients||[]), {name:'',quantity:'',unit:''}]})} className="w-full text-orange-600 border border-orange-100 bg-orange-50 hover:bg-orange-100">+ Add Ingredient</Button>
                    </div>
                </section>

                <section>
                    <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><div className="w-2 h-6 bg-orange-500 rounded-full"></div> Steps</h2>
                    <div className="space-y-4">
                        {form.steps?.map((step, i) => (
                            <div key={i} className="flex flex-col gap-2 p-4 bg-gray-50 rounded-xl border border-gray-100 group hover:border-orange-200 transition-colors">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-orange-500 text-sm bg-white px-2 py-0.5 rounded border border-orange-100">Step {i+1}</span>
                                    <button onClick={() => {
                                        const newSteps = form.steps?.filter((_, idx) => idx !== i);
                                        setForm({...form, steps: newSteps});
                                    }} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
                                </div>
                                <textarea 
                                    className="w-full border border-gray-300 rounded-lg p-3 min-h-[80px] focus:ring-2 focus:ring-orange-200 focus:outline-none bg-white resize-y" 
                                    value={step.text}
                                    placeholder="Describe this step..."
                                    onChange={e => updateStep(i, 'text', e.target.value)}
                                />
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <Input 
                                        type="number" 
                                        className="h-8 text-sm w-24" 
                                        placeholder="Sec" 
                                        value={step.timer_sec || ''} 
                                        onChange={e => updateStep(i, 'timer_sec', +e.target.value)} 
                                    />
                                    <span className="text-xs text-gray-400">Timer (seconds)</span>
                                </div>
                            </div>
                        ))}
                        <Button variant="ghost" onClick={() => setForm({...form, steps: [...(form.steps||[]), {order: (form.steps?.length||0)+1, text: ''}]})} className="w-full text-orange-600 border border-orange-100 bg-orange-50 hover:bg-orange-100">+ Add Step</Button>
                    </div>
                </section>
            </div>
        </div>

        <div className="p-4 bg-white border-t max-w-4xl mx-auto w-full">
            <Button onClick={save} className="w-full shadow-xl gap-2 h-14 text-lg bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
                <Save className="w-5 h-5" /> Save Recipe
            </Button>
        </div>
      </div>
    </div>
  );
};

// --- App Root & Router ---

const App = () => {
  const [history, setHistory] = useState<Route[]>([{ name: 'home' }]);
  const route = history[history.length - 1];

  const navigate = (newRoute: Route) => setHistory(prev => [...prev, newRoute]);
  const back = () => setHistory(prev => prev.length > 1 ? prev.slice(0, -1) : prev);

  return (
    <RouterContext.Provider value={{ route, navigate, back }}>
      <div className="flex h-screen w-full overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar />
        
        {/* Main Content Area */}
        <div className="flex-1 md:ml-64 relative h-full overflow-hidden flex flex-col">
            <div className="flex-1 overflow-hidden relative">
                {route.name === 'home' && <HomePage />}
                {route.name === 'detail' && <RecipeDetailPage id={route.id} />}
                {route.name === 'cook' && <CookingModePage id={route.id} />}
                {route.name === 'import' && <ImportPage />}
                {route.name === 'new' && <RecipeFormPage mode={route.mode} editId={route.editId} />}
            </div>
        </div>
      </div>
    </RouterContext.Provider>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);