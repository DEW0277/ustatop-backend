import { describe, expect, it } from 'vitest';
import { changePasswordSchema } from './change-password';

const issuesOf = (values: Record<string, string>) => {
  const result = changePasswordSchema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.path[0]);
};

describe('changePasswordSchema', () => {
  it("to'g'ri qiymatlarni qabul qiladi", () => {
    expect(issuesOf({ currentPassword: 'eski', newPassword: 'yangi-parol-12', confirmPassword: 'yangi-parol-12' })).toEqual([]);
  });

  it("12 belgidan qisqa yangi parol va mos kelmagan tasdiqni rad etadi", () => {
    expect(issuesOf({ currentPassword: 'eski', newPassword: 'qisqa', confirmPassword: 'qisqa' })).toContain('newPassword');
    expect(
      issuesOf({ currentPassword: 'eski', newPassword: 'yangi-parol-12', confirmPassword: 'yangi-parol-13' }),
    ).toEqual(['confirmPassword']);
  });

  it("yangi parol joriysi bilan bir xil bo'lsa rad etadi", () => {
    const same = 'bir-xil-parol-1';
    expect(issuesOf({ currentPassword: same, newPassword: same, confirmPassword: same })).toEqual(['newPassword']);
  });
});
