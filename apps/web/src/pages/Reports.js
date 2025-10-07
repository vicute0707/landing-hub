import React, { useEffect, useState } from "react";
import { fetchReport, leadsAPI, getMyLandingPages } from "../services/api";
import LPChart from "../components/LPChart";
import LeadTable from "../components/LeadTable";
import LeadStatusChart from "../components/LeadStatusChart";
import { CSVLink } from "react-csv";
import "../styles/Report.css";

const Report = ({ userId }) => {
  // Khởi tạo report default để tránh undefined
  const [report, setReport] = useState({
    totalLeads: 0,
    leadStatus: [],
    lpStats: []
  });
  const [leads, setLeads] = useState([]);
  const [lps, setLps] = useState([]);
  const [filterLP, setFilterLP] = useState("all");
  const [filterDate, setFilterDate] = useState({ from: "", to: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const rep = await fetchReport(userId);
        setReport({
          totalLeads: rep.totalLeads || 0,
          leadStatus: rep.leadStatus || [],
          lpStats: rep.lpStats || []
        });

        const leadRes = await leadsAPI.get(`/leads?userId=${userId}`);
        setLeads(leadRes.data?.data || []);

        const lpData = await getMyLandingPages(userId);
        setLps(lpData || []);
      } catch (err) {
        console.error("Lỗi fetch report:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  if (loading) return <div className="report-container">Loading...</div>;

  // Filter leads theo Landing Page và khoảng thời gian
  const filteredLeads = leads.filter((lead) => {
    const matchLP = filterLP === "all" || lead.landingId === filterLP;
    let matchDate = true;
    if (filterDate.from) matchDate = new Date(lead.createdAt) >= new Date(filterDate.from);
    if (matchDate && filterDate.to) matchDate = new Date(lead.createdAt) <= new Date(filterDate.to);
    return matchLP && matchDate;
  });

  return (
    <div className="report-container">
      {/* Header + Filters */}
      <div className="report-header">
        <h2>📊 LandingHub Dashboard</h2>
        <div className="report-filters">
          <div>
            <label>Landing Page:</label>
            <select value={filterLP} onChange={(e) => setFilterLP(e.target.value)}>
              <option value="all">Tất cả</option>
              {lps.map((lp) => (
                <option key={lp._id} value={lp._id}>
                  {lp.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Từ ngày:</label>
            <input
              type="date"
              value={filterDate.from}
              onChange={(e) => setFilterDate({ ...filterDate, from: e.target.value })}
            />
          </div>
          <div>
            <label>Đến ngày:</label>
            <input
              type="date"
              value={filterDate.to}
              onChange={(e) => setFilterDate({ ...filterDate, to: e.target.value })}
            />
          </div>
          <CSVLink data={filteredLeads} filename={"leads_export.csv"} className="export-btn">
            Xuất CSV
          </CSVLink>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-cards">
        <div className="kpi-card">
          <div className="title">Tổng Lead</div>
          <div className="value">{filteredLeads.length}</div>
        </div>
        <div className="kpi-card">
          <div className="title">Tổng LP</div>
          <div className="value">{lps.length}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-card">
          <LeadStatusChart
            leadStatus={(report.leadStatus || []).map((ls) => ({
              name: ls.status,
              value: ls.count
            }))}
          />
        </div>
        <div className="chart-card">
          <LPChart
            lpStats={(report.lpStats || []).map((lp) => ({
              name: lp.name,
              value: lp.leadCount
            }))}
          />
        </div>
      </div>

      {/* Lead Table */}
      <div className="lead-table-wrapper">
        <LeadTable leads={filteredLeads} />
      </div>
    </div>
  );
};

export default Report;
