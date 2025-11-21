import { formatRelativeTime } from './date-format.util';

describe('Date Format Utilities', () => {
  describe('formatRelativeTime', () => {
    it('should format seconds correctly', () => {
      const now = new Date();
      const fiveSecondsAgo = new Date(now.getTime() - 5000).toISOString();
      expect(formatRelativeTime(fiveSecondsAgo)).toBe('5s ago');
    });

    it('should format 0 seconds as "0s ago"', () => {
      const now = new Date().toISOString();
      expect(formatRelativeTime(now)).toBe('0s ago');
    });

    it('should format minutes correctly', () => {
      const now = new Date();
      const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000).toISOString();
      expect(formatRelativeTime(twoMinutesAgo)).toBe('2m ago');
    });

    it('should format 59 seconds as seconds, not minutes', () => {
      const now = new Date();
      const fiftyNineSecondsAgo = new Date(now.getTime() - 59 * 1000).toISOString();
      expect(formatRelativeTime(fiftyNineSecondsAgo)).toBe('59s ago');
    });

    it('should format hours correctly', () => {
      const now = new Date();
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(threeHoursAgo)).toBe('3h ago');
    });

    it('should format 59 minutes as minutes, not hours', () => {
      const now = new Date();
      const fiftyNineMinutesAgo = new Date(now.getTime() - 59 * 60 * 1000).toISOString();
      expect(formatRelativeTime(fiftyNineMinutesAgo)).toBe('59m ago');
    });

    it('should format days correctly', () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(twoDaysAgo)).toBe('2d ago');
    });

    it('should format 23 hours as hours, not days', () => {
      const now = new Date();
      const twentyThreeHoursAgo = new Date(now.getTime() - 23 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(twentyThreeHoursAgo)).toBe('23h ago');
    });

    it('should handle large number of days', () => {
      const now = new Date();
      const hundredDaysAgo = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(hundredDaysAgo)).toBe('100d ago');
    });

    it('should handle valid ISO date strings', () => {
      const isoDate = '2024-01-01T12:00:00.000Z';
      const result = formatRelativeTime(isoDate);
      expect(result).toMatch(/^\d+[smhd] ago$/);
    });

    it('should round down to nearest whole number', () => {
      const now = new Date();
      // 90 seconds = 1 minute (rounded down from 1.5)
      const ninetySecondsAgo = new Date(now.getTime() - 90 * 1000).toISOString();
      expect(formatRelativeTime(ninetySecondsAgo)).toBe('1m ago');
    });
  });
});
