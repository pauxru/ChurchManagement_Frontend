'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { BASE_ENDPOINT } from '../../../../../public/contants/global-variables';
import { useToken } from '../../../../../contexts/TokenContext';

const PositionPage = () => {
  const { position } = useParams() as { position: string };
  const { token } = useToken();

  const [formData, setFormData] = useState({
    introText: "",
    name: "",
    phone: "",
    email: "",
    level: "",
    levelName: "",
  });

  const [errors, setErrors] = useState({
    name: false,
    phone: false,
    level: false,
    levelName: false,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleVerify = () => {
    console.log("Here at Verifying");
    // Check for mandatory fields
    const newErrors = {
      name: !formData.name,
      phone: !formData.phone,
      level: !formData.level,
      levelName: !formData.levelName,
    };

    setErrors(newErrors);

    // If there are any missing mandatory fields, alert and stop submission
    if (Object.values(newErrors).includes(true)) {
      alert("Please fill in all mandatory fields!");
      return;
    }

    console.log("Verifying...", formData);
    

  const requestData = {
    Position: position,
    FullName: formData.name,
    PhoneNumber: formData.phone,
    Email:formData.email,
    Level: formData.level,
    LevelName: formData.levelName,
    Description: formData.introText

  };

  console.log("Here at Verifying 2: ",token);

  fetch(`${BASE_ENDPOINT}/Profile/verify`, {
    method: "POST", // Specify the HTTP method
    headers: {
      "Content-Type": "application/json", // Send as JSON
      // Optionally, include authorization token or any other headers
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(requestData), // Convert form data to JSON
  })
    .then((response) => response.json()) // Parse the JSON response
    .then((data) => {
      if (data.message) {
        alert(data.message); // Display any messages returned by the API
      }
      console.log(data); // Log the response data
    })
    .catch((error) => {
      console.error("Error during verification:", error); // Handle errors
      alert("There was an error submitting the verification data.");
    });

    alert("Verification data submitted!");
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Position: {position}</h1>
      <p style={styles.description}>
        Please provide the following information to verify your role as a{" "}
        <strong>{position}</strong> within the church system.
        <p></p><strong>Please use the name and phone number in the official church records</strong><p/>
      </p>

      {/* Name Field */}
      <input
        type="text"
        name="name"
        value={formData.name}
        onChange={handleChange}
        placeholder="Full Name"
        style={{ ...styles.input, borderColor: errors.name ? 'red' : '#ccc' }}
      />
      {/* Phone Field */}
      <input
        type="tel"
        name="phone"
        value={formData.phone}
        onChange={handleChange}
        placeholder="Phone Number"
        style={{ ...styles.input, borderColor: errors.phone ? 'red' : '#ccc' }}
      />
      {/* Email Field (Optional) */}
      <input
        type="email"
        name="email"
        value={formData.email}
        onChange={handleChange}
        placeholder="Email Address"
        style={styles.input}
      />
      {/* Level Selection Field */}
      <select
        name="level"
        value={formData.level}
        onChange={handleChange}
        style={{ ...styles.input, borderColor: errors.level ? 'red' : '#ccc' }}
      >
        <option value="">Select Level</option>
        <option value="National">National</option>
        <option value="ArchDiocese">ArchDiocese</option>
        <option value="Diocese">Diocese</option>
        <option value="Parish">Parish</option>
        <option value="Local Church">Local Church</option>
      </select>
      {/* Level Name Field */}
      <input
        type="text"
        name="levelName"
        value={formData.levelName}
        onChange={handleChange}
        placeholder="Name of the Level (e.g. Nairobi Diocese)"
        style={{ ...styles.input, borderColor: errors.levelName ? 'red' : '#ccc' }}
      />
      {/* Intro Text (Optional) */}
      <textarea
        name="introText"
        value={formData.introText}
        onChange={handleChange}
        placeholder="Write a brief introduction..."
        rows={4}
        style={styles.textarea}
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
