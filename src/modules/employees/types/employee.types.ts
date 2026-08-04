export type EmployeeStatus = 'ACTIVE' | 'ONBOARDING' | 'OFFBOARDING' | 'TERMINATED' | 'RESIGNED';

export interface EmployeeListItem {
  id: string;
  userId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  department: string;
  designation: string;
  dateOfJoining: string;
  dateOfBirth: string | null;
  status: EmployeeStatus;
  managerId: string | null;
  branchId: string | null;
  teamId: string | null;
}
