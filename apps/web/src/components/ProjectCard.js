import React from "react";
import { MapPin, Star } from "lucide-react";

const ProjectCard = ({ project, onSelect }) => (
  <div className="project-card" onClick={onSelect}>
    <div className="thumbnail-wrapper">
      <img src={project.thumbnail} alt={project.name} className="thumbnail" />
      <div className="overlay">
        <button className="btn-view">Chi tiết</button>
      </div>
    </div>
    <div className="project-info">
      <h3>{project.name}</h3>
      <p className="project-type">{project.type}</p>
      <div className="project-meta">
        <MapPin size={16} /> <span>{project.location}</span>
      </div>
      <div className="project-price">{project.price}</div>
      <div className="rating">
        <Star size={16} color="gold" /> {project.rating}
      </div>
    </div>
  </div>
);

export default ProjectCard;
