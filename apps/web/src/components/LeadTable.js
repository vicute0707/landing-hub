import React from "react";
import { CSVLink } from "react-csv";

const LeadTable = ({ leads }) => {
  const csvData = leads.map(l => ({
    Name: l.name,
    Email: l.email,
    Phone: l.phone,
    Status: l.status,
    Notes: l.notes,
    CreatedAt: new Date(l.createdAt).toLocaleDateString(),
    LandingPage: l.landingName || "N/A",
  }));

  return (
    <div>
      <h3>Danh sách Lead</h3>
      <CSVLink data={csvData} filename={"leads.csv"} style={{ marginBottom: "10px", display: "inline-block" }}>
        <button>Export CSV</button>
      </CSVLink>
      <table border="1" cellPadding="8" cellSpacing="0" style={{ width: "100%", marginTop: "10px" }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Status</th>
            <th>Notes</th>
            <th>Landing Page</th>
            <th>Created At</th>
          </tr>
        </thead>
        <tbody>
          {leads.map(lead => (
            <tr key={lead._id}>
              <td>{lead.name}</td>
              <td>{lead.email}</td>
              <td>{lead.phone}</td>
              <td>{lead.status}</td>
              <td>{lead.notes}</td>
              <td>{lead.landingName || "N/A"}</td>
              <td>{new Date(lead.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LeadTable;
