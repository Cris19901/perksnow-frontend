import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../Header';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { MobileBottomNav } from '../MobileBottomNav';
import {
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Filter,
  Calendar,
  User,
  Shield,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface AdminAuditLogPageProps {
  onNavigate?: (page: string) => void;
  onCartClick?: () => void;
  cartItemsCount?: number;
}

interface AuditEntry {
  id: string;
  admin_id: string;
  admin_username: string;
  action: string;
  target_user_id: string | null;
  target_username: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  upgrade_tier: 'bg-green-100 text-green-800',
  downgrade_tier: 'bg-orange-100 text-orange-800',
  ban_user: 'bg-red-100 text-red-800',
  unban_user: 'bg-blue-100 text-blue-800',
  approve_withdrawal: 'bg-green-100 text-green-800',
  reject_withdrawal: 'bg-red-100 text-red-800',
  reset_points: 'bg-yellow-100 text-yellow-800',
  manual_points: 'bg-purple-100 text-purple-800',
  delete_post: 'bg-red-100 text-red-800',
  delete_comment: 'bg-red-100 text-red-800',
  delete_reel: 'bg-red-100 text-red-800',
};

const ACTIONS = [
  'upgrade_tier',
  'downgrade_tier',
  'ban_user',
  'unban_user',
  'approve_withdrawal',
  'reject_withdrawal',
  'reset_points',
  'manual_points',
  'delete_post',
  'delete_comment',
  'delete_reel',
];

const ITEMS_PER_PAGE = 25;

export function AdminAuditLogPage({ onNavigate, onCartClick, cartItemsCount }: AdminAuditLogPageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filterAction, setFilterAction] = useState<string | null>(null);

  useEffect(() => {
    checkAdmin();
  }, [user]);

  useEffect(() => {
    if (isAdmin) fetchLogs();
  }, [isAdmin, currentPage, filterAction]);

  const checkAdmin = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    setIsAdmin(data?.role === 'admin');
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * ITEMS_PER_PAGE;

      const { data, error } = await supabase.rpc('get_admin_audit_logs', {
        p_limit: ITEMS_PER_PAGE + 1,
        p_offset: offset,
        p_action: filterAction,
      });

      if (error) throw error;

      const entries = (data || []) as AuditEntry[];
      setHasMore(entries.length > ITEMS_PER_PAGE);
      setLogs(entries.slice(0, ITEMS_PER_PAGE));
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const formatAction = (action: string) =>
    action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const formatDetails = (details: Record<string, any> | null) => {
    if (!details) return '';
    return Object.entries(details)
      .filter(([_, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
      .join(', ');
  };

  if (!isAdmin && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Access denied</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onNavigate={onNavigate}
        onCartClick={onCartClick}
        cartItemsCount={cartItemsCount}
        currentPage="admin"
      />

      <div className="max-w-6xl mx-auto px-4 py-6 pb-28 md:pb-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-orange-600" />
              Admin Audit Log
            </h1>
            <p className="text-sm text-gray-500">Track all admin actions for accountability</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-4">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-600">Filter:</span>
              <button
                onClick={() => { setFilterAction(null); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  !filterAction ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {ACTIONS.map(action => (
                <button
                  key={action}
                  onClick={() => { setFilterAction(action); setCurrentPage(1); }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filterAction === action ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {formatAction(action)}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600" />
            <p className="text-gray-500 mt-2">Loading audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No audit log entries found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-lg border">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                    <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Time</div>
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                    <div className="flex items-center gap-1"><Shield className="w-3 h-3" /> Admin</div>
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Action</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                    <div className="flex items-center gap-1"><User className="w-3 h-3" /> Target</div>
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm font-medium">
                        @{log.admin_username || 'unknown'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={`text-xs ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-800'}`}>
                        {formatAction(log.action)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      {log.target_username ? (
                        <span className="text-sm">@{log.target_username}</span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500 max-w-xs truncate">
                      {formatDetails(log.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {logs.length > 0 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">
              Page {currentPage}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasMore}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <MobileBottomNav onNavigate={onNavigate} currentPage="admin" />
    </div>
  );
}
