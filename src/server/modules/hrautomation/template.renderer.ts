/**
 * Pure variable substitution — no I/O, so the fill logic is directly unit-testable. Used both
 * for LETTER_* bodies (`{{variable}}` inside free text) and POSTER_* layout fields (each field's
 * `variableKey` resolves to one value placed at its x/y position).
 */

export interface TemplateVariables {
  [key: string]: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  department: string;
  designation: string;
  dateOfJoining: string;
  companyName: string;
  today: string;
}

const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/** Replaces every `{{key}}` in the body with the matching variable; an unknown key is left as-is rather than silently dropped, so a typo is visible in the output. */
export function renderBody(bodyTemplate: string, variables: TemplateVariables): string {
  return bodyTemplate.replace(VARIABLE_PATTERN, (match, key: string) => {
    const value = variables[key];
    return value !== undefined ? value : match;
  });
}

export function resolveField(variableKey: string, variables: TemplateVariables): string {
  return variables[variableKey] ?? '';
}

export function buildVariables(
  employee: { firstName: string; lastName: string; employeeId: string; department: string; designation: string; dateOfJoining: Date },
  companyName: string,
  now: Date = new Date(),
): TemplateVariables {
  return {
    firstName: employee.firstName,
    lastName: employee.lastName,
    employeeId: employee.employeeId,
    department: employee.department,
    designation: employee.designation,
    dateOfJoining: employee.dateOfJoining.toISOString().slice(0, 10),
    companyName,
    today: now.toISOString().slice(0, 10),
  };
}
