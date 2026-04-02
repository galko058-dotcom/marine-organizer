import { useState, useEffect } from "react";
import { supabase } from "./supabase";
const API_URL = "https://marine-organizer.onrender.com";
const users = ["MV", "GI", "GN", "DV", "YG"];
const progressColumns = ["DG1", "DG2", "DG3", "ME"];
const progressRows = [
  "Dismount",
  "Pre test",
  "Disassembled",
  "Inspected by client",
  "Def report confirmed",
  "Assembled",
  "Tested",
  "Installed",
  "Tested on board",
  "Sea trials done",
  "All reports signed",
];

function AutoTextarea({ value, onChange, onBlur }) {
  return (
    <textarea
      defaultValue={value}
      ref={el => {
        if (el) {
          el.style.height = "auto";
          el.style.height = el.scrollHeight + "px";
        }
      }}
      onInput={e => {
        e.target.style.height = "auto";
        e.target.style.height = e.target.scrollHeight + "px";
        onChange && onChange(e);
      }}
      onBlur={onBlur}
      style={{
  width: "100%",
  maxWidth: "100%",
  minHeight: 60,
  resize: "none",
  overflow: "hidden",
  boxSizing: "border-box"
  
}}
    />
  );
}

export default function App() {

  const [view, setView] = useState("home");
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const [ongoingTasks, setOngoingTasks] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [archivedTasks, setArchivedTasks] = useState([]);

  async function updateTask(taskId, updates) {
  // 🟢 update UI
  setOngoingTasks(tasks =>
    tasks.map(t => (t.id == taskId ? { ...t, ...updates } : t))
  );

  setUpcomingTasks(tasks =>
    tasks.map(t => (t.id == taskId ? { ...t, ...updates } : t))
  );

  // 🔥 update Supabase
  try {
    const { error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", taskId);

    if (error) throw error;

  } catch (err) {
    console.error("UPDATE ERROR:", err);
  }
}

  async function addOngoingTask() {
    const newTask = {
      job: "",
      workOrder: "",
      contact: "",
      seInCharge: users[0],
      status: "In progress",
      type: "ongoing",
      files: [],
      progressColumns: ["DG1", "DG2", "DG3", "ME"],
      progress: createEmptyProgress(["DG1", "DG2", "DG3", "ME"])
    };

    try {
      const { data, error } = await supabase
        .from("tasks")
        .insert([newTask])
        .select();

      if (error) throw error;

      setOngoingTasks(tasks => [...tasks, ...data]);

    } catch (err) {
      console.error("INSERT ERROR:", err);
    }
  }

useEffect(() => {
  setSelectedTaskId(null);
}, [view]);

 function createEmptyProgress(columns) {
  const progress = {};
  columns.forEach(col => {
    progress[col] = {};
    progressRows.forEach(row => {
      progress[col][row] = false;
    });
  });
  return progress;
}
useEffect(() => {
  const getData = async () => {
    try {
      // 🟢 ONGOING
      const { data: ongoingData, error: ongoingError } = await supabase
        .from("tasks")
        .select("*")
        .eq("type", "ongoing");

      if (ongoingError) throw ongoingError;
      // 🟢 UPCOMING
      const { data: upcomingData, error: upcomingError } = await supabase
  .from("tasks")
  .select("*")
  .eq("type", "upcoming");

      if (upcomingError) throw upcomingError;
      setUpcomingTasks(upcomingData || []);

      // 🟢 ARCHIVED
      const { data: archivedData, error: archivedError } = await supabase
        .from("tasks")
        .select("*")
        .eq("type", "archived");

      if (archivedError) throw archivedError;

      console.log("ONGOING:", ongoingData);
      console.log("ARCHIVED:", archivedData);

      setOngoingTasks(ongoingData || []);
      setArchivedTasks(archivedData || []);
      setIsLoaded(true);

    } catch (err) {
      console.error("FETCH ERROR:", err);
    }
  };

  getData();
}, []);

 function ensureProgress(task) {
  if (!task) return null;

  let updatedTask = { ...task };

  // ✅ progressColumns винаги масив
  if (
    !updatedTask.progressColumns ||
    !Array.isArray(updatedTask.progressColumns) ||
    updatedTask.progressColumns.length === 0
  ) {
    updatedTask.progressColumns = ["DG1", "DG2", "DG3", "ME"];
  }

  // ако е string → parse
  if (typeof updatedTask.progressColumns === "string") {
    try {
      updatedTask.progressColumns = JSON.parse(updatedTask.progressColumns);
    } catch {
      updatedTask.progressColumns = ["DG1", "DG2", "DG3", "ME"];
    }
  }

  // ✅ progress винаги обект
  if (!updatedTask.progress || typeof updatedTask.progress !== "object") {
    updatedTask.progress = createEmptyProgress(updatedTask.progressColumns);
  }

  // 🔥 синхронизация
  updatedTask.progressColumns.forEach(col => {
    if (!updatedTask.progress[col]) {
      updatedTask.progress[col] = {};
    }

    progressRows.forEach(row => {
      if (updatedTask.progress[col][row] === undefined) {
        updatedTask.progress[col][row] = false;
      }
    });
  });

  return updatedTask;
}

async function addUpcomingTask() {
  const newTask = {
    job: "",
    workOrder: "",
    expectedAt: "",
    seInCharge: users[0],
    type: "upcoming",
    files: []
  };

  try {
    const { data, error } = await supabase
      .from("tasks")
      .insert([newTask])
      .select();

    if (error) throw error;

    setUpcomingTasks(tasks => [...tasks, ...data]);

  } catch (err) {
    console.error("INSERT ERROR:", err);
  }
}

  function toggleProgress(taskId, column, row) {

  const task =
    ongoingTasks.find(t => t.id == taskId) ||
    upcomingTasks.find(t => t.id == taskId);

  if (!task) return;

  const safeTask = ensureProgress(task);

  const newProgress = {
    ...safeTask.progress,
    [column]: {
      ...safeTask.progress[column],
      [row]: !safeTask.progress[column][row]
    }
  };

  updateTask(taskId, { progress: newProgress });
}

 async function addFileToTask(taskId, file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  const fileData = {
    name: data.originalName,
    url: `${API_URL}/uploads/${data.fileName}`,
  };

  // 👉 намираме task (ВАЖНО: ==)
  const task =
    ongoingTasks.find(t => t.id == taskId) ||
    upcomingTasks.find(t => t.id == taskId);

  if (!task) {
    console.error("TASK NOT FOUND");
    return;
  }

  const updatedFiles = [...(task.files || []), fileData];

  // 🟢 update ongoing
  updateTask(taskId, { files: updatedFiles });
}


  function Dashboard() {
    return (
      <div>
        <h2>Dashboard</h2>
        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          {users.map(u => (
            <div
              key={u}
              onClick={() => setSelectedUser(u)}
              style={{
                width: 50,
                height: 50,
                borderRadius: "50%",
                background: "#1e293b",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              {u}
            </div>
          ))}
        </div>

        {selectedUser && (
          <div style={{ marginTop: 20 }}>
            <h3>Ongoing – {selectedUser}</h3>
            {ongoingTasks
  .filter(t => t.seInCharge === selectedUser)
  .map(t => (
    <div key={t.id} style={{ marginBottom: 8 }}>
      <div><strong>Job:</strong> {t.job || "(no description)"}</div>
      <div><strong>WO:</strong> {t.workOrder || "-"}</div>
    </div>
))}

            <h3 style={{ marginTop: 10 }}>Upcoming – {selectedUser}</h3>

{upcomingTasks
  .filter(t => t.seInCharge === selectedUser)
  .map(t => (
    <div key={t.id} style={{ marginBottom: 8 }}>
      <div><strong>Job:</strong> {t.job || "(no description)"}</div>
      <div><strong>WO:</strong> {t.workOrder || "-"}</div>
    </div>
))}

          </div>
        )}
      </div>
    );
  }

 function TaskFiles() {
  if (!selectedTaskId) return null;

  let currentTask =
    ongoingTasks.find(t => t.id == selectedTaskId) ||
    upcomingTasks.find(t => t.id == selectedTaskId);

  if (!currentTask) return null;

  currentTask = ensureProgress(currentTask);
  if (!currentTask.progress) {
  currentTask.progress = createEmptyProgress(currentTask.progressColumns || []);
}
  if (!currentTask.progressColumns) return null;

  const isOngoing = ongoingTasks.some(t => t.id == currentTask.id);
console.log("SELECTED ID:", selectedTaskId);
console.log("CURRENT TASK:", currentTask);

    return (
      <div>
       <button onClick={() => setSelectedTaskId(null)}>← Back</button>
        <h2>Progress & Files</h2>
        <p><strong>Job:</strong> {currentTask.job}</p>
        <p><strong>Work order:</strong> {currentTask.workOrder}</p>
        {currentTask.expectedAt && (
  <p><strong>Expected:</strong> {currentTask.expectedAt}</p>
)}

        <p><strong>SE in charge:</strong> {currentTask.seInCharge}</p>

      {isOngoing && (
  <>

   <h3>Progress Checklist</h3>

<button
  onClick={async () => {
    const baseName = "New Column";

    let counter = 1;
    let newColumnName = baseName;

    while (currentTask.progressColumns.includes(newColumnName)) {
      newColumnName = `${baseName} ${counter}`;
      counter++;
    }

    const updatedColumns = [...currentTask.progressColumns, newColumnName];

    const updatedProgress = {
      ...currentTask.progress,
      [newColumnName]: {}
    };

    progressRows.forEach(row => {
      updatedProgress[newColumnName][row] = false;
    });

    setOngoingTasks(tasks =>
      tasks.map(t =>
        t.id === currentTask.id
          ? {
              ...t,
              progressColumns: updatedColumns,
              progress: updatedProgress
              
            }
          : t
      )
    );
    
  }}
  
  style={{ marginBottom: 10 }}
>
  + Add Column
</button>

<table border="1" cellPadding="6" style={{ marginBottom: 20 }}>
      <thead>
        <tr>
          <th>Stage</th>
       {(currentTask.progressColumns || []).map(col => (
  <th key={col}>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      
      {/* Delete column button */}
      <button
       onClick={async () => {
  const updatedColumns = currentTask.progressColumns.filter(c => c !== col);

  const updatedProgress = { ...currentTask.progress };
  delete updatedProgress[col];

  // 🟢 UI update
  setOngoingTasks(tasks =>
    tasks.map(t =>
      t.id === currentTask.id
        ? {
            ...t,
            progressColumns: updatedColumns,
            progress: updatedProgress
          }
        : t
    )
  );

  // 🔥 SAVE в Supabase
  try {
    const { error } = await supabase
      .from("tasks")
      .update({
        progressColumns: updatedColumns,
        progress: updatedProgress
      })
      .eq("id", currentTask.id);

    if (error) throw error;

  } catch (err) {
    console.error("DELETE COLUMN ERROR:", err);
  }
}}
        style={{
          fontSize: 12,
          color: "red",
          border: "none",
          background: "transparent",
          cursor: "pointer"
        }}
      >
        X
      </button>

      {/* Editable column name */}
      <input
        defaultValue={col}
       onBlur={async e => {
          const newName = e.target.value.trim();
          if (!newName || newName === col) return;

          const updatedColumns = currentTask.progressColumns.map(c =>
            c === col ? newName : c
          );

          const updatedProgress = { ...currentTask.progress };
          updatedProgress[newName] = updatedProgress[col];
          delete updatedProgress[col];

          setOngoingTasks(tasks =>
            tasks.map(t =>
              t.id === currentTask.id
                ? {
                    ...t,
                    progressColumns: updatedColumns,
                    progress: updatedProgress
                  }
                : t
            )
          );
          await supabase
  .from("tasks")
  .update({
    progressColumns: updatedColumns,
    progress: updatedProgress
  })
  .eq("id", currentTask.id);
        }}
        style={{ width: 80 }}
      />

    </div>
  </th>
))}

        </tr>
      </thead>
      <tbody>
        {progressRows.map(row => (
          <tr key={row}>
            <td>{row}</td>
          {(currentTask.progressColumns || []).map(col => (
              <td key={col} style={{ textAlign: "center" }}>
                <input
                  type="checkbox"
                  checked={currentTask.progress?.[col]?.[row] || false}
                  onChange={() =>
                    toggleProgress(currentTask.id, col, row)
                  }
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </>
)}


        <h3>Upload file</h3>
<input
  type="file"
  onChange={e => {
    if (e.target.files.length > 0) {
      addFileToTask(currentTask.id, e.target.files[0]);
    }
  }}
/>

<h3 style={{ marginTop: 16 }}>Files</h3>
{(Array.isArray(currentTask.files) ? currentTask.files : []).map((f, i) => (
  <div key={i}>
    📎 <a href={f.url} target="_blank" rel="noreferrer">{f.name}</a>
  </div>
))}

{/* 🔥 ТУК СЛАГАШ NOTES */}
{!isOngoing && (
  <>
    <h3 style={{ marginTop: 16 }}>Notes</h3>
   <AutoTextarea
  value={currentTask.notes || ""}
  onBlur={e => {
    updateTask(currentTask.id, { notes: e.target.value });
  }}
/>
  </>
)}
      </div>
    );
  }

  function Ongoing() {
    return (
      <div>
        <h2>Ongoing</h2>
        <button onClick={addOngoingTask}>+ Add task</button>
        <table border="1" cellPadding="8" style={{ width: "100%", marginTop: 12 }}>
         <thead>
  <tr>
    <th style={{ width: "25%" }}>Job</th>
    <th style={{ width: "20%" }}>WO</th>
    <th style={{ width: "10%" }}>Contact</th>
    <th style={{ width: "10%" }}>SE</th>
    <th style={{ width: "10%" }}>Status</th>
    <th style={{ width: "15%" }}>Progress & Files</th>
    <th style={{ width: "10%" }}>Delete</th>
  </tr>
</thead>
          <tbody>
  {ongoingTasks.map(task => (
   <tr key={task.id}>

  {/* Job */}
  <td>
    <AutoTextarea
      value={task.job}
      onBlur={e => {
        updateTask(task.id, { job: e.target.value });
      }}
    />
  </td>

  {/* WO */}
  <td>
    <AutoTextarea
      value={task.workOrder}
      onBlur={e => {
        updateTask(task.id, { workOrder: e.target.value });
      }}
    />
  </td>

  {/* Contact */}
  <td>
    <AutoTextarea
      value={task.contact}
      onBlur={e => {
        updateTask(task.id, { contact: e.target.value });
      }}
    />
  </td>

  {/* SE */}
  <td>
    <select
      defaultValue={task.seInCharge}
      onChange={e => {
        updateTask(task.id, { seInCharge: e.target.value });
      }}
    >
      {users.map(u => (
        <option key={u}>{u}</option>
      ))}
    </select>
  </td>

  {/* Status */}
  <td>{task.status}</td>

  {/* Open */}
  <td>
    <button onClick={() => setSelectedTaskId(task.id)}>
      Open
    </button>
  </td>

  {/* Delete */}
  <td>
    <button
      onClick={async () => {
        try {
          const { error } = await supabase
            .from("tasks")
            .update({
              type: "archived",
              archivedAt: new Date().toLocaleString()
            })
            .eq("id", task.id);

          if (error) throw error;

          setOngoingTasks(tasks =>
            tasks.filter(t => t.id !== task.id)
          );

          setArchivedTasks(tasks => [
            ...tasks,
            {
              ...task,
              type: "archived",
              archivedAt: new Date().toLocaleString()
            }
          ]);

        } catch (err) {
          console.error("ARCHIVE ERROR:", err);
        }
      }}
      style={{ color: "red", fontWeight: "bold" }}
    >
      X
    </button>
  </td>

</tr>
  ))}
</tbody>
        </table>
      </div>
    );
  }

  function Upcoming() {
    return (
      <div>
        <h2>Upcoming</h2>
        <button onClick={addUpcomingTask}>+ Add task</button>
       <table
  border="1"
  cellPadding="8"
  style={{
    width: "100%",
    marginTop: 12,
    tableLayout: "fixed"
  }}
>
          <thead>
            <tr>
              <th>Job</th>
              <th>WO</th>
              <th>Expected</th>
              <th>SE</th>
              <th>Progress & Files</th>
              <th>Delete</th>
            </tr>
          </thead>
          <tbody>
  {upcomingTasks.map(task => (
    <tr key={task.id}>

      {/* Job */}
      <td>
        <textarea
  defaultValue={task.job}
  onBlur={e => {
    updateTask(task.id, { job: e.target.value });
  }}
/>
      </td>

      {/* WO */}
      <td>
        <textarea
  defaultValue={task.workOrder}
  onBlur={e => {
    updateTask(task.id, { workOrder: e.target.value });
  }}
/>
      </td>

      {/* Expected */}
      <td>
       <textarea
  defaultValue={task.expectedAt}
  onBlur={e => {
    updateTask(task.id, { expectedAt: e.target.value });
  }}
/>
      </td>

      {/* SE */}
      <td>
       <select
  defaultValue={task.seInCharge}
  onChange={e => {
    updateTask(task.id, { seInCharge: e.target.value });
  }}
>
  {users.map(u => (
    <option key={u}>{u}</option>
  ))}
</select>
      </td>

      {/* Progress & Files */}
      <td>
        <button onClick={() => setSelectedTaskId(task.id)}>
          Open
        </button>
      </td>

      {/* Delete */}
      <td>
        <button
          onClick={() => {
            const taskToArchive = task;
            setUpcomingTasks(tasks =>
              tasks.filter(t => t.id !== task.id)
            );
            setArchivedTasks(tasks => [
              ...tasks,
              { ...taskToArchive, archivedAt: new Date().toLocaleString() }
            ]);
          }}
          style={{ color: "red", fontWeight: "bold" }}
        >
          X
        </button>
      </td>

    </tr>
  ))}
</tbody>

        </table>
      </div>
    );
  }

 function Archive() {
  return (
    <div>
      <h2>Archive</h2>

      <table border="1" cellPadding="8" style={{ width: "100%", marginTop: 12 }}>
        <thead>
          <tr>
            <th>Job</th>
            <th>WO</th>
            <th>Archived at</th>
            <th>Restore</th>
            <th>Delete permanently</th>
          </tr>
        </thead>

        <tbody>
          {archivedTasks.map(task => (
            <tr key={task.id}>

              <td>{task.job}</td>
              <td>{task.workOrder}</td>
              <td>{task.archivedAt}</td>

              {/* Restore */}
              <td>
                <button
                  onClick={() => {
                    const restoredTask = { ...task };
                    delete restoredTask.archivedAt;

                    setArchivedTasks(tasks =>
                      tasks.filter(t => t.id !== task.id)
                    );

                    // Връщаме го в Ongoing
                    setOngoingTasks(tasks => [
                      ...tasks,
                      restoredTask
                    ]);
                  }}
                  style={{ color: "green", fontWeight: "bold" }}
                >
                  Restore
                </button>
              </td>

              {/* Permanent delete */}
              <td>
  <button
    onClick={async () => {
      try {
        // 🟢 1. трием файловете (ако има)
        if (Array.isArray(task.files) && task.files.length > 0) {
          const fileNames = task.files.map(f =>
            f.url.split("/uploads/")[1]
          );

          await fetch(`${API_URL}/delete-files`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ files: fileNames }),
          });
        }

        // 🔥 2. трием от Supabase
        const { error } = await supabase
          .from("tasks")
          .delete()
          .eq("id", task.id);

        if (error) throw error;

        // 🟢 3. махаме от UI
        setArchivedTasks(tasks =>
          tasks.filter(t => t.id !== task.id)
        );

      } catch (err) {
        console.error("DELETE ERROR:", err);
      }
    }}
    style={{ color: "darkred", fontWeight: "bold" }}
  >
    Delete
  </button>
</td>

            </tr>
          ))}
        </tbody>

      </table>
    </div>
  );
}

  return (
  <div>
    <header style={{ background: "#1e293b", color: "white", padding: 12 }}>
      <button onClick={() => setView("home")}>Home</button>{" "}
      <button onClick={() => setView("ongoing")}>Ongoing</button>{" "}
      <button onClick={() => setView("upcoming")}>Upcoming</button>{" "}
      <button onClick={() => setView("archive")}>Archive</button>
    </header>

    <main style={{ padding: 16 }}>
      {view === "home" && <Dashboard />}
      {view === "ongoing" && <Ongoing />}
      {view === "upcoming" && <Upcoming />}
      {view === "archive" && <Archive />}
    </main>

   {selectedTaskId && (view === "ongoing" || view === "upcoming") && <TaskFiles />}
  </div>
);

}
