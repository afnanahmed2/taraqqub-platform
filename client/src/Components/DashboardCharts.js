// DashboardCharts.js
// صفحة الإحصائيات المتقدمة - تعرض رسوم بيانية وتحليلات للتقارير

import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts';
import { 
  ArrowLeft, AlertTriangle, CheckCircle, Activity, MapPin
} from 'lucide-react';
import { fetchAdminReports, fetchReportStatistics } from '../Features/ReportSlice';

// ألوان الرسم البياني
const COLORS = ['#1E4DB7', '#FF9F1C', '#48CAE4', '#28a745', '#E63946', '#9B59B6', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];

const DashboardCharts = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { reports, statistics, status } = useSelector((state) => state.reports);
  const [categoryStats, setCategoryStats] = useState([]);
  const [governorateStats, setGovernorateStats] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);

  // التحقق من صلاحيات المدير وجلب البيانات
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userRole = localStorage.getItem("role");

    if (!token || userRole !== "admin") {
      navigate("/adminDashboard");
      return;
    }

    if (reports.length === 0) {
      dispatch(fetchAdminReports());
    }
    if (!statistics) {
      dispatch(fetchReportStatistics());
    }
  }, [dispatch, navigate, reports.length, statistics]);

  // حساب إحصائيات الفئات والمحافظات والبيانات الشهرية
  useEffect(() => {
    if (reports.length > 0) {
      
      // 1. حساب إحصائيات الفئات (Category Distribution)
      const categoryCount = {};
      reports.forEach(report => {
        const cat = report.category || 'Other';
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      });

      const sortedCategories = Object.entries(categoryCount)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      setCategoryStats(sortedCategories);

      // 2. حساب إحصائيات المحافظات (Governorate Distribution)
      const governorateCount = {};
      reports.forEach(report => {
        const gov = report.governorate || 'Unknown';
        governorateCount[gov] = (governorateCount[gov] || 0) + 1;
      });

      const sortedGovernorates = Object.entries(governorateCount)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      setGovernorateStats(sortedGovernorates);

      // 3. حساب البيانات الشهرية الحقيقية (Monthly Trends)
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      const monthlyReports = {};
      const monthlyResolved = {};
      
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();
      
      let earliestMonth = currentMonth;
      let earliestYear = currentYear;
      
      reports.forEach(report => {
        if (report.createdAt) {
          const reportDate = new Date(report.createdAt);
          const reportMonth = reportDate.getMonth();
          const reportYear = reportDate.getFullYear();
          
          if (reportYear < earliestYear || (reportYear === earliestYear && reportMonth < earliestMonth)) {
            earliestMonth = reportMonth;
            earliestYear = reportYear;
          }
        }
      });
      
      const monthsToShow = [];
      let tempYear = earliestYear;
      let tempMonth = earliestMonth;
      
      while (tempYear < currentYear || (tempYear === currentYear && tempMonth <= currentMonth)) {
        monthsToShow.push({
          month: monthNames[tempMonth],
          year: tempYear,
          monthIndex: tempMonth
        });
        tempMonth++;
        if (tempMonth > 11) {
          tempMonth = 0;
          tempYear++;
        }
      }
      
      const displayMonths = monthsToShow.slice(-6);
      
      reports.forEach(report => {
        if (report.createdAt) {
          const reportDate = new Date(report.createdAt);
          const monthName = monthNames[reportDate.getMonth()];
          const year = reportDate.getFullYear();
          const key = `${monthName}-${year}`;
          
          monthlyReports[key] = (monthlyReports[key] || 0) + 1;
          
          if (report.status === 'resolved' && report.updatedAt) {
            const resolvedDate = new Date(report.updatedAt);
            const resolvedMonthName = monthNames[resolvedDate.getMonth()];
            const resolvedYear = resolvedDate.getFullYear();
            const resolvedKey = `${resolvedMonthName}-${resolvedYear}`;
            monthlyResolved[resolvedKey] = (monthlyResolved[resolvedKey] || 0) + 1;
          }
        }
      });
      
      const trendDataArray = displayMonths.map(item => {
        const key = `${item.month}-${item.year}`;
        return {
          month: `${item.month} ${item.year}`,
          reports: monthlyReports[key] || 0,
          resolved: monthlyResolved[key] || 0
        };
      });
      
      setTrendData(trendDataArray);
      setLoading(false);
      
    } else if (status === 'succeeded' && reports.length === 0) {
      setLoading(false);
      setTrendData([]);
    }
  }, [reports, status]);

  // بيانات حالة البلاغات (من الإحصائيات الحقيقية)
  const pieData = [
    { name: 'Pending', value: statistics?.pending || 0, color: '#FF9F1C' },
    { name: 'In Progress', value: statistics?.inProgress || 0, color: '#48CAE4' },
    { name: 'Resolved', value: statistics?.resolved || 0, color: '#28a745' },
    { name: 'Spam', value: statistics?.spam || 0, color: '#E63946' },
    { name: 'Rejected', value: statistics?.rejected || 0, color: '#6c757d' },
  ];

  const totalReports = statistics?.total || reports.length || 0;
  const topCategory = categoryStats[0];

  // شاشة التحميل
  if (loading && reports.length === 0) {
    return (
      <div className="charts-page">
        <div className="charts-loading">
          <div className="loading-spinner"></div>
          <p>Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="charts-page">
      {/* Hero Section مع زر العودة */}
      <div className="charts-hero">
        <div className="charts-hero-content">
          <button className="charts-back-btn" onClick={() => navigate('/adminDashboard')}>
            <ArrowLeft size={18} /> Back to Dashboard
          </button>
          <h1>📊 Analytics Dashboard</h1>
          <p>Advanced insights and performance metrics for report management</p>
        </div>
      </div>

      <div className="charts-container">
        {/* Key Metrics Cards */}
        <div className="metrics-grid">
          {/* البطاقة 1: إجمالي البلاغات */}
          <div className="metric-card">
            <div className="metric-icon blue">
              <Activity size={24} />
            </div>
            <div className="metric-info">
              <span className="metric-label">Total Reports</span>
              <span className="metric-value">{totalReports}</span>
              {trendData.length >= 2 && (
                <span className="metric-trend positive">
                  {trendData[trendData.length-1].reports > trendData[trendData.length-2].reports ? '+' : ''}
                  {Math.round(((trendData[trendData.length-1].reports - trendData[trendData.length-2].reports) / (trendData[trendData.length-2].reports || 1)) * 100)}% from last month
                </span>
              )}
            </div>
          </div>

          {/* البطاقة 2: أكثر المشاكل شيوعاً */}
          <div className="metric-card">
            <div className="metric-icon orange">
              <AlertTriangle size={24} />
            </div>
            <div className="metric-info">
              <span className="metric-label">Most Common Issue</span>
              <span className="metric-value" style={{ fontSize: '18px' }}>
                {topCategory?.name || 'N/A'}
              </span>
              <span className="metric-trend">
                {topCategory?.value || 0} reports ({topCategory ? Math.round((topCategory.value / totalReports) * 100) : 0}%)
              </span>
            </div>
          </div>

          {/* البطاقة 3: نسبة الإنجاز */}
          <div className="metric-card">
            <div className="metric-icon green">
              <CheckCircle size={24} />
            </div>
            <div className="metric-info">
              <span className="metric-label">Resolution Rate</span>
              <span className="metric-value">
                {statistics?.resolved ? Math.round((statistics.resolved / totalReports) * 100) : 0}%
              </span>
              {trendData.length >= 2 && (
                <span className="metric-trend positive">
                  {trendData[trendData.length-1].resolved > trendData[trendData.length-2].resolved ? '+' : ''}
                  {Math.round(((trendData[trendData.length-1].resolved - trendData[trendData.length-2].resolved) / (trendData[trendData.length-2].resolved || 1)) * 100)}% improvement
                </span>
              )}
            </div>
          </div>

          {/* البطاقة 4: عدد المحافظات التي بها بلاغات */}
          <div className="metric-card">
            <div className="metric-icon purple">
              <MapPin size={24} />
            </div>
            <div className="metric-info">
              <span className="metric-label">Governorates Covered</span>
              <span className="metric-value">{governorateStats.length}</span>
              <span className="metric-trend">out of 11 governorates</span>
            </div>
          </div>
        </div>

        {/* Charts Row 1 - مخططين مختلفين (Pie Charts) */}
        <div className="charts-row">
          
          {/* المخطط 1: توزيع البلاغات حسب الحالة (Status) */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>📊 Report Status Distribution</h3>
              <p>Current state of all submitted reports (Pending, In Progress, Resolved...)</p>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData.filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.filter(d => d.value > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} reports`, 'Count']} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* المخطط 2: توزيع البلاغات حسب المحافظات */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>📍 Reports by Governorate</h3>
              <p>Distribution of reports across Oman governorates</p>
            </div>
            <div className="chart-body">
              {governorateStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={governorateStats.slice(0, 8)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
                      labelLine={false}
                    >
                      {governorateStats.slice(0, 8).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} reports`, 'Count']} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-data">No governorate data available</div>
              )}
            </div>
          </div>
        </div>

        {/* Charts Row 2 - Area Chart (Monthly Trends) */}
        <div className="charts-row">
          <div className="chart-card full-width">
            <div className="chart-header">
              <h3>📅 Monthly Report Trends</h3>
              <p>Reports submitted vs resolved over time</p>
            </div>
            <div className="chart-body">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1E4DB7" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#1E4DB7" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#28a745" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#28a745" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="reports" 
                      stroke="#1E4DB7" 
                      fillOpacity={1} 
                      fill="url(#colorReports)" 
                      name="Submitted Reports"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="resolved" 
                      stroke="#28a745" 
                      fillOpacity={1} 
                      fill="url(#colorResolved)" 
                      name="Resolved Reports"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-data" style={{ textAlign: 'center', padding: '60px' }}>
                  📊 No report data available yet. Start submitting reports to see trends!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Categories Bar Chart */}
        <div className="chart-card full-width" style={{ marginBottom: '40px' }}>
          <div className="chart-header">
            <h3>🏆 Top Problem Categories (By Count)</h3>
            <p>Most frequently reported infrastructure issues - ranked by number of reports</p>
          </div>
          <div className="chart-body">
            {categoryStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={categoryStats.slice(0, 8)}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={120} />
                  <Tooltip formatter={(value) => [`${value} reports`, 'Count']} />
                  <Bar dataKey="value" fill="#1E4DB7" radius={[0, 8, 8, 0]}>
                    {categoryStats.slice(0, 8).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">No category data available</div>
            )}
          </div>
        </div>

        
        
      </div>
    </div>
  );
};

export default DashboardCharts;