import React, { useMemo } from 'react';
import { FormSchema, FormResponse, Question } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';

interface AnalyticsTabProps {
  form: FormSchema;
  responses: FormResponse[];
}

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ form, responses }) => {
  const analyticsData = useMemo(() => {
    if (responses.length === 0) {
      return {
        completionRate: 0,
        questionBreakdowns: {},
      };
    }

    const completionRate = form.views > 0 ? (responses.length / form.views) * 100 : 0;

    const questionBreakdowns = form.questions
        .filter(q => q.type === 'multiple-choice' || q.type === 'rating')
        .reduce((acc, q) => {
            const data = new Map<string, number>();
            responses.forEach(res => {
                const answer = res.answers[q.id];
                if(answer !== undefined) {
                    const key = String(answer);
                    data.set(key, (data.get(key) || 0) + 1);
                }
            });
            acc[q.id] = Array.from(data.entries()).map(([name, value]) => ({ name, count: value }));
            return acc;
        }, {} as Record<string, {name: string, count: number}[]>);

    return {
      completionRate,
      questionBreakdowns,
    };
  }, [form, responses]);
  
  const formatTime = (ms: number) => {
      const seconds = Math.floor((ms / 1000) % 60);
      const minutes = Math.floor((ms / (1000 * 60)) % 60);
      return `${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`
  }

  const renderChart = (question: Question) => {
    const data = analyticsData.questionBreakdowns[question.id];
    if (!data) return null;

    const chartData = data.map(item => {
        const optionLabel = question.options?.find(opt => opt.value === item.name)?.label;
        return {
            name: optionLabel || item.name,
            count: item.count,
        }
    });

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 100, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={100} tick={{fontSize: 12}} />
                <Tooltip />
                <Bar dataKey="count" fill="#171717" name="Responses" />
            </BarChart>
        </ResponsiveContainer>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Total Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{responses.length}</p>
            <p className="text-sm text-neutral-500">{form.views} total views</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{analyticsData.completionRate.toFixed(0)}%</p>
            <p className="text-sm text-neutral-500">{responses.length} of {form.views} views</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Response Quality</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{responses.length > 0 ? '✓' : '—'}</p>
            <p className="text-sm text-neutral-500">
              {responses.length > 0 ? 'Receiving responses' : 'No responses yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Question Breakdown</h2>
        {form.questions.filter(q => q.type === 'multiple-choice' || q.type === 'rating').length > 0 ? (
            form.questions.filter(q => q.type === 'multiple-choice' || q.type === 'rating').map(q => (
                <Card key={q.id} className="mb-6">
                    <CardHeader>
                        <CardTitle>{q.label}</CardTitle>
                        <CardDescription>{q.type}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {analyticsData.questionBreakdowns[q.id] ? renderChart(q) : <p className="text-neutral-500">No responses for this question yet.</p>}
                    </CardContent>
                </Card>
            ))
        ) : (
             <p className="text-neutral-500">No multiple-choice or rating questions in this form to analyze.</p>
        )}
      </div>
    </div>
  );
};

export default AnalyticsTab;
