"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import styles from "../ChurchMember.module.css";
import { ChurchMember } from "../../../../types/interfaces";
import { CHURCH_NAME, BASE_ENDPOINT } from "../../../../public/contants/global-variables";

const ChurchMemberPortal: React.FC = () => {
  const [formData, setFormData] = useState<ChurchMember | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [bio, setBio] = useState("This is where you can describe yourself...");
  const [isEditingBio, setIsEditingBio] = useState(false);
  const searchParams = useSearchParams();
  const memberID = searchParams.get("memberID");

  useEffect(() => {
    const fetchMemberData = async () => {
      try {
        const response = await fetch(`${BASE_ENDPOINT}/Profile/get-profile/${memberID}`); // Adjust endpoint
        if (!response.ok) {
          throw new Error("Failed to fetch member data");
        }
        const data: ChurchMember = await response.json();
        setFormData(data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchMemberData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!formData) return;
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleEditField = (fieldName: string) => {
    setEditingField(fieldName);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setProfilePic(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleBioEditing = () => {
    setIsEditingBio((prev) => !prev);
  };

  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBio(e.target.value);
  };

  const handleLinkProfile = () => {
  }

  const renderField = (label: string, fieldName: keyof ChurchMember) => (
    <div className={styles.field}>
      <span className={styles.label}>{label}:</span>
      {editingField === fieldName ? (
        <input
          type="text"
          name={fieldName}
          value={formData?.[fieldName]?.toString() || ""}
          onChange={handleInputChange}
          className={styles.input}
        />
      ) : (
        <span className={styles.value}>
          {formData?.[fieldName] || "Not provided"}
        </span>
      )}
      <Image
        src="/images/edit.svg"
        alt="Edit Icon"
        width={20}
        height={20}
        className={styles.editIcon}
        onClick={() => handleEditField(fieldName)}
        title="Edit"
      />
    </div>
  );

  if (!formData) {
    return <p>Loading...</p>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{CHURCH_NAME} Church Member Portal</h1>

      {/* Contact Information Card */}
      <div className={styles.card}>
        <div className={styles.linkIconWrapper} onClick={handleLinkProfile}>
          <Image
            src={profilePic ? "/images/okay_link.svg" : "/images/broken_link.svg"}
            alt={profilePic ? "Linked" : "Not Linked"}
            width={24}
            height={24}
            className={styles.linkIcon}
            title={profilePic ? "Profile is linked to a church record" : "Profile is not linked"}
          />
        </div>

        <div className={styles.profileSection}>
          <div className={styles.imageWrapper}>
            <Image
              src={profilePic || "/images/default-profile.svg"}
              alt="Profile"
              width={100}
              height={100}
              className={styles.profileImage}
            />
            <label htmlFor="uploadImage" className={styles.uploadButton}>
              <Image
                src="/images/upload.svg"
                alt="Upload Icon"
                width={20}
                height={20}
              />
            </label>
            <input
              type="file"
              id="uploadImage"
              accept="image/*"
              onChange={handleImageUpload}
              className={styles.hiddenInput}
            />
          </div>
          <div className={styles.bioSection}>
            <h3 className={styles.bioTitle}>About me</h3>
            {isEditingBio ? (
              <textarea
                value={bio}
                onChange={handleBioChange}
                className={styles.bioInput}
              />
            ) : (
              <p className={styles.bioText}>{bio}</p>
            )}
            <button onClick={toggleBioEditing} className={styles.editBioButton}>
              {isEditingBio ? "Save" : "Edit Bio"}
            </button>
          </div>
          <div className={styles.infoSection}>
            {renderField("Member Number", "memberID")}
            {renderField("Name", "memberName")}
            {renderField("Alias", "memberAlias")}
            {renderField("Local Church ID", "memberLocalChurchID")}
            {renderField("Email", "memberEmail")}
            {renderField("Phone Number", "memberPhoneNum")}
            {renderField("Role", "memberRole")}
            {renderField("Member Since", "memberSince")}
            {renderField("Age", "memberAge")}
            {renderField("Sex", "memberSex")}
          </div>
        </div>
      </div>

      {/* Other Cards */}
      <div className={styles.cards}>
        <div className={styles.infoSection}>
          <h2 className={styles.cardTitle}>Sacramental Details</h2>
          {renderField("Baptism Day", "baptismDay")}
          {renderField("Baptised By", "baptisedBy")}
          {renderField("Baptism Church", "baptismChurch")}
          {renderField("Baptism godparent", "baptismRepresentative")}
          {renderField("Confirmation Day", "confirmationDay")}
          {renderField("Confirmed By", "confirmedBy")}
          {renderField("Confirmaton Church", "confirmationChurch")}
          {renderField("Confirmation Witness", "confirmationWitness")}
          {renderField("Consecration Day", "consecrationDay")}
          {renderField("Consecrated By", "consecratedBy")}
          {renderField("Consecration Church", "consecrationChurch")}
          {renderField("Consecration godparent", "consecrationRepresentative")}
        </div>
      </div>
    </div>
  );
};

export default ChurchMemberPortal;
