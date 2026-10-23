import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((destination: string) => { throw new Error(`redirect:${destination}`); }),
}));

import Home from "@/app/page";
import VoicePage from "@/app/voice/page";

describe("unified interview entry", () => {
  it.each([["home", Home], ["legacy voice", VoicePage]] as const)("redirects %s to live without rendering a legacy interview", (_name, page) => {
    expect(() => page()).toThrow("redirect:/live");
  });
});
