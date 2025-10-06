// src/components/UserDashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const UserDashboard = () => {
  const [landings, setLandings] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/user/landings')
      .then(res => setLandings(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      {/* Nút Go to Browser */}
      <div className="mb-6 flex justify-end">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          onClick={() => navigate('/browser')}
        >
          Go to Browser
        </button>
      </div>

      {/* Dashboard content (ví dụ listing landing page) */}
      <h2 className="text-2xl font-bold mb-4">Your Landing Pages</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {landings.map(l => (
          <div key={l.id} className="bg-white rounded-lg shadow hover:shadow-lg transform hover:scale-105 transition overflow-hidden">
            <img
              src={l.thumbnail || 'https://via.placeholder.com/300x160'}
              alt={l.title}
              className="w-full h-40 object-cover"
            />
            <div className="p-4">
              <h3 className="text-lg font-bold mb-2">{l.title}</h3>
              <p className="text-gray-500 mb-4 line-clamp-2">{l.description}</p>
              <button
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
                onClick={() => navigate(`/editor/${l.id}`)}
              >
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserDashboard;
