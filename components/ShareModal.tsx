import React, { useState, useEffect } from 'react';
import { Copy, X, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Input } from './ui/Input';
import { generateShareableFormUrl } from '../lib/utils';
import { FormSchema } from '../types';
import { useFormStore } from '../store/formStore';

interface ShareModalProps {
  formId: string;
  form?: FormSchema; // Optional form data for enhanced sharing
  onClose: () => void;
  title?: string;
  description?: string;
  showDashboardButton?: boolean;
}

const ShareModal: React.FC<ShareModalProps> = ({ 
  formId, 
  form: providedForm,
  onClose, 
  title = "Share Form",
  description = "Anyone with this link can view and submit responses to your form.",
  showDashboardButton = false
}) => {
  const { getFormById } = useFormStore();
  const [form, setForm] = useState<FormSchema | null>(providedForm || null);
  const [isVerifying, setIsVerifying] = useState(!providedForm);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [formUrl, setFormUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Verify form accessibility
  useEffect(() => {
    const verifyFormAccess = async () => {
      if (providedForm) {
        setForm(providedForm);
        setFormUrl(`${window.location.origin}/#/form/${formId}`);
        setIsVerifying(false);
        return;
      }

      try {
        setIsVerifying(true);
        setVerificationError(null);
        
        const foundForm = await getFormById(formId);
        
        if (!foundForm) {
          throw new Error('Form not found or inaccessible');
        }

        setForm(foundForm);
        setFormUrl(`${window.location.origin}/#/form/${formId}`);
      } catch (error: any) {
        console.error('Error verifying form access:', error);
        setVerificationError(error.message || 'Failed to verify form accessibility');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyFormAccess();
  }, [formId, providedForm, getFormById]);

  const copyToClipboard = async () => {
    if (!formUrl) return;

    try {
      await navigator.clipboard.writeText(formUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = formUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in-0">
      <Card className="w-full max-w-md relative animate-in zoom-in-95">
        <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-neutral-500" onClick={onClose}>
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </Button>
        
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {title}
            {isVerifying && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-neutral-900"></div>
            )}
            {!isVerifying && form && (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
            {!isVerifying && verificationError && (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
          </CardTitle>
          <CardDescription>
            {isVerifying ? 'Verifying form accessibility...' : description}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {isVerifying && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
            </div>
          )}

          {verificationError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Verification Failed</span>
              </div>
              <p className="text-red-600 text-sm mt-1">{verificationError}</p>
            </div>
          )}

          {form && formUrl && !isVerifying && (
            <>
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Form Verified</span>
                  </div>
                  <p className="text-green-600 text-sm mt-1">
                    "{form.title}" is accessible and ready to share
                  </p>
                </div>

                <div className="flex space-x-2">
                  <Input 
                    type="text" 
                    readOnly 
                    value={formUrl} 
                    className="bg-neutral-100 text-sm font-mono"
                    onClick={(e) => e.currentTarget.select()}
                  />
                  <Button 
                    onClick={copyToClipboard} 
                    variant="outline" 
                    className="min-w-[90px]"
                    disabled={!formUrl}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-blue-700 text-xs">
                    💡 This link works across all browsers and devices. Recipients can access your form without needing an account.
                  </p>
                </div>

                {form.questions && (
                  <div className="text-xs text-neutral-500 space-y-1">
                    <p>Form Details:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>{form.questions.length} question{form.questions.length !== 1 ? 's' : ''}</li>
                      <li>{form.views || 0} view{form.views !== 1 ? 's' : ''} so far</li>
                      {form.intelligentFollowUps && <li>AI-powered follow-ups enabled</li>}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="mt-6 flex justify-end gap-2">
            {verificationError && (
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
              >
                Retry
              </Button>
            )}
            {showDashboardButton ? (
              <Button onClick={onClose}>Go to Admin Dashboard</Button>
            ) : (
              <Button onClick={onClose} variant="outline">Close</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShareModal;
