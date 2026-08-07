import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import pfp from "../assets/pfp.png";
import api from "../api";
import "./profile.css";

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

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [user, userPosts, friends] = await Promise.all([
        !isOwn ? api.getUser(profileName) : Promise.resolve(null),
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

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-card glass-panel profile-loading">Loading profile...</div>
      </div>
    );
  }

  const bio = isOwn
    ? localStorage.getItem("zone_user_bio") || "This is you. Tell people about yourself!"
    : profile?.bio || "Zone Media user";

  return (
    <div className="profile-page">
      <button className="profile-back" onClick={() => navigate(isOwn ? "/homepage" : -1)}>
        &larr; Back
      </button>

      <div className="profile-card glass-panel">
        <div className="profile-cover"></div>

        <div className="profile-header">
          <div className="profile-avatar-wrap">
            <img src={pfp} alt={profileName} className="profile-avatar" />
            <span className="online-indicator large"></span>
          </div>

          <div className="profile-header-top">
            <div className="profile-header-info">
              <h1 className="profile-name">{profileName}</h1>
              <span className="profile-handle">@{profileName.toLowerCase().replace(/\s+/g, "")}</span>
            </div>

            <div className="profile-actions">
              {isOwn ? (
                <Link to="/homepage" className="btn-primary profile-action">
                  Edit Profile
                </Link>
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

          <p className="profile-bio">{bio}</p>
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
    </div>
  );
}

export default Profile;
