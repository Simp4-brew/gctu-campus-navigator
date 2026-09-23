import { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Landmark } from "lucide-react";

import { BUILDING_LIST } from "../data/buildings.js";
import SectionHeader from "./ui/SectionHeader.jsx";

// Every building except Block G (SGSR) gets a hero slide.
const SLIDES = BUILDING_LIST.filter((building) => building.id !== "blockG");

const SLIDE_INTERVAL_MS = 5000;

const STATS = [
  { id: "founded", value: "1973", label: "Founded" },
  { id: "faculties", value: "5", label: "Faculties" },
  { id: "staff", value: "500+", label: "Staff" },
  { id: "students", value: "10,000+", label: "Students" },
];

function HeroSlideshow({ onNavigateTo }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const showSlide = (index) =>
    setCurrentSlide((index + SLIDES.length) % SLIDES.length);

  // Auto-advance. Restarting the timer whenever the slide changes means a
  // manual click gets a full interval before the next automatic move.
  useEffect(() => {
    const timer = setTimeout(
      () => setCurrentSlide((slide) => (slide + 1) % SLIDES.length),
      SLIDE_INTERVAL_MS,
    );
    return () => clearTimeout(timer);
  }, [currentSlide]);

  return (
    <section
      className="hero-slideshow"
      id="hero-slideshow"
      aria-roledescription="carousel"
      aria-label="Campus buildings"
    >
      {SLIDES.map((building, index) => {
        const isActive = index === currentSlide;

        return (
          <div
            key={building.id}
            className={`slide-item ${isActive ? "active" : ""}`}
            id={`slide-item-${building.id}`}
            aria-hidden={!isActive}
          >
            <img
              src={building.image}
              alt={building.name}
              className="slide-image"
              referrerPolicy="no-referrer"
              // Only the first slide is needed for the initial paint.
              loading={index === 0 ? "eager" : "lazy"}
              decoding="async"
            />
            <div className="slide-overlay" />

            <div className="slide-content">
              <span className="category-badge">{building.category}</span>
              <h2 className="slide-title">{building.name}</h2>
              <p className="slide-desc">{building.desc}</p>

              <ul className="slide-bullet-list">
                {building.facts?.map((fact) => (
                  <li key={fact} className="slide-bullet">
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className="slide-direction-btn"
                id={`get-directions-slide-${building.id}`}
                onClick={() => onNavigateTo(building.name)}
                tabIndex={isActive ? 0 : -1}
              >
                Get Directions <ArrowRight size={15} />
              </button>
            </div>
          </div>
        );
      })}

      <div className="slide-controls">
        <button
          type="button"
          className="control-arrow-btn"
          id="slide-control-prev"
          onClick={() => showSlide(currentSlide - 1)}
          aria-label="Previous Slide"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          className="control-arrow-btn"
          id="slide-control-next"
          onClick={() => showSlide(currentSlide + 1)}
          aria-label="Next Slide"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="slide-dots">
        {SLIDES.map((building, index) => (
          <button
            key={building.id}
            type="button"
            className={`dot-indicator ${index === currentSlide ? "active" : ""}`}
            id={`slide-dot-${index}`}
            onClick={() => showSlide(index)}
            aria-label={`Go to slide ${index + 1}`}
            aria-current={index === currentSlide ? "true" : undefined}
          />
        ))}
      </div>
    </section>
  );
}

function BuildingCard({ building, onNavigateTo }) {
  const navigate = () => onNavigateTo(building.name);

  return (
    <div className="explore-card" id={`explore-card-${building.id}`} onClick={navigate}>
      <div className="explore-card-top">
        <span className="explore-card-emoji" aria-hidden="true">
          {building.emoji}
        </span>
        <div className="explore-card-meta">
          <h4 className="explore-card-name">{building.shortName}</h4>
          <span className="explore-card-cat">{building.category}</span>
        </div>
      </div>

      <p className="explore-card-desc">{building.desc}</p>

      <div className="explore-card-bottom">
        {/* The card is clickable with a mouse; this button is the
            keyboard- and screen-reader-accessible way to the same action. */}
        <button
          type="button"
          className="explore-dir-link"
          id={`explore-link-${building.id}`}
          onClick={(event) => {
            event.stopPropagation();
            navigate();
          }}
          aria-label={`Get route to ${building.name}`}
        >
          Get Route <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}

export default function CampusHome({ onNavigateTo }) {
  return (
    <div id="campus-home-tab" className="campus-home">
      <HeroSlideshow onNavigateTo={onNavigateTo} />

      <section className="stats-strip" id="stats-strip" aria-label="GCTU at a glance">
        {STATS.map((stat) => (
          <div key={stat.id} className="stat-item" id={`stat-${stat.id}`}>
            <span className="stat-val" id={`stat-val-${stat.id}`}>
              {stat.value}
            </span>
            <span className="stat-lbl">{stat.label}</span>
          </div>
        ))}
      </section>

      <section className="explore-section">
        <SectionHeader id="explore-grid-header" icon={<Landmark size={20} />}>
          Explore Tesano Campus
        </SectionHeader>

        <div className="explore-grid" id="explore-grid">
          {BUILDING_LIST.map((building) => (
            <BuildingCard key={building.id} building={building} onNavigateTo={onNavigateTo} />
          ))}
        </div>
      </section>
    </div>
  );
}
