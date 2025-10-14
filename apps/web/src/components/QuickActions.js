// src/components/QuickActions.jsx
import React from 'react';

const QuickActions = () => (
  <div className="flex gap-4 mb-4">
    <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Tạo Landing Page</button>
    <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">Tìm kiếm Lead</button>
    <button className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600">Xuất báo cáo</button>
  </div>
);

export default QuickActions;
