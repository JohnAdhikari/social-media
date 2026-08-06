import { useState, useEffect, useRef } from "react";
import pfp from "../../assets/pfp.png";
import imageIcon from "../../assets/image.png";
import api from "../../api";
import useGsapReveal from "../../hooks/useGsapReveal";
import "./displayposts.css";

// Map a backend post to the shape the UI expects.
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
    comments: (p.comments || []).map((c) => ({
      id: c.id,
      username: c.username,
      text: c.text,
    })),
    timestamp: "recent",
  };
}

function DisplayPosts({ searchQuery = "", activeTab = "feed" }) {
  const username = localStorage.getItem("username") || "Guest";

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [inputText, setInputText] = useState("");
  const [picture, setPicture] = useState(null);
  const [category, setCategory] = useState("General");
  const [activeCommentPostId, setActiveCommentPostId] = useState(null);
  const [commentInput, setCommentInput] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const feedRef = useRef(null);
  useGsapReveal(feedRef, { y: 28, stagger: 0.09 });

  async function loadPosts() {
    try {
      setLoading(true);
      setError("");
      const data = await api.getPosts();
      setPosts(data.map(mapPost));
    } catch (e) {
      setError(e.message || "Could not load posts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
  }, [activeTab]);

  function triggerToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 2500);
  }

  function handleImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPicture(reader.result);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleCreatePost(e) {
    e.preventDefault();
    if (!inputText.trim() && !picture) return;

    try {
      const created = await api.createPost({
        text: inputText.trim(),
        picture: picture || null,
        category,
      });
      setPosts([mapPost(created), ...posts]);
      setInputText("");
      setPicture(null);
      triggerToast("Post published to your feed!");
    } catch (err) {
      triggerToast(err.message || "Could not publish post");
    }
  }

  async function toggleLike(postId) {
    setPosts(
      posts.map((p) =>
        p.id === postId
          ? { ...p, likes: p.isLiked ? p.likes - 1 : p.likes + 1, isLiked: !p.isLiked }
          : p
      )
    );
    try {
      await api.likePost(postId);
    } catch {
      /* optimistic update; sync with server on next load */
    }
  }

  async function handleAddComment(postId) {
    if (!commentInput.trim()) return;
    const text = commentInput.trim();
    try {
      const comment = await api.addComment(postId, text);
      setPosts(
        posts.map((p) =>
          p.id === postId ? { ...p, comments: [...p.comments, comment] } : p
        )
      );
      setCommentInput("");
    } catch (err) {
      triggerToast(err.message || "Could not add comment");
    }
  }

  async function handleDeletePost(postId) {
    try {
      await api.deletePost(postId);
      setPosts(posts.filter((p) => p.id !== postId));
      triggerToast("Post removed");
    } catch (err) {
      triggerToast(err.message || "Could not delete post");
    }
  }

  const filteredPosts = posts.filter((post) => {
    // Feed keeps all categories; Explore focuses on varied/non-General content
    if (activeTab === "feed") {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          post.text.toLowerCase().includes(q) ||
          post.username.toLowerCase().includes(q) ||
          post.category.toLowerCase().includes(q)
        );
      }
      return true;
    }
    if (post.category === "General") return true;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      post.text.toLowerCase().includes(q) ||
      post.username.toLowerCase().includes(q) ||
      post.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="display-posts-container">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="toast-notification glass-panel">
          <span>✨ {toastMessage}</span>
        </div>
      )}

      {/* Post Creator Panel */}
      <div className="create-post-card glass-panel">
        <div className="create-post-header">
          <img src={pfp} alt="Profile" className="user-avatar" />
          <div className="creator-meta">
            <span className="creator-name">{username}</span>
            <select
              className="category-selector"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="General">🌐 General</option>
              <option value="AI & Tech">⚡ AI & Tech</option>
              <option value="Design">🎨 Design</option>
              <option value="Life">🌿 Life</option>
            </select>
          </div>
        </div>

        <textarea
          className="post-textarea"
          rows="3"
          placeholder={`What's on your mind, ${username.split(" ")[0]}?`}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />

        {/* Image Attachment Preview */}
        {picture && (
          <div className="image-preview-wrapper">
            <img src={picture} alt="Preview" className="upload-preview" />
            <button className="remove-img-btn" onClick={() => setPicture(null)}>✕</button>
          </div>
        )}

        <div className="create-post-actions">
          <div className="action-tools">
            <label htmlFor="imageUpload" className="upload-btn-label">
              <img src={imageIcon} alt="Attach" className="tool-icon" />
              <span>Photo / Image</span>
            </label>
            <input
              type="file"
              id="imageUpload"
              accept="image/*"
              hidden
              onChange={handleImageUpload}
            />
          </div>

          <button
            className="post-submit-btn btn-primary"
            onClick={handleCreatePost}
            disabled={!inputText.trim() && !picture}
          >
            Publish Post
          </button>
        </div>
      </div>

      {/* Posts Stream */}
      <div className="posts-feed" ref={feedRef}>
        {loading ? (
          <div className="empty-feed glass-panel">
            <div className="empty-icon" aria-hidden="true">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
              </svg>
            </div>
            <h3>Loading feed...</h3>
            <p>Fetching the latest posts from the server.</p>
          </div>
        ) : error ? (
          <div className="empty-feed glass-panel">
            <div className="empty-icon" aria-hidden="true">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h3>Couldn't reach the server</h3>
            <p>{error} — is the FastAPI backend running on port 8000?</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="empty-feed glass-panel">
            <div className="empty-icon" aria-hidden="true">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <h3>No posts found</h3>
            <p>Be the first to share a moment or update your search filter!</p>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <article key={post.id} className="post-card glass-panel" data-reveal>
              {/* Post Header */}
              <div className="post-card-header">
                <div className="author-info">
                  <img src={post.avatar || pfp} alt={post.username} className="author-avatar" />
                  <div>
                    <div className="author-name-row">
                      <h4 className="author-name">{post.username}</h4>
                      <span className="badge badge-gradient">{post.category}</span>
                    </div>
                    <span className="post-time">{post.timestamp}</span>
                  </div>
                </div>

                {post.username === username && (
                  <button className="delete-post-btn" onClick={() => handleDeletePost(post.id)} title="Delete post" aria-label="Delete post">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                  </button>
                )}
              </div>

              {/* Post Content */}
              <div className="post-body">
                <p className="post-text">{post.text}</p>
                {post.picture && (
                  <div className="post-media-container">
                    <img src={post.picture} alt="Post media" className="post-image" />
                  </div>
                )}
              </div>

              {/* Post Footer Actions */}
              <div className="post-footer">
                <button
                  className={`action-button like-btn ${post.isLiked ? "liked" : ""}`}
                  onClick={() => toggleLike(post.id)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={post.isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                  <span>{post.likes} {post.likes === 1 ? "Like" : "Likes"}</span>
                </button>

                <button
                  className="action-button comment-btn"
                  onClick={() => setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  <span>{post.comments.length} Comments</span>
                </button>

                <button
                  className="action-button share-btn"
                  onClick={() => triggerToast("Link copied to clipboard!")}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="18" cy="5" r="3"></circle>
                    <circle cx="6" cy="12" r="3"></circle>
                    <circle cx="18" cy="19" r="3"></circle>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                  </svg>
                  <span>Share</span>
                </button>
              </div>

              {/* Comments Section */}
              {activeCommentPostId === post.id && (
                <div className="comments-section">
                  <div className="comments-list">
                    {post.comments.map((comment) => (
                      <div key={comment.id} className="comment-item">
                        <img src={pfp} alt="avatar" className="comment-avatar" />
                        <div className="comment-bubble">
                          <span className="comment-author">{comment.username}</span>
                          <p className="comment-text">{comment.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="add-comment-row">
                    <input
                      type="text"
                      className="comment-input"
                      placeholder="Write a comment..."
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddComment(post.id)}
                    />
                    <button
                      className="send-comment-btn btn-primary"
                      onClick={() => handleAddComment(post.id)}
                    >
                      Post
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}

export default DisplayPosts;
