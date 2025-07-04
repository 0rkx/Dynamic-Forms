import React from 'react';
import { X, FileText, Edit2 } from 'lucide-react';
import { FormSchema } from '../../types';
import { Button } from '../ui/Button';

interface ViewManifestoModalProps {
  form: FormSchema;
  onClose: () => void;
  onEdit: () => void;
}

const ViewManifestoModal: React.FC<ViewManifestoModalProps> = ({ form, onClose, onEdit }) => {
  const manifestoData = form.manifestoData;
  
  // Check if manifesto has actual content
  const hasManifesto = manifestoData && (
    manifestoData.productVision?.trim() ||
    manifestoData.targetAudience?.trim() ||
    (manifestoData.keyQuestionAreas && manifestoData.keyQuestionAreas.some(area => area?.trim()))
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in-0">
      <div className="w-full max-w-3xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden relative animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">AI Manifesto</h2>
              <p className="text-sm text-neutral-600">Product vision guiding intelligent follow-ups</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-130px)]">
          {hasManifesto ? (
            <div className="space-y-6">
              {/* Product Vision */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-800 mb-1">Product Vision</h3>
                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                  <p className="text-neutral-700">
                    {manifestoData.productVision || 'No product vision defined'}
                  </p>
                </div>
              </div>

              {/* Target Audience */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-800 mb-1">Target Audience</h3>
                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                  <p className="text-neutral-700">
                    {manifestoData.targetAudience || 'No target audience defined'}
                  </p>
                </div>
              </div>

              {/* Key Question Areas */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-800 mb-1">Key Question Areas</h3>
                {manifestoData.keyQuestionAreas && manifestoData.keyQuestionAreas.length > 0 ? (
                  <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                    <ul className="list-disc list-inside space-y-1 text-neutral-700">
                      {manifestoData.keyQuestionAreas
                        .filter(area => area?.trim())
                        .map((area, index) => (
                          <li key={index}>{area}</li>
                        ))
                      }
                    </ul>
                  </div>
                ) : (
                  <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                    <p className="text-neutral-500 italic">No key question areas defined</p>
                  </div>
                )}
              </div>

              {/* Info Card */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <h4 className="font-medium text-blue-900 mb-2">How This Manifesto Works</h4>
                <div className="space-y-2 text-sm text-blue-800">
                  <p>• Guides AI to ask relevant follow-up questions</p>
                  <p>• Focuses on gathering insights beyond basic responses</p>
                  <p>• Adapts to user responses for deeper context</p>
                  <p>• Creates a more engaging conversation experience</p>
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
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-neutral-50 sticky bottom-0">
          <div className="text-sm text-neutral-500">
            {hasManifesto ? 'Last updated: ' + new Date(form.updatedAt).toLocaleDateString() : ''}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {onEdit && (
              <Button
                onClick={onEdit}
                className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
              >
                <Edit2 className="h-4 w-4" />
                {hasManifesto ? 'Edit Manifesto' : 'Create Manifesto'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewManifestoModal; 