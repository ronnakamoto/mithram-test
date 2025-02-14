import { useEffect } from 'react';
import { XMarkIcon, ExclamationTriangleIcon, UserCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const Badge = ({ children, variant = 'blue' }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium border ${colors[variant]}`}>
      {children}
    </span>
  );
};

const RecommendationCard = ({ title, specialty, priority, actions, variant = 'blue' }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-200 transition-colors">
    <div className="flex items-center justify-between mb-3">
      <h5 className="font-medium text-gray-900">{title}</h5>
      <div className="flex items-center gap-2">
        {specialty && <Badge variant={variant}>{specialty}</Badge>}
        {priority && (
          <Badge variant={priority.toLowerCase() === 'urgent' ? 'red' : 'blue'}>
            {priority}
          </Badge>
        )}
      </div>
    </div>
    {actions && (
      <ul className="space-y-2">
        {actions.map((action, index) => (
          <li key={index} className="text-gray-600 text-sm flex items-start">
            <span className="mr-2 text-blue-500">•</span>
            {action}
          </li>
        ))}
      </ul>
    )}
  </div>
);

const DeepAnalysisModal = ({ isOpen, setIsOpen, analysis }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, setIsOpen]);

  if (!isOpen || !analysis) return null;

  const { deepAnalysis, timestamp, analysisId } = analysis;
  const { summary, recommendations, riskFactors } = deepAnalysis;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      setIsOpen(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-gray-500 bg-opacity-75 z-50 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-xl p-6 transform transition-all">
          {/* Close button */}
          <button
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full p-1"
            onClick={() => setIsOpen(false)}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>

          {/* Content */}
          <div className="mt-2">
            <h3 className="text-2xl font-semibold text-gray-900 mb-6">
              Deep Analysis Results
            </h3>

            {/* Analysis ID and Timestamp */}
            <div className="mb-6 flex items-center justify-between text-sm text-gray-500">
              <span>Analysis ID: {analysisId}</span>
              <time dateTime={timestamp}>
                {format(new Date(timestamp), 'PPpp')}
              </time>
            </div>

            {/* Patient Overview Section */}
            {summary?.patientOverview && (
              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <UserCircleIcon className="h-8 w-8 text-blue-600" />
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">Patient Overview</h4>
                    <p className="text-sm text-gray-600">
                      {summary.patientOverview.age} years old, {summary.patientOverview.gender}
                    </p>
                  </div>
                </div>
                
                {summary.patientOverview.chronicConditions?.length > 0 && (
                  <div className="mt-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Chronic Conditions</h5>
                    <div className="flex flex-wrap gap-2">
                      {summary.patientOverview.chronicConditions.map((condition, index) => (
                        <Badge key={index} variant="yellow">{condition}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {summary.careApproach && (
                  <div className="mt-4 text-gray-700">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Care Approach</h5>
                    <p className="text-sm leading-relaxed">{summary.careApproach}</p>
                  </div>
                )}
              </div>
            )}

            {/* Recommendations Section */}
            {recommendations && (
              <div className="space-y-6 mb-6">
                <h4 className="text-lg font-medium text-gray-900">Recommendations</h4>
                <div className="grid gap-4">
                  {/* Specialty Management */}
                  <div className="grid gap-4 md:grid-cols-2">
                    {recommendations.renalManagement && (
                      <RecommendationCard
                        title="Renal Management"
                        specialty={recommendations.renalManagement.specialtyReferral}
                        priority={recommendations.renalManagement.priority}
                        actions={recommendations.renalManagement.actions}
                        variant="red"
                      />
                    )}
                    {recommendations.thyroidManagement && (
                      <RecommendationCard
                        title="Thyroid Management"
                        specialty={recommendations.thyroidManagement.specialtyReferral}
                        priority={recommendations.thyroidManagement.priority}
                        actions={recommendations.thyroidManagement.actions}
                        variant="blue"
                      />
                    )}
                    {recommendations.hypertensionManagement && (
                      <RecommendationCard
                        title="Hypertension Management"
                        specialty={recommendations.hypertensionManagement.specialtyReferral}
                        priority={recommendations.hypertensionManagement.priority}
                        actions={recommendations.hypertensionManagement.actions}
                        variant="purple"
                      />
                    )}
                  </div>

                  {/* Lifestyle Modification */}
                  {recommendations.lifestyleModification && (
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <h5 className="font-medium text-gray-900 mb-4">Lifestyle Modification</h5>
                      <div className="grid gap-4 md:grid-cols-3">
                        {/* Exercise */}
                        <div className="space-y-2">
                          <h6 className="text-sm font-medium text-gray-700">Exercise</h6>
                          <p className="text-sm text-gray-600">{recommendations.lifestyleModification.exercise.frequency}</p>
                          <ul className="space-y-1">
                            {recommendations.lifestyleModification.exercise.types.map((type, index) => (
                              <li key={index} className="text-sm text-gray-600 flex items-center">
                                <span className="mr-2 text-green-500">•</span>
                                {type}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Nutrition */}
                        <div className="space-y-2">
                          <h6 className="text-sm font-medium text-gray-700">Nutrition</h6>
                          <p className="text-sm text-gray-600">{recommendations.lifestyleModification.nutrition.balancedDiet}</p>
                          <p className="text-sm text-gray-600">{recommendations.lifestyleModification.nutrition.limit}</p>
                        </div>

                        {/* Stress Management */}
                        <div className="space-y-2">
                          <h6 className="text-sm font-medium text-gray-700">Stress Management</h6>
                          <ul className="space-y-1">
                            {recommendations.lifestyleModification.stressManagement.strategies.map((strategy, index) => (
                              <li key={index} className="text-sm text-gray-600 flex items-center">
                                <span className="mr-2 text-blue-500">•</span>
                                {strategy}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Monitoring */}
                  {recommendations.monitoring && (
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <ClockIcon className="h-5 w-5 text-blue-600" />
                        <h5 className="font-medium text-gray-900">Monitoring Schedule</h5>
                      </div>
                      <div className="grid gap-6 md:grid-cols-2">
                        {/* Routine Tests */}
                        <div>
                          <h6 className="text-sm font-medium text-gray-700 mb-2">Routine Tests</h6>
                          <ul className="space-y-1">
                            {recommendations.monitoring.routineTests.map((test, index) => (
                              <li key={index} className="text-sm text-gray-600 flex items-center">
                                <span className="mr-2 text-purple-500">•</span>
                                {test}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Follow-up Appointments */}
                        <div>
                          <h6 className="text-sm font-medium text-gray-700 mb-2">Follow-up Schedule</h6>
                          <div className="space-y-2">
                            {Object.entries(recommendations.monitoring.followUpAppointments).map(([specialty, interval]) => (
                              <div key={specialty} className="flex items-center justify-between text-sm">
                                <span className="text-gray-600 capitalize">{specialty}:</span>
                                <Badge variant="blue">{interval}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Risk Factors Section */}
            {Array.isArray(riskFactors) && riskFactors.length > 0 && (
              <div className="mt-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Risk Factors</h4>
                <div className="space-y-2">
                  {riskFactors.map((risk, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50"
                    >
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700">{risk}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeepAnalysisModal;
