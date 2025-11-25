// src/hooks/useJoinMeeting.ts
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';

export interface MeetingDetails {
  id: string;
  title: string;
  description?: string;
  organizerName: string;
  scheduledTime: string;
  requiresAuthentication?: boolean;
  organizerEmail?: string;
  meetingDuration?: number;
  maxParticipants?: number;
  isRecurring?: boolean;
  timezone?: string;
}

interface ValidationResult {
  valid: boolean;
  message?: string;
  requiresAuth?: boolean;
}

interface UseJoinMeetingResult {
  meeting: MeetingDetails | null;
  loading: boolean;
  error: string | null;
  handleJoin: () => Promise<void>;
  joining: boolean;
  validation: ValidationResult | null;
}

export const useJoinMeeting = (token: string): UseJoinMeetingResult => {
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState<MeetingDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [joining, setJoining] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  useEffect(() => {
    let isMounted = true;

    const validateToken = async () => {
      if (!token) {
        setError('This invitation link is missing a token. Please request a new link from the organizer.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // First validate the token
        const validationResponse = await api.get<{ data: ValidationResult }>('/api/public/meetings/join/validate', {
          params: { token },
          _skipAuthRefresh: true,
        } as any);

        if (!isMounted) return;

        const validationData = validationResponse.data.data;
        setValidation(validationData);

        if (!validationData.valid) {
          setError(validationData.message || 'This invitation is no longer valid.');
          setLoading(false);
          return;
        }

        // If token is valid, get meeting details
        const detailsResponse = await api.get<{ data: MeetingDetails }>('/api/public/meetings/join/token-details', {
          params: { token },
          _skipAuthRefresh: true,
        } as any);

        if (!isMounted) return;

        setMeeting(detailsResponse.data.data);
      } catch (err: any) {
        console.error('[JoinMeeting] Error validating token or fetching meeting details:', err);
        
        if (!isMounted) return;

        const errorMessage = err.response?.data?.data?.message || 
                          'We could not validate this invitation. Please check that the link is correct or contact the meeting organizer.';
        
        setError(errorMessage);
        setValidation({
          valid: false,
          message: errorMessage
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    validateToken();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleJoin = useCallback(async () => {
    if (!token) {
      setError('Missing invitation token. Please open the link you received or request a new one.');
      return;
    }

    if (!validation?.valid) {
      setError('This invitation is no longer valid. Please request a new one from the organizer.');
      return;
    }

    setJoining(true);
    setError(null);

    try {
      const isAuthenticated = !!localStorage.getItem('auth_token');
      const requiresAuth = validation?.requiresAuth || meeting?.requiresAuthentication;
      
      // If not logged in and authentication is not required, or if already logged in
      if (!requiresAuth || isAuthenticated) {
        const response = await api.post<{ data: { meetingId?: string } }>(
          '/api/public/meetings/join',
          {},
          {
            params: { token },
            _skipAuthRefresh: true,
          } as any
        );

        // Try to get meetingId from response data or use the one from meeting details
        const meetingId = response.data?.data?.meetingId || meeting?.id;
        
        if (!meetingId) {
          console.error('No meeting ID in response:', response.data);
          throw new Error('Could not determine meeting ID. Please try again or contact support.');
        }

        // Clear any pending token since we're handling it now
        localStorage.removeItem('pendingJoinToken');
        
        // Redirect to meeting details page
        navigate(`/meetings/${meetingId}`, { 
          replace: true,
          state: { 
            fromJoin: true,
            meetingTitle: meeting?.title 
          }
        });
      } else {
        // Store token and set auto-join intent for after login
        localStorage.setItem('pendingJoinToken', token);
        localStorage.setItem('shouldAutoJoin', 'true');

        const currentUrl = window.location.pathname + window.location.search;
        localStorage.setItem('redirectAfterLogin', currentUrl);
        localStorage.setItem('pendingRedirect', currentUrl);

        // Redirect to login preserving join intent
        navigate(`/login?redirect=${encodeURIComponent(currentUrl)}`, { 
          replace: true,
          state: { 
            returnTo: currentUrl,
            message: 'Please log in to join this meeting'
          } 
        });
      }
    } catch (err: any) {
      console.error('[JoinMeeting] Failed to join meeting:', err);
      
      const errorMessage = err.response?.data?.data?.message || 
                         'We could not add you to this meeting right now. Please try again or contact the organizer.';
      
      setError(errorMessage);
    } finally {
      setJoining(false);
    }
}, [meeting, navigate, token, validation]);

  return {
    meeting,
    loading,
    error,
    handleJoin,
    joining,
    validation,
  };
};