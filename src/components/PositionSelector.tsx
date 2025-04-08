"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const PositionSelector = () => {
  const router = useRouter();
  const [selectedPosition, setSelectedPosition] = useState("");

  const handleContinue = () => {
    if (!selectedPosition) {
      alert("Please select a position");
      return;
    }
    router.push(`/profile/setup/${selectedPosition}`);
  };

  return (
    <div style={{ padding: "2rem" }}>
      <label htmlFor="positionDropdown">Select your position:</label>
      <select
        id="positionDropdown"
        value={selectedPosition}
        onChange={(e) => setSelectedPosition(e.target.value)}
        style={{ marginLeft: "1rem", padding: "0.5rem" }}
      >
        <option value="">-- Choose --</option>
        <option value="Clergy">Clergy</option>
        <option value="Admin">Admin</option>
        <option value="BoardMember">Board Member</option>
      </select>

      {/* ✅ Only show button after selection */}
      {selectedPosition && (
        <button
          onClick={handleContinue}
          style={{
            marginLeft: "1rem",
            padding: "0.5rem 1rem",
            backgroundColor: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Continue
        </button>
      )}
    </div>
  );
};

export default PositionSelector;
