import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { attendanceService } from '@/services/api/attendance.service';
import { workEntryService } from '@/services/api/workEntry.service';
import { Attendance, WorkEntry } from '@/types';
import { toast } from 'react-hot-toast';
import { Calendar, Clock, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';
import { formatDate, formatTime, formatHours, calculateHours } from '@/utils/dateUtils';

const AttendancePage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'workHistory'>('overview');
  const [attendanceHistory, setAttendanceHistory] = useState<Attendance[]>([]);
  const [workHistory, setWorkHistory] = useState<WorkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<'weekly' | 'monthly'>('weekly');

  // Load attendance and work history
  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userId = user?.id || (user as any)?._id;
      if (!userId) {
        setError('User not authenticated');
        return;
      }

      // Calculate date range based on filter
      const now = new Date();
      let startDate: Date;
      let endDate: Date;

      if (timeFilter === 'weekly') {
        // Get start of current week (Sunday)
        const dayOfWeek = now.getDay();
        const daysToSubtract = dayOfWeek === 0 ? 7 : dayOfWeek; // If Sunday, go back 7 days
        startDate = new Date(now);
        startDate.setDate(now.getDate() - daysToSubtract);
        startDate.setHours(0, 0, 0, 0);
        
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
      } else {
        // Get start of current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
      }

      // Load attendance history with date range
      const attendanceResponse = await attendanceService.getAttendanceHistory(userId);
      const allAttendance = attendanceResponse.data || [];
      
      // Filter attendance by date range
      const filteredAttendance = allAttendance.filter(attendance => {
        const attendanceDate = new Date(attendance.createdAt);
        return attendanceDate >= startDate && attendanceDate <= endDate;
      });
      setAttendanceHistory(filteredAttendance);

      // Load work history with date range
      const workResponse = await workEntryService.getWorkHistoryByEmployee(userId);
      const allWork = workResponse.data || [];
      
      // Filter work entries by date range
      const filteredWork = allWork.filter(entry => {
        const entryDate = new Date(entry.startTime || entry.createdAt);
        return entryDate >= startDate && entryDate <= endDate;
      });
      setWorkHistory(filteredWork);


    } catch (error) {
      setError('Failed to load history data');
      toast.error('Failed to load history data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [user, timeFilter]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalAttendanceDays = attendanceHistory.length;
    let totalHours = 0;
    let totalProduction = 0;
    let totalRejections = 0;

    // Calculate from work history
    workHistory.forEach(entry => {
      if (entry.startTime && entry.endTime) {
        const startTime = new Date(entry.startTime);
        const endTime = new Date(entry.endTime);
        const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        totalHours += hours;
      }
      if (entry.achieved) totalProduction += entry.achieved;
      if (entry.rejected) totalRejections += entry.rejected;
    });

    return {
      attendanceDays: totalAttendanceDays,
      totalHours: Math.round(totalHours * 100) / 100,
      totalProduction,
      totalRejections
    };
  }, [attendanceHistory, workHistory]);

  // Date and time formatting functions are now imported from utils/dateUtils

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
            <button
              onClick={loadHistory}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
              <p className="text-gray-600 mt-1">Track your attendance, work hours, and performance</p>
            </div>
            <button
              onClick={loadHistory}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: TrendingUp },
                { id: 'workHistory', label: 'Work History', icon: Clock }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          
          {/* Time Filter */}
          <div className="px-6 py-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Time Period:</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setTimeFilter('weekly')}
                  className={`px-3 py-1 text-sm rounded-md ${
                    timeFilter === 'weekly'
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setTimeFilter('monthly')}
                  className={`px-3 py-1 text-sm rounded-md ${
                    timeFilter === 'monthly'
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Attendance & Work Overview</h2>
              

              {/* Recent Activity */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Recent Activity</h3>
                {workHistory.length === 0 ? (
                  <p className="text-gray-500">No recent activity found</p>
                ) : (
                  <div className="space-y-3">
                    {workHistory.slice(0, 5).map((entry) => (
                      <div key={entry._id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">
                              {entry.sizeCode} - {entry.targetQuantity} target
                            </p>
                            <p className="text-sm text-gray-600">
                              {formatDate(entry.startTime)} • {formatTime(entry.startTime)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-green-600">{entry.achieved || 0} achieved</p>
                            <p className="text-sm text-red-600">{entry.rejected || 0} rejected</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'workHistory' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Work History</h2>
              {workHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No work history found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {workHistory.map((entry) => (
                    <div key={entry._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="font-medium text-gray-900">{entry.sizeCode}</span>
                            <span className="text-sm text-gray-500">•</span>
                            <span className="text-sm text-gray-600">Target: {entry.targetQuantity}</span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {formatDate(entry.startTime)} • {formatTime(entry.startTime)} - {(entry.achieved > 0 || entry.rejected > 0) ? formatTime(entry.endTime) : 'In Progress'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-green-600">{entry.achieved || 0} achieved</p>
                          <p className="text-sm text-red-600">{entry.rejected || 0} rejected</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {entry.achieved > 0 || entry.rejected > 0 ? 'Completed' : 'In Progress'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AttendancePage;
