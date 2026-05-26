import React, { useState, useEffect } from 'react';
import { BUILDING_LIST } from '../data/buildings';
import { MapPin, Users, Award, Landmark, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

export default function CampusHome({ onNavigateTo }) {
  // Slideshow State (Using the 8 specific slide items)
  const [currentSlide, setCurrentSlide] = useState(0);

  // Filter 8 specific slides from BUILDING_LIST for the Slideshow
  const slideshowBuildings = BUILDING_LIST.filter(b => b.id !== 'blockG'); // Keep 8 buildings for slides (excluding blockG which is SGSR Academic block)

  // Auto advance slide every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slideshowBuildings.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slideshowBuildings.length]);

  const handlePrevSlide = (e) => {
    e.stopPropagation();
    setCurrentSlide((prev) => (prev - 1 + slideshowBuildings.length) % slideshowBuildings.length);
  };

  const handleNextSlide = (e) => {
    e.stopPropagation();
    setCurrentSlide((prev) => (prev + 1) % slideshowBuildings.length);
  };

  const selectSlide = (index) => {
    setCurrentSlide(index);
  };

  return (
    <div id="campus-home-tab" className="campus-home">
      
      {/* Hero Slideshow */}
      <section className="hero-slideshow" id="hero-slideshow">
        {slideshowBuildings.map((building, index) => {
          const isActive = index === currentSlide;
          return (
            <div 
              key={building.id} 
              className={`slide-item ${isActive ? 'active' : ''}`}
              id={`slide-item-${building.id}`}
            >
              <img 
                src={building.image} 
                alt={building.name} 
                className="slide-image" 
                referrerPolicy="no-referrer"
              />
              <div className="slide-overlay" />
              
              <div className="slide-content">
                <span className="category-badge">{building.category}</span>
                <h2 className="slide-title">{building.name}</h2>
                <p className="slide-desc">{building.desc}</p>
                
                <ul className="slide-bullet-list">
                  {building.facts && building.facts.map((fact, i) => (
                    <li key={i} className="slide-bullet">
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>
                
                <button 
                  className="slide-direction-btn"
                  id={`get-directions-slide-${building.id}`}
                  onClick={() => onNavigateTo(building.name)}
                >
                  Get Directions <ArrowRight size={15} />
                </button>
              </div>
            </div>
          );
        })}

        {/* Slideshow Arrow Buttons */}
        <div className="slide-controls">
          <button 
            className="control-arrow-btn" 
            id="slide-control-prev" 
            onClick={handlePrevSlide}
            aria-label="Previous Slide"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            className="control-arrow-btn" 
            id="slide-control-next" 
            onClick={handleNextSlide}
            aria-label="Next Slide"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Slideshow Dot Indicators */}
        <div className="slide-dots">
          {slideshowBuildings.map((_, index) => (
            <button
              key={index}
              className={`dot-indicator ${index === currentSlide ? 'active' : ''}`}
              id={`slide-dot-${index}`}
              onClick={() => selectSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Stats Strip */}
      <section className="stats-strip" id="stats-strip">
        <div className="stat-item" id="stat-founded">
          <span className="stat-val" id="stat-val-founded">1973</span>
          <span className="stat-lbl">Founded</span>
        </div>
        <div className="stat-item" id="stat-faculties">
          <span className="stat-val" id="stat-val-faculties">5</span>
          <span className="stat-lbl">Faculties</span>
        </div>
        <div className="stat-item" id="stat-staff">
          <span className="stat-val" id="stat-val-staff">500+</span>
          <span className="stat-lbl">Staff</span>
        </div>
        <div className="stat-item" id="stat-students">
          <span className="stat-val" id="stat-val-students">10,000+</span>
          <span className="stat-lbl">Students</span>
        </div>
      </section>

      {/* Explore Grid */}
      <section className="explore-section">
        <h3 className="section-header" id="explore-grid-header">
          <Landmark size={20} /> Explore Tesano Campus
        </h3>
        <div className="explore-grid" id="explore-grid" style={{ marginTop: '0.85rem' }}>
          {BUILDING_LIST.map((building) => (
            <div 
              key={building.id} 
              className="explore-card"
              id={`explore-card-${building.id}`}
              onClick={() => onNavigateTo(building.name)}
            >
              <div className="explore-card-top">
                <span className="explore-card-emoji">{building.emoji}</span>
                <div className="explore-card-meta">
                  <h4 className="explore-card-name">{building.shortName}</h4>
                  <span className="explore-card-cat" style={{ color: "var(--action-blue)" }}>{building.category}</span>
                </div>
              </div>
              <p className="explore-card-desc">{building.desc}</p>
              
              <div className="explore-card-bottom">
                <button 
                  className="explore-dir-link"
                  id={`explore-link-${building.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateTo(building.name);
                  }}
                >
                  Get Route <ArrowRight size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
