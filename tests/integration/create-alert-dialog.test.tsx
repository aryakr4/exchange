import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CreateAlertDialog } from "@/features/alerts/components/create-alert-dialog";
import { interpretAlert } from "@/features/alerts/actions/interpret";

const createAlert = vi.fn();
vi.mock("@/features/alerts/actions/alerts", () => ({
  createAlert: (...args: unknown[]) => createAlert(...args),
}));

vi.mock("@/features/alerts/actions/interpret", () => ({
  interpretAlert: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  createAlert.mockResolvedValue({ success: true });
});

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /new alert/i }));
  return screen.findByRole("dialog");
}

describe("CreateAlertDialog", () => {
  it("opens from the trigger button", async () => {
    const user = userEvent.setup();
    render(<CreateAlertDialog />);

    await openDialog(user);

    expect(
      screen.getByRole("heading", { name: /create alert/i })
    ).toBeInTheDocument();
  });

  it("shows validation errors on empty submit and does not call the action", async () => {
    const user = userEvent.setup();
    render(<CreateAlertDialog />);
    await openDialog(user);

    await user.click(screen.getByRole("button", { name: /create alert/i }));

    expect(await screen.findAllByText("Select a currency")).toHaveLength(2);
    expect(screen.getByText("Select a condition")).toBeInTheDocument();
    expect(
      screen.getByText("Target rate must be greater than 0")
    ).toBeInTheDocument();
    expect(createAlert).not.toHaveBeenCalled();
  });

  it("rejects a non-numeric rate", async () => {
    const user = userEvent.setup();
    render(<CreateAlertDialog />);
    await openDialog(user);

    await user.type(screen.getByLabelText(/target rate/i), "abc");
    await user.click(screen.getByRole("button", { name: /create alert/i }));

    expect(await screen.findByText("Enter a valid rate")).toBeInTheDocument();
    expect(createAlert).not.toHaveBeenCalled();
  });

  it("submits valid input and closes the dialog", async () => {
    const user = userEvent.setup();
    render(<CreateAlertDialog />);
    await openDialog(user);

    await user.click(screen.getByRole("combobox", { name: /from/i }));
    await user.click(await screen.findByRole("option", { name: /US Dollar/i }));

    await user.click(screen.getByRole("combobox", { name: /^to$/i }));
    await user.click(await screen.findByRole("option", { name: /Euro/i }));

    await user.click(
      screen.getByRole("combobox", { name: /notify me when/i })
    );
    await user.click(await screen.findByRole("option", { name: /above/i }));

    await user.type(screen.getByLabelText(/target rate/i), "0.95");
    await user.click(screen.getByRole("button", { name: /create alert/i }));

    await waitFor(() => {
      expect(createAlert).toHaveBeenCalledWith({
        from_currency: "USD",
        to_currency: "EUR",
        condition: "greater_than",
        target_rate: 0.95,
      });
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("surfaces a server error and keeps the dialog open", async () => {
    createAlert.mockResolvedValue({
      success: false,
      error: "Could not create the alert. Try again.",
    });
    const user = userEvent.setup();
    render(<CreateAlertDialog />);
    await openDialog(user);

    await user.click(screen.getByRole("combobox", { name: /from/i }));
    await user.click(await screen.findByRole("option", { name: /US Dollar/i }));
    await user.click(screen.getByRole("combobox", { name: /^to$/i }));
    await user.click(await screen.findByRole("option", { name: /Euro/i }));
    await user.click(
      screen.getByRole("combobox", { name: /notify me when/i })
    );
    await user.click(await screen.findByRole("option", { name: /above/i }));
    await user.type(screen.getByLabelText(/target rate/i), "0.95");

    await user.click(screen.getByRole("button", { name: /create alert/i }));

    await waitFor(() => expect(createAlert).toHaveBeenCalled());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("pre-fills the form from a plain-English description via Claude", async () => {
    const user = userEvent.setup();
    vi.mocked(interpretAlert).mockResolvedValue({
      status: "ok",
      draft: {
        from_currency: "USD",
        to_currency: "INR",
        condition: "greater_than",
        target_rate: 84.6,
      },
      currentRate: 84.1,
      suggested: true,
      summary: "USD → INR, alert when 1 USD buys ≥ 84.6 (currently 84.1)",
    });

    render(<CreateAlertDialog />);
    await user.click(screen.getByRole("button", { name: /new alert/i }));

    await user.type(
      screen.getByLabelText(/describe your alert/i),
      "tell me when my dollars buy more rupees",
    );
    await user.click(screen.getByRole("button", { name: /interpret/i }));

    expect(await screen.findByText(/currently 84\.1/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("84.6")).toBeInTheDocument();
  });

  it("shows a clarification message without pre-filling", async () => {
    const user = userEvent.setup();
    vi.mocked(interpretAlert).mockResolvedValue({
      status: "clarification",
      message: "Pick two different currencies.",
    });

    render(<CreateAlertDialog />);
    await user.click(screen.getByRole("button", { name: /new alert/i }));
    await user.type(screen.getByLabelText(/describe your alert/i), "usd to usd");
    await user.click(screen.getByRole("button", { name: /interpret/i }));

    expect(
      await screen.findByText(/pick two different currencies/i),
    ).toBeInTheDocument();
  });
});
