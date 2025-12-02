import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../Header';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { AlertCircle, FileText, ShoppingBag, Trash2, CheckCircle, X } from 'lucide-react';
import { toast } from 'sonner';

interface ReportedContent {
  id: string;
  content_type: 'post' | 'product' | 'comment';
  content_id: string;
  reporter_id: string;
  reason: string;
  description: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  created_at: string;
  content?: any;
  reporter?: any;
}

interface AdminModerationPageProps {
  onCartClick?: () => void;
  cartItemsCount?: number;
}

export function AdminModerationPage({ onCartClick, cartItemsCount }: AdminModerationPageProps) {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [reports, setReports] = useState<ReportedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate('/login');
      return;
    }

    fetchReports();
  }, [user, authLoading, navigate, filter]);

  const fetchReports = async () => {
    try {
      setLoading(true);

      // Note: This requires a 'reports' table in your database
      // For now, we'll create mock data structure
      // You'll need to create this table with proper schema

      /* Expected schema:
      CREATE TABLE reports (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        content_type TEXT NOT NULL,
        content_id UUID NOT NULL,
        reporter_id UUID REFERENCES users(id),
        reason TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );
      */

      const query = supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter === 'pending') {
        query.eq('status', 'pending');
      }

      const { data, error } = await query;

      if (error) {
        // Table might not exist yet
        console.error('Reports table error:', error);
        setReports([]);
      } else {
        setReports(data || []);
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContent = async (report: ReportedContent) => {
    try {
      // Delete the content based on type
      let error;

      if (report.content_type === 'post') {
        ({ error } = await supabase.from('posts').delete().eq('id', report.content_id));
      } else if (report.content_type === 'product') {
        ({ error } = await supabase.from('products').delete().eq('id', report.content_id));
      } else if (report.content_type === 'comment') {
        ({ error } = await supabase.from('comments').delete().eq('id', report.content_id));
      }

      if (error) throw error;

      // Update report status
      await supabase
        .from('reports')
        .update({ status: 'reviewed' })
        .eq('id', report.id);

      toast.success('Content deleted successfully');
      fetchReports();
    } catch (err) {
      console.error('Error deleting content:', err);
      toast.error('Failed to delete content');
    }
  };

  const handleDismissReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({ status: 'dismissed' })
        .eq('id', reportId);

      if (error) throw error;

      toast.success('Report dismissed');
      fetchReports();
    } catch (err) {
      console.error('Error dismissing report:', err);
      toast.error('Failed to dismiss report');
    }
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'post':
        return <FileText className="w-5 h-5" />;
      case 'product':
        return <ShoppingBag className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onNavigate={(page) => navigate(`/${page}`)}
        onCartClick={onCartClick}
        cartItemsCount={cartItemsCount}
        currentPage="feed"
      />

      <div className="max-w-[1400px] mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => navigate('/admin')}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              ←
            </button>
            <AlertCircle className="w-8 h-8 text-orange-600" />
            <h1 className="text-3xl font-bold">Content Moderation</h1>
          </div>
          <p className="text-gray-600">
            Review and moderate reported content
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            onClick={() => setFilter('pending')}
          >
            Pending Reports
          </Button>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All Reports
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Reports</p>
                  <p className="text-2xl font-bold">
                    {reports.filter((r) => r.status === 'pending').length}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Reviewed</p>
                  <p className="text-2xl font-bold">
                    {reports.filter((r) => r.status === 'reviewed').length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Dismissed</p>
                  <p className="text-2xl font-bold">
                    {reports.filter((r) => r.status === 'dismissed').length}
                  </p>
                </div>
                <X className="w-8 h-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading reports...</p>
          </div>
        )}

        {/* Reports List */}
        {!loading && (
          <Card>
            <CardHeader>
              <CardTitle>
                {filter === 'pending' ? 'Pending Reports' : 'All Reports'} ({reports.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reports.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-semibold mb-2">No reports found</p>
                  <p className="text-sm">
                    {filter === 'pending'
                      ? 'All reports have been reviewed'
                      : 'No reports have been submitted yet'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map((report) => (
                    <div
                      key={report.id}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-white rounded-lg">
                          {getContentIcon(report.content_type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                              {report.content_type}
                            </span>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                report.status === 'pending'
                                  ? 'bg-orange-100 text-orange-700'
                                  : report.status === 'reviewed'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {report.status}
                            </span>
                          </div>

                          <p className="font-semibold mb-1">{report.reason}</p>
                          {report.description && (
                            <p className="text-sm text-gray-600 mb-2">{report.description}</p>
                          )}

                          <p className="text-xs text-gray-500">
                            Reported {formatDate(report.created_at)}
                          </p>
                        </div>

                        {report.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteContent(report)}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete Content
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDismissReport(report.id)}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Dismiss
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Info Message */}
        {!loading && reports.length === 0 && (
          <Card className="mt-6 border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900 mb-1">Setup Required</p>
                  <p className="text-sm text-blue-800">
                    To enable content moderation, you need to create a 'reports' table in your Supabase database.
                    Contact your developer to set this up.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
