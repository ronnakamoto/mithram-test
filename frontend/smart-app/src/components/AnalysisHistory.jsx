import { useState, useEffect } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ChevronRightIcon, ClockIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import apiConfig from '../config/api';

const StatusIcon = ({ status }) => {
  switch (status) {
    case 'completed':
      return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    case 'failed':
      return <XCircleIcon className="w-5 h-5 text-red-500" />;
    default:
      return <ClockIcon className="w-5 h-5 text-blue-500" />;
  }
};

const AnalysisTimeline = ({ history }) => {
  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-8 top-0 bottom-0 w-px bg-gray-200" />
      
      {/* Timeline items */}
      <div className="space-y-6">
        {history.map((item, index) => (
          <div key={item.analysisId} className="relative flex items-start group">
            {/* Status dot */}
            <div className="absolute left-8 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-gray-300 group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-blue-600 group-hover:border-transparent transition-all duration-200" />
            
            {/* Content card */}
            <div className="ml-16 flex-1 bg-white rounded-2xl border border-gray-100 hover:border-blue-200 transition-all duration-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <StatusIcon status={item.analysis.status} />
                  <h3 className="text-lg font-medium text-gray-900">
                    Analysis {history.length - index}
                  </h3>
                </div>
                <time className="text-sm text-gray-500" dateTime={item.timestamp}>
                  {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                </time>
              </div>
              
              {/* Analysis details */}
              <div className="space-y-4">
                {/* Status and timestamp */}
                <div className="flex items-center justify-between text-sm">
                  <span className={`px-3 py-1 rounded-full ${
                    item.analysis.status === 'completed' ? 'bg-gradient-to-r from-green-400 to-green-600 text-white' :
                    item.analysis.status === 'failed' ? 'bg-gradient-to-r from-red-400 to-red-600 text-white' :
                    'bg-gradient-to-r from-blue-400 to-blue-600 text-white'
                  }`}>
                    {item.analysis.status.charAt(0).toUpperCase() + item.analysis.status.slice(1)}
                  </span>
                  <span className="text-gray-500">
                    {format(new Date(item.timestamp), 'MMM d, yyyy HH:mm')}
                  </span>
                </div>

                {/* Recommendations summary */}
                {item.analysis.recommendations && (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <h4 className="text-sm font-medium text-gray-700">Recommendations</h4>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {item.analysis.recommendations.reasoning}
                    </p>
                    {item.analysis.recommendations.specialists?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {item.analysis.recommendations.specialists.map((specialist, i) => (
                          <span key={i} className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 text-white text-sm hover:from-blue-500 hover:to-blue-700 transition-all duration-200">
                            {specialist.specialty}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Risk factors if present */}
                {item.analysis.recommendations?.riskFactors?.length > 0 && (
                  <div className="border-t border-gray-100 pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Risk Factors</h4>
                    <div className="flex flex-wrap gap-2">
                      {item.analysis.recommendations.riskFactors.map((risk, i) => (
                        <span key={i} className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-sm">
                          {risk}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AnalysisHistory = ({ analysisId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(apiConfig.endpoints.analysis.history(analysisId), {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('mithram_token')}`
          }
        });
        
        if (!response.ok) throw new Error('Failed to fetch analysis history');
        
        const data = await response.json();
        setHistory(data.items);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [analysisId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
        <XCircleIcon className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <h3 className="text-lg font-medium text-red-800 mb-1">Failed to Load History</h3>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-3xl p-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-semibold text-gray-900">Analysis History</h2>
        <span className="bg-gradient-to-r from-blue-400 to-blue-600 text-white px-4 py-1 rounded-full text-sm">
          {history.length} Analyses
        </span>
      </div>
      
      <AnalysisTimeline history={history} />
    </div>
  );
};

export default AnalysisHistory;
