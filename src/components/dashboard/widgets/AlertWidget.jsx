import React from "react";
import AlertCard from "../AlertCard";

export default function AlertWidget({ dashboardData }) {
  const { alerts = [] } = dashboardData || {};

  return <AlertCard alerts={alerts} />;
}