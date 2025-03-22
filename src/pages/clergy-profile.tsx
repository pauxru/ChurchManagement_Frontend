import { useState, useEffect } from "react";
import Image from "next/image";
import styles from "../../styles/ClergyProfile.module.css";
import { CHURCH_NAME, BASE_ENDPOINT } from "../../public/contants/global-variables";
import { useRouter } from "next/router";

interface Clergy {
  clergyID: number;
  clergyName: string;
  clergyAlias: string;
  churchMemberID: string;
  clergyRank: string;
  ordinationDate: string;
  ordainedBy: string;
  ordinationChurch: string;
  salary: number;
  description: string;
}


const ClergyProfile = () => {
  const router = useRouter();
  const { clergyID } = router.query;
  const [formData, setFormData] = useState<Clergy | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [bio, setBio] = useState("This is where you can describe yourself...");
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClergyDetails = async (id: number) => {
      setLoading(true);
      try {
        const response = await fetch(`${BASE_ENDPOINT}/Clergy/get-clergy/${id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch clergy data");
        }
        const data: Clergy = await response.json();
        setFormData(data);
      } catch (error) {
        setError(error instanceof Error ? error.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };
  
    if (clergyID && typeof clergyID === "string") {
      const idNumber = parseInt(clergyID, 10);
      if (!isNaN(idNumber)) {
        fetchClergyDetails(idNumber);
      }
    }
  }, [clergyID]);
  
  
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => (prev ? { ...prev, [name]: value } : null));
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

  const renderField = (label: string, fieldName: keyof Clergy) => (
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

  if (loading) return <p>Loading clergy data...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{CHURCH_NAME} Church Clergy Portal</h1>

      <div className={styles.card}>
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
            {formData && (
              <>
                {renderField("Clergy ID", "clergyID")}
                {renderField("Name", "clergyName")}
                {renderField("Alias", "clergyAlias")}
                {renderField("Church Member ID", "churchMemberID")}
                {renderField("Rank", "clergyRank")}
                {renderField("Ordination Date", "ordinationDate")}
                {renderField("Ordained By", "ordainedBy")}
                {renderField("Ordination Church", "ordinationChurch")}
                {renderField("Salary", "salary")}
                {renderField("Description", "description")}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClergyProfile;
