import { paginate, PaginationDto } from './pagination.dto';

describe('paginate()', () => {
  it('should return correct pagination metadata', () => {
    const dto: PaginationDto = { page: 1, limit: 3 };
    const result = paginate([1, 2, 3], 10, dto);

    expect(result.data).toEqual([1, 2, 3]);
    expect(result.total).toBe(10);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(3);
    expect(result.totalPages).toBe(4);
  });

  it('should handle empty data set', () => {
    const dto: PaginationDto = { page: 1, limit: 20 };
    const result = paginate([], 0, dto);

    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  it('should use defaults when page/limit are undefined', () => {
    const dto: PaginationDto = {};
    const result = paginate([1], 1, dto);

    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.totalPages).toBe(1);
  });

  it('should calculate totalPages correctly for exact multiples', () => {
    const dto: PaginationDto = { page: 2, limit: 5 };
    const result = paginate([], 10, dto);

    expect(result.totalPages).toBe(2);
  });

  it('should round up totalPages for non-exact division', () => {
    const dto: PaginationDto = { page: 1, limit: 7 };
    const result = paginate([], 15, dto);

    expect(result.totalPages).toBe(3);
  });
});
