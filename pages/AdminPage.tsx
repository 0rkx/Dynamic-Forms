import React, { useMemo, useEffect } from 'react';
import { useFormStore } from '../store/formStore';
import { useAuthStore } from '../store/authStore';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { FileText, MessageSquare, Clock } from 'lucide-react';

const AdminPage: React.FC = () => {
  const { getFormsByOwner, responses, analyzeFormInBackground, loadForms, loadFormResponses, forms, loading } = useFormStore();
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sortOrder, setSortOrder] = React.useState('updatedAt-desc');

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
      // Load responses for each form
      userForms.forEach(form => {
        loadFormResponses(form.id);
      });
    }
  }, [userForms.length, loadFormResponses]);

  // Auto-analyze all user forms in background when page loads
  useEffect(() => {
    if (userForms.length > 0) {
      // Analyze up to 5 most recent forms to avoid overwhelming the API
      const recentForms = userForms
        .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
        .slice(0, 5);
      
      recentForms.forEach(form => {
        // Trigger background analysis (will use cache if available)
        analyzeFormInBackground(form);
      });
    }
  }, [userForms.length, analyzeFormInBackground]); // Only run when forms count changes

  const getResponseCount = (formId: string) => {
    return responses[formId]?.length || 0;
  };

  const sortedAndFilteredForms = useMemo(() => {
    return userForms
      .filter(form => (form.title || '').toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
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
  }, [userForms, searchTerm, sortOrder, responses]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-2">
            <Input 
                placeholder="Search forms..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-48 h-10"
            />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="h-10 rounded-md border border-neutral-300 bg-transparent px-3 text-sm"
            >
              <option value="updatedAt-desc">Recently Updated</option>
              <option value="createdAt-desc">Newest First</option>
              <option value="title-asc">Title (A-Z)</option>
              <option value="responses-desc">Most Responses</option>
            </select>
            <Link to="/create">
                <Button>+ New Form</Button>
            </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <h2 className="text-2xl font-semibold">Loading forms...</h2>
        </div>
      ) : userForms.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-neutral-200 rounded-lg">
          <h2 className="text-2xl font-semibold">No Forms Yet</h2>
          <p className="text-neutral-500 mt-2">
            You haven't created any forms. Get started by creating one!
          </p>
           <Link to="/create" className="mt-4 inline-block">
            <Button>Create your first form</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedAndFilteredForms.map((form) => (
            <Card key={form.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="truncate">{form.title}</CardTitle>
                <CardDescription>Created {new Date(form.createdAt).toLocaleDateString()}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-between">
                <div className="space-y-2 text-sm text-neutral-600">
                  <p className="flex items-center gap-2"><FileText className="h-4 w-4"/> {form.questions.length} questions</p>
                  <p className="flex items-center gap-2"><MessageSquare className="h-4 w-4"/> {getResponseCount(form.id)} responses</p>
                  <p className="flex items-center gap-2"><Clock className="h-4 w-4"/> Updated {new Date(form.updatedAt).toLocaleDateString()}</p>
                </div>
                <Link to={`/admin/form/${form.id}`} className="mt-4">
                    <Button variant="outline" className="w-full">View Details</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPage;