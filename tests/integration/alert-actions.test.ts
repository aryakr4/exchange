import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createAlert,
  deleteAlert,
  toggleAlertActive,
} from "@/features/alerts/actions/alerts";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));

// Mutable per-test fixtures consumed by the supabase mock below.
let currentUser: { id: string } | null = null;
let insertResult: { error: { message: string } | null } = { error: null };
let mutationRow: { id: string } | null = null;

const insertSpy = vi.fn();
const updateSpy = vi.fn();
const deleteSpy = vi.fn();
const eqSpy = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: currentUser } })),
    },
    from: vi.fn(() => ({
      insert: (payload: unknown) => {
        insertSpy(payload);
        return Promise.resolve(insertResult);
      },
      update: (payload: unknown) => {
        updateSpy(payload);
        return mutationChain();
      },
      delete: () => {
        deleteSpy();
        return mutationChain();
      },
    })),
  })),
}));

/** Mimics .eq().eq().select().maybeSingle() on update/delete. */
function mutationChain() {
  const chain = {
    eq: (column: string, value: unknown) => {
      eqSpy(column, value);
      return chain;
    },
    select: () => chain,
    maybeSingle: async () => ({ data: mutationRow, error: null }),
  };
  return chain;
}

const validInput = {
  from_currency: "USD",
  to_currency: "EUR",
  target_rate: 0.95,
  condition: "greater_than",
};

beforeEach(() => {
  vi.clearAllMocks();
  currentUser = { id: "user-123" };
  insertResult = { error: null };
  mutationRow = { id: "alert-1" };
});

describe("createAlert", () => {
  it("creates an alert with user_id taken from the session", async () => {
    const result = await createAlert(validInput);

    expect(result.success).toBe(true);
    expect(insertSpy).toHaveBeenCalledWith({
      user_id: "user-123",
      from_currency: "USD",
      to_currency: "EUR",
      target_rate: 0.95,
      condition: "greater_than",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("rejects unauthenticated callers before touching the database", async () => {
    currentUser = null;

    const result = await createAlert(validInput);

    expect(result).toEqual({
      success: false,
      error: "You must be logged in.",
    });
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("rejects identical currencies server-side", async () => {
    const result = await createAlert({ ...validInput, to_currency: "USD" });

    expect(result.success).toBe(false);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("rejects a non-positive rate server-side", async () => {
    const result = await createAlert({ ...validInput, target_rate: 0 });

    expect(result.success).toBe(false);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("returns a generic error when the insert fails", async () => {
    insertResult = { error: { message: "duplicate key value" } };

    const result = await createAlert(validInput);

    expect(result).toEqual({
      success: false,
      error: "Could not create the alert. Try again.",
    });
    // The raw DB error must not leak to the client.
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("toggleAlertActive", () => {
  const id = "6f9619ff-8b86-4d01-b42d-00cf4fc964ff";

  it("updates active and scopes the mutation to the session user", async () => {
    const result = await toggleAlertActive({ id, active: false });

    expect(result.success).toBe(true);
    expect(updateSpy).toHaveBeenCalledWith({ active: false });
    expect(eqSpy).toHaveBeenCalledWith("id", id);
    expect(eqSpy).toHaveBeenCalledWith("user_id", "user-123");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("reports not-found when no row matches (foreign or missing alert)", async () => {
    mutationRow = null;

    const result = await toggleAlertActive({ id, active: true });

    expect(result).toEqual({ success: false, error: "Alert not found." });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects a malformed id", async () => {
    const result = await toggleAlertActive({ id: "not-a-uuid", active: true });

    expect(result.success).toBe(false);
    expect(updateSpy).not.toHaveBeenCalled();
  });
});

describe("deleteAlert", () => {
  const id = "6f9619ff-8b86-4d01-b42d-00cf4fc964ff";

  it("deletes the alert scoped to the session user", async () => {
    const result = await deleteAlert({ id });

    expect(result.success).toBe(true);
    expect(deleteSpy).toHaveBeenCalled();
    expect(eqSpy).toHaveBeenCalledWith("id", id);
    expect(eqSpy).toHaveBeenCalledWith("user_id", "user-123");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("reports not-found when nothing was deleted", async () => {
    mutationRow = null;

    const result = await deleteAlert({ id });

    expect(result).toEqual({ success: false, error: "Alert not found." });
  });

  it("rejects unauthenticated callers", async () => {
    currentUser = null;

    const result = await deleteAlert({ id });

    expect(result.success).toBe(false);
    expect(deleteSpy).not.toHaveBeenCalled();
  });
});
