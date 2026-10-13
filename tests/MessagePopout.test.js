import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleShowClick, showItem, showMessage } from "../reminders/MessagePopout";

const render = vi.fn();
const popoutClass = vi.fn(function (options) {
    this.options = options;
    this.render = render;
});

beforeEach(() => {
    render.mockReset();
    popoutClass.mockClear();
    game.messages = { get: vi.fn(() => ({ id: "m1" })) };
    globalThis.ui = { notifications: { warn: vi.fn() } };
    globalThis.CONFIG = { ChatMessage: { popoutClass } };
});

describe("showMessage", () => {
    it("opens Foundry's chat popout for the message", async () => {
        expect(await showMessage("m1")).toBe(true);
        expect(popoutClass).toHaveBeenCalledWith({ message: { id: "m1" } });
        expect(render).toHaveBeenCalledWith({ force: true });
    });

    it("warns when the message is deleted", async () => {
        game.messages.get.mockReturnValue(undefined);
        expect(await showMessage("m1")).toBe(false);
        expect(ui.notifications.warn).toHaveBeenCalledWith("PF2e Robin's Reminders: REMINDERS.messageGone");
        expect(popoutClass).not.toHaveBeenCalled();
    });
});

describe("showItem", () => {
    it("opens the item sheet", async () => {
        const sheetRender = vi.fn();
        globalThis.fromUuid = vi.fn(async () => ({ sheet: { render: sheetRender } }));
        expect(await showItem("Actor.a.Item.i")).toBe(true);
        expect(sheetRender).toHaveBeenCalledWith(true);
    });

    it("warns when the item is gone", async () => {
        globalThis.fromUuid = vi.fn(async () => null);
        expect(await showItem("Actor.a.Item.i")).toBe(false);
        expect(ui.notifications.warn).toHaveBeenCalledWith("PF2e Robin's Reminders: REMINDERS.itemGone");
    });
});

describe("handleShowClick", () => {
    it("handles clicks on show links", () => {
        const link = document.createElement("a");
        link.dataset.showMessage = "m1";
        document.body.append(link);
        const event = { target: link, preventDefault: vi.fn() };
        expect(handleShowClick(event)).toBe(true);
        expect(event.preventDefault).toHaveBeenCalled();
        expect(game.messages.get).toHaveBeenCalledWith("m1");
    });

    it("handles clicks on item links", () => {
        globalThis.fromUuid = vi.fn(async () => null);
        const link = document.createElement("a");
        link.dataset.showItem = "Actor.a.Item.i";
        const event = { target: link, preventDefault: vi.fn() };
        expect(handleShowClick(event)).toBe(true);
        expect(fromUuid).toHaveBeenCalledWith("Actor.a.Item.i");
    });

    it("ignores other clicks", () => {
        expect(handleShowClick({ target: document.body, preventDefault: vi.fn() })).toBe(false);
    });
});
