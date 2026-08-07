import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import pfp from "../assets/pfp.png";
import api from "../api";
import "./profile.css";

const MAX_AVATAR = 512;
const MAX_COVER = 1600;

function resizeImage(file, maxSize) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file is not a valid image"));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function mapPost(p) {
  return {
    id: p.id,
    username: p.username,
    avatar: pfp,
    text: p.text,
    picture: p.picture,
    category: p.category,
    likes: p.likes,
    isLiked: false,
    comments: (p.comments || []).map((c) => ({ id: c.id, username: c.username, text: c.text })),
  };
}

function Profile() {
  const { username: routeUser } = useParams();
  const navigate = useNavigate();
  const currentUser = localStorage.getItem("username") || "Guest";
  const isOwn = !routeUser || routeUser === currentUser;
  const profileName = isOwn ? currentUser : decodeURIComponent(routeUser);

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [friendState, setFriendState] = useState("none");
  const [busy, setBusy] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState(null);
  const [editCover, setEditCover] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [user, userPosts, friends] = await Promise.all([
        isOwn ? api.me() : api.getUser(profileName),
        api.getUserPosts(profileName),
        api.getFriends(),
      ]);
      setProfile(user);
      setPosts((userPosts || []).map(mapPost));
      if (!isOwn) {
        if ((friends.friends || []).some((f) => f.username === profileName)) setFriendState("friends");
        else if ((friends.pending_incoming || []).includes(profileName)) setFriendState("incoming");
        else if ((friends.pending_sent || []).includes(profileName)) setFriendState("outgoing");
        else setFriendState("none");
      }
    } catch (e) {
      setError(e.message || "Could not load profile");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileName]);

  async function handleFriendAction() {
    setBusy(true);
    try {
      if (friendState === "none") {
        await api.sendFriendRequest(profileName);
        setFriendState("outgoing");
      } else if (friendState === "incoming") {
        await api.respondFriendRequest(profileName, true);
        setFriendState("friends");
      } else if (friendState === "friends") {
        await api.removeFriend(profileName);
        setFriendState("none");
      }
    } finally {
      setBusy(false);
    }
  }

  function openEdit() {
    setEditBio(profile?.bio || "");
    setEditAvatar(null);
    setEditCover(null);
    setEditError("");
    setEditing(true);
  }

  async function onAvatarFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setEditAvatar(await resizeImage(file, MAX_AVATAR));
    } catch (err) {
      setEditError(err.message);
    }
  }

  async function onCoverFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setEditCover(await resizeImage(file, MAX_COVER));
    } catch (err) {
      setEditError(err.message);
    }
  }

  async function saveProfile() {
    setSaving(true);
    setEditError("");
    try {
      const data = { bio: editBio };
      if (editAvatar) data.avatar = editAvatar;
      if (editCover) data.cover = editCover;
      const updated = await api.updateProfile(data);
      setProfile(updated);
      setEditing(false);
    } catch (err) {
      setEditError(err.message || "Could not save changes");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-card glass-panel profile-loading">Loading profile...</div>
      </div>
    );
  }

  const avatarUrl = profile?.avatar || pfp;
  const coverUrl = profile?.cover || "";
  const bio = profile?.bio || "";

  return (
    <div className="profile-page">
      <button className="profile-back" onClick={() => navigate(isOwn ? "/homepage" : -1)}>
        &larr; Back
      </button>

      <div className="profile-card glass-panel">
        <div
          className="profile-cover"
          style={coverUrl ? { backgroundImage: `url(${coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        >
          {isOwn && (
            <button className="profile-cover-edit" onClick={openEdit} aria-label="Change cover photo">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
            </button>
          )}
        </div>

        <div className="profile-header">
          <div className="profile-avatar-wrap">
            <img src={avatarUrl} alt={profileName} className="profile-avatar" />
            {isOwn && (
              <button className="profile-avatar-edit" onClick={openEdit} aria-label="Change profile photo">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
              </button>
            )}
            <span className="online-indicator large"></span>
          </div>

          <div className="profile-header-top">
            <div className="profile-header-info">
              <h1 className="profile-name">{profileName}</h1>
              <span className="profile-handle">@{profileName.toLowerCase().replace(/\s+/g, "")}</span>
            </div>

            <div className="profile-actions">
              {isOwn ? (
                <button className="btn-primary profile-action" onClick={openEdit}>
                  Edit Profile
                </button>
              ) : (
                <>
                  <Link to={`/messages/${encodeURIComponent(profileName)}`} className="profile-action-chat">
                    Message
                  </Link>
                  <button
                    className={`btn-primary profile-btn ${friendState === "friends" ? "profile-btn-following" : ""}`}
                    onClick={handleFriendAction}
                    disabled={busy}
                  >
                    {friendState === "friends" ? "Unfriend" : friendState === "incoming" ? "Accept" : friendState === "outgoing" ? "Pending" : "Add Friend"}
                  </button>
                </>
              )}
            </div>
          </div>

          <p className="profile-bio">{bio || "Your Bio"}</p>
        </div>

        <div className="profile-stats">
          <div className="profile-stat"><b>{posts.length}</b><span>Posts</span></div>
          <div className="profile-stat"><b>{profile?.friend_count ?? "—"}</b><span>Friends</span></div>
          <div className="profile-stat"><b>{profile?.post_count ?? posts.length}</b><span>Total Posts</span></div>
        </div>

        {error && <div className="profile-error">{error}</div>}

        <div className="profile-posts-section">
          <h3>Posts</h3>
          {posts.length === 0 ? (
            <div className="profile-posts-empty">No posts yet.</div>
          ) : (
            <div className="profile-posts">
              {posts.map((post) => (
                <div key={post.id} className="profile-post glass-panel">
                  <p className="profile-post-text">{post.text}</p>
                  {post.picture && (
                    <div className="profile-post-media">
                      <img src={post.picture} alt="Post media" className="profile-post-image" />
                    </div>
                  )}
                  <div className="profile-post-meta">
                    <span>{post.likes} likes</span>
                    <span>{post.category}</span>
                    <span>{post.comments.length} comments</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editing && (
        <div className="profile-modal-backdrop" onClick={() => setEditing(false)}>
          <div className="profile-modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-head">
              <h2>Edit Profile</h2>
              <button className="profile-modal-close" onClick={() => setEditing(false)} aria-label="Close">
                ×
              </button>
            </div>

            <div className="profile-modal-field">
              <label>Profile Photo</label>
              <div className="profile-modal-photo-row">
                <img src={editAvatar || avatarUrl} alt="Avatar preview" className="profile-modal-avatar" />
                <div className="profile-modal-photo-actions">
                  <input ref={avatarInputRef} type="file" accept="image/*" hidden onChange={onAvatarFile} />
                  <button className="btn-primary" onClick={() => avatarInputRef.current?.click()}>
                    Upload photo
                  </button>
                  {editAvatar && (
                    <button className="profile-modal-ghost" onClick={() => setEditAvatar(null)}>
                      Revert
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="profile-modal-field">
              <label>Cover Photo</label>
              <div
                className="profile-modal-cover-preview"
                style={(editCover || coverUrl) ? { backgroundImage: `url(${editCover || coverUrl})` } : undefined}
              >
                {!(editCover || coverUrl) && <span>No cover set</span>}
              </div>
              <div className="profile-modal-photo-actions">
                <input ref={coverInputRef} type="file" accept="image/*" hidden onChange={onCoverFile} />
                <button className="btn-primary" onClick={() => coverInputRef.current?.click()}>
                  Upload cover
                </button>
                {editCover && (
                  <button className="profile-modal-ghost" onClick={() => setEditCover(null)}>
                    Revert
                  </button>
                )}
              </div>
            </div>

            <div className="profile-modal-field">
              <label htmlFor="edit-bio">Bio</label>
              <textarea
                id="edit-bio"
                className="profile-modal-bio"
                value={editBio}
                maxLength={200}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Tell people about yourself..."
              />
              <span className="profile-modal-count">{editBio.length}/200</span>
            </div>

            {editError && <div className="profile-error">{editError}</div>}

            <div className="profile-modal-actions">
              <button className="profile-modal-ghost" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={saveProfile} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
