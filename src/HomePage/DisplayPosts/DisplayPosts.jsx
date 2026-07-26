import { useState, useEffect } from "react";
import pfp from "../../assets/pfp.png";
import imageIcon from "../../assets/image.png";
import "./displayposts.css";

const INITIAL_POSTS = [
  {
    id: 1,
    username: "Alex Rivera",
    avatar: pfp,
    text: "🚀 Just launched our new AI Agent dashboard built with React 19 & FastAPI! Super clean glassmorphism UI and lightning-fast performance.",
    picture: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
    category: "AI & Tech",
    likes: 24,
    isLiked: false,
    comments: [
      { id: 101, username: "Sarah Chen", text: "Looks incredible! Love the glow effects 🔥" },
      { id: 102, username: "John Adhikari", text: "Awesome work team!" }
    ],
    timestamp: "15 mins ago"
  },
  {
    id: 2,
    username: "Emily Taylor",
    avatar: pfp,
    text: "Spent the weekend exploring modern CSS custom properties and responsive grid systems. The web design ecosystem is evolving so fast! 🎨✨",
    picture: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80",
    category: "Design",
    likes: 42,
    isLiked: true,
    comments: [
      { id: 103, username: "David Kim", text: "What color palette did you use here?" }
    ],
    timestamp: "2 hours ago"
  }
];

function DisplayPosts({ searchQuery = "", activeTab = "feed" }) {
  const username = localStorage.getItem("username") || "John Adhikari";

  const [posts, setPosts] = useState(() => {
    const saved = localStorage.getItem("zone_posts");
    return saved ? JSON.parse(saved) : INITIAL_POSTS;
  });

  const [inputText, setInputText] = useState("");
  const [picture, setPicture] = useState(null);
  const [category, setCategory] = useState("General");
  const [activeCommentPostId, setActiveCommentPostId] = useState(null);
  const [commentInput, setCommentInput] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    localStorage.setItem("zone_posts", JSON.stringify(posts));
  }, [posts]);

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

  function handleCreatePost(e) {
    e.preventDefault();
    if (!inputText.trim() && !picture) return;

    const newPost = {
      id: Date.now(),
      username: username,
      avatar: pfp,
      text: inputText.trim(),
      picture: picture,
      category: category,
      likes: 0,
      isLiked: false,
      comments: [],
      timestamp: "Just now"
    };

    setPosts([newPost, ...posts]);
    setInputText("");
    setPicture(null);
    triggerToast("Post published to your feed!");
  }

  function toggleLike(postId) {
    setPosts(posts.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          likes: p.isLiked ? p.likes - 1 : p.likes + 1,
          isLiked: !p.isLiked
        };
      }
      return p;
    }));
  }

  function handleAddComment(postId) {
    if (!commentInput.trim()) return;

    setPosts(posts.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: [
            ...p.comments,
            { id: Date.now(), username: username, text: commentInput.trim() }
          ]
        };
      }
      return p;
    }));

    setCommentInput("");
  }

  function handleDeletePost(postId) {
    setPosts(posts.filter(p => p.id !== postId));
    triggerToast("Post removed");
  }

  const filteredPosts = posts.filter(post => {
    if (activeTab === "explore" && post.category === "General") {
      // Show varied content on explore
      return true;
    }
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      post.text.toLowerCase().includes(query) ||
      post.username.toLowerCase().includes(query) ||
      post.category.toLowerCase().includes(query)
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
          placeholder={`What's on your mind, ${username.split(' ')[0]}?`}
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
      <div className="posts-feed">
        {filteredPosts.length === 0 ? (
          <div className="empty-feed glass-panel">
            <div className="empty-icon">💬</div>
            <h3>No posts found</h3>
            <p>Be the first to share a moment or update your search filter!</p>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <article key={post.id} className="post-card glass-panel">
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
                  <button className="delete-post-btn" onClick={() => handleDeletePost(post.id)} title="Delete post">
                    🗑️
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
                  className={`action-button like-btn ${post.isLiked ? 'liked' : ''}`}
                  onClick={() => toggleLike(post.id)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={post.isLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                  <span>{post.likes} {post.likes === 1 ? 'Like' : 'Likes'}</span>
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
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
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