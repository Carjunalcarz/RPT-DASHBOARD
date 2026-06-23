import { adminTable, describeError } from "./supabase";

export interface PendingUser {
  id: string;
  username: string;
  email: string;
  created_at: string;
  is_confirmed: boolean;
}

// Fetch all pending users
export const fetchPendingUsers = async (): Promise<PendingUser[]> => {
  const tbl = adminTable("pending_users");
  if (!tbl) {
    console.error("Supabase is not configured");
    return [];
  }

  try {
    const { data, error } = await tbl
      .select("id, username, email, created_at, is_confirmed")
      .eq("is_confirmed", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching pending users:", describeError(error));
      return [];
    }
    return data || [];
  } catch (error) {
    console.error("Error fetching pending users:", describeError(error));
    return [];
  }
};

// Create a pending user registration
export const createPendingUser = async (
  username: string,
  email: string,
  authUserId?: string,
): Promise<{ success: boolean; error?: string; userId?: string }> => {
  const tbl = adminTable("pending_users");
  if (!tbl) return { success: false, error: "Supabase is not configured" };

  try {
    const { error } = await tbl.insert({
      ...(authUserId ? { id: authUserId } : {}),
      username,
      email: email.toLowerCase().trim(),
      is_confirmed: false,
      created_at: new Date().toISOString(),
    });

    if (error) return { success: false, error: describeError(error) };
    return { success: true };
  } catch (error) {
    return { success: false, error: describeError(error) };
  }
};

// Confirm a pending user (set is_confirmed to true)
export const confirmPendingUser = async (
  userId: string,
): Promise<{ success: boolean; error?: string }> => {
  const lookup = adminTable("pending_users");
  if (!lookup) return { success: false, error: "Supabase is not configured" };

  try {
    const { data: pendingUser, error: fetchError } = await lookup
      .select("*")
      .eq("id", userId)
      .single();

    if (fetchError || !pendingUser) {
      return { success: false, error: "Pending user not found" };
    }

    const upd = adminTable("pending_users");
    if (!upd) return { success: false, error: "Supabase is not configured" };
    const { error: updateError } = await upd
      .update({ is_confirmed: true })
      .eq("id", userId);

    if (updateError) {
      return { success: false, error: describeError(updateError) };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: describeError(error) };
  }
};

// Reject a pending user (delete from pending_users)
export const rejectPendingUser = async (
  userId: string,
): Promise<{ success: boolean; error?: string }> => {
  const tbl = adminTable("pending_users");
  if (!tbl) return { success: false, error: "Supabase is not configured" };

  try {
    const { error } = await tbl.delete().eq("id", userId);
    if (error) return { success: false, error: describeError(error) };
    return { success: true };
  } catch (error) {
    return { success: false, error: describeError(error) };
  }
};

// Check if a user is confirmed
export const isPendingUserConfirmed = async (
  email: string,
): Promise<boolean> => {
  const tbl = adminTable("pending_users");
  if (!tbl) {
    // No Supabase = no gate. Same as before — let login proceed.
    return true;
  }

  try {
    const { data, error } = await tbl
      .select("is_confirmed")
      .eq("email", email.toLowerCase().trim());

    if (error || !data || data.length === 0) {
      // User not found in pending_users — either not registered or already confirmed.
      return true;
    }

    return data[0]?.is_confirmed || false;
  } catch (error) {
    console.error("Error checking user confirmation:", describeError(error));
    return true;
  }
};
