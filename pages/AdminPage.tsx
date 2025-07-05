import React, { useMemo, useEffect, useState } from 'react';
import { useFormStore } from '../store/formStore';
import { useAuthStore } from '../store/authStore';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  FileText, 
  MessageSquare, 
  Clock, 
  Search, 
  Plus, 
  Filter, 
  Eye,
  ExternalLink,
  Sparkles
} from 'lucide-react';

import { devLog, useIsMobile } from '../lib/utils';
import MobileDesktopRestriction from '../components/MobileDesktopRestriction';

const AdminPage: React.FC = () => {
  const { getFormsByOwner, responses, analyzeFormInBackground, loadForms, loadFormResponses, forms, loading } = useFormStore();
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('updatedAt-desc');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'draft'>('all');
  const isMobile = useIsMobile();

  // Load forms when component mounts or user changes
  useEffect(() => {
    if (user) {
      loadForms();
    }
  }, [user, loadForms]);

  // Get forms owned by the current user
  const userForms = user ? getFormsByOwner(user.id) : [];
  
  // Load responses for all user forms when forms are loaded
  useEffect(() => {
    if (userForms.length > 0) {
      userForms.forEach(form => {
        loadFormResponses(form.id);
      });
    }
  }, [userForms.length, loadFormResponses]);

  // Auto-analyze recent forms in background when page loads (only once)
  useEffect(() => {
    // Use a timeout to ensure forms are loaded before analyzing
    const timeoutId = setTimeout(() => {
      if (userForms.length > 0) {
        const recentForms = userForms
          .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
          .slice(0, 3); // Reduced from 5 to 3 to limit API calls
        
        recentForms.forEach(form => {
          // Only analyze if not already analyzing and no existing analysis
          const { getAnalysis, isAnalyzing } = useFormStore.getState();
          if (!isAnalyzing(form.id) && !getAnalysis(form.id)) {
            devLog('Triggering background analysis for form:', form.title);
            analyzeFormInBackground(form);
          }
        });
      }
    }, 1000); // 1 second delay to ensure forms are loaded

    return () => clearTimeout(timeoutId);
  }, [userForms.length]); // Removed analyzeFormInBackground from dependencies

  const getResponseCount = (formId: string) => {
    return responses[formId]?.length || 0;
  };

  // Filter and sort forms
  const filteredAndSortedForms = useMemo(() => {
    let filtered = userForms.filter(form => {
      const matchesSearch = (form.title || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = selectedFilter === 'all' || 
        (selectedFilter === 'active' && getResponseCount(form.id) > 0) ||
        (selectedFilter === 'draft' && getResponseCount(form.id) === 0);
      return matchesSearch && matchesFilter;
    });

    return filtered.sort((a, b) => {
      const [key, order] = sortOrder.split('-');
      let valA, valB;

      switch (key) {
        case 'title':
          valA = (a.title || '').toLowerCase();
          valB = (b.title || '').toLowerCase();
          break;
        case 'responses':
          valA = getResponseCount(a.id);
          valB = getResponseCount(b.id);
          break;
        case 'createdAt':
        case 'updatedAt':
          valA = new Date(a[key] || 0).getTime();
          valB = new Date(b[key] || 0).getTime();
          break;
        default:
          valA = 0;
          valB = 0;
          break;
      }
      
      if (order === 'asc') {
        return valA < valB ? -1 : 1;
      } else {
        return valA > valB ? -1 : 1;
      }
    });
  }, [userForms, searchTerm, sortOrder, selectedFilter, responses]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const dashboardContent = (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your forms and track responses</p>
        </div>
        <Link to="/create">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            New Form
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search forms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Forms</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </select>
            
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="updatedAt-desc">Recently Updated</option>
              <option value="createdAt-desc">Newest First</option>
              <option value="title-asc">Title (A-Z)</option>
              <option value="responses-desc">Most Responses</option>
            </select>
          </div>
        </div>
      </div>

      {/* Forms List */}
      {userForms.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No forms yet</h2>
          <p className="text-gray-600 mb-6">Get started by creating your first form</p>
          <Link to="/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Form
            </Button>
          </Link>
        </div>
      ) : filteredAndSortedForms.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No forms found</h2>
          <p className="text-gray-600 mb-6">Try adjusting your search or filter</p>
          <Button 
            variant="outline" 
            onClick={() => {
              setSearchTerm('');
              setSelectedFilter('all');
            }}
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAndSortedForms.map((form) => {
            const responseCount = getResponseCount(form.id);
            const isActive = responseCount > 0;
            
            return (
              <div key={form.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">{form.title}</h3>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        isActive 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {isActive ? 'Active' : 'Draft'}
                      </div>
                    </div>
                    <div className="flex items-center gap-6 mt-2 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        <span>{form.questions.length} questions</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        <span>{responseCount} responses</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>Updated {new Date(form.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Link to={`/form/${form.id}`} target="_blank">
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link to={`/admin/form/${form.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <MobileDesktopRestriction 
        title="Dashboard - Desktop Experience Recommended"
        description="The dashboard is optimized for desktop use with complex tables and detailed analytics. For the best experience, we recommend using a desktop or laptop computer."
      >
        {dashboardContent}
      </MobileDesktopRestriction>
    );
  }

  return dashboardContent;
};

export default AdminPage;