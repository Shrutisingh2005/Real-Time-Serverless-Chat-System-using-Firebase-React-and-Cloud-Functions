import { useEffect, useRef, useState } from "react";
import "./chat.css";
import EmojiPicker from "emoji-picker-react";
import {
  arrayUnion,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useChatStore } from "../../lib/chatStore";
import { useUserStore } from "../../lib/userStore";
import { format } from "timeago.js";
import { isOffensive, localIsOffensive } from "../../lib/moderation";
import toast from "react-hot-toast";

const Chat = () => {
  const [chat, setChat] = useState();
  const [open, setOpen] = useState(false); // emoji picker open state
  const [text, setText] = useState("");
  const [isBlockedMsg, setIsBlockedMsg] = useState(false);

  const { currentUser } = useUserStore();
  const { chatId, user, isCurrentUserBlocked, isReceiverBlocked } =
    useChatStore();

  const endRef = useRef(null);
  const changeDebounceRef = useRef(null); // for debounced remote moderation

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.messages]);

  useEffect(() => {
    if (!chatId) return;
    const unSub = onSnapshot(doc(db, "chats", chatId), (res) => {
      setChat(res.data());
    });
    return () => unSub();
  }, [chatId]);

  // EMOJI PICKER
  const handleEmoji = (e) => {
    setText((prev) => prev + e.emoji);
    setOpen(false);
  };

  // MESSAGE CHANGE HANDLER WITH LOCAL + REMOTE MODERATION
  const handleChange = (e) => {
    const value = e.target.value;
    setText(value);

    // LOCAL check
    try {
      const locallyBlocked = localIsOffensive(value);
      if (locallyBlocked) {
        setIsBlockedMsg(true);
        if (changeDebounceRef.current) {
          clearTimeout(changeDebounceRef.current);
          changeDebounceRef.current = null;
        }
        return;
      } else setIsBlockedMsg(false);
    } catch (err) {
      console.error("[moderation] local check error:", err);
      setIsBlockedMsg(false);
    }

    // REMOTE debounce check
    if (changeDebounceRef.current) clearTimeout(changeDebounceRef.current);
    changeDebounceRef.current = setTimeout(async () => {
      try {
        const remoteBlocked = await isOffensive(value, { useRemote: false });
        setIsBlockedMsg(!!remoteBlocked);
      } catch (err) {
        console.error("[moderation] remote check error:", err);
        setIsBlockedMsg(false);
      } finally {
        changeDebounceRef.current = null;
      }
    }, 300);
  };

  const handleSend = async () => {
    if (!text.trim()) return;

    // FINAL LOCAL check
    try {
      if (localIsOffensive(text)) {
        setIsBlockedMsg(true);
        toast.error("🚫 Offensive message blocked", {
          style: { background: "#ffdddd", color: "#d00000", border: "1px solid #d00000" },
        });
        return;
      }
    } catch (err) {
      console.error(err);
    }

    // OPTIONAL REMOTE check
    try {
      if (await isOffensive(text, { useRemote: false })) {
        setIsBlockedMsg(true);
        toast.error("🚫 Offensive message blocked", {
          style: { background: "#ffdddd", color: "#d00000", border: "1px solid #d00000" },
        });
        setText("");
        return;
      }
    } catch (err) {
      console.error(err);
    }

    // SEND MESSAGE
    try {
      await updateDoc(doc(db, "chats", chatId), {
        messages: arrayUnion({
          senderId: currentUser.id,
          text: text.trim(),
          createdAt: new Date(),
        }),
      });

      const ids = [currentUser.id, user.id];
      for (const id of ids) {
        const ref = doc(db, "userchats", id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          const chats = data.chats || [];
          const i = chats.findIndex((c) => c.chatId === chatId);
          if (i !== -1) {
            chats[i] = {
              ...chats[i],
              lastMessage: text.trim(),
              isSeen: id === currentUser.id,
              updatedAt: Date.now(),
            };
            await updateDoc(ref, { chats });
          } else {
            await updateDoc(ref, {
              chats: arrayUnion({
                chatId,
                lastMessage: text.trim(),
                receiverId: id === currentUser.id ? user.id : currentUser.id,
                updatedAt: Date.now(),
              }),
            });
          }
        } else {
          await setDoc(ref, {
            chats: [
              {
                chatId,
                lastMessage: text.trim(),
                receiverId: id === currentUser.id ? user.id : currentUser.id,
                updatedAt: Date.now(),
              },
            ],
          });
        }
      }
    } catch (e) {
      console.error("handleSend error:", e);
      toast.error("Failed to send message");
    } finally {
      setText("");
      setIsBlockedMsg(false);
    }
  };

  return (
    <div className="chat">
      <div className="top">
        <div className="user">
          <img src={user?.avatar || "/avatar.png"} alt="" />
          <div className="texts">
            <span>{user?.username}</span>
            <p>Chat safely ✨</p>
          </div>
        </div>
      </div>

      <div className="center">
        {chat?.messages?.map((m, i) => (
          <div
            className={m.senderId === currentUser?.id ? "message own" : "message"}
            key={i}
          >
            <div className="texts">
              <p>{m.text}</p>
              <span>
                {m.createdAt
                  ? typeof m.createdAt?.toDate === "function"
                    ? format(m.createdAt.toDate())
                    : format(new Date(m.createdAt))
                  : ""}
              </span>
            </div>
          </div>
        ))}
        <div ref={endRef}></div>
      </div>

      <div className="bottom">
        <input
          type="text"
          value={text}
          onChange={handleChange}
          placeholder={
            isCurrentUserBlocked || isReceiverBlocked
              ? "You cannot send a message"
              : isBlockedMsg
              ? "🚫 Offensive message blocked"
              : "Type a message..."
          }
          disabled={isCurrentUserBlocked || isReceiverBlocked}
          style={{ border: isBlockedMsg ? "2px solid red" : "1px solid #ccc" }}
        />

        {/* EMOJI PICKER */}
        <div className="emoji">
          <img src="/emoji.png" alt="emoji" onClick={() => setOpen((prev) => !prev)} />
          {open && <EmojiPicker onEmojiClick={handleEmoji} />}
        </div>

        <button
          onClick={handleSend}
          disabled={isBlockedMsg || isCurrentUserBlocked || isReceiverBlocked}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;
