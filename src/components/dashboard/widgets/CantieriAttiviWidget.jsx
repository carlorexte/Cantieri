import React from "react";
import CantieriAttivi from "../CantieriAttivi";

export default function CantieriAttiviWidget({ dashboardData }) {
  const { cantieri = [], isLoading = false } = dashboardData || {};

  return (
    <CantieriAttivi 
      cantieri={cantieri}
      isLoading={isLoading}
    />
  );
}