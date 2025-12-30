import React from "react";
import ManualeUtente from "@/components/guida/ManualeUtente";

export default function Guida() {
  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <ManualeUtente />
      </div>
    </div>
  );
}