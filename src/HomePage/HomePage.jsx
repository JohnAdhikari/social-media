import "./homepage.css";
import NavigationBar from "./NavigationBar/NavigationBar";
import DisplayPosts from "./DisplayPosts/DisplayPosts";
import Contact from "./ContactList/Contact";
import AboutMe from "./aboutme/AboutMe";

function Homepage() {
  return (<>
    <div className="homepage-container">
      <div className="homepage-nav-bar-container">
        <NavigationBar />
      </div>

      <div className="homepage-content-grid">
        <div className="homepage-left-sidebar">
          <AboutMe />
        </div>
        <div className="homepage-main-feed">  
          <DisplayPosts />
        </div>
        <div className="homepage-right-sidebar">
          <Contact />
        </div>
        
      </div>
    </div>
    <footer><p className="cc">© {new Date().getFullYear()} John Adhikari</p></footer>
  </>);
}

export default Homepage;