import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Trophy, Calendar, BookOpen, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AssessmentResult {
  id: string;
  topic: string;
  grade: string;
  score: number;
  total_questions: number;
  completed_at: string;
  language: string;
}

const Results = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('assessment_results')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

      if (error) throw error;

      // Deduplicate by topic - keep only the latest result for each topic
      const uniqueResults: AssessmentResult[] = [];
      const seenTopics = new Set<string>();
      
      (data || []).forEach((result: AssessmentResult) => {
        if (!seenTopics.has(result.topic)) {
          seenTopics.add(result.topic);
          uniqueResults.push(result);
        }
      });

      setResults(uniqueResults);
    } catch (error) {
      console.error('Error fetching results:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your results.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-blue-600';
    return 'text-orange-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            My Results
          </h1>
          <div className="w-20" />
        </div>

        {/* Results List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : results.length === 0 ? (
          <Card className="p-8 text-center">
            <Trophy className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Results Yet</h2>
            <p className="text-muted-foreground mb-4">
              Complete lessons to see your results here
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Start Learning
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {results.map((result) => {
              const percentage = (result.score / result.total_questions) * 100;
              const needsRevision = percentage < 70;
              
              return (
                <Card key={result.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-purple-600" />
                        <h3 className="text-lg font-semibold">{result.topic}</h3>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(result.completed_at)}
                        </span>
                        <span>Grade: {result.grade}</span>
                      </div>
                      {needsRevision && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/lesson/${encodeURIComponent(result.topic)}`)}
                          className="mt-2 gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Revise Topic
                        </Button>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`text-3xl font-bold ${getScoreColor(result.score, result.total_questions)}`}>
                        {result.score}/{result.total_questions}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {Math.round(percentage)}%
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Results;
