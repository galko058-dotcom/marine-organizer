import { useState, useEffect } from "react";
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

export default function App() {

  const [view, setView] = useState("home");
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const [ongoingTasks, setOngoingTasks] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [archivedTasks, setArchivedTasks] = useState([]);

  // 🔹 ЗАРЕЖДАНЕ ОТ BACKEND
  useEffect(() => {
  fetch("(`${API_URL}/data")
    .then(res => res.json())
    .then(data => {
      setOngoingTasks(data.ongoing || []);
      setUpcomingTasks(data.upcoming || []);
      setArchivedTasks(data.archived || []);
      setIsLoaded(true); // 🔥 важно
    });
}, []);

  // 🔹 ЗАПИС КЪМ BACKEND
  useEffect(() => {
  if (!isLoaded) return; // 🔥 не записвай преди да сме заредили

  fetch("(`${API_URL}/data", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ongoing: ongoingTasks,
      upcoming: upcomingTasks,
      archived: archivedTasks
    })
  });
}, [ongoingTasks, upcomingTasks, archivedTasks, isLoaded]);
  useEffect(() => {
  setSelectedTask(null);
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

 function ensureProgress(task) {
  if (!task) return null;

  let updatedTask = { ...task };

  // Ако няма progressColumns – добавяме default
  if (!updatedTask.progressColumns) {
    updatedTask.progressColumns = ["DG1", "DG2", "DG3", "ME"];
  }

  // Ако няма progress – създаваме го спрямо колоните
  if (!updatedTask.progress) {
    updatedTask.progress = createEmptyProgress(updatedTask.progressColumns);
  }

  return updatedTask;
}


  function addOngoingTask() {
    setOngoingTasks(tasks => [...tasks, {
      id: Date.now(),
      job: "",
      workOrder: "",
      contact: "",
      seInCharge: users[0],
      status: "In progress",
      files: [],
      progressColumns: ["DG1", "DG2", "DG3", "ME"],
      progress: createEmptyProgress(["DG1", "DG2", "DG3", "ME"])
    }]);
  }

 function addUpcomingTask() {
  setUpcomingTasks(tasks => [...tasks, {
    id: Date.now(),
    job: "",
    workOrder: "",
    expectedAt: "",
    seInCharge: users[0],
    files: []
  }]);
}

  function toggleProgress(taskId, column, row) {
  setOngoingTasks(tasks =>
    tasks.map(t => {
      if (t.id !== taskId) return t;

      const safeTask = ensureProgress(t);

      return {
        ...safeTask,
        progress: {
          ...safeTask.progress,
          [column]: {
            ...safeTask.progress[column],
            [row]: !safeTask.progress[column][row]
          }
        }
      };
    })
  );

  setUpcomingTasks(tasks =>
    tasks.map(t => {
      if (t.id !== taskId) return t;

      const safeTask = ensureProgress(t);

      return {
        ...safeTask,
        progress: {
          ...safeTask.progress,
          [column]: {
            ...safeTask.progress[column],
            [row]: !safeTask.progress[column][row]
          }
        }
      };
    })
  );
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

  // Проверяваме къде се намира задачата
  const isOngoing = ongoingTasks.some(t => t.id === taskId);

  if (isOngoing) {
    setOngoingTasks(tasks =>
      tasks.map(t =>
        t.id === taskId
          ? { ...t, files: [...(t.files || []), fileData] }
          : t
      )
    );
  } else {
    setUpcomingTasks(tasks =>
      tasks.map(t =>
        t.id === taskId
          ? { ...t, files: [...(t.files || []), fileData] }
          : t
      )
    );
  }
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
  if (!selectedTask) return null;

  let currentTask =
  ongoingTasks.find(t => t.id === selectedTask.id) ||
  upcomingTasks.find(t => t.id === selectedTask.id);

if (!currentTask) return null;

currentTask = ensureProgress(currentTask);
const isOngoing = ongoingTasks.some(t => t.id === currentTask.id);

    return (
      <div>
       <button onClick={() => setSelectedTask(null)}>← Back</button>
        <h2>Progress & Files</h2>
        <p><strong>Job:</strong> {currentTask.job}</p>
        <p><strong>Work order:</strong> {currentTask.workOrder}</p>
        {currentTask.expectedAt && (
  <p><strong>Expected:</strong> {currentTask.expectedAt}</p>
)}

        <p><strong>SE in charge:</strong> {currentTask.seInCharge}</p>

        {ongoingTasks.some(t => t.id === currentTask.id) && (
  <>

   <h3>Progress Checklist</h3>

<button
  onClick={() => {
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
        {currentTask.progressColumns.map(col => (
  <th key={col}>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      
      {/* Delete column button */}
      <button
        onClick={() => {
          const updatedColumns = currentTask.progressColumns.filter(c => c !== col);

          const updatedProgress = { ...currentTask.progress };
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
        onBlur={e => {
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
           {currentTask.progressColumns.map(col => (
              <td key={col} style={{ textAlign: "center" }}>
                <input
                  type="checkbox"
                  checked={currentTask.progress[col][row]}
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
        {currentTask.files?.map((f, i) => (
          <div key={i}>
            📎 <a href={f.url} target="_blank" rel="noreferrer">{f.name}</a>
          </div>
        ))}
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
              <th>Job</th>
              <th>WO</th>
              <th>Contact</th>
              <th>SE</th>
              <th>Status</th>
              <th>Progress & Files</th>
              <th>Delete</th>
            </tr>
          </thead>
          <tbody>
  {ongoingTasks.map(task => (
    <tr key={task.id}>

      <td>
        <textarea
          defaultValue={task.job}
          onBlur={e =>
            setOngoingTasks(tasks =>
              tasks.map(t =>
                t.id === task.id ? { ...t, job: e.target.value } : t
              )
            )
          }
        />
      </td>

      <td>
        <textarea
          defaultValue={task.workOrder}
          onBlur={e =>
            setOngoingTasks(tasks =>
              tasks.map(t =>
                t.id === task.id ? { ...t, workOrder: e.target.value } : t
              )
            )
          }
        />
      </td>

      <td>
        <textarea
          defaultValue={task.contact}
          onBlur={e =>
            setOngoingTasks(tasks =>
              tasks.map(t =>
                t.id === task.id ? { ...t, contact: e.target.value } : t
              )
            )
          }
        />
      </td>

      <td>
        <select
          defaultValue={task.seInCharge}
          onChange={e =>
            setOngoingTasks(tasks =>
              tasks.map(t =>
                t.id === task.id ? { ...t, seInCharge: e.target.value } : t
              )
            )
          }
        >
          {users.map(u => (
            <option key={u}>{u}</option>
          ))}
        </select>
      </td>

      <td>{task.status}</td>

      <td>
        <button onClick={() => setSelectedTask(task)}>
          Open
        </button>
      </td>

      <td>
        <button
          onClick={() => {
            const taskToArchive = task;
            setOngoingTasks(tasks =>
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

  function Upcoming() {
    return (
      <div>
        <h2>Upcoming</h2>
        <button onClick={addUpcomingTask}>+ Add task</button>
        <table border="1" cellPadding="8" style={{ width: "100%", marginTop: 12 }}>
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
          onBlur={e =>
            setUpcomingTasks(tasks =>
              tasks.map(t =>
                t.id === task.id ? { ...t, job: e.target.value } : t
              )
            )
          }
        />
      </td>

      {/* WO */}
      <td>
        <textarea
          defaultValue={task.workOrder}
          onBlur={e =>
            setUpcomingTasks(tasks =>
              tasks.map(t =>
                t.id === task.id ? { ...t, workOrder: e.target.value } : t
              )
            )
          }
        />
      </td>

      {/* Expected */}
      <td>
        <textarea
          defaultValue={task.expectedAt}
          onBlur={e =>
            setUpcomingTasks(tasks =>
              tasks.map(t =>
                t.id === task.id ? { ...t, expectedAt: e.target.value } : t
              )
            )
          }
        />
      </td>

      {/* SE */}
      <td>
        <select
          defaultValue={task.seInCharge}
          onChange={e =>
            setUpcomingTasks(tasks =>
              tasks.map(t =>
                t.id === task.id ? { ...t, seInCharge: e.target.value } : t
              )
            )
          }
        >
          {users.map(u => (
            <option key={u}>{u}</option>
          ))}
        </select>
      </td>

      {/* Progress & Files */}
      <td>
        <button onClick={() => setSelectedTask(task)}>
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
  if (task.files && task.files.length > 0) {
    const fileNames = task.files.map(f =>
      f.url.split("/uploads/")[1]
    );

    await fetch("(`${API_URL}/delete-files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files: fileNames }),
    });
  }

  setArchivedTasks(tasks =>
    tasks.filter(t => t.id !== task.id)
  );
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

   {selectedTask && (view === "ongoing" || view === "upcoming") && <TaskFiles />}
  </div>
);

}
