import { describe, it, expect, vi, beforeEach } from "vitest";
import RemindersManager from "../reminders/RemindersManager";
import { makeDoc, renderWindow } from "./helpers";
import { pickTrigger } from "../reminders/TriggerPicker";

vi.mock("../reminders/TriggerPicker", () => ({ pickTrigger: vi.fn(async () => "turnEnd") }));

let user;

const { actions } = RemindersManager.DEFAULT_OPTIONS;

beforeEach(() => {
    user = makeDoc([
        { id: "a", text: "Sustain <b>", source: "Gavilar", messageId: "m1", actorUuid: "Actor.a" },
        { id: "b", text: "Aura", itemUuid: "Actor.a.Item.i", actorUuid: "Actor.a" },
        { id: "c", text: "Giant fly thing", actorUuid: "Scene.s.Token.t.Actor.f" },
        { id: "d", text: "Everywhere" },
    ]);
    game.user = user;
    const names = { "Actor.a": "Sai Kai Len", "Scene.s.Token.t.Actor.f": "Giant Fly" };
    globalThis.fromUuidSync = vi.fn((uuid) => (names[uuid] ? { name: names[uuid] } : undefined));
});

describe("RemindersManager", () => {
    it("can be resized", () => {
        expect(RemindersManager.DEFAULT_OPTIONS.window.resizable).toBe(true);
    });


    it("groups your reminders per actor and token, with the ones without an actor on their own", async () => {
        const element = await renderWindow(new RemindersManager());
        const titles = [...element.querySelectorAll("summary > span")].map((span) => span.textContent.trim());
        expect(titles).toEqual(["Sai Kai Len (2)", "Giant Fly (1)", "REMINDERS.manager.user (1)"]);
    });

    it("shows a chevron before each section's name, which the CSS turns when it is open", async () => {
        const element = await renderWindow(new RemindersManager());
        const chevrons = element.querySelectorAll("details > summary span:first-child i.pf2e-reminders-chevron");
        expect(chevrons).toHaveLength(3);
        expect(chevrons[0].className).toContain("fa-chevron-right");
    });

    it("scrolls inside the window when the list is long, set inline", async () => {
        const body = (await renderWindow(new RemindersManager())).querySelector(".pf2e-reminders-body");
        expect(body.style.maxHeight).toBe("60vh");
        expect(body.style.overflowY).toBe("auto");
    });

    it("lists reminders escaped, with links and remove buttons", async () => {
        const element = await renderWindow(new RemindersManager());
        expect(element.innerHTML).toContain("Sustain &lt;b&gt;");
        expect(element.querySelector("[data-show-message=m1]")).not.toBeNull();
        expect(element.querySelector("[data-show-item]")).not.toBeNull();
        expect(element.querySelectorAll("[data-action=removeOne]")).toHaveLength(4);
    });

    it("names actors that no longer exist as unavailable", async () => {
        fromUuidSync.mockReturnValue(undefined);
        const element = await renderWindow(new RemindersManager());
        expect(element.querySelector("summary span").textContent).toContain("REMINDERS.manager.unknown");
    });

    it("copes with an unresolvable uuid", async () => {
        fromUuidSync.mockImplementation(() => { throw new Error("bad uuid"); });
        const element = await renderWindow(new RemindersManager());
        expect(element.querySelector("summary span").textContent).toContain("REMINDERS.manager.unknown");
    });

    it("escapes the section names", async () => {
        fromUuidSync.mockReturnValue({ name: "<i>Fly</i>" });
        const element = await renderWindow(new RemindersManager());
        expect(element.innerHTML).toContain("&lt;i&gt;Fly&lt;/i&gt; (2)");
    });

    it("lists each group in a collapsed section that stays open across redraws", async () => {
        const manager = new RemindersManager();
        let element = await renderWindow(manager);
        expect([...element.querySelectorAll("details")].map((details) => details.open)).toEqual([false, false, false]);

        manager.openKeys.add("Actor.a");
        element = await renderWindow(manager);
        expect(element.querySelector('details[data-key="Actor.a"]').open).toBe(true);
        expect(element.querySelector('details[data-key="user"]').open).toBe(false);
    });

    it("remembers which sections are open when they are toggled", () => {
        const manager = new RemindersManager();
        manager.element = document.createElement("div");
        manager.element.innerHTML = '<details data-key="user"></details>';
        manager._onFirstRender({}, {});
        const details = manager.element.querySelector("details");
        details.open = true;
        details.dispatchEvent(new Event("toggle"));
        expect(manager.openKeys.has("user")).toBe(true);
        details.open = false;
        details.dispatchEvent(new Event("toggle"));
        expect(manager.openKeys.has("user")).toBe(false);
    });

    it("has a remove all button for each group", async () => {
        const element = await renderWindow(new RemindersManager());
        const buttons = [...element.querySelectorAll("[data-action=removeAllFor]")];
        expect(buttons.map((button) => button.dataset.doc)).toEqual(["Actor.a", "Scene.s.Token.t.Actor.f", "user"]);
    });

    it("puts the clear all button in a Foundry form footer", async () => {
        const element = await renderWindow(new RemindersManager());
        const button = element.querySelector(".standard-form footer.form-footer button[data-action=clearAll]");
        expect(button.type).toBe("button");
        expect(button.textContent).toContain("REMINDERS.manager.clearAll");
    });

    it("has a clear all button, also when there are no reminders", async () => {
        let element = await renderWindow(new RemindersManager());
        expect(element.querySelector("[data-action=clearAll]")).not.toBeNull();
        user = makeDoc([]);
        game.user = user;
        element = await renderWindow(new RemindersManager());
        expect(element.querySelector("[data-action=clearAll]")).not.toBeNull();
    });

    describe("clear all", () => {
        beforeEach(() => {
            user.unsetFlag = vi.fn();
            game.actors = [];
            game.scenes = [];
        });

        function stubConfirm(answer) {
            foundry.applications.api.DialogV2 = { confirm: vi.fn(async () => answer) };
        }

        it("clears everything and redraws after confirmation", async () => {
            stubConfirm(true);
            const app = { render: vi.fn() };
            await actions.clearAll.call(app);
            expect(user.unsetFlag).toHaveBeenCalledWith("pf2e-reminders", "reminders");
            expect(app.render).toHaveBeenCalled();
        });

        it("does nothing when the confirmation is declined or closed", async () => {
            stubConfirm(false);
            const app = { render: vi.fn() };
            await actions.clearAll.call(app);
            expect(user.unsetFlag).not.toHaveBeenCalled();
            expect(app.render).not.toHaveBeenCalled();
        });
    });

    it("shows an empty message without reminders", async () => {
        user = makeDoc([]);
        game.user = user;
        const element = await renderWindow(new RemindersManager());
        expect(element.textContent).toContain("REMINDERS.manager.empty");
        expect(element.querySelector("[data-action=removeAllFor]")).toBeNull();
    });

    it("shows a trigger icon for each reminder and switches it when clicked", async () => {
        const element = await renderWindow(new RemindersManager());
        expect(element.querySelectorAll("[data-action=chooseTrigger]")).toHaveLength(4);
        const app = new RemindersManager();
        app.render = vi.fn();
        await actions.chooseTrigger.call(app, {}, { dataset: { id: "a" } });
        expect(user.getFlag("pf2e-reminders", "reminders").find((reminder) => reminder.id === "a").trigger).toBe("turnEnd");
        expect(app.render).toHaveBeenCalled();
    });

    it("removes one reminder and re-renders", async () => {
        const app = new RemindersManager();
        app.render = vi.fn();
        await actions.removeOne.call(app, {}, { dataset: { id: "a" } });
        expect(user.setFlag).toHaveBeenCalledWith("pf2e-reminders", "reminders", expect.not.arrayContaining([expect.objectContaining({ id: "a" })]));
        expect(app.render).toHaveBeenCalled();
    });

    it("removes all reminders of just the chosen group", async () => {
        const app = { render: vi.fn() };
        const event = { preventDefault: vi.fn() };
        await actions.removeAllFor.call(app, event, { dataset: { doc: "Actor.a" } });
        expect(event.preventDefault).toHaveBeenCalled();
        expect(user.getFlag("pf2e-reminders", "reminders").map((reminder) => reminder.id)).toEqual(["c", "d"]);
        expect(app.render).toHaveBeenCalled();
    });

    it("removes the reminders without an actor from their own group", async () => {
        await actions.removeAllFor.call({ render: vi.fn() }, { preventDefault: vi.fn() }, { dataset: { doc: "user" } });
        expect(user.getFlag("pf2e-reminders", "reminders").map((reminder) => reminder.id)).toEqual(["a", "b", "c"]);
    });
});
