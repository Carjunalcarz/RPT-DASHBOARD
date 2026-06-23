import { describe, it, expect } from 'vitest';
import { filterMembersByMainClass, ClassMember } from './classFilter';

describe('filterMembersByMainClass', () => {
  const mockMembers: ClassMember[] = [
    { Code: 'A1', MainClass: 'A', Description: 'Member A1' },
    { Code: 'A2', MainClass: 'A', Description: 'Member A2' },
    { Code: 'B1', MainClass: 'B', Description: 'Member B1' },
    { Code: 'A3', MainClass: 'OTHER', InheritedFrom: 'A', Description: 'Inherited A3' },
    { Code: 'A4', MainClass: 'OTHER', ParentClass: 'A', Description: 'Nested A4' },
  ];

  it('should filter members associated exclusively with the selected main class', () => {
    const result = filterMembersByMainClass(mockMembers, 'B');
    expect(result.members).toHaveLength(1);
    expect(result.members[0].Code).toBe('B1');
    expect(result.error).toBeUndefined();
  });

  it('should handle inheritance and nested classes edge cases', () => {
    const result = filterMembersByMainClass(mockMembers, 'A');
    expect(result.members).toHaveLength(4);
    const codes = result.members.map(m => m.Code);
    expect(codes).toContain('A1'); // Direct
    expect(codes).toContain('A2'); // Direct
    expect(codes).toContain('A3'); // Inherited edge case
    expect(codes).toContain('A4'); // Nested edge case
  });

  it('should return an error when main class has no members', () => {
    const result = filterMembersByMainClass(mockMembers, 'C');
    expect(result.members).toHaveLength(0);
    expect(result.error).toBe('The selected main class has no members.');
  });

  it('should return an error for invalid selection', () => {
    const result = filterMembersByMainClass(mockMembers, '');
    expect(result.members).toHaveLength(0);
    expect(result.error).toBe('Invalid selection or no main class selected.');
    
    const resultNull = filterMembersByMainClass(mockMembers, null);
    expect(resultNull.members).toHaveLength(0);
    expect(resultNull.error).toBe('Invalid selection or no main class selected.');
  });

  it('should return an error if empty member list is provided', () => {
    const result = filterMembersByMainClass([], 'A');
    expect(result.members).toHaveLength(0);
    expect(result.error).toBe('No members available to filter.');
  });
});
