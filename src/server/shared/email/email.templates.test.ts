import { describe, it, expect } from 'vitest';
import {
  inviteEmailTemplate,
  companyAdminInviteTemplate,
  passwordResetEmailTemplate,
  welcomeEmailTemplate,
  interviewScheduledEmailTemplate,
  notificationEmailTemplate,
  projectAssignedEmailTemplate,
  taskAssignedEmailTemplate,
  taskReadyForReviewEmailTemplate,
  taskCompletedEmailTemplate,
  taskReopenedEmailTemplate,
  taskOverdueEmailTemplate,
} from './email.templates.js';

/** Every template must produce all three: a non-empty subject, valid-looking HTML, and a plain-text
 * fallback that carries the same essential information (link included, when there is one) —
 * emails are commonly read in text-only clients or previewed as plain text before opening. */
function expectWellFormed(rendered: { subject: string; html: string; text: string }) {
  expect(rendered.subject.length).toBeGreaterThan(0);
  expect(rendered.html).toContain('<!doctype html>');
  expect(rendered.html).toContain('</html>');
  expect(rendered.text.length).toBeGreaterThan(0);
}

describe('inviteEmailTemplate', () => {
  it('is well-formed and includes the invite link in both html and text', () => {
    const rendered = inviteEmailTemplate({ tenantName: 'Acme Inc', role: 'EMPLOYEE', inviteLink: 'https://app.example.com/invite/accept?token=abc', expiresInDays: 7 });
    expectWellFormed(rendered);
    expect(rendered.html).toContain('https://app.example.com/invite/accept?token=abc');
    expect(rendered.text).toContain('https://app.example.com/invite/accept?token=abc');
    expect(rendered.text).toContain('7 days');
  });
});

describe('companyAdminInviteTemplate', () => {
  it('is well-formed and includes the invite link, company name, and expiry window', () => {
    const rendered = companyAdminInviteTemplate({
      tenantName: 'Acme Inc',
      inviteLink: 'https://app.example.com/invite/accept?token=abc',
      expiresInDays: 7,
    });
    expectWellFormed(rendered);
    expect(rendered.subject).toContain('Acme Inc');
    expect(rendered.html).toContain('https://app.example.com/invite/accept?token=abc');
    expect(rendered.text).toContain('https://app.example.com/invite/accept?token=abc');
    expect(rendered.text).toContain('7 days');
  });
});

describe('passwordResetEmailTemplate', () => {
  it('is well-formed and includes the reset link and expiry window', () => {
    const rendered = passwordResetEmailTemplate({ resetLink: 'https://app.example.com/reset-password?token=xyz', validForMinutes: 60 });
    expectWellFormed(rendered);
    expect(rendered.html).toContain('https://app.example.com/reset-password?token=xyz');
    expect(rendered.text).toContain('60 minutes');
  });
});

describe('welcomeEmailTemplate', () => {
  it('is well-formed and greets the employee by name', () => {
    const rendered = welcomeEmailTemplate({ firstName: 'Ada', tenantName: 'Acme Inc', loginLink: 'https://app.example.com/login' });
    expectWellFormed(rendered);
    expect(rendered.html).toContain('Ada');
    expect(rendered.text).toContain('https://app.example.com/login');
  });
});

describe('interviewScheduledEmailTemplate', () => {
  it('is well-formed and includes the candidate name, job title, and schedule', () => {
    const rendered = interviewScheduledEmailTemplate({
      candidateName: 'Sam Candidate',
      jobTitle: 'Software Engineer',
      tenantName: 'Acme Inc',
      scheduledAt: new Date('2026-08-10T10:00:00Z'),
      mode: 'VIDEO',
    });
    expectWellFormed(rendered);
    expect(rendered.html).toContain('Sam Candidate');
    expect(rendered.html).toContain('Software Engineer');
    expect(rendered.text).toContain('VIDEO');
  });

  it('includes the location when given, on top of the mode', () => {
    const rendered = interviewScheduledEmailTemplate({
      candidateName: 'Sam Candidate',
      jobTitle: 'Software Engineer',
      tenantName: 'Acme Inc',
      scheduledAt: new Date('2026-08-10T10:00:00Z'),
      mode: 'ONSITE',
      location: '221B Baker Street',
    });
    expect(rendered.text).toContain('221B Baker Street');
  });
});

