import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';

function makeMockHost(method = 'GET', url = '/test'): ArgumentsHost {
  const mockJson = jest.fn();
  const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
  const mockResponse = { status: mockStatus };
  const mockRequest = { url, method };

  return {
    switchToHttp: () => ({
      getResponse: () => mockResponse,
      getRequest: () => mockRequest,
    }),
  } as unknown as ArgumentsHost;
}

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
  });

  it('should format HTTP 400 exception correctly', () => {
    const host = makeMockHost('POST', '/api/v1/auth/login');
    const exception = new HttpException({ message: 'Bad request data' }, HttpStatus.BAD_REQUEST);

    filter.catch(exception, host);

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<{ status: jest.Mock; json?: jest.Mock }>();
    expect(response.status).toHaveBeenCalledWith(400);

    const jsonCall = (response.status as jest.Mock).mock.results[0].value as { json: jest.Mock };
    const body = jsonCall.json.mock.calls[0][0] as Record<string, unknown>;

    expect(body.statusCode).toBe(400);
    expect(body.path).toBe('/api/v1/auth/login');
    expect(body.method).toBe('POST');
    expect(typeof body.timestamp).toBe('string');
    expect(body.message).toBe('Bad request data');
  });

  it('should return 500 for non-HTTP exceptions', () => {
    const host = makeMockHost();
    const exception = new Error('Something blew up');

    filter.catch(exception, host);

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<{ status: jest.Mock }>();
    expect(response.status).toHaveBeenCalledWith(500);

    const jsonCall = (response.status as jest.Mock).mock.results[0].value as { json: jest.Mock };
    const body = jsonCall.json.mock.calls[0][0] as Record<string, unknown>;
    expect(body.statusCode).toBe(500);
  });

  it('should produce a valid ISO timestamp', () => {
    const host = makeMockHost();
    const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);

    filter.catch(exception, host);

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<{ status: jest.Mock }>();
    const jsonCall = (response.status as jest.Mock).mock.results[0].value as { json: jest.Mock };
    const body = jsonCall.json.mock.calls[0][0] as Record<string, unknown>;

    expect(() => new Date(body.timestamp as string)).not.toThrow();
    expect(new Date(body.timestamp as string).toISOString()).toBe(body.timestamp);
  });
});
