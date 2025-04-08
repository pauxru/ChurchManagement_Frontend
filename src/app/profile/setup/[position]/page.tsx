'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';

const PositionPage = () => {
  const { position } = useParams() as { position: string };

  const [formData, setFormData] = useState({
    introText: "",
    name: "",
    phone: "",
    email: "",
    level: "",
    levelName: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleVerify = () => {
    console.log("Verifying...", formData);
    alert("Verification data submitted!");
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Position: {position}</h1>
      <p style={styles.description}>
        Please provide the following information to verify your role as a{" "}
        <strong>{position}</strong> within the church system.
      </p>

      <textarea
        name="introText"
        value={formData.introText}
        onChange={handleChange}
        placeholder="Write a brief introduction..."
        rows={4}
        style={styles.textarea}
      />
      <input
        type="text"
        name="name"
        value={formData.name}
        onChange={handleChange}
        placeholder="Full Name"
        style={styles.input}
      />
      <input
        type="tel"
        name="phone"
        value={formData.phone}
        onChange={handleChange}
        placeholder="Phone Number"
        style={styles.input}
      />
      <input
        type="email"
        name="email"
        value={formData.email}
        onChange={handleChange}
        placeholder="Email Address"
        style={styles.input}
      />
      <select
        name="level"
        value={formData.level}
        onChange={handleChange}
        style={styles.input}
      >
        <option value="">Select Level</option>
        <option value="National">National</option>
        <option value="ArchDiocese">ArchDiocese</option>
        <option value="Diocese">Diocese</option>
        <option value="Parish">Parish</option>
        <option value="Local Church">Local Church</option>
      </select>
      <input
        type="text"
        name="levelName"
        value={formData.levelName}
        onChange={handleChange}
        placeholder="Name of the Level (e.g. Nairobi Diocese)"
        style={styles.input}
      />
      <button onClick={handleVerify} style={styles.button}>
        Verify
      </button>
    </div>
  );
};

export default PositionPage;

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: "600px",
    margin: "40px auto",
    padding: "20px",
    border: "1px solid #ddd",
    borderRadius: "12px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    backgroundColor: "#fff",
    fontFamily: "sans-serif",
  },
  title: {
    fontSize: "1.8rem",
    marginBottom: "10px",
    color: "#333",
  },
  description: {
    fontSize: "1rem",
    color: "#555",
    marginBottom: "16px",
  },
  input: {
    width: "100%",
    padding: "10px",
    marginBottom: "14px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "1rem",
  },
  textarea: {
    width: "100%",
    padding: "10px",
    marginBottom: "14px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "1rem",
  },
  button: {
    padding: "12px 20px",
    fontSize: "1rem",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#4CAF50",
    color: "#fff",
    cursor: "pointer",
  },
};
