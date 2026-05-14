import { registerAs } from '@nestjs/config';

export default registerAs('intelligence', () => ({
  weights: {
    rating: parseFloat(process.env['SCORE_WEIGHT_RATING'] ?? '0.35'),
    availability: parseFloat(process.env['SCORE_WEIGHT_AVAILABILITY'] ?? '0.25'),
    experience: parseFloat(process.env['SCORE_WEIGHT_EXPERIENCE'] ?? '0.20'),
    load: parseFloat(process.env['SCORE_WEIGHT_LOAD'] ?? '0.10'),
    specialization: parseFloat(process.env['SCORE_WEIGHT_SPECIALIZATION'] ?? '0.10'),
  },
  minDataPoints: parseInt(process.env['INTELLIGENCE_MIN_DATA_POINTS'] ?? '5', 10),
  lookaheadDays: parseInt(process.env['INTELLIGENCE_LOOKAHEAD_DAYS'] ?? '14', 10),
  topSlots: parseInt(process.env['INTELLIGENCE_TOP_SLOTS'] ?? '5', 10),
}));
