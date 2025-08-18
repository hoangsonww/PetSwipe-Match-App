import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL + "/chat";
const MARGIN = 16;
const BRAND = { btn: "#234851", accent: "#7097A8" };
type Role = "user" | "model";
interface Msg {
  sender: Role;
  text: string;
}

const TypingBubble: React.FC<{ stage: "thinking" | "generating" }> = ({
  stage,
}) => {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const id = setInterval(
      () => setDots((d) => (d.length < 3 ? d + "." : ".")),
      350,
    );
    return () => clearInterval(id);
  }, []);
  return (
    <span className="flex items-center gap-1">
      <Loader2 className="w-4 h-4 animate-spin" />
      {stage === "thinking" ? "Thinking" : "Generating response"}
      {dots}
    </span>
  );
};

const mdComponents = {
  h1: (p: any) => (
    <h1 className="text-2xl font-bold border-b mb-3 pb-1 break-words" {...p} />
  ),
  h2: (p: any) => (
    <h2
      className="text-xl font-semibold border-b mb-3 pb-1 break-words"
      {...p}
    />
  ),
  h3: (p: any) => (
    <h3 className="text-lg font-semibold mb-2 break-words" {...p} />
  ),
  p: (p: any) => (
    <p className="mb-3 leading-relaxed break-words overflow-x-auto" {...p} />
  ),
  ul: (p: any) => <ul className="list-disc ml-5 mb-3 space-y-1" {...p} />,
  ol: (p: any) => <ol className="list-decimal ml-5 mb-3 space-y-1" {...p} />,
  li: (p: any) => <li className="break-words" {...p} />,
  blockquote: (p: any) => (
    <blockquote
      className="border-l-4 pl-4 italic text-gray-600 dark:text-gray-300 mb-3"
      {...p}
    />
  ),
  hr: () => <hr className="my-4 border-gray-300 dark:border-gray-700" />,
  a: (p: any) => (
    <a
      className="text-[#3B7683] underline break-all hover:text-[#2b5d69]"
      target="_blank"
      rel="noopener noreferrer"
      {...p}
    />
  ),
  table: (p: any) => (
    <div className="overflow-x-auto my-4 border rounded-lg">{p.children}</div>
  ),
  thead: (p: any) => (
    <thead className="bg-gray-100 dark:bg-gray-800 text-sm" {...p} />
  ),
  th: (p: any) => (
    <th className="border px-3 py-2 font-medium break-words" {...p} />
  ),
  td: (p: any) => <td className="border px-3 py-2 break-words" {...p} />,
  code: ({
    inline,
    children,
    ...props
  }: {
    inline?: boolean;
    children: React.ReactNode;
  }) =>
    inline ? (
      <code
        className="bg-gray-200 dark:bg-gray-800 px-1 rounded break-words"
        {...props}
      >
        {children}
      </code>
    ) : (
      <pre
        className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm my-3 shadow-inner"
        {...props}
      >
        <code>{children}</code>
      </pre>
    ),
};

