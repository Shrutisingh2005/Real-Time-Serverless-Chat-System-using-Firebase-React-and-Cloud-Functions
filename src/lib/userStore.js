import { doc, getDoc } from "firebase/firestore";
import { create } from "zustand";
import { db } from "./firebase";

export const useUserStore = create((set) => ({
  currentUser: null,
  isLoading: true,

  fetchUserInfo: async (uid) => {
    // if user is not signed in
    if (!uid) {
      set({ currentUser: null, isLoading: false });
      return;
    }

    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        // user exists in Firestore
        set({ currentUser: docSnap.data(), isLoading: false });
      } else {
        // user logged in but Firestore doc missing
        console.warn("No user doc found, but user is authenticated.");
        set({ currentUser: { id: uid }, isLoading: false });
      }
    } catch (err) {
      console.error("Error fetching user info:", err);
      set({ currentUser: null, isLoading: false });
    }
  },
}));
