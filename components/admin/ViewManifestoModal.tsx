import React from 'react';
import { FormSchema } from '../../types';
import { Button } from '../ui/Button';
import { X, FileText, Users, Target, MessageSquare, Lightbulb } from 'lucide-react';

interface ViewManifestoModalProps {
  form: FormSchema;
  onClose: () => void;
  onEdit?: () => void;
}

const ViewManifestoModal: React.FC<ViewManifestoModalProps> = ({ form, onClose, onEdit }) => {
  const manifestoData = form.manifestoData;
  
  // Check if manifesto has actual content
  const hasManifesto = form.manifesto 
    || (manifestoData && (
      manifestoData.productVision?.trim() ||
      manifestoData.targetAudience?.trim() ||
      (manifestoData.businessGoals && manifestoData.businessGoals.some(goal => goal?.trim())) ||
      (manifestoData.keyQuestionAreas && manifestoData.keyQuestionAreas.some(area => area?.trim()))
    ));

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">AI Manifesto</h2>
              <p className="text-sm text-gray-600">Product vision guiding intelligent follow-ups</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {hasManifesto ? (
            <div className="space-y-6">
              {/* Status Indicator */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-800">Manifesto Active</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  This manifesto is guiding intelligent follow-up questions for your form.
                </p>
              </div>

              {manifestoData ? (
                /* Structured Manifesto Display */
                <div className="space-y-6">
                  {/* Product Vision */}
                  {manifestoData.productVision && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Lightbulb className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold text-gray-900">Product Vision</h3>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{manifestoData.productVision}</p>
                    </div>
                  )}

                  {/* Target Audience */}
                  {manifestoData.targetAudience && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="h-5 w-5 text-purple-600" />
                        <h3 className="font-semibold text-gray-900">Target Audience</h3>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{manifestoData.targetAudience}</p>
                    </div>
                  )}

                  {/* Business Goals */}
                  {manifestoData.businessGoals && manifestoData.businessGoals.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Target className="h-5 w-5 text-green-600" />
                        <h3 className="font-semibold text-gray-900">Business Goals</h3>
                      </div>
                      <ul className="space-y-2">
                        {manifestoData.businessGoals.map((goal, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                            <span className="text-gray-700">{goal}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Key Question Areas */}
                  {manifestoData.keyQuestionAreas && manifestoData.keyQuestionAreas.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <MessageSquare className="h-5 w-5 text-orange-600" />
                        <h3 className="font-semibold text-gray-900">Key Question Areas</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {manifestoData.keyQuestionAreas.map((area, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Conversation Tone */}
                  {manifestoData.conversationTone && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <MessageSquare className="h-5 w-5 text-indigo-600" />
                        <h3 className="font-semibold text-gray-900">Conversation Tone</h3>
                      </div>
                      <span className="inline-flex items-center px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium capitalize">
                        {manifestoData.conversationTone}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                /* Text-only Manifesto Display */
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-5 w-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">Manifesto Content</h3>
                  </div>
                  <div className="prose max-w-none">
                    <pre className="whitespace-pre-wrap text-gray-700 leading-relaxed font-sans">
                      {form.manifesto}
                    </pre>
                  </div>
                </div>
              )}

              {/* Form Connection Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">How This Manifesto Works</h4>
                <div className="space-y-2 text-sm text-blue-800">
                  <p>• Guides AI to ask relevant follow-up questions</p>
                  <p>• Focuses on your specific business objectives</p>
                  <p>• Adapts to user responses for deeper insights</p>
                  <p>• Maintains consistent conversation tone</p>
                </div>
              </div>
            </div>
          ) : (
            /* No Manifesto State */
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Manifesto Found</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                This form doesn't have a configured manifesto yet. A manifesto helps guide intelligent follow-up questions to gather more valuable insights.
              </p>
              {onEdit && (
                <Button
                  onClick={onEdit}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Create Manifesto
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            Form: <span className="font-medium">{form.title}</span>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {hasManifesto && onEdit && (
              <Button 
                onClick={onEdit}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Edit Manifesto
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewManifestoModal; 