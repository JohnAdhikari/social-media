import logoText from "../../assets/text.png";
import logo from "../../assets/logo.png";
import pfp from "../../assets/pfp.png";
import image from "../../assets/image.png";
import { Link } from "react-router-dom";
import "./displayposts.css";
import reactImg from "../../assets/react.svg";
import { use, useState } from "react";

function DisplayPosts() {
    const [inputText, setInputText] = useState("");
    const [text, setText] = useState("");
    const [picture, setPicture] = useState(null);
    const [posts, setPosts] = useState([]);

    const username = localStorage.getItem("username") || "Guest";

    function handleInputText(e) {
        setInputText(e.target.value);
    }

    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (file) {
            setPicture(URL.createObjectURL(file));
        }
    }

    function displayContent() {
        if(!inputText && !picture) {
            return;
        }
        setPosts(prev => [
            {
                id: Date.now(),
                text: inputText,
                picture: picture
            },
            ...prev

       ]);
       setInputText("");
       setPicture(null);
        
    }





    return(
        <div className="display-container">
            <div className="display-container-input">
                <div className="display-input">
                    <img src={pfp} alt="Profile Picture" className="display-image" />
                    <input type="text" placeholder={`What's on your mind ${username}?`} className="display-post-input" value={inputText} onChange={handleInputText}/>
                    <label htmlFor="imageUpload" className="display-image-input">
                    <img src={image} alt="Upload" className="display-input-img" />
                    </label>
                    <input
                    type="file"
                    id="imageUpload"
                    accept="image/*"
                    hidden
                    onChange={handleImageUpload}
                    />
                </div>
                <button className="display-post-btn" onClick={displayContent}  >Post</button>
            </div>
            {posts.map(post => (
                <div className="display-post-display" key={post.id}>
                    <div className="display-post-header">
                        <img src={pfp} alt="Profile" className="display-post-pfp" />
                        <span className="display-post-username">{username}</span>
                    </div>

                    <div className="display-post-content">
                        <p>{post.text}</p>
                        {post.picture && (
                        <img
                            src={post.picture}
                            alt="Post"
                            className="display-post-image"
                        />
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default DisplayPosts