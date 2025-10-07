import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

const LPChart = ({ lpStats }) => (
  <div>
    <h3>Lead theo Landing Page</h3>
    <BarChart width={500} height={300} data={lpStats}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Bar dataKey="leadCount" fill="#82ca9d" />
    </BarChart>
  </div>
);

export default LPChart;
