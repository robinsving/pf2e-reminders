import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("../reminders/ActorRemindersPanel", () => ({ openActorReminders: vi.fn() }));

import { createRemindersMessage, renderRemindersMessage } from "../reminders/RemindersMessage";
import { openActorReminders } from "../reminders/ActorRemindersPanel";
import { makeDoc, setSettings } from "./helpers";

let player;
let promptTrigger;
let actorDoc = { uuid: "Actor.a", isOwner: true, type: "character" };

function makeMessage(id, isReminders = true, actorUuid = "Actor.a", trigger) {
    return { id, getFlag: vi.fn(() => (isReminders ? { actorUuid, trigger } : undefined)) };
}

function makeHtml() {
    const html = document.createElement("div");
    html.innerHTML = '<div class="pf2e-reminders-chat"><h4>Reminders</h4></div>';
    return html;
}

beforeEach(() => {
    setSettings();
    vi.clearAllMocks();
    promptTrigger = undefined;
    globalThis.fromUuidSync = vi.fn(() => actorDoc);
    player = makeDoc([
        { id: "u1", text: "Sustain <b>", source: "Gavilar" },
        { id: "a1", text: "Aura of Courage", itemUuid: "Actor.a.Item.i", actorUuid: "Actor.a" },
        { id: "o1", text: "Other actor", actorUuid: "Actor.other" },
    ], { id: "p" });
    game.user = player;
});

describe("createRemindersMessage", () => {
    it("posts a message whispered only to the user and flagged with the actor", async () => {
        const token = { id: "t1" };
        globalThis.ChatMessage = { create: vi.fn(), getSpeaker: vi.fn(() => ({ token: "t1" })) };
        globalThis.CONST = { CHAT_MESSAGE_STYLES: { OTHER: 0 } };

        await createRemindersMessage({ token, actor: { uuid: "Actor.a" } }, "turnEnd");

        const data = ChatMessage.create.mock.calls[0][0];
        expect(ChatMessage.getSpeaker).toHaveBeenCalledWith({ token });
        expect(data.whisper).toEqual(["p"]);
        expect(data.flags["pf2e-reminders"].turnMessage).toEqual({ actorUuid: "Actor.a", trigger: "turnEnd" });
    });
});

