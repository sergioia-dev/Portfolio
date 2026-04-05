import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HomePage, Portfolio } from "./pages/pagesBundle.jsx";
import { WhatIsNix, WhatAreJWT } from "./pages/blogs/blogsBundle.jsx";
import { useStorageState } from "./states/states.jsx";
import {
  API_URL,
  BLOGS_SUBURL,
  PROJECTS_SUBURL,
  TAGS_SUBURL,
} from "./configuration/environment.js";

const API = {
  blogs: `${API_URL}${BLOGS_SUBURL}`,
  projects: `${API_URL}${PROJECTS_SUBURL}`,
  tags: `${API_URL}${TAGS_SUBURL}`,
};

function App() {
  const userLanguage = navigator.language.substring(0, 2).toUpperCase();

  const [language, setLanguage] = useStorageState(
    "language",
    userLanguage === "EN" ? "EN" : "ES",
  );
  const [url, setUrl] = React.useState(`${API.blogs + language}`);
  const [theme, setTheme] = useStorageState(
    "theme",
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "GRUVBOX_DARK"
      : "",
  );

  const handleTheme = () => {
    setTheme(event.target.value);
  };

  const handleLanguage = () => {
    if (language === "EN") {
      setLanguage("ES");
      setUrl(`${API.blogs}ES`);
    } else {
      setLanguage("EN");
      setUrl(`${API.blogs}EN`);
    }
  };
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              language={language}
              handleLanguage={handleLanguage}
              theme={theme}
              handleTheme={handleTheme}
              url={url}
              setUrl={setUrl}
              tags_url={API.tags}
              blogs_url={API.blogs}
            />
          }
        />
        <Route
          path="/portfolio"
          element={
            <Portfolio
              theme={theme}
              handleTheme={handleTheme}
              language={language}
              handleLanguage={handleLanguage}
              projects_url={API.projects}
              blogs_url={API.blogs}
            />
          }
        />
        <Route
          path="/blogs/what-is-nix"
          element={
            <WhatIsNix
              theme={theme}
              handleTheme={handleTheme}
              language={language}
              handleLanguage={handleLanguage}
              projects_url={API.projects}
              blogs_url={API.blogs}
            />
          }
        />

        <Route
          path="/blogs/what-are-jwt"
          element={
            <WhatAreJWT
              theme={theme}
              handleTheme={handleTheme}
              language={language}
              handleLanguage={handleLanguage}
              projects_url={API.projects}
              blogs_url={API.blogs}
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
