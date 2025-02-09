import { useState } from "react";
import Image from "next/image";
import styles from "../../styles/ChurchMember.module.css";
import { ChurchMember } from "../../types/interfaces"
import { CHURCH_NAME } from "../../public/contants/global-variables";

const ChurchMemberPortal = () => {
  const [formData, setFormData] = useState<ChurchMember>({
    memberID: 234,
    memberName: "John Doe",
    memberAlias: "Wa Ciku",
    memberLocalChurchID: 123,
    isActive: false,
    memberSex: "Male",
    memberAge: 35,
    memberSince: "2005-08-15",
    memberEmail: "johndoe@example.com",
    memberPhoneNum: "123-456-7890",
    memberRole: "Elder",
    baptismDay: "2010-06-20",
    baptisedBy: "Pastor James",
    baptismChurch: "St. Peter's Church",
    baptismRepresentative: "",
    confirmationDay: "",
    confirmedBy: "",
    confirmationChurch: "",
    confirmationWitness: "",
    consecrationDay: "",
    consecratedBy: "",
    consecrationChurch: "",
    consecrationRepresentative: "",
  });

  const [editingField, setEditingField] = useState<string | null>(null);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [bio, setBio] = useState("This is where you can describe yourself...");
  const [isEditingBio, setIsEditingBio] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
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

  const renderField = (label: string, fieldName: string) => (
    <div className={styles.field}>
      <span className={styles.label}>{label}:</span>
      {editingField === fieldName ? (
        <input
          type="text"
          name={fieldName}
          value={formData[fieldName as keyof ChurchMember]?.toString() || ""}
          onChange={handleInputChange}
          className={styles.input}
        />
      ) : (
        <span className={styles.value}>
          {formData[fieldName as keyof ChurchMember] || "Not provided"}
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

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{CHURCH_NAME} Church Clergy Portal</h1>

      {/* Contact Information Card */}
      <div className={styles.card}>
        <div
          className={`${styles.statusLabel} ${formData.isActive ? styles.active : styles.inactive}`}
        >
          {formData.isActive ? "Active" : "Inactive"}
        </div>
        <div className={styles.profileSection}>
          <div className={styles.imageWrapper}>
            <img
              src={profilePic || "/images/default-profile.svg"}
              alt="Profile"
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
        

        {/* Sacramental Details */}
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
