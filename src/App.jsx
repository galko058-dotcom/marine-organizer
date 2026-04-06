import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import Vacations from "./vacations/vacations";
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
  const [bg, setBg] = useState(() => {
  return localStorage.getItem("bg") || "dark";
});
 const backgrounds = {
  dark: "linear-gradient(135deg, #020617, #0f172a, #1e293b)",
  ocean: "linear-gradient(135deg, #020617, #0a2540, #1e3a5f)",
  steel: "linear-gradient(135deg, #111827, #1f2937, #374151)",
  sunset: "linear-gradient(135deg, #7c2d12, #1e293b, #020617)"
};
  const [ongoingTasks, setOngoingTasks] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [archivedTasks, setArchivedTasks] = useState([]);
  useEffect(() => {
  localStorage.setItem("bg", bg);
}, [bg]);

  async function deleteFile(taskId, fileUrl) {
  try {
    // 🟢 1. взимаме името на файла от URL-а
    const fileName = fileUrl.split("/task-files/")[1];

    // 🟢 2. трием от Supabase Storage
    const { error: storageError } = await supabase.storage
      .from("task-files")
      .remove([fileName]);

    if (storageError) throw storageError;

    // 🟢 3. намираме task-а
    const task =
      ongoingTasks.find(t => t.id == taskId) ||
      upcomingTasks.find(t => t.id == taskId);

    if (!task) return;

    // 🟢 4. махаме файла от масива
    const updatedFiles = (task.files || []).filter(
      f => f.url !== fileUrl
    );

    // 🟢 5. update в DB + UI
    updateTask(taskId, { files: updatedFiles });

  } catch (err) {
    console.error("DELETE FILE ERROR:", err);
    alert("Delete failed");
  }
}

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
  console.log("START UPLOAD:", file);

 const ext = file.name.split(".").pop();

 const fileName = `${Date.now()}.${ext}`;

  const { data, error } = await supabase.storage
    .from("task-files")
    .upload(fileName, file);

  if (error) {
    console.error("UPLOAD ERROR:", error);
    alert("Upload failed!");
    return;
  }

  console.log("UPLOAD SUCCESS:", data);

  const { data: publicUrlData } = supabase.storage
    .from("task-files")
    .getPublicUrl(fileName);

  const fileData = {
    name: file.name,
    url: publicUrlData.publicUrl,
  };

  const task =
    ongoingTasks.find(t => t.id == taskId) ||
    upcomingTasks.find(t => t.id == taskId);

  if (!task) return;

  const updatedFiles = [...(task.files || []), fileData];

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

    // 🔥 SAVE в Supabase (ТУК БЕШЕ ПРОБЛЕМЪТ)
    try {
      const { data, error } = await supabase
        .from("tasks")
        .update({
          progressColumns: updatedColumns,
          progress: updatedProgress
        })
       .eq("id", selectedTaskId)
       .select();
        
        console.log("AFTER SAVE:", data);
      if (error) throw error;

    } catch (err) {
      console.error("ADD COLUMN ERROR:", err);
    }
  }}
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
const { data, error } = await supabase
  .from("tasks")
  .update({
    progressColumns: updatedColumns,
    progress: updatedProgress
  })
  .eq("id", currentTask.id.trim())
  .select();

console.log("AFTER SAVE:", data);

if (error) {
  console.error("ADD COLUMN ERROR:", error);
}

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
  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
    📎 
    <a href={f.url} target="_blank" rel="noreferrer">{f.name}</a>

    <button
     onClick={() => {
  if (window.confirm("Сигурен ли си, че искаш да изтриеш файла?")) {
    deleteFile(currentTask.id, f.url);
  }
}}
      style={{
        color: "red",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        fontWeight: "bold"
      }}
    >
      X
    </button>
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
       <table
  style={{
    width: "100%",
    marginTop: 12,
    borderCollapse: "collapse",
    background: "#020617",
    borderRadius: 8,
    overflow: "hidden"
  }}
