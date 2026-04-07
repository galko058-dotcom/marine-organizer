import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export default function Vacations() {
  const [balances, setBalances] = useState([]);
  const [vacations, setVacations] = useState([]);
  const [prevBalances, setPrevBalances] = useState([]);
  const [selectedUser, setSelectedUser] = useState("MV");
  const users = ["MV", "GI", "GN", "YG"];

 useEffect(() => {
  fetchBalances();
  fetchVacations();
  fetchPrevBalances();
}, []);

useEffect(() => {
  if (balances.length && prevBalances.length) {
    handleYearChange();
  }
}, [balances, prevBalances]);

  async function fetchVacations() {
    const { data } = await supabase
      .from("vacations")
      .select("*");

    setVacations(data || []);
  }

  async function fetchBalances() {
    const { data } = await supabase
      .from("vacation_balances")
      .select("*");

    setBalances(data || []);
  }

  async function fetchPrevBalances() {
  const { data } = await supabase
    .from("vacation_balances_prev")
    .select("*");

  setPrevBalances(data || []);
}

  async function updateBalance(user, value) {
    await supabase
      .from("vacation_balances")
      .update({ days_left: value })
      .eq("user_name", user);

    setBalances(prev =>
      prev.map(b =>
        b.user_name === user ? { ...b, days_left: value } : b
      )
    );
  }

  async function handleYearChange() {
  const currentYear = new Date().getFullYear();

  for (const b of balances) {
    if (b.year !== currentYear) {
      const prev = prevBalances.find(p => p.user_name === b.user_name);

      const newPrevDays = (prev?.days_left || 0) + b.days_left;

      // update prev table
      await supabase
        .from("vacation_balances_prev")
        .update({
          days_left: newPrevDays,
          year: currentYear - 1
        })
        .eq("user_name", b.user_name);

      // reset current year
      await supabase
        .from("vacation_balances")
        .update({
          days_left: 20,
          year: currentYear
        })
        .eq("user_name", b.user_name);
    }
  }
}

  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date());

  function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

 const year = currentDate.getFullYear();
const month = currentDate.getMonth();

  const monthName = new Date(year, month).toLocaleString("en-US", {
    month: "long"
  });

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const days = Array.from(
    { length: getDaysInMonth(year, month) },
    (_, i) => i + 1
  );
  const firstDay = new Date(year, month, 1).getDay();
 const offset = (firstDay + 6) % 7; // прави Monday първи

 const userColors = {
  MV: "#22c55e",
  GI: "#3b82f6",
  GN: "#f59e0b",
  YG: "#a855f7"
};

function prevMonth() {
  setCurrentDate(
    new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
  );
}

function nextMonth() {
  setCurrentDate(
    new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
  );
}

 function getUsersForDay(day) {
  const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return vacations
    .filter(v => v.date === date)
    .map(v => v.user_name);
}

  async function addVacationDay(day) {
  const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const existing = vacations.find(
    v => v.date === date && v.user_name === selectedUser
  );

  // 🔴 ако има → махаме
 if (existing) {

  // 🔁 връщаме дни обратно
  if (existing.source === "prev") {
    const prevBalance = prevBalances.find(p => p.user_name === selectedUser);

    await supabase
      .from("vacation_balances_prev")
      .update({
        days_left: (prevBalance?.days_left || 0) + 1
      })
      .eq("user_name", selectedUser);

  } else {
    const userBalance = balances.find(b => b.user_name === selectedUser);

    await supabase
      .from("vacation_balances")
      .update({
        days_left: (userBalance?.days_left || 0) + 1
      })
      .eq("user_name", selectedUser);
  }

  // 🗑️ трием vacation
  await supabase
    .from("vacations")
    .delete()
    .eq("id", existing.id);

  setVacations(prev =>
    prev.filter(v => v.id !== existing.id)
  );

  // 🔄 refresh
  fetchBalances();
  fetchPrevBalances();

  return;
}

  // 🛑 защита (реално няма да се стигне, но е safe)
  if (existing) return;

  // 🟢 add
  const userBalance = balances.find(b => b.user_name === selectedUser);
  const prevBalance = prevBalances.find(p => p.user_name === selectedUser);

let source = "current";

if (prevBalance && prevBalance.days_left > 0) {
  source = "prev";

  await supabase
    .from("vacation_balances_prev")
    .update({
     days_left: Math.max(0, prevBalance.days_left - 1)
    })
    .eq("user_name", selectedUser);

} else if (userBalance && userBalance.days_left > 0) {
  source = "current";

  await supabase
    .from("vacation_balances")
    .update({
     days_left: Math.max(0, userBalance.days_left - 1)
    })
    .eq("user_name", selectedUser);

} else {
  alert("No remaining days!");
  return;
}

const { data, error } = await supabase
  .from("vacations")
  .insert([
    {
      user_name: selectedUser,
      date,
      source
    }
  ])
  .select();

if (!error) {
  setVacations(prev => [...prev, ...data]);
  fetchBalances();
  fetchPrevBalances();
}
}

 function isDayBooked(day) {
  const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return vacations.some(
    v => v.date === date && v.user_name === selectedUser
  );
}

  return (
    <div>
      <h2>Vacations</h2>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
  {Object.keys(userColors).map(user => (
    <div
      key={user}
      onClick={() => setSelectedUser(user)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        cursor: "pointer",
        padding: "4px 8px",
        borderRadius: 6,
        background: selectedUser === user ? "#334155" : "transparent"
      }}
    >
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: userColors[user]
        }}
      />
      <span>{user}</span>
    </div>
  ))}
