import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MainLayout from "../../components/layouts/MainLayout";
import {
  Button,
  EmptyState,
  LoadingSpinner,
  Modal,
  PageHeader,
  SearchInput,
  ToastProvider,
} from "../../components/ui";
import { Select, TextArea } from "../../components/ui/forms";
import { useAuth } from "../../contexts/AuthContext";
import type { Message } from "../../interfaces/message";
import type { User } from "../../interfaces/user";
import MessageService from "../../services/MessageService";
import { notify } from "../../util/notify";
import { formatDate, unwrapData } from "../../util/studySyncData";

interface ConversationsData {
  conversations: Message[];
}

interface ThreadData {
  messages: Message[];
}

interface ContactsData {
  contacts: User[];
}

interface MessageData {
  message: Message;
}

interface EchoChannel {
  listen: (event: string, callback: (payload: { message?: Message }) => void) => EchoChannel;
  stopListening?: (event: string) => EchoChannel;
}

interface EchoClient {
  private: (channel: string) => EchoChannel;
  leave?: (channel: string) => void;
}

type PendingMessage = Message & { is_pending?: boolean };

const getOtherUser = (message: Message | undefined, currentUserId: number): Pick<User, "id" | "name" | "avatar"> | null => {
  if (!message) return null;
  if (message.sender_id === currentUserId) return message.receiver ?? null;
  return message.sender ?? null;
};

const uniqueMessages = (messages: Message[]) => {
  const map = new Map<string, Message>();
  messages.forEach((message) => {
    map.set(String(message.id), message);
  });

  return [...map.values()].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
};

