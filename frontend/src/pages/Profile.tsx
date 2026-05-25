import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { User, ArrowLeft, Loader2 } from 'lucide-react';
import { userService, ProfileUpdateRequest } from '@/services/userService';
import { User as UserType } from '@/types/user';

const profileSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, apostrophes, and hyphens'),
  profilePictureUrl: z.string()
    .url('Please enter a valid URL')
    .regex(/\.(png|jpg|jpeg|gif|webp)$/i, 'Profile picture must be a valid image URL (png, jpg, jpeg, gif, webp)')
    .max(500, 'URL must be less than 500 characters')
    .optional()
    .or(z.literal(''))
});

type ProfileFormData = z.infer<typeof profileSchema>;

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty }
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema)
  });

  const loadUserProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const userProfile = await userService.getCurrentProfile();
      setUser(userProfile);
      reset({
        name: userProfile.name,
        profilePictureUrl: userProfile.profilePictureUrl || ''
      });
    } catch (error) {
      console.error('Failed to load user profile:', error);
      toast.error('Failed to load profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [reset]);

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setIsUpdating(true);
      const updateData: ProfileUpdateRequest = {
        name: data.name,
        ...(data.profilePictureUrl && { profilePictureUrl: data.profilePictureUrl })
      };
      const updatedUser = await userService.updateProfile(updateData);
      setUser(updatedUser);
      toast.success('Profile updated successfully!');
    } catch (error: unknown) {
      console.error('Failed to update profile:', error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Failed to update profile.');
    } finally {
      setIsUpdating(false);
    }
  };

  const getInitials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-2 border-transparent border-t-[#0071E3] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 animate-fade-in">
      {/* ── Header ───────────────────────────────────────────── */}
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 mb-8 text-sm font-medium hover:text-[#0071E3] transition-colors"
        style={{ color: "var(--text-secondary)" }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="mb-10">
        <h1 className="display-sm mb-2" style={{ color: "var(--text-primary)" }}>Profile Settings</h1>
        <p className="body-base">Update your personal information and preferences.</p>
      </div>

      {/* ── Profile Form ─────────────────────────────────────── */}
      <div className="card-surface p-8 mb-8">
        <div className="flex items-center gap-3 mb-6 border-b pb-6" style={{ borderColor: "var(--border-subtle)" }}>
          <User className="w-5 h-5 text-[#0071E3]" />
          <div>
            <h2 className="text-lg font-semibold font-display" style={{ color: "var(--text-primary)" }}>Profile Information</h2>
            <p className="text-sm font-body" style={{ color: "var(--text-secondary)" }}>Manage your account details and how others see you</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex items-center gap-6 p-4 rounded-xl" style={{ background: "var(--surface-raised)", border: "1px solid var(--border-subtle)" }}>
            <div className="relative w-16 h-16 rounded-full overflow-hidden bg-[#0071E3]/20 flex items-center justify-center shrink-0">
              {user?.profilePictureUrl ? (
                <img src={user.profilePictureUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-[#0071E3]">{user?.name ? getInitials(user.name) : 'U'}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate" style={{ color: "var(--text-primary)" }}>{user?.name}</h3>
              <p className="text-sm truncate mb-1" style={{ color: "var(--text-secondary)" }}>{user?.email}</p>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full uppercase tracking-wider" style={{ background: "rgba(255,255,255,0.1)", color: "var(--text-tertiary)" }}>
                {user?.role}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium font-body block" style={{ color: "var(--text-secondary)" }}>Name <span className="text-[#FF453A]">*</span></label>
            <input
              type="text"
              placeholder="Enter your name"
              {...register('name')}
              className={`input-dark w-full ${errors.name ? '!border-[#FF453A]' : ''}`}
            />
            {errors.name && <p className="text-xs text-[#FF453A] mt-1">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium font-body block" style={{ color: "var(--text-secondary)" }}>Profile Picture URL</label>
            <input
              type="url"
              placeholder="https://example.com/profile.jpg"
              {...register('profilePictureUrl')}
              className={`input-dark w-full ${errors.profilePictureUrl ? '!border-[#FF453A]' : ''}`}
            />
            {errors.profilePictureUrl ? (
              <p className="text-xs text-[#FF453A] mt-1">{errors.profilePictureUrl.message}</p>
            ) : (
              <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>Optional: Enter a URL to your profile picture (png, jpg, webp)</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t" style={{ borderColor: "var(--border-subtle)" }}>
            <button
              type="button"
              onClick={() => reset()}
              disabled={!isDirty || isUpdating}
              className="px-5 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              style={{ background: "var(--surface-raised)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)" }}
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={!isDirty || isUpdating}
              className="btn-accent px-5 py-2 text-sm font-medium rounded-lg flex items-center justify-center disabled:opacity-50 min-w-[120px]"
            >
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Account Info ─────────────────────────────────────── */}
      <div className="card-surface p-8">
        <h2 className="text-lg font-semibold font-display mb-6" style={{ color: "var(--text-primary)" }}>Account Information</h2>
        <div className="space-y-4 text-sm font-body">
          <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: "var(--border-subtle)" }}>
            <span style={{ color: "var(--text-secondary)" }}>Email</span>
            <span className="font-medium" style={{ color: "var(--text-primary)" }}>{user?.email}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: "var(--border-subtle)" }}>
            <span style={{ color: "var(--text-secondary)" }}>Email Verification</span>
            <span className={`font-medium ${user?.emailVerified ? 'text-[#34C759]' : 'text-[#FF453A]'}`}>
              {user?.emailVerified ? 'Verified' : 'Not Verified'}
            </span>
          </div>
          <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: "var(--border-subtle)" }}>
            <span style={{ color: "var(--text-secondary)" }}>Member Since</span>
            <span className="font-medium" style={{ color: "var(--text-primary)" }}>
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span style={{ color: "var(--text-secondary)" }}>Last Login</span>
            <span className="font-medium" style={{ color: "var(--text-primary)" }}>
              {user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
