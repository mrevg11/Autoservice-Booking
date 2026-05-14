import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';
import { User } from '../../database/entities/user.entity';

function makeContext(role?: Role): ExecutionContext {
  const user = role ? ({ role } as Partial<User> as User) : undefined;
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should return true when no @Roles() decorator is present', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = makeContext(Role.CLIENT);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should return true when user has the required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    const ctx = makeContext(Role.ADMIN);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should return false when user has a different role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    const ctx = makeContext(Role.CLIENT);
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('should return false when user is absent', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([ROLES_KEY, [Role.MASTER]]);
    const ctx = makeContext(undefined);
    expect(guard.canActivate(ctx)).toBe(false);
  });
});