const Messages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<User[]>([]);
  const [thread, setThread] = useState<Message[]>([]);
  const [activeUserId, setActiveUserId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [selectedContactId, setSelectedContactId] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const currentUserId = user?.id ?? 0;

  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await MessageService.conversations();
      const data = unwrapData<ConversationsData>(response, { conversations: [] });
      setConversations(data.conversations);
      const firstOtherUser = currentUserId ? getOtherUser(data.conversations[0], currentUserId) : null;
      setActiveUserId((value) => value ?? firstOtherUser?.id ?? null);
    } catch {
      notify.error("Failed to load conversations.");
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  const syncConversationsQuietly = useCallback(async () => {
    try {
      const response = await MessageService.conversations();
      const data = unwrapData<ConversationsData>(response, { conversations: [] });
      setConversations(data.conversations);
    } catch {
      // Keep the current thread usable even if the sidebar preview cannot refresh.
    }
  }, []);

  const fetchContacts = useCallback(async () => {
    try {
      const response = await MessageService.contacts();
      const data = unwrapData<ContactsData>(response, { contacts: [] });
      setContacts(data.contacts);
      setSelectedContactId((value) => value || (data.contacts[0]?.id ? String(data.contacts[0].id) : ""));
    } catch {
      notify.error("Failed to load message contacts.");
    }
  }, []);

  const fetchThread = useCallback(async () => {
    if (!activeUserId) return;

    setIsThreadLoading(true);
    try {
      const response = await MessageService.thread(activeUserId);
      const data = unwrapData<ThreadData>(response, { messages: [] });
      setThread((current) => uniqueMessages([...current.filter((message) => !("is_pending" in message)), ...data.messages]));
    } catch {
      notify.error("Failed to load message thread.");
    } finally {
      setIsThreadLoading(false);
    }
  }, [activeUserId]);

  const syncThreadQuietly = useCallback(async () => {
    if (!activeUserId) return;

    try {
      const response = await MessageService.thread(activeUserId);
      const data = unwrapData<ThreadData>(response, { messages: [] });
      setThread((current) => uniqueMessages([...current.filter((message) => !("is_pending" in message)), ...data.messages]));
    } catch {
      // Polling should not interrupt an active conversation with repeated errors.
    }
  }, [activeUserId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  useEffect(() => {
    if (!activeUserId) return;

    const interval = window.setInterval(() => {
      syncThreadQuietly();
      syncConversationsQuietly();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [activeUserId, syncConversationsQuietly, syncThreadQuietly]);

  useEffect(() => {
    const echo = (window as Window & { Echo?: EchoClient }).Echo;
    if (!echo || !currentUserId) return;

    const channelName = `users.${currentUserId}`;
    const channel = echo.private(channelName).listen(".message.created", (payload) => {
      if (!payload.message) return;

      const otherUserId = payload.message.sender_id === currentUserId
        ? payload.message.receiver_id
        : payload.message.sender_id;

      setConversations((current) => [
        payload.message as Message,
        ...current.filter((message) => {
          const currentOtherUserId = message.sender_id === currentUserId ? message.receiver_id : message.sender_id;
          return currentOtherUserId !== otherUserId;
        }),
      ]);

      if (otherUserId === activeUserId) {
        setThread((current) => uniqueMessages([...current, payload.message as Message]));
      }
    });

    return () => {
      channel.stopListening?.(".message.created");
      echo.leave?.(channelName);
    };
  }, [activeUserId, currentUserId]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [thread]);

  const visibleConversations = useMemo(
    () =>
      conversations.filter((message) => {
        const otherUser = currentUserId ? getOtherUser(message, currentUserId) : null;
        return otherUser?.name.toLowerCase().includes(search.toLowerCase()) ?? false;
      }),
    [conversations, currentUserId, search],
  );

  const activeUser = useMemo(
    () =>
      conversations
        .map((message) => (currentUserId ? getOtherUser(message, currentUserId) : null))
        .find((otherUser) => otherUser?.id === activeUserId) ??
      contacts.find((contact) => contact.id === activeUserId) ??
      null,
    [activeUserId, contacts, conversations, currentUserId],
  );

  const startConversation = () => {
    const contactId = Number(selectedContactId);
    if (!contactId) {
      notify.warning("Choose someone to message first.");
      return;
    }

    setActiveUserId(contactId);
    setThread([]);
    setDraft("");
    setIsNewMessageOpen(false);
  };

  const handleSend = async () => {
    if (!activeUserId || !draft.trim()) return;

    const outgoingContent = draft.trim();
    const activeContact = activeUser;
    const pendingMessage: PendingMessage = {
      id: -Date.now(),
      sender_id: currentUserId,
      receiver_id: activeUserId,
      content: outgoingContent,
      read_at: null,
      sender: user ? { id: user.id, name: user.name, avatar: user.avatar } : undefined,
      receiver: activeContact ? { id: activeContact.id, name: activeContact.name, avatar: activeContact.avatar } : undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_pending: true,
    };

    setThread((current) => uniqueMessages([...current, pendingMessage]));
    setConversations((current) => [
      pendingMessage,
      ...current.filter((message) => {
        const otherUserId = message.sender_id === currentUserId ? message.receiver_id : message.sender_id;
        return otherUserId !== activeUserId;
      }),
    ]);
    setDraft("");
    setIsSending(true);
    try {
      const response = await MessageService.send({ receiver_id: activeUserId, content: outgoingContent });
      const data = unwrapData<MessageData | null>(response, null);
      if (data?.message) {
        setThread((current) => uniqueMessages([
          ...current.filter((message) => message.id !== pendingMessage.id),
          data.message,
        ]));
        setConversations((current) => [
          data.message,
          ...current.filter((message) => {
            const otherUserId = message.sender_id === currentUserId ? message.receiver_id : message.sender_id;
            return otherUserId !== activeUserId;
          }),
        ]);
      }
      syncConversationsQuietly();
    } catch {
      setThread((current) => current.filter((message) => message.id !== pendingMessage.id));
      setConversations((current) => current.filter((message) => message.id !== pendingMessage.id));
      setDraft(outgoingContent);
      notify.error("Failed to send message.");
    } finally {
      setIsSending(false);
    }
  };

  const content = (
    <>
      <div className="space-y-6 pb-10">
        <PageHeader
          eyebrow="Communication"
          title="Messages"
          description="Keep student-teacher conversations close to assignments, classes, and academic decisions."
          action={
            <Button type="button" iconName="FaPenToSquare" onClick={() => setIsNewMessageOpen(true)} disabled={contacts.length === 0}>
              New Message
            </Button>
          }
        />

        <section className="grid min-h-[640px] overflow-hidden rounded-2xl border border-border-muted bg-bg-light shadow lg:grid-cols-[340px_1fr]">
          <aside className="border-b border-border-muted p-5 lg:border-b-0 lg:border-r">
            <SearchInput value={search} onChange={setSearch} placeholder="Search people..." />
            <div className="mt-5 space-y-3">
              {isLoading ? (
                <LoadingSpinner height="min-h-64" text="Loading conversations" />
              ) : visibleConversations.length === 0 ? (
                <EmptyState
                  iconName="FaEnvelopeOpen"
                  title="No conversations yet"
                  message="Start a message with someone from your classes to create a thread."
                  action={
                    <Button type="button" iconName="FaPenToSquare" onClick={() => setIsNewMessageOpen(true)} disabled={contacts.length === 0}>
                      New Message
                    </Button>
                  }
                />
              ) : (
                visibleConversations.map((message) => {
                  const otherUser = getOtherUser(message, currentUserId);
                  if (!otherUser) return null;

                  return (
                    <button
                      key={message.id}
                      type="button"
                      onClick={() => setActiveUserId(otherUser.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition-all duration-300 active:scale-[0.99] ${
                        activeUserId === otherUser.id
                          ? "border-primary bg-primary text-bg-dark"
                          : "border-border-muted bg-bg-main text-text hover:border-primary/50"
                      }`}
                    >
                      <h2 className="text-sm font-black uppercase italic tracking-tighter">
                        {otherUser.name}
                      </h2>
                      <p className="mt-2 line-clamp-2 text-xs font-semibold uppercase tracking-wider opacity-80">
                        {message.content}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <div className="flex min-h-[640px] flex-col">
            <div className="border-b border-border-muted bg-bg-main p-5">
              <h2 className="text-xl font-black uppercase italic tracking-tighter text-text">
                {activeUser?.name ?? "Select a conversation"}
              </h2>
              <p className="text-sm font-medium text-text-muted">
                {activeUser ? "Thread history and replies" : "Choose a person from the conversation list."}
              </p>
            </div>

            <div ref={threadRef} className="flex-1 space-y-4 overflow-y-auto p-5">
              {isThreadLoading ? (
                <LoadingSpinner height="min-h-64" text="Loading thread" />
              ) : !activeUserId ? (
                <EmptyState
                  iconName="FaComments"
                  title="No thread selected"
                  message="Select a conversation to read and send messages."
                />
              ) : thread.length === 0 ? (
                <EmptyState
                  iconName="FaCommentDots"
                  title="Start the thread"
                  message="Send the first message to begin this academic conversation."
                />
              ) : (
                thread.map((message) => {
                  const isMine = message.sender_id === currentUserId;
                  const isPending = "is_pending" in message;
                  return (
                    <article key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl border p-4 ${
                          isMine
                            ? "border-primary bg-primary text-bg-dark"
                            : "border-border-muted bg-bg-main text-text"
                        }`}
                      >
                        <p className="text-sm font-medium leading-relaxed">{message.content}</p>
                        <p className="mt-3 text-[11px] font-black uppercase italic tracking-widest opacity-70">
                          {isPending ? "Sending..." : formatDate(message.created_at, { hour: "numeric", minute: "2-digit" })}
                        </p>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            <div className="border-t border-border-muted bg-bg-main p-5">
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <TextArea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Write a message..."
                  fullWidth
                  disabled={!activeUserId}
                />
                <Button
                  type="button"
                  iconName="FaPaperPlane"
                  isLoading={isSending}
                  loadingText="Sending"
                  disabled={!activeUserId || !draft.trim()}
                  onClick={handleSend}
                >
                  Send
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Modal
        isOpen={isNewMessageOpen}
        onClose={() => setIsNewMessageOpen(false)}
        title="New Message"
        primaryAction={{
          label: "Start Thread",
          onClick: startConversation,
          iconName: "FaMessage",
        }}
        secondaryAction={{
          label: "Cancel",
          onClick: () => setIsNewMessageOpen(false),
          variant: "secondary",
        }}
      >
        {contacts.length === 0 ? (
          <EmptyState
            iconName="FaUserGroup"
            title="No contacts yet"
            message={user?.role === "teacher" ? "Students will appear after they join your classes." : "Teachers will appear after you join a class."}
          />
        ) : (
          <Select
            label="Contact"
            value={selectedContactId}
            onChange={(event) => setSelectedContactId(event.target.value)}
            options={contacts.map((contact) => ({
              value: String(contact.id),
              label: `${contact.name} (${contact.role})`,
            }))}
            fullWidth
          />
        )}
      </Modal>
      <ToastProvider />
    </>
  );

  return <MainLayout content={content} />;
};

export default Messages;
