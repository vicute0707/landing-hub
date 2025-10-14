// src/components/StatCard.jsx
import React from 'react';

const StatCard = ({ title, value }) => (
  <div className="bg-white shadow rounded p-4 flex flex-col items-center justify-center">
    <p className="text-gray-500">{title}</p>
    <p className="text-2xl font-bold">{value}</p>
  </div>
);

export default StatCard;
