import { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Target, 
  Award, 
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
  Calendar,
  Trophy,
  Loader2
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, subDays } from 'date-fns';
import { reportsService, ReportFilters } from '@/services/api/reports.service';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

// Real data will be loaded from API

export default function EmployeePerformance() {
  const { user } = useAuthStore();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week');
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [weeklyStats, setWeeklyStats] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [achievements, setAchievements] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [currentStats, setCurrentStats] = useState({
    todayTarget: 0,
    todayAchieved: 0,
    todayEfficiency: 0,
    todayRejections: 0,
    weeklyAverage: 0,
    monthlyAverage: 0,
    totalProduction: 0,
    totalRejections: 0,
    bestDay: 0,
    streak: 0,
  });

  // Define loadPerformanceData function first
  const loadPerformanceData = useCallback(async () => {
    const userId = user?.id || user?._id;
    if (!userId) {
      // No user ID available for performance data
      setError('User not authenticated. Please log in again.');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const filters: ReportFilters = {
        startDate: selectedPeriod === 'week' 
          ? subDays(new Date(), 7).toISOString()
          : subDays(new Date(), 30).toISOString(),
        endDate: new Date().toISOString(),
        employeeId: userId,
        factoryId: user.factoryId,
      };

      // Loading performance data with filters
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 5000)
      );
      
      const performanceDataPromise = reportsService.getEmployeePerformanceData(userId, filters);
      
      const performanceData = await Promise.race([performanceDataPromise, timeoutPromise]);
      // Performance data received
      
      // Check if we got actual data or empty object
      if (performanceData && Object.keys(performanceData).length > 0) {
        setPerformanceData(performanceData.trends || []);
        setWeeklyStats(performanceData.weeklyStats || []);
        setAchievements(performanceData.achievements || []);
        setCurrentStats(performanceData.currentStats || {
          todayTarget: 0,
          todayAchieved: 0,
          todayEfficiency: 0,
          todayRejections: 0,
          weeklyAverage: 0,
          monthlyAverage: 0,
          totalProduction: 0,
          totalRejections: 0,
          bestDay: 0,
          streak: 0,
        });
        setError(null);
        setLoading(false);
      } else {
        // No data returned
        setPerformanceData([]);
        setWeeklyStats([]);
        setAchievements([]);
        setCurrentStats({
          todayTarget: 0,
          todayAchieved: 0,
          todayEfficiency: 0,
          todayRejections: 0,
          weeklyAverage: 0,
          monthlyAverage: 0,
          totalProduction: 0,
          totalRejections: 0,
          bestDay: 0,
          streak: 0,
        });
        setError(null);
        setLoading(false);
      }
    } catch (error) {
      // Failed to load performance data
      // Performance data loading error
      
      if (error instanceof Error) {
        if (error.message === 'Request timeout') {
          setError('Request timeout. Please try again.');
          toast.error('Request timeout. Please try again.');
        } else {
          setError('Failed to load performance data. Please try again.');
          toast.error('Failed to load performance data. Please try again.');
        }
      } else {
        setError('Failed to load performance data. Please try again.');
        toast.error('Failed to load performance data. Please try again.');
      }
      
      // Set empty data instead of sample data
      setPerformanceData([]);
      setWeeklyStats([]);
      setAchievements([]);
      setCurrentStats({
        todayTarget: 0,
        todayAchieved: 0,
        todayEfficiency: 0,
        todayRejections: 0,
        weeklyAverage: 0,
        monthlyAverage: 0,
        totalProduction: 0,
        totalRejections: 0,
        bestDay: 0,
        streak: 0,
      });
      setLoading(false);
    }
  }, [user?.id, user?._id, selectedPeriod]);

  useEffect(() => {
    // EmployeePerformance useEffect triggered
    
    if (user?.id || user?._id) {
      // Loading performance data
      loadPerformanceData();
    } else {
      // No user ID available for performance data
      setLoading(false);
      setError('User not authenticated. Please log in again.');
    }
  }, [user?.id, user?._id, selectedPeriod, loadPerformanceData]);

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 110) return 'text-success';
    if (efficiency >= 90) return 'text-primary';
    return 'text-destructive';
  };

  const getEfficiencyBadge = (efficiency: number) => {
    if (efficiency >= 110) return 'default';
    if (efficiency >= 90) return 'secondary';
    return 'destructive';
  };

  // Show loading state
  if (loading) {
    return (
      <Layout title="My Performance">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">My Performance</h1>
            <p className="text-muted-foreground">
              Track your productivity, efficiency, and achievements
            </p>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center h-64">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>Loading performance data...</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Show error state
  if (error) {
    return (
      <Layout title="My Performance">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">My Performance</h1>
            <p className="text-muted-foreground">
              Track your productivity, efficiency, and achievements
            </p>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center h-64 text-center">
                <div className="space-y-4">
                  <XCircle className="h-12 w-12 text-red-500 mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold text-red-600">Error Loading Data</h3>
                    <p className="text-muted-foreground">{error}</p>
                    <Button 
                      onClick={loadPerformanceData}
                      className="mt-4"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="My Performance">
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">My Performance</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Track your productivity, efficiency, and achievements
            </p>
            {error && (
              <p className="text-sm text-red-600 mt-1">
                ⚠️ {error}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={loadPerformanceData}
              variant="outline"
              size="sm"
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Refresh
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Today's Performance */}
        <Card className="shadow-md border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Target className="h-5 w-5" />
              Today's Performance
            </CardTitle>
            <CardDescription className="text-sm">
              {format(new Date(), 'EEEE, MMMM do, yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-primary/5 rounded-lg">
                <p className="text-xl sm:text-2xl font-bold text-primary">{currentStats.todayAchieved}</p>
                <p className="text-sm text-muted-foreground">Achieved</p>
                <p className="text-xs">Target: {currentStats.todayTarget}</p>
              </div>
              <div className="text-center p-3 bg-muted/5 rounded-lg">
                <p className={`text-xl sm:text-2xl font-bold ${getEfficiencyColor(currentStats.todayEfficiency)}`}>
                  {currentStats.todayEfficiency.toFixed(2)}%
                </p>
                <p className="text-sm text-muted-foreground">Efficiency</p>
                <Badge variant={getEfficiencyBadge(currentStats.todayEfficiency)} className="text-xs mt-1">
                  {currentStats.todayEfficiency >= 100 ? 'Above Target' : 'Below Target'}
                </Badge>
              </div>
              <div className="text-center p-3 bg-destructive/5 rounded-lg">
                <p className="text-xl sm:text-2xl font-bold text-destructive">{currentStats.todayRejections}</p>
                <p className="text-sm text-muted-foreground">Rejections</p>
                <p className="text-xs">Quality: {currentStats.todayAchieved > 0 ? ((currentStats.todayAchieved - currentStats.todayRejections) / currentStats.todayAchieved * 100).toFixed(1) : 0}%</p>
              </div>
              <div className="text-center p-3 bg-success/5 rounded-lg">
                <p className="text-xl sm:text-2xl font-bold text-success">{currentStats.streak}</p>
                <p className="text-sm text-muted-foreground">Day Streak</p>
                <p className="text-xs">Target achieved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Weekly Average</p>
                  <p className="text-xl sm:text-2xl font-bold">{currentStats.weeklyAverage.toFixed(2)}%</p>
                </div>
              </div>
              <Progress value={currentStats.weeklyAverage} className="h-2" />
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-success" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Monthly Average</p>
                  <p className="text-xl sm:text-2xl font-bold">{currentStats.monthlyAverage.toFixed(2)}%</p>
                </div>
              </div>
              <Progress value={currentStats.monthlyAverage} className="h-2" />
            </CardContent>
          </Card>
          <Card className="shadow-md sm:col-span-2 lg:col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-warning" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Best Day</p>
                  <p className="text-xl sm:text-2xl font-bold">{currentStats.bestDay}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">pieces produced</p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Charts */}
        <div className="grid gap-6">
          {/* Daily Performance Trend */}
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <BarChart3 className="h-5 w-5" />
                  Daily Performance (Last 7 Days)
                </CardTitle>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant={selectedPeriod === 'week' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPeriod('week')}
                    className="flex-1 sm:flex-none"
                  >
                    Week
                  </Button>
                  <Button
                    variant={selectedPeriod === 'month' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPeriod('month')}
                    className="flex-1 sm:flex-none"
                  >
                    Month
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : performanceData.length > 0 || weeklyStats.length > 0 ? (
                <div className="h-[250px] sm:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {selectedPeriod === 'week' ? (
                      <LineChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                          fontSize={12}
                          className="text-xs sm:text-sm"
                        />
                        <YAxis fontSize={12} className="text-xs sm:text-sm" />
                        <Tooltip 
                          labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                          formatter={(value, name) => [value, name === 'efficiency' ? `${value}%` : value]}
                        />
                        <Line type="monotone" dataKey="achieved" stroke="hsl(var(--primary))" strokeWidth={2} name="Achieved" />
                        <Line type="monotone" dataKey="target" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="5 5" name="Target" />
                        <Line type="monotone" dataKey="efficiency" stroke="hsl(var(--success))" strokeWidth={2} name="Efficiency" />
                      </LineChart>
                    ) : (
                      <BarChart data={weeklyStats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" fontSize={12} className="text-xs sm:text-sm" />
                        <YAxis fontSize={12} className="text-xs sm:text-sm" />
                        <Tooltip />
                        <Bar dataKey="production" fill="hsl(var(--primary))" name="Production" />
                        <Bar dataKey="target" fill="hsl(var(--muted))" name="Target" />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-center">
                  <div className="space-y-4">
                    <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto" />
                    <div>
                      <h3 className="text-lg font-semibold text-muted-foreground">No Data Available</h3>
                      <p className="text-sm text-muted-foreground">Complete some work entries to see your performance trends</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Achievements & Milestones
              </CardTitle>
              <CardDescription>
                Your earned achievements and progress towards goals
              </CardDescription>
            </CardHeader>
            <CardContent>
              {achievements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`p-4 rounded-lg border ${
                      achievement.earned
                        ? 'bg-success/5 border-success/20'
                        : 'bg-muted/5 border-muted/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {achievement.earned ? (
                        <CheckCircle className="h-6 w-6 text-success mt-1" />
                      ) : (
                        <XCircle className="h-6 w-6 text-muted-foreground mt-1" />
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium">{achievement.title}</h4>
                        <p className="text-sm text-muted-foreground">{achievement.description}</p>
                        {achievement.earned && achievement.date && (
                          <p className="text-xs text-success mt-1">
                            Earned on {format(new Date(achievement.date), 'MMM dd, yyyy')}
                          </p>
                        )}
                      </div>
                    </div>
                                      </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No achievements available yet</p>
                  <p className="text-sm">Complete more work to earn achievements</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistics Summary */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Performance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{currentStats.totalProduction}</p>
                  <p className="text-sm text-muted-foreground">Total Production</p>
                  <p className="text-xs">This month</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-destructive">{currentStats.totalRejections}</p>
                  <p className="text-sm text-muted-foreground">Total Rejections</p>
                  <p className="text-xs">Quality: {currentStats.totalProduction > 0 ? ((currentStats.totalProduction - currentStats.totalRejections) / currentStats.totalProduction * 100).toFixed(1) : 0}%</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-success">{currentStats.bestDay}</p>
                  <p className="text-sm text-muted-foreground">Best Single Day</p>
                  <p className="text-xs">Personal record</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-warning">{achievements.filter(a => a.earned).length}</p>
                  <p className="text-sm text-muted-foreground">Achievements</p>
                  <p className="text-xs">Out of {achievements.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}