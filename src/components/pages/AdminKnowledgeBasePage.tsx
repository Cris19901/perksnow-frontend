import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../Header';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { MobileBottomNav } from '../MobileBottomNav';
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Tag,
  Eye,
  EyeOff,
  ArrowLeft,
  Save,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface KBArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: 'general',      label: 'General' },
  { value: 'earning',      label: 'Earning Points' },
  { value: 'points',       label: 'Points System' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'withdrawal',   label: 'Withdrawal' },
  { value: 'referral',     label: 'Referral' },
  { value: 'account',      label: 'Account' },
  { value: 'security',     label: 'Security' },
  { value: 'marketplace',  label: 'Marketplace' },
  { value: 'support',      label: 'Support' },
];

const BLANK_ARTICLE: Omit<KBArticle, 'id' | 'created_at' | 'updated_at'> = {
  title: '',
  content: '',
  category: 'general',
  tags: [],
  is_published: true,
};

interface AdminKnowledgeBasePageProps {
  onNavigate?: (page: string) => void;
  onCartClick?: () => void;
  cartItemsCount?: number;
}

export function AdminKnowledgeBasePage({ onNavigate, onCartClick, cartItemsCount }: AdminKnowledgeBasePageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Editor state
  const [editing, setEditing] = useState<Partial<KBArticle> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    fetchArticles();
  }, [categoryFilter]);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      let q = supabase
        .from('knowledge_base')
        .select('*')
        .order('updated_at', { ascending: false });

      if (categoryFilter) q = q.eq('category', categoryFilter);

      const { data, error } = await q;
      if (error) throw error;
      setArticles(data ?? []);
    } catch (err: any) {
      toast.error('Failed to load articles: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = articles.filter(a =>
    !searchQuery ||
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const openNew = () => {
    setEditing({ ...BLANK_ARTICLE });
    setIsNew(true);
    setTagInput('');
  };

  const openEdit = (article: KBArticle) => {
    setEditing({ ...article });
    setIsNew(false);
    setTagInput('');
  };

  const closeEditor = () => {
    setEditing(null);
    setIsNew(false);
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (!tag || editing?.tags?.includes(tag)) return;
    setEditing(prev => ({ ...prev, tags: [...(prev?.tags ?? []), tag] }));
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setEditing(prev => ({ ...prev, tags: (prev?.tags ?? []).filter(t => t !== tag) }));
  };

  const saveArticle = async () => {
    if (!editing?.title?.trim()) { toast.error('Title is required'); return; }
    if (!editing?.content?.trim()) { toast.error('Content is required'); return; }

    setSaving(true);
    try {
      const payload = {
        title:        editing.title.trim(),
        content:      editing.content.trim(),
        category:     editing.category ?? 'general',
        tags:         editing.tags ?? [],
        is_published: editing.is_published ?? true,
      };

      if (isNew) {
        const { error } = await supabase.from('knowledge_base').insert(payload);
        if (error) throw error;
        toast.success('Article created');
      } else {
        const { error } = await supabase
          .from('knowledge_base')
          .update(payload)
          .eq('id', editing.id!);
        if (error) throw error;
        toast.success('Article updated');
      }

      closeEditor();
      fetchArticles();
    } catch (err: any) {
      toast.error('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (article: KBArticle) => {
    try {
      const { error } = await supabase
        .from('knowledge_base')
        .update({ is_published: !article.is_published })
        .eq('id', article.id);
      if (error) throw error;
      toast.success(article.is_published ? 'Article unpublished' : 'Article published');
      fetchArticles();
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    }
  };

  const deleteArticle = async (article: KBArticle) => {
    if (!confirm(`Delete "${article.title}"? This cannot be undone.`)) return;
    try {
      const { error } = await supabase.from('knowledge_base').delete().eq('id', article.id);
      if (error) throw error;
      toast.success('Article deleted');
      fetchArticles();
    } catch (err: any) {
      toast.error('Delete failed: ' + err.message);
    }
  };

  // ---- Editor panel ----
  if (editing !== null) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onNavigate={onNavigate} onCartClick={onCartClick} cartItemsCount={cartItemsCount} currentPage="admin" />
        <div className="max-w-3xl mx-auto px-4 py-6 pb-28 md:pb-8">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" onClick={closeEditor}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <h1 className="text-2xl font-bold">{isNew ? 'New Article' : 'Edit Article'}</h1>
          </div>

          <Card className="p-6 space-y-5">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-1">Title *</label>
              <Input
                value={editing.title ?? ''}
                onChange={e => setEditing(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Article title"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                value={editing.category ?? 'general'}
                onChange={e => setEditing(prev => ({ ...prev, category: e.target.value }))}
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium mb-1">Tags</label>
              <div className="flex gap-2 mb-2 flex-wrap">
                {(editing.tags ?? []).map(tag => (
                  <span key={tag} className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-blue-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  placeholder="Add a tag and press Enter"
                  className="flex-1"
                />
                <Button variant="outline" size="sm" onClick={addTag}>
                  <Tag className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Published toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_published"
                checked={editing.is_published ?? true}
                onChange={e => setEditing(prev => ({ ...prev, is_published: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <label htmlFor="is_published" className="text-sm font-medium">Published (visible to AI and users)</label>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium mb-1">Content *</label>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm font-mono min-h-[400px] resize-y"
                value={editing.content ?? ''}
                onChange={e => setEditing(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Write article content here. Use plain text. This is what the AI reads to answer user questions."
              />
              <p className="text-xs text-gray-400 mt-1">{(editing.content ?? '').length} chars</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button onClick={saveArticle} disabled={saving} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving…' : isNew ? 'Create Article' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={closeEditor} disabled={saving}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
        <MobileBottomNav currentPage="admin" onNavigate={onNavigate} />
      </div>
    );
  }

  // ---- List panel ----
  return (
    <div className="min-h-screen bg-gray-50">
      <Header onNavigate={onNavigate} onCartClick={onCartClick} cartItemsCount={cartItemsCount} currentPage="admin" />

      <div className="max-w-4xl mx-auto px-4 py-6 pb-28 md:pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-purple-600" />
                Knowledge Base
              </h1>
              <p className="text-sm text-gray-500">{articles.length} articles — AI reads these to answer support questions</p>
            </div>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="w-4 h-4" /> New Article
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Search articles…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="border rounded-md px-3 py-2 text-sm bg-white min-w-[160px]"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Articles list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center text-gray-400">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No articles found</p>
            <p className="text-sm">Try a different search or create a new article.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(article => {
              const isExpanded = expandedId === article.id;
              const catLabel = CATEGORIES.find(c => c.value === article.category)?.label ?? article.category;
              return (
                <Card key={article.id} className="overflow-hidden">
                  {/* Row */}
                  <div
                    className="flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : article.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          article.is_published
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {article.is_published ? 'Published' : 'Draft'}
                        </span>
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{catLabel}</span>
                      </div>
                      <h3 className="font-semibold text-sm leading-snug truncate">{article.title}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {article.content.length} chars · Updated {new Date(article.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title={article.is_published ? 'Unpublish' : 'Publish'}
                        onClick={e => { e.stopPropagation(); togglePublish(article); }}
                      >
                        {article.is_published
                          ? <Eye className="w-4 h-4 text-green-600" />
                          : <EyeOff className="w-4 h-4 text-gray-400" />
                        }
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Edit"
                        onClick={e => { e.stopPropagation(); openEdit(article); }}
                      >
                        <Pencil className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Delete"
                        onClick={e => { e.stopPropagation(); deleteArticle(article); }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-gray-400 ml-1" />
                        : <ChevronDown className="w-4 h-4 text-gray-400 ml-1" />
                      }
                    </div>
                  </div>

                  {/* Expanded content preview */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t pt-3">
                      {article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {article.tags.map(tag => (
                            <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans bg-gray-50 rounded p-3 max-h-64 overflow-y-auto">
                        {article.content}
                      </pre>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <MobileBottomNav currentPage="admin" onNavigate={onNavigate} />
    </div>
  );
}
