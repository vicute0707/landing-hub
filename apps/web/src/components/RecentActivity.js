// src/components/RecentActivity.jsx
import React from 'react';

const RecentActivity = ({ leads, landingPages }) => (
  <div className="grid grid-cols-2 gap-4">
    <div className="bg-white shadow rounded p-4">
      <h3 className="font-bold mb-2">Recent Leads</h3>
      <ul>
        {leads.map(lead => (
          <li key={lead.id} className="border-b py-1">
            {lead.name} ({lead.email}) - {new Date(lead.created_at).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
    <div className="bg-white shadow rounded p-4">
      <h3 className="font-bold mb-2">Recent Landing Pages</h3>
      <ul>
        {landingPages.map(lp => (
          <li key={lp.id} className="border-b py-1">
            {lp.title} - {new Date(lp.created_at).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  </div>
);

export default RecentActivity;