describe('notificationEmailTemplate', () => {
  it('is well-formed and reuses the notification title/body as-is', () => {
    const rendered = notificationEmailTemplate({ title: 'Leave approved', body: 'Enjoy your time off.', link: '/leave', appUrl: 'https://app.example.com' });
    expectWellFormed(rendered);
    expect(rendered.subject).toBe('Leave approved');
    expect(rendered.html).toContain('Enjoy your time off.');
    expect(rendered.text).toContain('https://app.example.com/leave');
  });

  it('omits the CTA/link section entirely when no link is given', () => {
    const rendered = notificationEmailTemplate({ title: 'FYI', body: 'Just a heads up.', appUrl: 'https://app.example.com' });
    expect(rendered.text).not.toContain('https://app.example.com');
  });
});

describe('projectAssignedEmailTemplate', () => {
  it('is well-formed and names the project and the manager who assigned it', () => {
    const rendered = projectAssignedEmailTemplate({
      employeeName: 'Ada',
      projectName: 'Website Relaunch',
      managerName: 'Grace Manager',
      projectLink: '/projects/proj-1',
      appUrl: 'https://app.example.com',
    });
    expectWellFormed(rendered);
    expect(rendered.text).toContain('Website Relaunch');
    expect(rendered.text).toContain('Grace Manager');
    expect(rendered.text).toContain('https://app.example.com/projects/proj-1');
  });
});

describe('taskAssignedEmailTemplate', () => {
  it('includes task, project, priority, and due date', () => {
    const rendered = taskAssignedEmailTemplate({
      employeeName: 'Ada',
      taskTitle: 'Design homepage',
      projectName: 'Website Relaunch',
      priority: 'HIGH',
      dueDate: new Date('2026-09-01'),
      taskLink: '/projects/proj-1',
      appUrl: 'https://app.example.com',
    });
    expectWellFormed(rendered);
    expect(rendered.html).toContain('Design homepage');
    expect(rendered.html).toContain('Website Relaunch');
    expect(rendered.html).toContain('HIGH');
    expect(rendered.text).toContain('https://app.example.com/projects/proj-1');
  });

  it('shows "Not set" for a task with no due date, rather than an invalid date string', () => {
    const rendered = taskAssignedEmailTemplate({
      employeeName: 'Ada',
      taskTitle: 'Design homepage',
      projectName: 'Website Relaunch',
      priority: 'LOW',
      dueDate: null,
      taskLink: '/projects/proj-1',
      appUrl: 'https://app.example.com',
    });
    expect(rendered.text).toContain('Not set');
  });
});

describe('taskReadyForReviewEmailTemplate', () => {
  it('names the employee who submitted the task for review', () => {
    const rendered = taskReadyForReviewEmailTemplate({
      managerName: 'Grace',
      employeeName: 'Ada Lovelace',
      taskTitle: 'Design homepage',
      projectName: 'Website Relaunch',
      taskLink: '/projects/proj-1',
      appUrl: 'https://app.example.com',
    });
    expectWellFormed(rendered);
    expect(rendered.text).toContain('Ada Lovelace');
    expect(rendered.text).toContain('Design homepage');
  });
});

describe('taskCompletedEmailTemplate', () => {
  it('is well-formed and names the completed task', () => {
    const rendered = taskCompletedEmailTemplate({
      employeeName: 'Ada',
      taskTitle: 'Design homepage',
      projectName: 'Website Relaunch',
      taskLink: '/projects/proj-1',
      appUrl: 'https://app.example.com',
    });
    expectWellFormed(rendered);
    expect(rendered.text).toContain('Design homepage');
  });
});

describe('taskReopenedEmailTemplate', () => {
  it('is well-formed and names the reopened task', () => {
    const rendered = taskReopenedEmailTemplate({
      recipientName: 'Ada',
      taskTitle: 'Design homepage',
      projectName: 'Website Relaunch',
      taskLink: '/projects/proj-1',
      appUrl: 'https://app.example.com',
    });
    expectWellFormed(rendered);
    expect(rendered.text).toContain('Design homepage');
  });
});

describe('taskOverdueEmailTemplate', () => {
  it('includes the original due date', () => {
    const rendered = taskOverdueEmailTemplate({
      recipientName: 'Ada',
      taskTitle: 'Design homepage',
      projectName: 'Website Relaunch',
      dueDate: new Date('2026-08-01'),
      taskLink: '/projects/proj-1',
      appUrl: 'https://app.example.com',
    });
    expectWellFormed(rendered);
    expect(rendered.text).toContain('Design homepage');
    expect(rendered.text).toContain('2026');
  });
});
