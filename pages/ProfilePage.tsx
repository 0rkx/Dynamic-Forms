import React, { useState, useEffect } from 'react';
import { motion, Variants } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.6, 
      staggerChildren: 0.1 
    } 
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const ProfilePage: React.FC = () => {
  const { user, updateProfile, signOut, getDisplayName } = useAuthStore();
  const { addToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
  });

  // Update form data when user changes or component mounts
  useEffect(() => {
    if (user) {
      setFormData({
        displayName: getDisplayName() || '',
        email: user.email || '',
      });
    }
  }, [user, getDisplayName]);

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      await updateProfile({
        displayName: formData.displayName,
      });
      setIsEditing(false);
      addToast({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your profile has been updated successfully.',
        duration: 4000
      });
      // The user state will be automatically updated by the auth store
      // which will trigger the useEffect to update the form data
    } catch (error) {
      console.error('Failed to update profile:', error);
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update your profile. Please try again.',
        duration: 5000
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        displayName: getDisplayName() || '',
        email: user.email || '',
      });
    }
    setIsEditing(false);
  };

  const getInitials = () => {
    if (!user) return 'U';
    
    const displayName = getDisplayName();
    if (displayName && displayName !== 'User') {
      return displayName
        .split(' ')
        .map(name => name[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    
    return 'U';
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  const displayName = getDisplayName();

  return (
    <div className="max-w-4xl mx-auto py-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Profile & Settings</h1>
          <p className="text-neutral-600">Manage your account settings and preferences.</p>
        </motion.div>

        <div className="grid gap-6">
          {/* Profile Information */}
          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold mb-1">Profile Information</h2>
                  <p className="text-sm text-neutral-600">Update your personal information and how others see you.</p>
                </div>
                {!isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Profile
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-6 mb-6">
                <div className="w-20 h-20 bg-indigo-600 text-white rounded-full flex items-center justify-center text-2xl font-semibold">
                  {getInitials()}
                </div>
                <div className="flex-1">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Display Name
                        </label>
                        <Input
                          value={formData.displayName}
                          onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                          placeholder="Enter your display name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Email Address
                        </label>
                        <Input
                          value={formData.email}
                          disabled
                          className="bg-neutral-50"
                        />
                        <p className="text-xs text-neutral-500 mt-1">Email cannot be changed</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div>
                        <h3 className="font-medium text-neutral-900">
                          {displayName || 'No display name set'}
                        </h3>
                        <p className="text-sm text-neutral-600">{user.email}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    size="sm"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSaving}
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </Card>
          </motion.div>

          {/* Danger Zone */}
          <motion.div variants={itemVariants}>
            <Card className="p-6 border-red-200">
              <h2 className="text-xl font-semibold mb-1 text-red-700">Danger Zone</h2>
              <p className="text-sm text-neutral-600 mb-6">Actions that cannot be undone.</p>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                  <div>
                    <h3 className="font-medium text-red-700">Sign Out</h3>
                    <p className="text-sm text-red-600">Sign out of your account on this device</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={signOut}
                    className="border-red-200 text-red-700 hover:bg-red-100"
                  >
                    Sign Out
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProfilePage; 