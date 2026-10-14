import { describe, it, expect, vi, beforeEach } from "vitest";
import { addItemBells } from "../reminders/ItemBell";
import { makeDoc, setSettings } from "./helpers";
import { pickTrigger } from "../reminders/TriggerPicker";

vi.mock("../reminders/TriggerPicker", () => ({ pickTrigger: vi.fn(async () => "turnStart") }));

let actor;
let item;
let app;
let user;

function makeHtml() {
    const html = document.createElement("div");
    html.innerHTML = `<ol>
        <li data-item-id="i"><div class="item-controls"><a data-action="edit-item"></a></div></li>
        <li data-item-id="unknown"><div class="item-controls"></div></li>
        <li data-item-id="i"><span>no controls</span></li>
    </ol>`;
    return html;
}

beforeEach(() => {
    vi.clearAllMocks();
    setSettings();
    user = makeDoc();
    game.user = user;
    actor = { isOwner: true, name: "Gavilar", uuid: "Actor.a" };
    item = { uuid: "Actor.a.Item.i", name: "Aura of Courage", actor };
    actor.items = { get: vi.fn((id) => (id === "i" ? item : undefined)) };
    app = { actor };
});

describe("addItemBells", () => {
    it("adds a bell only to rows with a known item", () => {
        const html = makeHtml();
        addItemBells(app, html);
        expect(html.querySelectorAll(".pf2e-reminders-item-bell")).toHaveLength(1);
    });

    it("does not add a second bell on repeated renders", () => {
        const html = makeHtml();
        addItemBells(app, html);
        addItemBells(app, html);
        expect(html.querySelectorAll(".pf2e-reminders-item-bell")).toHaveLength(1);
    });

    it("accepts a jQuery-style html argument", () => {
        const html = makeHtml();
        addItemBells(app, [html]);
        expect(html.querySelector(".pf2e-reminders-item-bell")).not.toBeNull();
    });

    it("marks the bell active when you already have a reminder for the item", () => {
        user = makeDoc([{ id: "a", itemUuid: item.uuid, actorUuid: "Actor.a" }]);
        game.user = user;
        const html = makeHtml();
        addItemBells(app, html);
        expect(html.querySelector(".pf2e-reminders-item-bell").classList.contains("active")).toBe(true);
    });

    it("stores the reminder on the user, tagged with the actor, when clicked", async () => {
        const html = makeHtml();
        addItemBells(app, html);
        const bell = html.querySelector(".pf2e-reminders-item-bell");
        bell.click();
        await vi.waitFor(() => expect(bell.classList.contains("active")).toBe(true));
        expect(user.setFlag).toHaveBeenCalledWith("pf2e-reminders", "reminders", [
            expect.objectContaining({ text: "Aura of Courage", itemUuid: item.uuid, actorUuid: "Actor.a" }),
        ]);
    });

    it("lets the icon column of spell rows fit the bell, so it does not end up behind the cast button", () => {
        const html = document.createElement("div");
        html.innerHTML = `<ol class="spell-list">
            <li data-item-id="i"><button class="cast-spell"></button><div class="item-controls"><a data-action="edit-item"></a></div></li>
        </ol><ul><li data-item-id="i"><div class="item-controls"></div></li></ul>`;
        addItemBells(app, html);
        const [spellRow, otherRow] = html.querySelectorAll("li");
        expect(spellRow.style.getPropertyValue("--controls-width")).toBe("min-content");
        expect(otherRow.style.getPropertyValue("--controls-width")).toBe("");
        expect(spellRow.querySelector(".item-controls").firstElementChild.className).toBe("pf2e-reminders-item-bell");
    });

    it("adds no bells for actors the user does not own", () => {
        actor.isOwner = false;
        const html = makeHtml();
        addItemBells(app, html);
        expect(html.querySelector(".pf2e-reminders-item-bell")).toBeNull();
    });

    it("adds no bell to the rank lines of a spell list, which carry the id of the spellcasting entry, but does to every spell row", () => {
        const html = document.createElement("div");
        html.innerHTML = `<ol class="spell-list">
            <li class="header-row" data-item-id="i" data-item-type="spell-slot-group"><div class="item-controls"><a></a></div></li>
            <li class="spell" data-item-id="i" data-item-type="spell"><div class="item-controls"><a></a></div></li>
            <li class="spell virtual" data-item-id="i" data-item-type="spell-slot-group"><div class="item-controls"><a></a></div></li>
        </ol>`;
        addItemBells(app, html);
        const [header, spell, virtualSpell] = html.querySelectorAll("li");
        expect(header.querySelector(".pf2e-reminders-item-bell")).toBeNull();
        expect(spell.querySelector(".pf2e-reminders-item-bell")).not.toBeNull();
        // virtual spell rows are real spells, although the sheet gives them the type of the rank lines
        expect(virtualSpell.querySelector(".pf2e-reminders-item-bell")).not.toBeNull();
        expect(header.style.getPropertyValue("--controls-width")).toBe("");
    });

    it("adds no bell to lore skills", () => {
        item.type = "lore";
        const html = makeHtml();
        addItemBells(app, html);
        expect(html.querySelector(".pf2e-reminders-item-bell")).toBeNull();
    });

    it("adds no bell to spellcasting entries such as Arcane Prepared Spells", () => {
        item.type = "spellcastingEntry";
        const html = makeHtml();
        addItemBells(app, html);
        expect(html.querySelector(".pf2e-reminders-item-bell")).toBeNull();
    });

    it("follows the item types chosen in the settings", () => {
        setSettings({ excludedItemTypes: ["weapon"] });
        item.type = "weapon";
        let html = makeHtml();
        addItemBells(app, html);
        expect(html.querySelector(".pf2e-reminders-item-bell")).toBeNull();

        item.type = "spell";
        html = makeHtml();
        addItemBells(app, html);
        expect(html.querySelector(".pf2e-reminders-item-bell")).not.toBeNull();
    });

    describe("NPC sheets (abilities and strikes have a controls icon list)", () => {
        function makeNpcHtml() {
            const html = document.createElement("div");
            html.innerHTML = `<ol>
                <li data-item-id="i"><h4><span class="name">Aura</span></h4>
                    <div class="controls"><a class="chat"></a><a data-action="edit-item"></a></div></li>
                <li data-item-id="i"><h4><a class="name">Jaws</a></h4>
                    <div class="controls"><a class="chat"></a></div></li>
                <li data-item-id="unknown"><h4><span class="name">Mystery</span></h4><div class="controls"></div></li>
                <li data-item-id="i"><h4><span class="name">No icons</span></h4></li>
            </ol>`;
            return html;
        }

        function setNpcBells(on) {
            actor.type = "npc";
            setSettings({ npcReminders: on });
        }

        it("adds no bells on NPC sheets by default", () => {
            setNpcBells(false);
            const html = makeNpcHtml();
            addItemBells(app, html);
            expect(html.querySelector(".pf2e-reminders-item-bell")).toBeNull();
        });

        it("still adds bells to non-NPC sheets when the NPC setting is off", () => {
            setNpcBells(false);
            actor.type = "character";
            const html = makeHtml();
            addItemBells(app, html);
            expect(html.querySelector(".pf2e-reminders-item-bell")).not.toBeNull();
        });

        it("puts the bell first in the icon list on the right when the GM has turned it on", () => {
            setNpcBells(true);
            const html = makeNpcHtml();
            addItemBells(app, html);
            const bells = html.querySelectorAll(".controls .pf2e-reminders-item-bell");
            expect(bells).toHaveLength(2);
            expect(bells[0].nextElementSibling.className).toBe("chat");
            expect(html.querySelector("h4 .pf2e-reminders-item-bell")).toBeNull();
        });

        it("does not add a second bell on repeated renders", () => {
            setNpcBells(true);
            const html = makeNpcHtml();
            addItemBells(app, html);
            addItemBells(app, html);
            expect(html.querySelectorAll(".pf2e-reminders-item-bell")).toHaveLength(2);
        });

        it("respects the excluded item types and the actor's ownership", () => {
            setNpcBells(true);
            item.type = "spellcastingEntry";
            let html = makeNpcHtml();
            addItemBells(app, html);
            expect(html.querySelector(".pf2e-reminders-item-bell")).toBeNull();

            item.type = "action";
            actor.isOwner = false;
            html = makeNpcHtml();
            addItemBells(app, html);
            expect(html.querySelector(".pf2e-reminders-item-bell")).toBeNull();
        });

        it("toggles the reminder when clicked", async () => {
            setNpcBells(true);
            const html = makeNpcHtml();
            addItemBells(app, html);
            const bell = html.querySelector(".pf2e-reminders-item-bell");
            bell.click();
            await vi.waitFor(() => expect(bell.classList.contains("active")).toBe(true));
            expect(user.setFlag).toHaveBeenCalled();
        });

        it("leaves rows that have item controls to the item controls", () => {
            setNpcBells(true);
            const html = makeHtml();
            addItemBells(app, html);
            expect(html.querySelectorAll(".pf2e-reminders-item-bell")).toHaveLength(1);
            expect(html.querySelector(".item-controls .pf2e-reminders-item-bell")).not.toBeNull();
        });
    });

    it("asks for a trigger, starting on turn start, and adds the reminder on the one picked", async () => {
        pickTrigger.mockResolvedValueOnce("crit");
        const html = makeHtml();
        addItemBells(app, html);
        html.querySelector(".pf2e-reminders-item-bell").click();
        await vi.waitFor(() => expect(user.setFlag).toHaveBeenCalled());
        expect(pickTrigger).toHaveBeenCalledWith("turnStart");
        expect(user.getFlag("pf2e-reminders", "reminders")[0].trigger).toBe("crit");
    });

    it("adds nothing when the trigger popup is closed", async () => {
        pickTrigger.mockResolvedValueOnce(undefined);
        const html = makeHtml();
        addItemBells(app, html);
        const bell = html.querySelector(".pf2e-reminders-item-bell");
        bell.click();
        await vi.waitFor(() => expect(pickTrigger).toHaveBeenCalled());
        expect(user.setFlag).not.toHaveBeenCalled();
        expect(bell.classList.contains("active")).toBe(false);
    });

    it("removes all the item's reminders, on any trigger, without asking, when the bell is active", async () => {
        user = makeDoc([
            { id: "a", itemUuid: item.uuid, actorUuid: "Actor.a", trigger: "turnEnd" },
            { id: "b", itemUuid: item.uuid, actorUuid: "Actor.a", trigger: "hit" },
            { id: "c", text: "Other", itemUuid: "Actor.a.Item.other" },
        ]);
        game.user = user;
        const html = makeHtml();
        addItemBells(app, html);
        const bell = html.querySelector(".pf2e-reminders-item-bell");
        bell.click();
        await vi.waitFor(() => expect(bell.classList.contains("active")).toBe(false));
        expect(pickTrigger).not.toHaveBeenCalled();
        expect(user.getFlag("pf2e-reminders", "reminders").map((reminder) => reminder.id)).toEqual(["c"]);
    });

    describe("shift-click", () => {
        const shiftClick = (bell) => bell.dispatchEvent(new MouseEvent("click", { shiftKey: true, bubbles: true, cancelable: true }));

        beforeEach(() => {
            user = makeDoc([{ id: "a", itemUuid: item.uuid, actorUuid: "Actor.a", trigger: "turnStart" }]);
            game.user = user;
        });

        it("adds a reminder on another trigger even though the item has one, and keeps the old one", async () => {
            pickTrigger.mockResolvedValueOnce("hit");
            const html = makeHtml();
            addItemBells(app, html);
            shiftClick(html.querySelector(".pf2e-reminders-item-bell"));
            await vi.waitFor(() => expect(user.setFlag).toHaveBeenCalled());
            expect(user.getFlag("pf2e-reminders", "reminders").map((reminder) => reminder.trigger)).toEqual(["turnStart", "hit"]);
        });

        it("removes only the reminder on the chosen trigger when the item already has one there", async () => {
            user = makeDoc([
                { id: "a", itemUuid: item.uuid, actorUuid: "Actor.a", trigger: "turnStart" },
                { id: "b", itemUuid: item.uuid, actorUuid: "Actor.a", trigger: "hit" },
            ]);
            game.user = user;
            pickTrigger.mockResolvedValueOnce("hit");
            const html = makeHtml();
            addItemBells(app, html);
            const bell = html.querySelector(".pf2e-reminders-item-bell");
            shiftClick(bell);
            await vi.waitFor(() => expect(user.getFlag("pf2e-reminders", "reminders")).toHaveLength(1));
            expect(user.getFlag("pf2e-reminders", "reminders")[0].trigger).toBe("turnStart");
            expect(bell.classList.contains("active")).toBe(true);
        });

        it("changes nothing when the popup is closed", async () => {
            pickTrigger.mockResolvedValueOnce(undefined);
            const html = makeHtml();
            addItemBells(app, html);
            shiftClick(html.querySelector(".pf2e-reminders-item-bell"));
            await vi.waitFor(() => expect(pickTrigger).toHaveBeenCalled());
            expect(user.setFlag).not.toHaveBeenCalled();
        });

        it("asks for a trigger like a plain click when the item has no reminder", async () => {
            user = makeDoc();
            game.user = user;
            pickTrigger.mockResolvedValueOnce("miss");
            const html = makeHtml();
            addItemBells(app, html);
            shiftClick(html.querySelector(".pf2e-reminders-item-bell"));
            await vi.waitFor(() => expect(user.getFlag("pf2e-reminders", "reminders")).toHaveLength(1));
            expect(pickTrigger).toHaveBeenCalledWith("turnStart");
        });
    });

    it("adds no bells when the user has turned the module off", () => {
        setSettings({ enabled: false });
        const html = makeHtml();
        addItemBells(app, html);
        expect(html.querySelector(".pf2e-reminders-item-bell")).toBeNull();
    });

    it("ignores sheets without an actor", () => {
        const html = makeHtml();
        addItemBells({}, html);
        expect(html.querySelector(".pf2e-reminders-item-bell")).toBeNull();
    });
});
