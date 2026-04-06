import React, { useState } from "react";
import { useFetchData } from "../states/states";
import StaticAside from "../components/StaticAside";
import Loading from "../components/Loading";
import "../style/Portfolio.css";
import {
  ReactSVG,
  NodeSVG,
  JavascriptSVG,
  TypescriptSVG,
  NixSVG,
  SpringSVG,
  FlutterSVG,
  GitSVG,
  HtmlSVG,
  JavaSVG,
  DartSVG,
  CssSVG,
  ExpressSVG,
  DebianSVG,
  MintSVG,
  UbuntuSVG,
  CodeSVG,
  MysqlSVG,
  PostgreSVG,
  SQLiteSVG,
  DockerSVG,
} from "../components/SVG";

function Portfolio({
  language,
  handleLanguage,
  theme,
  handleTheme,
  blogs_url,
  projects_url,
}) {
  const ES_text = {
    introduction: {
      title: "Bienvenido a mi Portafolio",
      slogan: "¿Qué vamos a construir hoy?",
      intro:
        "Soy un Desarrollador de Software apasionado por la intersección entre el desarrollo de aplicaciones y los fundamentos de los sistemas operativos. Esta dualidad me permite crear software no solo funcional, sino también eficiente y consciente del sistema en el que se ejecuta. Aplico este mismo rigor para implementar arquitecturas limpias y código reproducible, explorando actualmente Nix para llevar estos conceptos al siguiente nivel. Con un dominio intermedio de Linux, busco retos donde pueda potenciar mis habilidades a un siguiente nivel.",
      btnProjects: "Ver mis Proyectos",
      btnContact: "Contacto",
      suggestedArticles: "Artículos Recomendados",
      btnBlog: "Leer Artículo",
    },
    technologies: "Mis Habilidades",
    projects: {
      title: "Proyectos",
      btnWebsite: "Ver el Sitio",
      btnRepo: "Ver el Repositorio",
    },
    contact: {
      title: "Contacto",
      nameLabel: "Nombre",
      messageLabel: "Mensaje",
      btnMessage: "Enviar Mensaje",
      btnSubmitted: "Enviado √",
      slogan: "Vamos a construir un nuevo mundo",
    },
  };

  const EN_text = {
    introduction: {
      title: "Welcome to my Portfolio",
      slogan: "What are we going to build today?",
      intro:
        "I am a Software Developer passionate about the intersection between application development and operating system fundamentals. This dual focus allows me to create software that is not only functional, but also efficient and system-aware. I apply this same rigor to implementing clean architectures and reproducible code, and I am currently exploring Nix to take these concepts to the next level. With an intermediate command of Linux, I am seeking challenges where I can elevate my skills to a higher tier.",
      btnProjects: "View my Projects",
      btnContact: "Contact",
      suggestedArticles: "Suggested Articles",
      btnBlog: "Read Article",
    },
    technologies: "My Skills",
    projects: {
      title: "Projects",
      btnWebsite: "View Website",
      btnRepo: "View Repository",
    },
    contact: {
      title: "Contact",
      nameLabel: "Name",
      messageLabel: "Message",
      btnMessage: "Send Message",
      btnSubmitted: "Sent √",
      slogan: "Let's start building a new world",
    },
  };
  const SectionArea = ({ text, blogs_url, projects_url }) => {
    const Introduction = ({ blogs_url, text }) => {
      const FeaturedCarousel = ({ blogs_url, text }) => {
        const [blogs, dispatchBlogs] = React.useReducer(useFetchData, {
          data: [],
          isError: false,
          isLoading: false,
        });

        const handleFetchBlogs = React.useCallback(async () => {
          dispatchBlogs({ type: "FETCH_INIT" });
          try {
            const response = await fetch(`${blogs_url}${language}&quantity=3`);

            if (!response) {
              throw new Error(`Error ${response.status}`);
            }

            const data = await response.json();

            dispatchBlogs({
              type: "FETCH_SUCCESS",
              payload: data,
              isLoading: false,
              isError: false,
            });
          } catch (error) {
            dispatchBlogs({ type: "FETCH_FAILURE" });
          }
        }, [blogs_url]);

        React.useEffect(() => {
          handleFetchBlogs();
        }, [handleFetchBlogs]);

        const [currentIndex, setCurrentIndex] = useState(0);

        const featuredBlogs = blogs.data.slice(0, blogs.data.length);

        React.useEffect(() => {
          const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % featuredBlogs.length);
          }, 5000);
          return () => clearInterval(interval);
        }, [featuredBlogs.length]);

        const nextSlide = () => {
          setCurrentIndex((prev) => (prev + 1) % featuredBlogs.length);
        };

        const prevSlide = () => {
          setCurrentIndex(
            (prev) => (prev - 1 + featuredBlogs.length) % featuredBlogs.length,
          );
        };

        return (
          <div className="featured-carousel">
            <h2>{text.suggestedArticles}</h2>

            <div className="carousel-container">
              <button
                className="carousel-nav carousel-nav-prev"
                onClick={prevSlide}
              >
                ←
              </button>
              <div className="carousel-track">
                {blogs.isError && <p>Something Went Wrong</p>}
                {blogs.isLoading ? (
                  <Loading />
                ) : (
                  featuredBlogs.map((blog, index) => (
                    <div
                      key={index}
                      className="carousel-card"
                      style={{
                        opacity: index === currentIndex ? 1 : 0,
                        transform:
                          index === currentIndex
                            ? "scale(1)"
                            : "scale(0.8) translateX(" +
                              (index - currentIndex) * 20 +
                              "px)",
                      }}
                    >
                      <img src={`/images/${blog.image_path}`} alt="" />
                      <h4 className="carousel-card-title">{blog.title}</h4>
                      <p className="carousel-card-description">
                        {blog.description.length > 80
                          ? blog.description.substring(0, 80) + "..."
                          : blog.description}
                      </p>
                      <div className="carousel-card-technologies">
                        {blog.tags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="carousel-tech-tag">
                            {tag.name}
                          </span>
                        ))}
                      </div>
                      <a
                        href={blog.url}
                        target="_blank"
                        className="carousel-card-link"
                      >
                        {text.btnBlog}
                      </a>
                    </div>
                  ))
                )}
              </div>
              <button
                className="carousel-nav carousel-nav-next"
                onClick={nextSlide}
              >
                →
              </button>
            </div>
            <div className="carousel-dots">
              {featuredBlogs.map((_, index) => (
                <button
                  key={index}
                  className={`carousel-dot ${index === currentIndex ? "active" : ""}`}
                  onClick={() => setCurrentIndex(index)}
                />
              ))}
            </div>
          </div>
        );
      };
      return (
        <section className="portfolio-section intro-section">
          <section className="intro-content">
            <div className="intro-text">
              <h1>{text.title}</h1>
              <h2>{text.slogan}</h2>
              <p className="intro-description">{text.intro}</p>
              <div className="btns-container">
                <a href="#projects" className="btn-primary">
                  {text.btnProjects}
                </a>
                <a href="#contact" className="btn-primary">
                  {text.btnContact}
                </a>
              </div>
            </div>
          </section>
          <section className="intro-carrousel">
            <FeaturedCarousel blogs_url={blogs_url} text={text} />
          </section>
        </section>
      );
    };

    const Technologies = ({ text }) => {
      const technologies = [
        {
          name: "Spring",
          icon: <SpringSVG />,
          link: "https://spring.io/projects/spring-boot",
        },
        {
          name: "Flutter",
          icon: <FlutterSVG />,
          link: "https://flutter.dev/",
        },
        { name: "React", icon: <ReactSVG />, link: "https://react.dev/" },
        {
          name: "Express",
          icon: <ExpressSVG />,
          link: "https://expressjs.com/",
        },
        {
          name: "TypeScript",
          icon: <TypescriptSVG />,
          link: "https://www.typescriptlang.org/",
        },
        {
          name: "Java",
          icon: <JavaSVG />,
          link: "https://www.java.com/en/download/help/whatis_java.html",
        },
        { name: "Dart", icon: <DartSVG />, link: "https://dart.dev/" },
        { name: "Nix", icon: <NixSVG />, link: "https://nixos.org/" },
        {
          name: "Docker",
          icon: <DockerSVG />,
          link: "https://www.docker.com/",
        },
        { name: "Node.js", icon: <NodeSVG />, link: "https://nodejs.org/en" },
        { name: "Git", icon: <GitSVG />, link: "https://git-scm.com/" },
        {
          name: "MySQL",
          icon: <MysqlSVG />,
          link: "https://www.oracle.com/mysql/what-is-mysql/",
        },
        {
          name: "PostgreSQL",
          icon: <PostgreSVG />,
          link: "https://www.postgresql.org/about/",
        },
        {
          name: "SQLite",
          icon: <SQLiteSVG />,
          link: "https://sqlite.org/",
        },
        {
          name: "NixOS",
          icon: <NixSVG />,
          link: "https://nixos.org/",
        },
        {
          name: "Debian",
          icon: <DebianSVG />,
          link: "https://www.debian.org/",
        },
      ];

      return (
        <section className="portfolio-section technologies-section">
          <h2>{text}</h2>
          <div className="technologies-grid">
            {technologies.map((tech, index) => (
              <a key={index} href={tech.link} target="_blank">
                <div className="tech-card">
                  <span className="tech-icon">{tech.icon}</span>
                  <span className="tech-name">{tech.name}</span>
                </div>
              </a>
            ))}
          </div>
        </section>
      );
    };
    const Projects = ({ text, projects_url }) => {
      const [projects, dispatchProjects] = React.useReducer(useFetchData, {
        data: [],
        isError: false,
        isLoading: false,
      });

      const handleFetchProjects = React.useCallback(async () => {
        dispatchProjects({ type: "FETCH_INIT" });
        try {
          const response = await fetch(`${projects_url}${language}`);

          if (!response) {
            throw new Error(`Error ${response.status}`);
          }

          const data = await response.json();

          dispatchProjects({
            type: "FETCH_SUCCESS",
            payload: data,
            isLoading: false,
            isError: false,
          });
        } catch (error) {
          dispatchProjects({ type: "FETCH_FAILURE" });
        }
      }, [projects_url]);

      React.useEffect(() => {
        handleFetchProjects();
      }, [handleFetchProjects]);

      return (
        <section id="projects" className="portfolio-section projects-section">
          <h2>{text.title}</h2>

          {projects.isError && <p>Something Went Wrong</p>}
          {projects.isLoading ? (
            <Loading />
          ) : (
            <div className="projects-grid">
              {projects.data.map((project) => (
                <div key={project.id} className="project-card">
                  <h3>{project.title}</h3>
                  <p>{project.description}</p>
                  <div className="project-technologies">
                    {project.tags.slice(0, 3).map((tech) => (
                      <span key={tech.id} className="project-tech-tag">
                        {tech.name}
                      </span>
                    ))}
                  </div>
                  <div className="project-buttons">
                    <a
                      href={project.repository}
                      target="_blank"
                      className="project-link"
                    >
                      {text.btnRepo}
                    </a>

                    {project.website !== null ? (
                      <a
                        href={project.website}
                        target="_blank"
                        className="project-link"
                      >
                        {text.btnWebsite}
                      </a>
                    ) : (
                      ""
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      );
    };

    const Contact = ({ text }) => {
      const [contactData, setContactData] = React.useState({
        name: { info: "", error: false },
        email: { info: "", error: false },
        message: { info: "", error: false },
      });

      const handleContactChange = (event) => {
        const { name, value } = event.target;
        setContactData((prev) => ({
          ...prev,
          [name]: { info: value, error: false },
        }));
      };

      const handleContactSubmit = async (event) => {
        event.preventDefault();
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        let name = false,
          message = false,
          email = false;

        if (contactData.name.info.trim() === "") {
          name = true;
        }

        if (
          contactData.email.info.trim() === "" ||
          !emailRegex.test(contactData.email.info)
        ) {
          email = true;
        }

        if (contactData.message.info.trim() === "") {
          message = true;
        }

        if (name || email || message) {
          setContactData({
            name: { info: name ? "" : contactData.name.info, error: name },
            email: { info: email ? "" : contactData.email.info, error: email },
            message: {
              info: message ? "" : contactData.message.info,
              error: message,
            },
          });
          return;
        }

        try {
          // Format data as URL encoded form data
          const formData = new FormData();
          formData.append("email", contactData.email.info);
          formData.append("name", contactData.name.info);
          formData.append("message", contactData.message.info);

          formData.append("_subject", "New Contact Form Submission");
          formData.append("_captcha", "false");

          const response = await fetch(
            "https://formsubmit.co/K1mikaze@proton.me",
            {
              method: "POST",
              body: formData,
            },
          );

          if (response.ok) {
            setContactData({
              name: { info: "", error: false },
              email: { info: "", error: false },
              message: { info: "", error: false },
            });
            setIsSubmitted(true);
          } else {
            console.error("Form submission failed:", response.status);
          }
        } catch (error) {
          console.error("Error submitting form:", error);
        }
      };

      const [isSubmitted, setIsSubmitted] = useState(false);

      return (
        <section id="contact" className="portfolio-section contact-section">
          <section className="form-container">
            <h2>{text.title}</h2>

            <form onSubmit={handleContactSubmit} className="contact-form">
              <div className="form-group">
                <label htmlFor="name">
                  {text.nameLabel + (contactData.name.error ? " !" : "")}
                </label>
                <input
                  className={contactData.name.error ? "error" : ""}
                  type="text"
                  id="name"
                  value={contactData.name.info}
                  name="name"
                  autoComplete="Your full name"
                  onChange={handleContactChange}
                  maxLength={200}
                  minLength={3}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">
                  Email {contactData.email.error ? " !" : ""}
                </label>
                <input
                  className={contactData.email.error ? "error" : ""}
                  type="text"
                  id="email"
                  value={contactData.email.info}
                  name="email"
                  autoComplete="Email addres"
                  minLength={10}
                  maxLength={320}
                  onChange={handleContactChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="message">
                  {text.messageLabel + (contactData.message.error ? " !" : "")}
                </label>
                <textarea
                  className={contactData.message.error ? "error" : ""}
                  id="message"
                  name="message"
                  onChange={handleContactChange}
                  value={contactData.message.info}
                  minLength={10}
                  maxLength={1000}
                  required
                ></textarea>
              </div>
              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitted}
              >
                {isSubmitted == true ? text.btnSubmitted : text.btnMessage}
              </button>
            </form>
          </section>
          <section className="contact-slogan">
            <h1>{text.slogan}</h1>
            <CodeSVG />
          </section>
        </section>
      );
    };

    return (
      <section className="section-area">
        <div className="section-container">
          <Introduction blogs_url={blogs_url} text={text.introduction} />
          <Technologies text={text.technologies} />
          <Projects text={text.projects} projects_url={projects_url} />
          <Contact text={text.contact} />
        </div>
      </section>
    );
  };

  return (
    <article className={`grid-page ${theme}`}>
      <StaticAside
        language={language}
        handleLanguage={handleLanguage}
        theme={theme}
        handleTheme={handleTheme}
      />
      <SectionArea
        text={language === "ES" ? ES_text : EN_text}
        blogs_url={blogs_url}
        projects_url={projects_url}
      />
    </article>
  );
}

export default Portfolio;
