import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchUsdQuotes } from "@/lib/exchange-rates/client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const successBody = {
  success: true,
  timestamp: 1_780_000_000,
  source: "USD",
  quotes: { USDEUR: 0.92, USDGBP: 0.79 },
};

describe("fetchUsdQuotes", () => {
  beforeEach(() => {
    vi.useFakeTimers(); // makes retry backoff instant
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("normalizes USDXXX keys and returns the market timestamp", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(successBody));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchUsdQuotes(["EUR", "GBP"]);

    expect(result.quotes).toEqual({ EUR: 0.92, GBP: 0.79 });
    expect(result.fetchedAt).toEqual(new Date(1_780_000_000 * 1000));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get("source")).toBe("USD");
    expect(url.searchParams.get("currencies")).toBe("EUR,GBP");
  });

  it("deduplicates currencies and drops USD from the request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(successBody));
    vi.stubGlobal("fetch", fetchMock);

    await fetchUsdQuotes(["EUR", "USD", "EUR", "GBP"]);

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get("currencies")).toBe("EUR,GBP");
  });

  it("retries on HTTP 500 and succeeds on a later attempt", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 500))
      .mockResolvedValueOnce(jsonResponse(successBody));
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchUsdQuotes(["EUR"]);
    await vi.runAllTimersAsync(); // flush the backoff sleep
    const result = await promise;

    expect(result.quotes.EUR).toBe(0.92);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after the maximum number of attempts", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, 503));
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchUsdQuotes(["EUR"]);
    const assertion = expect(promise).rejects.toThrow("HTTP 503");
    await vi.runAllTimersAsync();
    await assertion;

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does NOT retry API-level errors (e.g. quota exhausted)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        success: false,
        error: { code: 104, info: "monthly quota reached" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchUsdQuotes(["EUR"])).rejects.toThrow(
      "API error 104: monthly quota reached"
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a malformed response shape without retrying", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ totally: "unexpected" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchUsdQuotes(["EUR"])).rejects.toThrow(
      "Unexpected response shape"
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries network failures", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(jsonResponse(successBody));
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchUsdQuotes(["EUR"]);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.quotes.EUR).toBe(0.92);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
