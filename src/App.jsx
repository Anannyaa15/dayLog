import { useEffect, useState } from "react";
import { auth, provider, db } from "./firebase";
import {
  signInWithPopup,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import "./App.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [date, setDate] = useState("");
  const [entry, setEntry] = useState("");
  const [entries, setEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Auth state (keeps user after reload)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setEntries([]);
      }
    });
    return unsub;
  }, []);

  // Fetch user's entries
  const fetchEntries = async (u) => {
    if (!u) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "entries"),
        where("uid", "==", u.uid),
        orderBy("date", "desc")
      );
      const snap = await getDocs(q);
      const arr = [];
      snap.forEach((doc) => arr.push({ id: doc.id, ...doc.data() }));
      setEntries(arr);
    } catch (err) {
      console.error("fetchEntries:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchEntries(user);
  }, [user]);

  // Sign in
  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will set user and fetch entries
    } catch (err) {
      console.error("Sign in error:", err);
    }
  };

  // Sign out
  const signOutUser = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (err) {
      console.error("Sign out:", err);
    }
  };

  // Save entry (used by modal)
  const saveEntry = async () => {
    if (!date || !entry.trim()) {
      alert("Please pick a date and write something.");
      return;
    }
    try {
      await addDoc(collection(db, "entries"), {
        uid: user.uid,
        date,
        text: entry.trim(),
        createdAt: serverTimestamp(),
      });
      setEntry("");
      setDate("");
      setShowEntryForm(false);
      fetchEntries(user);
    } catch (err) {
      console.error("saveEntry:", err);
    }
  };

  // Filtered entries by search
  const visibleEntries = entries.filter((e) =>
    e.text?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="app-root">
      <div className="app-center">
        {!user ? (
          <div className="landing fade-in">
            <h1 className="logo">dayLog</h1>
            <p className="tagline">Capture your thoughts, one day at a time ✨</p>
            <div className="landing-cta">
              <button className="signin-btn" onClick={signInWithGoogle}>
                Sign in with Google
              </button>
            </div>
            <p className="small-note">Build your habit — one entry a day.</p>
          </div>
        ) : (
          <div className="dashboard fade-in">
            <header className="header">
              <div className="header-inner">
                <div>
                  <h1 className="brand">dayLog</h1>
                  <p className="welcome">Welcome, {user.displayName}</p>
                </div>
                <div className="profile-actions">
                  {user.photoURL && (
                    <img
                      src={user.photoURL}
                      alt="avatar"
                      className="avatar"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <button className="ghost-btn" onClick={signOutUser}>
                    Sign out
                  </button>
                </div>
              </div>
            </header>

            <div className="toolbar">
              <input
                className="search-box"
                type="search"
                placeholder="Search entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              <div className="desktop-actions">
                <button
                  className="primary-btn"
                  onClick={() => setShowEntryForm(true)}
                >
                  + New Entry
                </button>
              </div>
            </div>

            <h3 className="section-title">My Entries</h3>

            <div className="entries-list">
              {loading && <div className="loading">Loading…</div>}
              {!loading && visibleEntries.length === 0 && (
                <div className="empty-note">No entries yet — click + to add one.</div>
              )}
              {visibleEntries.map((e) => (
                <article className="entry fade-up" key={e.id}>
                  <strong className="entry-date">{e.date}</strong>
                  <p className="entry-text">{e.text}</p>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating button (always bottom-right when user is signed in) */}
      {user && (
        <button
          className="floating-btn"
          title={showEntryForm ? "Close" : "Add entry"}
          onClick={() => setShowEntryForm((s) => !s)}
        >
          {showEntryForm ? "✖" : "+"}
        </button>
      )}

      {/* Modal centered form */}
      {showEntryForm && user && (
        <div className="modal-overlay" onClick={() => setShowEntryForm(false)}>
          <div
            className="modal"
            onClick={(e) => {
              e.stopPropagation(); // don't close when clicking inside modal
            }}
          >
            <h3>New Entry</h3>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <textarea
              rows="6"
              placeholder="Write your thoughts..."
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
            />
            <div className="modal-actions">
              <button className="primary-btn" onClick={saveEntry}>
                Save
              </button>
              <button
                className="ghost-btn"
                onClick={() => {
                  setShowEntryForm(false);
                  setDate("");
                  setEntry("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}