const wrapBareLatex = (text: string) =>
  text
    .split("\n")
    .map((line) =>
      line.trim().startsWith("\\") && !/^\s*```/.test(line)
        ? `$$\n${line}\n$$`
        : line,
    )
    .join("\n");

const DraggableChatbot: React.FC = () => {
  const [authed, setAuthed] = useState(
    typeof window !== "undefined" && !!localStorage.getItem("jwt"),
  );
  useEffect(() => {
    const interval = setInterval(
      async () => {
        const raw = localStorage.getItem("jwt");
        if (!raw) {
          setAuthed(false);
          return;
        }
        const token = raw.replace(/^Bearer\s+/i, "");
        try {
          const res = await fetch(API_URL, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.status === 401) {
            setAuthed(false);
            localStorage.removeItem("jwt");
          }
        } catch {}
      },
      5 * 60 * 1000,
    ); // 5 minutes
    return () => clearInterval(interval);
  }, []);
  if (!authed) return null;

  const saved =
    typeof window !== "undefined" && localStorage.getItem("chatPos");
  const [pos, setPos] = useState<{ x: number; y: number }>(
    saved ? JSON.parse(saved) : { x: MARGIN, y: window.innerHeight / 2 },
  );
  const dragging = useRef(false);
  const moved = useRef(false);
  const delta = useRef({ x: 0, y: 0 });
  const start = useRef({ x: 0, y: 0 });
  const THRESHOLD = 5;

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    moved.current = false;
    start.current = { x: e.clientX, y: e.clientY };
    delta.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    if (
      !moved.current &&
      Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) >
        THRESHOLD
    ) {
      moved.current = true;
    }
    setPos({
      x: e.clientX - delta.current.x,
      y: e.clientY - delta.current.y,
    });
  };
  const onUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    const btn = 56;
    const snapX =
      pos.x + btn / 2 < window.innerWidth / 2
        ? MARGIN
        : window.innerWidth - btn - MARGIN;
    const snapY = Math.min(
      Math.max(pos.y, MARGIN),
      window.innerHeight - btn - MARGIN,
    );
    const snapped = { x: snapX, y: snapY };
    setPos(snapped);
    localStorage.setItem("chatPos", JSON.stringify(snapped));
  };

  useEffect(() => {
    const handleResize = () => {
      const btn = 56;
      const maxX = window.innerWidth - btn - MARGIN;
      const maxY = window.innerHeight - btn - MARGIN;
      let x = Math.min(Math.max(pos.x, MARGIN), maxX);
      let y = Math.min(Math.max(pos.y, MARGIN), maxY);
      // if it was snapped right before, keep it snapped right
      if (pos.x > window.innerWidth / 2) x = maxX;
      if (x !== pos.x || y !== pos.y) {
        setPos({ x, y });
        localStorage.setItem("chatPos", JSON.stringify({ x, y }));
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [pos]);

  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("chatMsgs") || "[]");
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [stage, setStage] = useState<"thinking" | "generating">("thinking");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
    localStorage.setItem("chatMsgs", JSON.stringify(msgs));
  }, [msgs]);

  const send = async () => {
    if (!input.trim() || pending) return;
    const raw = localStorage.getItem("jwt");
    if (!raw) return;
    const token = raw.replace(/^Bearer\s+/i, "");

    const userText = input.trim();
    setMsgs((m) => [...m, { sender: "user", text: userText }]);
    setInput("");
    setPending(true);
    setStage("thinking");

    const timer = setTimeout(
      () => setStage("generating"),
      900 + Math.random() * 700,
    );

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          history: msgs.map((m) => ({
            role: m.sender,
            parts: [{ text: m.text }],
          })),
          message: userText,
          userContext: "",
        }),
      });
      if (res.status === 401 || res.status === 404) {
        setAuthed(false);
        localStorage.removeItem("jwt");
        return;
      }
      const data = await res.json();
      setMsgs((m) => [
        ...m,
        { sender: "model", text: data.text || "(no reply)" },
      ]);
    } catch {
      setMsgs((m) => [
        ...m,
        { sender: "model", text: "Sorry, something went wrong." },
      ]);
    } finally {
      clearTimeout(timer);
      setPending(false);
    }
  };

  const bubbleVar = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring", stiffness: 280, damping: 24 },
    },
  };

  return (
    <>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        style={{ left: pos.x, top: pos.y, touchAction: "none" }}
        className="fixed z-50"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onClick={() => !dragging.current && !moved.current && setOpen(true)}
      >
        <Button
          size="icon"
          style={{ backgroundColor: BRAND.btn, color: "white" }}
          className="shadow-xl hover:scale-110 hover:shadow-2xl transition-all"
        >
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: [0, 10, -8, 0] }}
            transition={{
              repeat: Infinity,
              duration: 2.5,
              ease: "easeInOut",
              repeatDelay: 5,
            }}
          >
            <MessageSquare />
          </motion.div>
        </Button>
      </motion.div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 dark:bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 40 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="w-full max-w-lg"
            >
              <Card className="rounded-3xl shadow-2xl bg-white dark:bg-[#101010]">
                <CardContent className="p-6 sm:p-8 space-y-6">
                  <div className="flex justify-between items-center">
                    <button
                      aria-label="Clear chat"
                      onClick={() => {
                        setMsgs([]);
                        localStorage.removeItem("chatMsgs");
                      }}
                      className="rounded-full p-1 hover:bg-red-100 dark:hover:bg-red-800 transition"
                    >
                      <Trash2 className="w-5 h-5 text-red-500" />
                    </button>
                    <h2 className="text-xl font-extrabold text-[#234851] dark:text-[#B6EBE9]">
                      PetSwipe Assistant
                    </h2>
                    <button
                      aria-label="Close"
                      onClick={() => setOpen(false)}
                      className="rounded-full p-1 hover:bg-gray-200 dark:hover:bg-gray-800 transition"
                    >
                      <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    </button>
                  </div>

                  <div
                    ref={scrollRef}
                    className="h-72 overflow-y-auto pr-1 space-y-4"
                  >
                    {/* Empty state when no messages yet */}
                    {!pending && msgs.length === 0 && (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center px-4">
                          No messages yet - say hi 👋 Our assistant can help you
                          find pets, answer questions, and more! Just type your
                          message below and hit enter or click send.
                        </p>
                      </div>
                    )}

                    {msgs.map((m, i) => (
                      <motion.div
                        key={i}
                        variants={bubbleVar}
                        initial="hidden"
                        animate="visible"
                        className={`max-w-[80%] group ${
                          m.sender === "user" ? "ml-auto" : "mr-auto"
                        }`}
                      >
                        <div
                          className={`px-4 py-3 rounded-2xl shadow transition-transform pb-1 z-10
                          ${
                            m.sender === "user"
                              ? "bg-gradient-to-br from-[#6FB8C6] to-[#3B7683] text-white rounded-br-none"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-none"
                          }
                          group-hover:scale-[1.01] group-hover:shadow-lg
                        `}
                        >
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            // @ts-ignore
                            components={mdComponents}
                          >
                            {wrapBareLatex(m.text)}
                          </ReactMarkdown>
                        </div>
                      </motion.div>
                    ))}

                    {pending && (
                      <motion.div
                        variants={bubbleVar}
                        initial="hidden"
                        animate="visible"
                        className="flex"
                      >
                        <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-none text-gray-700 dark:text-gray-300 shadow">
                          <TypingBubble stage={stage} />
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && send()}
                      placeholder="Type your message…"
                      className="flex-1 rounded-full bg-gray-100 dark:bg-gray-800 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#7097A8] text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 shadow-inner"
                    />
                    <Button
                      disabled={pending || !input.trim()}
                      onClick={send}
                      style={{ backgroundColor: BRAND.accent, color: "white" }}
                      className="h-12 w-12 flex items-center justify-center rounded-full shadow-md hover:shadow-lg disabled:opacity-50"
                    >
                      {pending ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Send />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default DraggableChatbot;
