import { describe, it, expect, vi } from 'vitest';
import { RoomBookingService } from './roombooking.service.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors/app-error.js';

vi.mock('../audit/audit.service.js', () => ({ auditLogService: { record: vi.fn() } }));

function makeBooking(overrides: Partial<Record<string, unknown>> = {}) {
  return { id: 'book-1', tenantId: 'tenant-1', employeeId: 'emp-1', roomName: 'Falcon', status: 'CONFIRMED', ...overrides };
}

function makeDeps() {
  const repository = {
    create: vi.fn().mockResolvedValue(makeBooking()),
    findById: vi.fn().mockResolvedValue(makeBooking()),
    update: vi.fn().mockImplementation((id, data) => ({ ...makeBooking(), id, ...data })),
    findOverlapping: vi.fn().mockResolvedValue(null),
    findMany: vi.fn(),
  };
  const employeeRepository = { findByUserId: vi.fn().mockResolvedValue({ id: 'emp-1' }) };
  return { repository, employeeRepository };
}

function build(deps: ReturnType<typeof makeDeps>) {
  return new RoomBookingService(deps.repository as never, deps.employeeRepository as never);
}

const slot = { roomName: 'Falcon', startTime: new Date('2026-08-01T10:00:00Z'), endTime: new Date('2026-08-01T11:00:00Z'), purpose: 'Sync' };

describe('RoomBookingService.create', () => {
  it('refuses an overlapping booking for the same room', async () => {
    const deps = makeDeps();
    deps.repository.findOverlapping.mockResolvedValue(makeBooking());
    await expect(build(deps).create('tenant-1', 'user-1', slot, {})).rejects.toThrow(ConflictError);
  });

  it('allows the booking when the room is free', async () => {
    const deps = makeDeps();
    await expect(build(deps).create('tenant-1', 'user-1', slot, {})).resolves.toBeTruthy();
  });
});

describe('RoomBookingService.cancel', () => {
  it('lets the booker cancel their own booking without ROOM_BOOKING_MANAGE', async () => {
    const deps = makeDeps();
    await build(deps).cancel('tenant-1', 'user-1', false, 'book-1', {});
    expect(deps.repository.update).toHaveBeenCalledWith('book-1', { status: 'CANCELLED' });
  });

  it("blocks cancelling someone else's booking without the permission", async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeBooking({ employeeId: 'someone-else' }));
    await expect(build(deps).cancel('tenant-1', 'user-1', false, 'book-1', {})).rejects.toThrow(ForbiddenError);
  });

  it('lets a ROOM_BOOKING_MANAGE holder cancel any booking', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeBooking({ employeeId: 'someone-else' }));
    await expect(build(deps).cancel('tenant-1', 'user-1', true, 'book-1', {})).resolves.toBeTruthy();
  });

  it('refuses to cancel an already-cancelled booking', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeBooking({ status: 'CANCELLED' }));
    await expect(build(deps).cancel('tenant-1', 'user-1', true, 'book-1', {})).rejects.toThrow(ConflictError);
  });

  it('404s a booking from another tenant', async () => {
    const deps = makeDeps();
    deps.repository.findById.mockResolvedValue(makeBooking({ tenantId: 'other' }));
    await expect(build(deps).cancel('tenant-1', 'user-1', true, 'book-1', {})).rejects.toThrow(NotFoundError);
  });
});