</div>
      <div style={{ marginBottom: 12 }}>
  
</div>

      {/* TABLE */}
      <div style={{ display: "flex", gap: 20 }}>
      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>Name</th>
            <th>Remaining Days</th>
          </tr>
        </thead>

        <tbody>
          {users.map(u => {
  const b = balances.find(x => x.user_name === u);
  if (!b) return null;

  return (
    <tr key={u}>
      <td>{u}</td>

      <td>
        <select
          value={b.days_left}
          onChange={e =>
            updateBalance(u, Number(e.target.value))
          }
        >
          {Array.from({ length: 21 }, (_, i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      </td>
    </tr>
  );
})}
        </tbody>
      </table>
      
      <table border="1" cellPadding="8">
  <thead>
    <tr>
      <th>Name</th>
      <th>Prev Year Days</th>
    </tr>
  </thead>

  <tbody>
    {users.map(u => {
  const b = prevBalances.find(x => x.user_name === u);
  if (!b) return null;

  return (
    <tr key={u}>
      <td>{u}</td>
      <td>{b.days_left}</td>
    </tr>
  );
})}
  </tbody>
</table>
</div>

      {/* CALENDAR HEADER */}
     <div
  style={{
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginTop: 30
  }}
>
  <button
  onClick={() => setCurrentDate(new Date())}
  style={{
    marginLeft: 10,
    padding: "4px 8px",
    cursor: "pointer"
  }}
>
  Today
</button>
  <button onClick={prevMonth}>←</button>

  <h3 style={{ margin: 0 }}>
    {monthName} {year}
  </h3>

  <button onClick={nextMonth}>→</button>
</div>

      {/* WEEK DAYS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          maxWidth: 400,
          marginBottom: 8
        }}
      >
        {weekDays.map(d => (
          <div key={d} style={{ textAlign: "center", fontWeight: "bold" }}>
            {d}
          </div>
        ))}
      </div>

      {/* CALENDAR GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 8,
          maxWidth: 400
        }}
      >
        {Array.from({ length: offset }).map((_, i) => (
  <div key={"empty-" + i}></div>
))}
        {days.map(day => {
         const users = getUsersForDay(day);

         function isToday(day) {
  const now = new Date();

  return (
    day === now.getDate() &&
    month === now.getMonth() &&
    year === now.getFullYear()
  );
}

         

          return (
            <div
              key={day}
              onClick={() => addVacationDay(day)}
              style={{
  padding: 10,
  background: "#1e293b",
  textAlign: "center",
  cursor: "pointer",
  borderRadius: 6,
 border: isToday(day) ? "1px solid #facc15" : "1px solid transparent",
  transition: "0.2s"
}}
onMouseEnter={e => {
  e.currentTarget.style.border = "1px solid #38bdf8";
}}
onMouseLeave={e => {
  if (isToday(day)) {
    e.currentTarget.style.border = "1px solid #facc15";
  } else {
    e.currentTarget.style.border = "1px solid transparent";
  }
}}
            >
             <div>{day}</div>

<div style={{ display: "flex", gap: 4, marginTop: 4, justifyContent: "center" }}>
  {users.map(u => (
    <div
      key={u + "-" + day}
      style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: userColors[u]
      }}
    />
  ))}
</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}