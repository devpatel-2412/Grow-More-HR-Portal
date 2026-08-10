import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const handlers = {
  loginSuccess: http.post('/api/v1/auth/login', () =>
    HttpResponse.json({
      data: { requiresTwoFactor: false, accessToken: 'fake-access-token', user: { id: 'u1', email: 'admin@acme.com', role: 'ADMIN', status: 'ACTIVE', permissions: [] } },
    }),
  ),
  loginRequires2FA: http.post('/api/v1/auth/login', () =>
    HttpResponse.json({ data: { requiresTwoFactor: true, challengeToken: 'challenge-token-123' } }),
  ),
  loginInvalidCredentials: http.post('/api/v1/auth/login', () =>
    HttpResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } }, { status: 401 }),
  ),
  meUnauthenticated: http.get('/api/v1/auth/me', () =>
    HttpResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Access token required' } }, { status: 401 }),
  ),
  meSuccess: http.get('/api/v1/auth/me', () =>
    HttpResponse.json({
      data: {
        user: { id: 'u1', email: 'admin@acme.com', role: 'ADMIN', status: 'ACTIVE', permissions: [] },
        profile: null,
        tenant: { id: 't1', name: 'Acme Inc', domain: 'acme', logoUrl: null, primaryColor: '#16a34a', secondaryColor: '#0ea5e9' },
      },
    }),
  ),
  refreshFails: http.post('/api/v1/auth/refresh', () =>
    HttpResponse.json({ error: { code: 'UNAUTHORIZED', message: 'No session cookie present' } }, { status: 401 }),
  ),
  invitableRolesSuccess: http.get('/api/v1/users/invitable-roles', () =>
    HttpResponse.json({ data: { roles: ['ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'] } }),
  ),
  invitableRolesEmpty: http.get('/api/v1/users/invitable-roles', () => HttpResponse.json({ data: { roles: [] } })),
  inviteUserSuccess: http.post('/api/v1/users/invite', () =>
    HttpResponse.json({ data: { id: 'u2', email: 'new@acme.com', role: 'EMPLOYEE', status: 'PENDING_INVITE' } }, { status: 201 }),
  ),
  inviteUserConflict: http.post('/api/v1/users/invite', () =>
    HttpResponse.json({ error: { code: 'CONFLICT', message: 'An account with this email already exists' } }, { status: 409 }),
  ),
  acceptInviteSuccess: http.post('/api/v1/users/invite/accept', () =>
    HttpResponse.json({ data: { id: 'u2', email: 'new@acme.com', status: 'ACTIVE' } }),
  ),
  acceptInviteInvalidToken: http.post('/api/v1/users/invite/accept', () =>
    HttpResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired invite' } }, { status: 401 }),
  ),
  attendanceTodayNotPunchedIn: http.get('/api/v1/attendance/today', () => HttpResponse.json({ data: null })),
  attendanceTodayPunchedIn: http.get('/api/v1/attendance/today', () =>
    HttpResponse.json({
      data: {
        id: 'att-1',
        employeeId: 'emp-1',
        date: '2026-01-01T00:00:00.000Z',
        checkIn: '2026-01-01T09:30:00.000Z',
        checkOut: null,
        status: 'PRESENT',
        lateMinutes: 0,
        overBreakMinutes: 0,
        requiredLogoutTime: '2026-01-01T18:30:00.000Z',
        gpsCoordinates: null,
        deviceType: 'web',
        breaks: [],
        onBreak: false,
        liveRequiredLogoutTime: '2099-01-01T18:30:00.000Z',
        liveOverBreakMinutes: 0,
      },
    }),
  ),
  attendancePunchInSuccess: http.post('/api/v1/attendance/punch-in', () =>
    HttpResponse.json(
      {
        data: {
          id: 'att-1',
          employeeId: 'emp-1',
          date: '2026-01-01T00:00:00.000Z',
          checkIn: '2026-01-01T09:30:00.000Z',
          checkOut: null,
          status: 'PRESENT',
          lateMinutes: 0,
          overBreakMinutes: 0,
          requiredLogoutTime: '2026-01-01T18:30:00.000Z',
          breaks: [],
        },
      },
      { status: 201 },
    ),
  ),
  regularizationRequestSuccess: http.post('/api/v1/attendance/regularization', () =>
    HttpResponse.json(
      {
        data: {
          id: 'reg-1',
          employeeId: 'emp-1',
          date: '2026-01-05T00:00:00.000Z',
          requestedCheckIn: '2026-01-05T09:30:00.000Z',
          requestedCheckOut: null,
          reason: 'Forgot to punch in',
          status: 'PENDING',
          reviewedById: null,
          reviewedAt: null,
          createdAt: '2026-01-05T10:00:00.000Z',
        },
      },
      { status: 201 },
    ),
  ),
  leaveSubmitSuccess: http.post('/api/v1/leave', () =>
    HttpResponse.json(
      {
        data: {
          id: 'leave-1',
          employeeId: 'emp-1',
          leaveType: 'CASUAL',
          startDate: '2026-02-10T00:00:00.000Z',
          endDate: '2026-02-11T00:00:00.000Z',
          isHalfDay: false,
          totalDays: 2,
          reason: 'Trip',
          status: 'PENDING_MANAGER',
          managerId: 'mgr-1',
          managerApprovedById: null,
          managerReviewedAt: null,
          hrApprovedById: null,
          hrReviewedAt: null,
          createdAt: '2026-02-01T00:00:00.000Z',
        },
      },
      { status: 201 },
    ),
  ),
  leaveSubmitConflict: http.post('/api/v1/leave', () =>
    HttpResponse.json(
      { error: { code: 'CONFLICT', message: 'You already have a leave request covering part of this date range' } },
      { status: 409 },
    ),
  ),
  projectCreateSuccess: http.post('/api/v1/projects', () =>
    HttpResponse.json(
      {
        data: {
          id: 'proj-1',
          name: 'Website Relaunch',
          description: null,
          startDate: '2026-03-01T00:00:00.000Z',
          endDate: null,
          status: 'PLANNING',
        },
      },
      { status: 201 },
    ),
  ),
  employeesEmptyList: http.get('/api/v1/employees', () =>
    HttpResponse.json({ data: [], meta: { page: 1, limit: 100, total: 0, totalPages: 1 } }),
  ),
  taskUpdateStatusSuccess: http.patch('/api/v1/tasks/:id', () =>
    HttpResponse.json({ data: { id: 'task-1', status: 'IN_PROGRESS' } }),
  ),
  tasksEmptyList: http.get('/api/v1/tasks', () =>
    HttpResponse.json({ data: [], meta: { page: 1, limit: 100, total: 0, totalPages: 1 } }),
  ),
  workReportSubmitSuccess: http.post('/api/v1/work-reports', () =>
    HttpResponse.json(
      {
        data: {
          id: 'wr-1',
          tenantId: 'tenant-1',
          employeeId: 'emp-1',
          date: '2026-07-29',
          completedTasks: ['Shipped the login page'],
          pendingTasks: [],
          tomorrowPlan: [],
          issues: null,
          timeSpentMinutes: 480,
          status: 'PENDING',
          reviewedById: null,
          reviewedAt: null,
          reviewNote: null,
          createdAt: '2026-07-29T10:00:00.000Z',
        },
      },
      { status: 201 },
    ),
  ),
  workReportSubmitConflict: http.post('/api/v1/work-reports', () =>
    HttpResponse.json(
      { error: { code: 'CONFLICT', message: 'You have already submitted a work report for this date' } },
      { status: 409 },
    ),
  ),
  timerNotRunning: http.get('/api/v1/time-logs/timer/running', () => HttpResponse.json({ data: null })),
  timerRunning: http.get('/api/v1/time-logs/timer/running', () =>
    HttpResponse.json({
      data: {
        id: 'tl-1',
        tenantId: 'tenant-1',
        employeeId: 'emp-1',
        taskId: null,
        description: 'Deep work',
        startedAt: new Date(Date.now() - 90000).toISOString(),
        endedAt: null,
        durationMinutes: 0,
        source: 'TIMER',
        createdAt: new Date().toISOString(),
      },
    }),
  ),
  timerStartConflict: http.post('/api/v1/time-logs/timer/start', () =>
    HttpResponse.json(
      { error: { code: 'CONFLICT', message: 'You already have a running timer — stop it before starting another' } },
      { status: 409 },
    ),
  ),
  financeCreateSuccess: http.post('/api/v1/finance', () =>
    HttpResponse.json(
      {
        data: {
          id: 'fin-1',
          tenantId: 'tenant-1',
          type: 'INVOICE',
          number: 'INV-2026-0001',
          issueDate: '2026-07-29T00:00:00.000Z',
          dueDate: null,
          currency: 'USD',
          subtotal: 500,
          taxRate: 0,
          taxAmount: 0,
          totalAmount: 500,
          amountPaid: 0,
          notes: null,
          status: 'DRAFT',
          projectId: null,
          createdAt: '2026-07-29T10:00:00.000Z',
        },
      },
      { status: 201 },
    ),
  ),
  ticketCreateSuccess: http.post('/api/v1/tickets', () =>
    HttpResponse.json(
      {
        data: {
          id: 'tick-1',
          tenantId: 'tenant-1',
          employeeId: 'emp-1',
          category: 'IT',
          subject: 'Laptop wont boot',
          description: 'Blue screen on startup',
          status: 'OPEN',
          assignedToId: null,
          createdAt: '2026-07-29T10:00:00.000Z',
        },
      },
      { status: 201 },
    ),
  ),
  announcementPublishSuccess: http.post('/api/v1/announcements', () =>
    HttpResponse.json(
      {
        data: {
          id: 'ann-1',
          tenantId: 'tenant-1',
          title: 'Office closed Friday',
          body: 'Enjoy the long weekend',
          audience: 'ALL',
          department: null,
          publishedById: 'emp-1',
          expiresAt: null,
          createdAt: '2026-07-29T10:00:00.000Z',
        },
      },
      { status: 201 },
    ),
  ),
};

export const server = setupServer(handlers.meUnauthenticated, handlers.refreshFails, handlers.invitableRolesSuccess);
