export interface ClassMember {
  Code: string;
  MainClass: string;
  // Support for requested edge cases
  ParentClass?: string; 
  InheritedFrom?: string;
  [key: string]: any;
}

export interface FilterResult<T> {
  members: T[];
  error?: string;
}

/**
 * Dynamically filters members that belong specifically to the selected main class.
 * Handles edge cases like inheritance, nested classes, and empty member lists.
 */
export function filterMembersByMainClass<T extends ClassMember>(
  allMembers: T[],
  selectedMainClass: string | null | undefined
): FilterResult<T> {
  // Error handling: invalid selection
  if (!selectedMainClass || selectedMainClass.trim() === '') {
    return { members: [], error: 'Invalid selection or no main class selected.' };
  }

  // Error handling: empty member list edge case
  if (!allMembers || allMembers.length === 0) {
    return { members: [], error: 'No members available to filter.' };
  }

  const filtered = allMembers.filter(member => {
    // Trim values to avoid mismatch due to MSSQL CHAR trailing spaces
    const memMainClass = member.MainClass?.trim();
    const memInherited = member.InheritedFrom?.trim();
    const memParent = member.ParentClass?.trim();
    const target = selectedMainClass.trim();

    // 1. Direct membership logic
    if (memMainClass === target) {
      return true;
    }
    
    // 2. Inheritance edge case logic
    if (memInherited === target) {
      return true;
    }

    // 3. Nested class edge case logic
    if (memParent === target) {
      return true;
    }

    return false;
  });

  // Error handling: main class has no members
  if (filtered.length === 0) {
    return { members: [], error: 'The selected main class has no members.' };
  }

  return { members: filtered };
}
