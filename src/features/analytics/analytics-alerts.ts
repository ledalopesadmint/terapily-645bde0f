/**
 * Analytics alert thresholds — configurable limits for the admin dashboard.
 */

export const ANALYTICS_ALERT_THRESHOLDS = {
  /** Daily error count above which an alert is shown */
  errorCountThreshold: 10,
  /** Error rate % (errors / total events) above which an alert fires */
  errorRateThreshold: 5,
  /** Number of distinct pages with errors to trigger alert */
  failedPagesThreshold: 3,
  /** Minimum consecutive days of errors to flag "recurrent" */
  recurrentErrorDays: 3,
} as const;

export type AlertLevel = "warning" | "critical";

export interface AnalyticsAlert {
  id: string;
  level: AlertLevel;
  title: string;
  description: string;
}
