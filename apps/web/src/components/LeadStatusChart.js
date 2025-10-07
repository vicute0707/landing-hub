import React from "react";
import { PieChart, Pie, Tooltip, Cell, Legend } from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const LeadStatusChart = ({ leadStatus }) => (
  <div>
    <h3>Trạng thái Lead</h3>
    <PieChart width={400} height={300}>
      <Pie
        data={leadStatus.map(s => ({ name: s._id, value: s.count }))}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="50%"
        outerRadius={100}
        fill="#8884d8"
        label
      >
        {leadStatus.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip />
      <Legend />
    </PieChart>
  </div>
);

export default LeadStatusChart;
