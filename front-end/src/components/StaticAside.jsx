import meImg from "../assets/me.webp";
import { GithubSVG, LinkedInSVG } from "../components/SVG.jsx";
import "../style/StaticAside.css";

function StaticAside({ language, handleLanguage, theme, handleTheme }) {
  const ES_text = {
    title: "Desarrollador de Software",
    home_url: "Inicio",
    portfolio_url: "Portafolio",
    contact_url: "Contacto",
    language_btn: "Español",
  };
  const EN_text = {
    title: "Software Developer",
    home_url: "Home",
    portfolio_url: "Portfolio",
    contact_url: "Contact",
    language_btn: "English",
  };

  const sidebar = ({
    title,
    home_url,
    portfolio_url,
    contact_url,
    language_btn,
  }) => (
    <aside className="static-aside">
      <div className="aside-container">
        <img src={meImg} alt="Me IMG"></img>
        <h1>Sergio IA</h1>
        <h3>{title}</h3>
        <div className="icons-container">
          <a href="https://github.com/sergioia-dev" target="_blank">
            <GithubSVG />
          </a>
          <a
            href="https://www.linkedin.com/in/sergio-idarraga-aguirre-b8473a319/"
            target="_blank"
          >
            <LinkedInSVG />
          </a>
        </div>
        <ol className="aside-links">
          <li>
            <a href="/">{home_url}</a>
          </li>
          <li>
            <a href="/portfolio">{portfolio_url}</a>
          </li>
          <li>
            <a href="/portfolio#contact">{contact_url}</a>
          </li>
        </ol>
        <div className="button-controller">
          <button type="button" onClick={handleLanguage}>
            {language_btn}
          </button>
          <select
            id="colorscheme"
            name="colorscheme"
            value={theme}
            onChange={handleTheme}
          >
            <option value="">Light</option>
            <option value="CATPPUCCIN_LATTE">Latte</option>
            <option value="GRUVBOX_DARK">Dark</option>
            <option value="CATPPUCCIN_MOCHA">Mocha</option>
          </select>
        </div>
      </div>
    </aside>
  );

  return sidebar(language === "EN" ? EN_text : ES_text);
}

export default StaticAside;
