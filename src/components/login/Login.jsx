import { useState } from "react";
import "./login.css";
import { toast } from "react-toastify";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

/**
 * Option B: Single shared/default avatar for all users.
 * Make sure you have a file public/avatar.png in your project.
 */

const Login = () => {
  const [loading, setLoading] = useState(false);

  // ---------- REGISTER ----------
  const handleRegister = async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const { username, email, password } = Object.fromEntries(formData);

    // client-side validation (before network calls)
    if (!username || !email || !password) {
      toast.warn("Please fill all fields!");
      return;
    }

    setLoading(true);
    try {
      // check unique username
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", username));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        toast.warn("Select another username!");
        return;
      }

      // create firebase auth user
      const res = await createUserWithEmailAndPassword(auth, email, password);

      // use single default avatar (no upload required)
      const avatarUrl = "/avatar.png";

      // save user document
      await setDoc(doc(db, "users", res.user.uid), {
        username,
        email,
        avatar: avatarUrl,
        id: res.user.uid,
        blocked: [],
      });

      // create empty userchats doc
      await setDoc(doc(db, "userchats", res.user.uid), {
        chats: [],
      });

      toast.success("Account created! You can login now!");
      e.target.reset();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  // ---------- LOGIN ----------
  const handleLogin = async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const { email, password } = Object.fromEntries(formData);

    if (!email || !password) {
      toast.warn("Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Login successful!");
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <div className="item">
        <h2>Welcome back,</h2>
        <form onSubmit={handleLogin}>
          <input type="text" placeholder="Email" name="email" />
          <input type="password" placeholder="Password" name="password" />
          <button disabled={loading}>{loading ? "Loading..." : "Sign In"}</button>
        </form>
      </div>

      <div className="separator"></div>

      <div className="item">
        <h2>Create an Account</h2>
        <form onSubmit={handleRegister}>
          {/* show the shared avatar preview */}
          <div style={{ marginBottom: 12 }}>
            <img
              src="/avatar.png"
              alt="default avatar"
              style={{ width: 80, height: 80, borderRadius: 8 }}
            />
          </div>

          <input type="text" placeholder="Username" name="username" />
          <input type="text" placeholder="Email" name="email" />
          <input type="password" placeholder="Password" name="password" />
          <button disabled={loading}>{loading ? "Loading..." : "Sign Up"}</button>
        </form>
      </div>
    </div>
  );
};

export default Login;