>
         <thead style={{ background: "#0f172a" }}>
  <tr>
    <th style={{ width: "25%", padding: 10, textAlign: "left", color: "#38bdf8" }}>
  Job
</th>
    <th style={{ width: "20%", padding: 10, textAlign: "left", color: "#38bdf8" }}>
  WO
</th>
    <th style={{ width: "15%", padding: 10, textAlign: "left", color: "#38bdf8" }}>
  Contact
</th>
   <th style={{ width: "10%", padding: 10, textAlign: "left", color: "#38bdf8" }}>
  SE
</th>
    <th style={{ width: "10%", padding: 10, textAlign: "left", color: "#38bdf8" }}>
  Status
</th>
   <th style={{ width: "10%", padding: 10, textAlign: "left", color: "#38bdf8" }}>
  Progess & Files
</th>
    <th style={{ width: "10%", padding: 10, textAlign: "left", color: "#38bdf8" }}>
  Delete
</th>
  </tr>
</thead>
          <tbody>
  {ongoingTasks.map(task => (
  <tr
  key={task.id}
  style={{
    borderTop: "1px solid #1e293b",
    transition: "0.2s"
  }}
  onMouseEnter={e => (e.currentTarget.style.background = "#0f172a")}
  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
>

  {/* Job */}
  <td style={{ padding: 10 }}>
    <AutoTextarea
      value={task.job}
      onBlur={e => {
        updateTask(task.id, { job: e.target.value });
      }}
    />
  </td>

  {/* WO */}
  <td style={{ padding: 10 }}>
    <AutoTextarea
      value={task.workOrder}
      onBlur={e => {
        updateTask(task.id, { workOrder: e.target.value });
      }}
    />
  </td>

  {/* Contact */}
  <td style={{ padding: 10 }}>
    <AutoTextarea
      value={task.contact}
      onBlur={e => {
        updateTask(task.id, { contact: e.target.value });
      }}
    />
  </td>

  {/* SE */}
  <td style={{ padding: 10 }}>
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
 <td style={{ padding: 10 }}>{task.status}</td>

  {/* Open */}
  <td style={{ padding: 10 }}>
    <button onClick={() => setSelectedTaskId(task.id)}>
      Open
    </button>
  </td>

  {/* Delete */}
  <td style={{ padding: 10 }}>
    <button
      onClick={async () => {
        try {
          const { error } = await supabase
            .from("tasks")
            .update({            
             type: "archived",
             originalType: task.type, // 🔥 важно
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
              originalType: task.type, // 🔥 КЛЮЧОВО
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
  style={{
    width: "100%",
    marginTop: 12,
    borderCollapse: "collapse",
    background: "#020617",
    borderRadius: 8,
    overflow: "hidden"
  }}
>
         <thead style={{ background: "#0f172a" }}>
            <tr>
              <th style={{ padding: 10, textAlign: "left", color: "#38bdf8" }}>
              Job
              </th>
              <th style={{ padding: 10, textAlign: "left", color: "#38bdf8" }}>
              WO
              </th>
              <th style={{ padding: 10, textAlign: "left", color: "#38bdf8" }}>
              Expected
              </th>
              <th style={{ padding: 10, textAlign: "left", color: "#38bdf8" }}>
              SE
              </th>
              <th style={{ padding: 10, textAlign: "left", color: "#38bdf8" }}>
              Progress & Files
              </th>
              <th style={{ padding: 10, textAlign: "left", color: "#38bdf8" }}>
              Delete
              </th>
            </tr>
          </thead>
          <tbody>
  {upcomingTasks.map(task => (
    <tr
    key={task.id}
    style={{
      borderTop: "1px solid #1e293b",
      transition: "0.2s"
    }}
    onMouseEnter={e => (e.currentTarget.style.background = "#0f172a")}
    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
  >

      {/* Job */}
      <td style={{ padding: 10 }}>
      <AutoTextarea
  value={task.job || ""}
  onBlur={e => {
    updateTask(task.id, { job: e.target.value });
  }}
/>
      </td>

      {/* WO */}
      <td style={{ padding: 10 }}>
       <AutoTextarea
  value={task.workOrder || ""}
  onBlur={e => {
    updateTask(task.id, { workOrder: e.target.value });
  }}
/>
      </td>

      {/* Expected */}
      <td style={{ padding: 10 }}>
       <AutoTextarea
  value={task.expectedAt || ""}
  onBlur={e => {
    updateTask(task.id, { expectedAt: e.target.value });
  }}
/>
      </td>

      {/* SE */}
      <td style={{ padding: 10 }}>
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
      <td style={{ padding: 10 }}>
        <button onClick={() => setSelectedTaskId(task.id)}>
          Open
        </button>
      </td>

      {/* Delete */}
      <td style={{ padding: 10 }}>
        <button
          onClick={async () => {
  try {
    // 🔥 1. update в Supabase
    const { error } = await supabase
      .from("tasks")
      .update({
        type: "archived",
        originalType: task.type,
        archivedAt: new Date().toLocaleString()
      })
      .eq("id", task.id);      

    if (error) throw error;

    // 🟢 2. update UI
    setUpcomingTasks(tasks =>
      tasks.filter(t => t.id !== task.id)
    );

    setArchivedTasks(tasks => [
      ...tasks,
      {
        ...task,
        type: "archived",
        originalType: task.type, // 🔥 ТОВА ЛИПСВА
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
                  onClick={async () => {
  try {
    console.log("RESTORE TASK:", task);
    const newType = task.originalType || "ongoing";

    // 🔥 1. update в Supabase (ТОВА ЛИПСВАШЕ ДОСЕГА)
    const { error } = await supabase
      .from("tasks")
      .update({
        type: newType,
        archivedAt: null,
        originalType: null
      })
      .eq("id", task.id);

    if (error) throw error;

    // 🟢 2. махаме от archive UI
    setArchivedTasks(tasks =>
      tasks.filter(t => t.id !== task.id)
    );

    // 🟢 3. добавяме в правилния списък
   const restoredTask = {
  ...task,
  type: newType,
  archivedAt: null,
  originalType: null
};

if (newType === "ongoing") {
  setOngoingTasks(tasks => [...tasks, restoredTask]);
} else {
  setUpcomingTasks(tasks => [...tasks, restoredTask]);
}

  } catch (err) {
    console.error("RESTORE ERROR:", err);
  }
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
    f.url.split("/task-files/")[1]
  );

  await supabase.storage
    .from("task-files")
    .remove(fileNames);
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
  <div
    style={{
      minHeight: "100vh",
      background: backgrounds[bg],
      color: "#e2e8f0"
    }}
  >
    <header style={{ background: "#1e293b", color: "white", padding: 12 }}>
      <button onClick={() => setView("vacations")}>Vacations</button>
      <button onClick={() => setView("home")}>Home</button>{" "}
      <button onClick={() => setView("ongoing")}>Ongoing</button>{" "}
      <button onClick={() => setView("upcoming")}>Upcoming</button>{" "}
      <button onClick={() => setView("archive")}>Archive</button>
      <select
  value={bg}
  onChange={e => setBg(e.target.value)}
  style={{
    marginLeft: 20,
    padding: 5,
    background: "#020617",
    color: "#38bdf8",
    border: "1px solid #334155"
  }}
>
  <option value="dark">Dark</option>
  <option value="ocean">Ocean</option>
  <option value="steel">Steel</option>
  <option value="sunset">Sunset</option>
</select>
    </header>

    <main style={{ padding: 16 }}>    
      {view === "home" && <Dashboard />}
      {view === "ongoing" && <Ongoing />}
      {view === "upcoming" && <Upcoming />}
      {view === "archive" && <Archive />}
      {view === "vacations" && <Vacations />}
    </main>

   {selectedTaskId && (view === "ongoing" || view === "upcoming") && <TaskFiles />}
  </div>
);

}