describe("renderRemindersMessage", () => {
    async function render(message = makeMessage("m1")) {
        game.messages = { contents: [message] };
        const html = makeHtml();
        await renderRemindersMessage(message, html);
        return html;
    }

    function stubPrompt(text) {
        foundry.applications.api.DialogV2 = { prompt: vi.fn(async ({ content }) => (text === undefined ? undefined : { text, trigger: promptTrigger ?? (content.includes("turnEnd") ? "turnEnd" : "turnStart") })) };
    }

    it("lists your reminders for the turn's actor and the ones without an actor, escaped", async () => {
        const list = (await render()).querySelector("ul").innerHTML;
        expect(list).toContain("Sustain &lt;b&gt;");
        expect(list).toContain("Aura of Courage");
        expect(list).not.toContain("Other actor");
    });

    it("marks older messages as past", async () => {
        const older = makeMessage("m1");
        game.messages = { contents: [older, makeMessage("m2")] };
        const html = makeHtml();
        await renderRemindersMessage(older, html);
        expect(html.querySelector("ul")).toBeNull();
        expect(html.textContent).toContain("REMINDERS.chat.past");
    });

    it("marks the message as past when there are no reminders", async () => {
        player = makeDoc([]);
        game.user = player;
        expect((await render()).querySelector("ul")).toBeNull();
    });

    it("leaves out the actor's reminders when you turned them off for it", async () => {
        player = makeDoc(player.getFlag("pf2e-reminders", "reminders"), {}, { disabledActors: ["Actor.a"] });
        game.user = player;
        const list = (await render()).querySelector("ul").innerHTML;
        expect(list).not.toContain("Aura of Courage");
        expect(list).toContain("Sustain");
    });

    it("adds nothing to existing messages when the user has turned the module off", async () => {
        setSettings({ enabled: false });
        const html = await render();
        expect(html.querySelector("ul")).toBeNull();
        expect(html.querySelector("[data-action=addCustom]")).toBeNull();
    });

    describe("turn end messages", () => {
        beforeEach(() => {
            player = makeDoc([
                { id: "s", text: "At the start", actorUuid: "Actor.a" },
                { id: "e", text: "At the end", actorUuid: "Actor.a", trigger: "turnEnd" },
            ]);
            game.user = player;
        });

        it("show only the turn end reminders and show the trigger as an icon and text in a subheader", async () => {
            const html = await render(makeMessage("m1", true, "Actor.a", "turnEnd"));
            expect(html.querySelector("ul").textContent).toContain("At the end");
            expect(html.querySelector("ul").textContent).not.toContain("At the start");
            const subheader = html.querySelector("h4 + .pf2e-reminders-subheader");
            expect(subheader.textContent).toContain("REMINDERS.trigger.turnEnd");
            expect(subheader.querySelector("i").className).toContain("fa-hourglass-end");
            expect(html.querySelector("h4").textContent).not.toContain("REMINDERS.trigger");
            expect(html.querySelector("h4 i.fa-hourglass-end")).toBeNull();
        });

        it("start the custom reminder prompt on the message's own trigger", async () => {
            stubPrompt("Close the door");
            const html = await render(makeMessage("m1", true, "Actor.a", "turnEnd"));
            html.querySelector("[data-action=addCustom]").click();
            await vi.waitFor(() => expect(html.querySelector("ul").textContent).toContain("Close the door"));
            expect(player.getFlag("pf2e-reminders", "reminders").at(-1)).toMatchObject({ text: "Close the door", trigger: "turnEnd" });
            expect(foundry.applications.api.DialogV2.prompt.mock.calls[0][0].content).toContain('data-trigger="turnEnd"');
        });

        it("keep the trigger chosen in the prompt, which may differ from the message's", async () => {
            stubPrompt("Open the door");
            promptTrigger = "turnStart";
            const html = await render(makeMessage("m1", true, "Actor.a", "turnEnd"));
            html.querySelector("[data-action=addCustom]").click();
            await vi.waitFor(() => expect(player.setFlag).toHaveBeenCalled());
            expect(player.getFlag("pf2e-reminders", "reminders").at(-1)).toMatchObject({ text: "Open the door", trigger: "turnStart" });
            expect(html.querySelector("ul").textContent).not.toContain("Open the door");
        });
    });

    it("shows turn start messages without a trigger flag, as posted by older versions", async () => {
        const html = await render(makeMessage("m1"));
        expect(html.querySelector(".pf2e-reminders-subheader i").className).toContain("fa-hourglass-start");
    });

    it("says there are no reminders left once the last one is removed", async () => {
        player = makeDoc([{ id: "a1", text: "Aura", actorUuid: "Actor.a" }]);
        game.user = player;
        const html = await render();
        html.querySelector("[data-action=removeOne]").click();
        await vi.waitFor(() => expect(html.textContent).toContain("REMINDERS.chat.empty"));
        expect(html.querySelector("ul")).toBeNull();
        expect(html.querySelector("[data-action=addCustom]")).not.toBeNull();
    });

    it("does not limit the height of the list in the chat message", async () => {
        const html = await render();
        expect(html.querySelector(".pf2e-reminders-body").style.maxHeight).toBe("");
    });

    it("ignores other messages", async () => {
        const html = await render(makeMessage("m1", false));
        expect(html.querySelector("ul")).toBeNull();
        expect(html.textContent).not.toContain("past");
    });

    it("removes a reminder from the user", async () => {
        const html = await render();
        html.querySelector('[data-action=removeOne][data-id="a1"]').click();
        await vi.waitFor(() => expect(html.querySelector('[data-action=removeOne][data-id="a1"]')).toBeNull());
        expect(player.getFlag("pf2e-reminders", "reminders").map((r) => r.id)).toEqual(["u1", "o1"]);
    });

    it("puts the list and plus buttons right-aligned on the title line, with no input field", async () => {
        const html = await render();
        expect(html.querySelector("h4 [data-action=addCustom]")).not.toBeNull();
        expect(html.querySelector("h4").classList.contains("pf2e-reminders-title")).toBe(true);
        expect(html.querySelector("[style]")).toBeNull();
        expect(html.querySelector("form")).toBeNull();
        expect(html.querySelector("input")).toBeNull();
    });

    it("has no toggle to turn the actor's reminders off", async () => {
        const html = await render();
        expect(html.querySelector("[data-toggle-actor]")).toBeNull();
        expect(html.querySelector("[data-action=toggleEnabled]")).toBeNull();
    });

    describe("list icon", () => {
        beforeEach(() => { actorDoc = { uuid: "Actor.a", isOwner: true, type: "character" }; });

        it("sits with the bell and the plus and opens the actor's reminders window", async () => {
            const html = await render();
            const icon = html.querySelector("h4 .pf2e-reminders-buttons [data-action=openReminders]");
            expect(icon.querySelector("i").className).toContain("fa-bell");
            expect(icon.dataset.tooltip).toBe("REMINDERS.chat.showAll");
            icon.click();
            await vi.waitFor(() => expect(openActorReminders).toHaveBeenCalled());
            expect(openActorReminders).toHaveBeenCalledWith(actorDoc);
            expect(fromUuidSync).toHaveBeenCalledWith("Actor.a");
        });

        it("is left out for actors the user does not own", async () => {
            actorDoc = { ...actorDoc, isOwner: false };
            expect((await render()).querySelector("[data-action=openReminders]")).toBeNull();
        });

        it("is left out for NPCs unless the GM turned NPC reminders on", async () => {
            actorDoc = { ...actorDoc, type: "npc" };
            expect((await render()).querySelector("[data-action=openReminders]")).toBeNull();

            setSettings({ npcReminders: true });
            expect((await render()).querySelector("[data-action=openReminders]")).not.toBeNull();
        });

        it("is left out when the actor no longer exists", async () => {
            fromUuidSync.mockReturnValue(null);
            expect((await render()).querySelector("[data-action=openReminders]")).toBeNull();
        });

        it("is left out of past messages and of turns without an actor", async () => {
            const older = makeMessage("m1");
            game.messages = { contents: [older, makeMessage("m2")] };
            const html = makeHtml();
            await renderRemindersMessage(older, html);
            expect(html.querySelector("[data-action=openReminders]")).toBeNull();

            expect((await render(makeMessage("m1", true, ""))).querySelector("[data-action=openReminders]")).toBeNull();
        });
    });

    it("has neither a bell nor a plus when the turn has no actor", async () => {
        const html = await render(makeMessage("m1", true, ""));
        expect(html.querySelector("[data-toggle-actor]")).toBeNull();
        expect(html.querySelector("[data-action=addCustom]")).toBeNull();
        expect(html.querySelector("h4").textContent).toContain("REMINDERS.chat.title");
        expect(html.querySelector("ul")).not.toBeNull();
    });

    it("adds the prompted text as a custom reminder for the turn's actor", async () => {
        stubPrompt("  Sustain the shield  ");
        const html = await render();
        html.querySelector("[data-action=addCustom]").click();
        await vi.waitFor(() => expect(html.querySelector("ul").textContent).toContain("Sustain the shield"));
        expect(player.getFlag("pf2e-reminders", "reminders")).toContainEqual(
            expect.objectContaining({ text: "Sustain the shield", actorUuid: "Actor.a" }));
    });

    it("ignores a closed or blank prompt", async () => {
        stubPrompt(undefined);
        const html = await render();
        html.querySelector("[data-action=addCustom]").click();
        await new Promise((resolve) => setTimeout(resolve));
        expect(player.setFlag).not.toHaveBeenCalled();
    });
});
