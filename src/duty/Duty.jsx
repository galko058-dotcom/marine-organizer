import { useState, useEffect } from "react";
import { supabase } from "../supabase";

export default function Duty() {

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedUser, setSelectedUser] = useState("GI");
  const [duties, setDuties] = useState([]);
  const [holidays, setHolidays] = useState([]);

  const today = new Date();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = new Date(year, month).toLocaleString("en-US", {
    month: "long"
  });

  useEffect(() => {
  fetchDuties();
}, []);

useEffect(() => {
  fetchHolidays();
}, [year]);

async function fetchHolidays() {
  try {
    const res = await fetch(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/BG`
    );
    const data = await res.json();
    setHolidays(data);
  } catch (err) {
    console.error("Holiday fetch error:", err);
  }
}

async function fetchDuties() {
  const { data } = await supabase
    .from("duty")
    .select("*");

  setDuties(data || []);
}

function isHoliday(day) {
  const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return holidays.some(h => h.date === date);
}

function getBorderColor(day) {
  if (isToday(day)) return "#facc15";
  if (isHoliday(day)) return "#ef4444";
  if (isWeekend(day)) return "#ef4444";
  return "transparent";
}

  function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  const days = Array.from(
    { length: getDaysInMonth(year, month) },
    (_, i) => i + 1
  );

  const firstDay = new Date(year, month, 1).getDay();
  const offset = (firstDay + 6) % 7;

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  function isToday(day) {
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  }

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const users = ["GI", "GN", "YG"];

  function getDutyForDay(day) {
  const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return duties.find(d => d.date === date);
}


function isWeekend(day) {
  const date = new Date(year, month, day);
  const d = date.getDay(); // 0 = Sunday, 6 = Saturday
  return d === 0 || d === 6;
}

async function handleDayClick(day) {
  const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const existing = duties.find(d => d.date === date);

  // 🔴 ако има същия user → махаме
  if (existing && existing.user_name === selectedUser) {
    await supabase
      .from("duty")
      .delete()
      .eq("id", existing.id);

    setDuties(prev => prev.filter(d => d.id !== existing.id));
    return;
  }

  // 🔁 ако има друг user → override
  if (existing) {
    await supabase
      .from("duty")
      .update({ user_name: selectedUser })
      .eq("id", existing.id);

    setDuties(prev =>
      prev.map(d =>
        d.id === existing.id ? { ...d, user_name: selectedUser } : d
      )
    );

    return;
  }

  // 🟢 нов запис
  const { data } = await supabase
    .from("duty")
    .insert([
      {
        user_name: selectedUser,
        date
      }
    ])
    .select();

  setDuties(prev => [...prev, ...data]);
}

  return (
    <div>
      <h2>Duty</h2>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
  {users.map(user => (
    <div
      key={user}
      onClick={() => setSelectedUser(user)}
      style={{
        cursor: "pointer",
        padding: "4px 8px",
        borderRadius: 6,
        background: selectedUser === user ? "#334155" : "transparent"
      }}
    >
      {user}
    </div>
  ))}
</div>

      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={prevMonth}>←</button>

        <h3 style={{ margin: 0 }}>
          {monthName} {year}
        </h3>

        <button onClick={nextMonth}>→</button>

        <button
          onClick={() => setCurrentDate(new Date())}
          style={{ marginLeft: 10 }}
        >
          Today
        </button>
      </div>

      {/* WEEK DAYS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          maxWidth: 400,
          marginTop: 10
        }}
      >
        {weekDays.map(d => (
          <div key={d} style={{ textAlign: "center", fontWeight: "bold" }}>
            {d}
          </div>
        ))}
      </div>

      {/* GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 8,
          maxWidth: 400,
          marginTop: 8
        }}
      >
        {Array.from({ length: offset }).map((_, i) => (
          <div key={"empty-" + i}></div>
        ))}

        {days.map(day => {
  const duty = getDutyForDay(day);

  let borderColor = getBorderColor(day);

  if (isWeekend(day)) borderColor = "#ef4444";
  if (isToday(day)) borderColor = "#facc15";

  return (
    <div
  key={day}
  onClick={() => handleDayClick(day)}

  onMouseEnter={e => {
    e.currentTarget.style.border = "1px solid #38bdf8";
  }}

  onMouseLeave={e => {
    const original = getBorderColor(day);
    e.currentTarget.style.border = `1px solid ${original}`;
  }}

  style={{
    padding: 10,
    background: "#1e293b",
    textAlign: "center",
    borderRadius: 6,
    cursor: "pointer",
    border: `1px solid ${borderColor}`
  }}
>
      <div>{day}</div>
      <div style={{ marginTop: 4, fontWeight: "bold" }}>
        {duty?.user_name || ""}
      </div>
    </div>
  );
})}
      </div>
    </div>
  );
}