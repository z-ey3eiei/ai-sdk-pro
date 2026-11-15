"use client";

import {
  useMutation,
  useOthers,
  useSelf,
  useStorage,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import { Users } from "lucide-react";
import { useRef, useState } from "react";

function PresenceStack() {
  const others = useOthers();
  const self = useSelf();
  const people = [
    ...(self
      ? [
          {
            connectionId: self.connectionId,
            name: self.info?.name ?? "You",
            avatar: self.info?.avatar,
            color: self.info?.color,
            you: true,
          },
        ]
      : []),
    ...others.map(other => ({
      connectionId: other.connectionId,
      name: other.info?.name ?? "Visitor",
      avatar: other.info?.avatar,
      color: other.info?.color,
      you: false,
    })),
  ];

  return (
    <div className="collab-presence" aria-label="People on this page">
      <Users size={15} aria-hidden="true" />
      <span>
        {people.length === 1
          ? "Only you here — open another tab to sync"
          : `${people.length} people building live`}
      </span>
      <ul className="collab-avatars">
        {people.slice(0, 6).map(person => (
          <li key={person.connectionId}>
            <img
              src={person.avatar}
              alt=""
              width={28}
              height={28}
              style={{
                borderColor: person.color ?? "var(--border-strong)",
              }}
              title={person.you ? `${person.name} (you)` : person.name}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SharedHeroDraft() {
  const updatePresence = useUpdateMyPresence();
  const text = useStorage(root => root.heroDraft.text) ?? "";
  const updateText = useMutation(({ storage }, next: string) => {
    storage.get("heroDraft").set("text", next);
  }, []);

  return (
    <label className="collab-draft">
      <span>Shared project pitch (synced with Liveblocks)</span>
      <textarea
        value={text}
        rows={3}
        spellCheck
        onFocus={() => updatePresence({ focus: "hero" })}
        onChange={event => updateText(event.target.value)}
        placeholder="Describe what you want your agent to do…"
      />
    </label>
  );
}

function IdeaBoard() {
  const updatePresence = useUpdateMyPresence();
  const ideas = useStorage(root => root.ideas.items) ?? [];
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addIdea = useMutation(({ storage }, idea: string) => {
    const trimmed = idea.trim();
    if (!trimmed) return;
    const bucket = storage.get("ideas");
    const current = bucket.get("items");
    if (current.includes(trimmed)) return;
    bucket.set("items", [...current, trimmed].slice(-12));
  }, []);

  const removeIdea = useMutation(({ storage }, idea: string) => {
    const bucket = storage.get("ideas");
    bucket.set(
      "items",
      bucket.get("items").filter(item => item !== idea)
    );
  }, []);

  return (
    <div className="collab-ideas">
      <p className="collab-ideas-title">
        Shared build board <span className="live-dot" aria-hidden="true" />
      </p>
      <ul>
        {ideas.map(idea => (
          <li key={idea}>
            <span>{idea}</span>
            <button type="button" onClick={() => removeIdea(idea)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <form
        onSubmit={event => {
          event.preventDefault();
          addIdea(draft);
          setDraft("");
          inputRef.current?.focus();
        }}
      >
        <input
          ref={inputRef}
          value={draft}
          onChange={event => setDraft(event.target.value)}
          onFocus={() => updatePresence({ focus: "ideas" })}
          placeholder="Add a build step everyone can see…"
          maxLength={120}
        />
        <button type="submit" disabled={!draft.trim()}>
          Add
        </button>
      </form>
    </div>
  );
}

export default function HomeCollaboration() {
  return (
    <div className="home-collab-shell">
      <PresenceStack />
      <SharedHeroDraft />
      <IdeaBoard />
      <p className="collab-footnote">
        Real-time layer powered by{" "}
        <a href="https://liveblocks.io" target="_blank" rel="noreferrer">
          Liveblocks
        </a>
        . Signed-in users join with GitHub; guests get a stable session cookie.
      </p>
    </div>
  );
}