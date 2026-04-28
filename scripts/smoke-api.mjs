const BASE_URL = process.env.SMOKE_API_URL ?? "http://localhost:5000/api";

const TEST_USERS = {
  admin: { email: "admin@regris.com", password: "Password123!" },
  supervisor: { email: "clarise@regris.com", password: "Password123!" },
  intern: { email: "maria@regris.com", password: "Password123!" },
};

const tinyPngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF9sAAAAASUVORK5CYII=";

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, options);
  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : null;

  if (!response.ok) {
    throw new Error(data?.message ?? `Request failed: ${response.status}`);
  }

  return data;
}

async function login(email, password) {
  return request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

async function authedRequest(path, token, options = {}) {
  const headers = {
    Authorization: `Bearer ${token}`,
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers ?? {}),
  };

  return request(path, { ...options, headers });
}

function logPass(message) {
  console.log(`PASS ${message}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const admin = await login(TEST_USERS.admin.email, TEST_USERS.admin.password);
  const supervisor = await login(TEST_USERS.supervisor.email, TEST_USERS.supervisor.password);
  const intern = await login(TEST_USERS.intern.email, TEST_USERS.intern.password);

  logPass(`login admin role=${admin.user.role}`);
  logPass(`login supervisor role=${supervisor.user.role}`);
  logPass(`login intern role=${intern.user.role}`);

  const adminDashboard = await authedRequest("/dashboard/overview", admin.token);
  const supervisorDashboard = await authedRequest("/dashboard/overview", supervisor.token);
  const internDashboard = await authedRequest("/dashboard/overview", intern.token);

  assert(adminDashboard.systemStats, "Admin dashboard did not return system stats.");
  assert(supervisorDashboard.stats, "Supervisor dashboard did not return stats.");
  assert(internDashboard.attendance, "Intern dashboard did not return attendance state.");
  assert(
    ["clocked-in", "clocked-out", "absent"].includes(internDashboard.attendance.status),
    "Intern dashboard returned an unexpected attendance status.",
  );

  logPass(`dashboard admin users=${adminDashboard.systemStats.totalUsers}`);
  logPass(`dashboard supervisor interns=${supervisorDashboard.stats.activeInterns}`);
  logPass(`dashboard intern attendanceStatus=${internDashboard.attendance.status}`);

  const attendance = await authedRequest("/attendance", intern.token);
  assert("todayRecord" in attendance, "Intern attendance response is missing todayRecord.");
  assert(
    !attendance.todayRecord || attendance.todayRecord.attendanceStatus === internDashboard.attendance.attendanceStatus,
    "Intern dashboard attendance status does not match attendance page status.",
  );
  logPass(`attendance intern todayRecordStatus=${attendance.todayRecord?.attendanceStatus ?? "none"}`);

  const assignableInterns = await authedRequest("/tasks/interns", supervisor.token);
  assert(Array.isArray(assignableInterns.interns), "Supervisor assignable intern list is invalid.");
  logPass(`supervisor assignable interns count=${assignableInterns.interns.length}`);

  const smokeTitle = `QA Smoke Task ${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const expectedDeadline = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const createdTask = await authedRequest("/tasks", supervisor.token, {
    method: "POST",
    body: JSON.stringify({
      title: smokeTitle,
      description: "Temporary smoke test task",
      assignedToId: intern.user.id,
      deadline: expectedDeadline,
      priority: "medium",
      status: "pending",
    }),
  });

  assert(createdTask.task?.id, "Task creation did not return a task id.");
  assert(createdTask.task?.deadline, "Created task did not persist its deadline.");
  assert(createdTask.task?.deadline === expectedDeadline, "Created task deadline changed before it was returned.");
  logPass(`create task id=${createdTask.task.id}`);

  try {
    const internTasks = await authedRequest("/tasks", intern.token);
    assert(
      internTasks.tasks.some((task) => task.id === createdTask.task.id),
      "Created task is not visible to the assigned intern.",
    );
    assert(
      internTasks.tasks.some((task) => task.id === createdTask.task.id && task.deadline),
      "Created task deadline is missing from the intern task list.",
    );
    assert(
      internTasks.tasks.some((task) => task.id === createdTask.task.id && task.deadline === expectedDeadline),
      "Created task deadline changed in the intern task list.",
    );
    logPass("intern can read assigned task");

    const updatedTask = await authedRequest(`/tasks/${createdTask.task.id}`, intern.token, {
      method: "PUT",
      body: JSON.stringify({ status: "reviewing" }),
    });
    assert(updatedTask.task?.status === "reviewing", "Intern task review submission did not persist.");
    logPass(`intern submit task for review=${updatedTask.task.status}`);

    const supervisorRevisionTask = await authedRequest(`/tasks/${createdTask.task.id}`, supervisor.token, {
      method: "PUT",
      body: JSON.stringify({
        title: createdTask.task.title,
        description: createdTask.task.description,
        assignedToId: intern.user.id,
        deadline: createdTask.task.deadline,
        priority: createdTask.task.priority,
        status: "revision",
      }),
    });
    assert(supervisorRevisionTask.task?.status === "revision", "Supervisor revision request did not persist.");
    logPass(`supervisor request revision=${supervisorRevisionTask.task.status}`);

    const internResubmittedTask = await authedRequest(`/tasks/${createdTask.task.id}`, intern.token, {
      method: "PUT",
      body: JSON.stringify({ status: "reviewing" }),
    });
    assert(internResubmittedTask.task?.status === "reviewing", "Intern resubmission for review did not persist.");
    logPass(`intern resubmit task for review=${internResubmittedTask.task.status}`);

    const supervisorReviewedTask = await authedRequest(`/tasks/${createdTask.task.id}`, supervisor.token, {
      method: "PUT",
      body: JSON.stringify({
        title: createdTask.task.title,
        description: createdTask.task.description,
        assignedToId: intern.user.id,
        deadline: createdTask.task.deadline,
        priority: createdTask.task.priority,
        status: "completed",
      }),
    });
    assert(supervisorReviewedTask.task?.status === "completed", "Supervisor review completion did not persist.");
    logPass(`supervisor approve reviewed task=${supervisorReviewedTask.task.status}`);

    const sentMessage = await authedRequest("/messages", supervisor.token, {
      method: "POST",
      body: JSON.stringify({
        receiverId: intern.user.id,
        content: "QA smoke image attachment",
        attachment: {
          name: "qa-smoke.png",
          type: "image/png",
          data: `data:image/png;base64,${tinyPngBase64}`,
        },
      }),
    });

    assert(sentMessage.message?.id, "Message send did not return a message id.");
    logPass(`send message id=${sentMessage.message.id}`);

    const internConversation = await authedRequest(`/messages/${supervisor.user.id}`, intern.token);
    const matchedMessage = internConversation.messages.find((message) => message.id === sentMessage.message.id);
    assert(matchedMessage, "Sent message is not visible to the intern.");
    assert(matchedMessage.attachment?.type === "image/png", "Image attachment type was not preserved.");
    logPass(`message attachment type=${matchedMessage.attachment.type}`);
  } finally {
    await authedRequest(`/tasks/${createdTask.task.id}`, supervisor.token, {
      method: "DELETE",
    });
    logPass("delete temporary task");
  }
}

main().catch((error) => {
  console.error(`FAIL ${error.message}`);
  process.exit(1);
});
