import { track } from '@vercel/analytics'

/**
 * Custom Analytics Helper
 * Centralized tracking for custom events in the application
 */

export const analytics = {
  /**
   * Track authentication sign in event
   * @param email User email
   * @param success Whether sign in was successful
   */
  signIn: (email: string, success: boolean) => {
    track('user_sign_in', {
      email: email.split('@')[1], // Track domain only for privacy
      success,
      timestamp: new Date().toISOString(),
    })
  },

  /**
   * Track authentication sign out event
   */
  signOut: () => {
    track('user_sign_out', {
      timestamp: new Date().toISOString(),
    })
  },

  /**
   * Track sign in failure
   * @param email User email
   * @param errorMessage Error message
   */
  signInFailed: (email: string, errorMessage: string) => {
    track('user_sign_in_failed', {
      email: email.split('@')[1], // Track domain only for privacy
      errorType: errorMessage.split(':')[0], // Extract error type
      timestamp: new Date().toISOString(),
    })
  },

  /**
   * Track attendance form submission
   * @param data Attendance submission data
   */
  submitAttendance: (data: {
    status: string
    formId: string
    formTitle: string
    isNewParticipant: boolean
    kelompok?: string | null
    kategori?: string | null
    participantCount: number
  }) => {
    track('attendance_submitted', {
      status: data.status,
      formId: data.formId,
      formTitle: data.formTitle,
      isNewParticipant: data.isNewParticipant,
      kelompok: data.kelompok,
      kategori: data.kategori,
      participantCount: data.participantCount,
      timestamp: new Date().toISOString(),
    })
  },

  /**
   * Track attendance submission failure
   * @param error Error message
   * @param status Attendance status that failed
   * @param formTitle Title of the form
   */
  submitAttendanceFailed: (
    error: string,
    status: string,
    formTitle: string
  ) => {
    track('attendance_submission_failed', {
      error: error.substring(0, 100), // Truncate for privacy
      status,
      formTitle,
      timestamp: new Date().toISOString(),
    })
  },
}
