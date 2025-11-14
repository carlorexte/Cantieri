import React from "react";
import TaskPersonali from "../TaskPersonali";

export default function TaskPersonaliWidget({ dashboardData }) {
  const { taskPersonali = [], cantieri = [], isLoading = false } = dashboardData || {};

  return (
    <TaskPersonali 
      tasks={taskPersonali}
      cantieri={cantieri}
      isLoading={isLoading}
    />
  );
}