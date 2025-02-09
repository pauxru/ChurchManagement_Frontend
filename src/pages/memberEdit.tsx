import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import "../app/globals.css";

interface ChurchMember {
  memberID: number;
  memberName: string;
  memberSex: string;
  memberRole: string;
  memberAge: number | null;
  memberSince: string;
  memberEmail: string | null;
  memberPhoneNum: string | null;
}

const MemberForm: React.FC = () => {
  const router = useRouter();
  const { member } = router.query;
  const [memberData, setMemberData] = useState<Partial<ChurchMember>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (member) {
      const parsedMember = JSON.parse(member as string);
      if (parsedMember) {
        setMemberData(parsedMember);
      }
    }
    setLoading(false);
  }, [member]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setMemberData((prevMember) => ({ ...prevMember, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (memberData.memberID) {
        await axios.put(
          `https://localhost:5000/ChurchManagement/member/${memberData.memberID}`,
          memberData
        );
      } else {
        await axios.post(`https://localhost:5000/ChurchManagement/member`, memberData);
      }
      router.push("/members");
    } catch (err) {
      console.error("Failed to save member:", err);
      setError("Failed to save member details.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold text-center mb-6 text-blue-800">
        {memberData.memberID ? "Edit Member" : "Add New Member"}
      </h1>
      <form onSubmit={handleSubmit} className="max-w-lg mx-auto bg-white p-6 rounded-lg shadow-lg">
        <div className="mb-4">
          <label className="block text-gray-700">Name</label>
          <input
            type="text"
            name="memberName"
            value={memberData.memberName || ""}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">Sex</label>
          <select
            name="memberSex"
            value={memberData.memberSex || ""}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded"
            required
          >
            <option value="">Select Sex</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">Role</label>
          <input
            type="text"
            name="memberRole"
            value={memberData.memberRole || ""}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">Age</label>
          <input
            type="number"
            name="memberAge"
            value={memberData.memberAge || ""}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">Member Since</label>
          <input
            type="date"
            name="memberSince"
            value={memberData.memberSince || ""}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">Email</label>
          <input
            type="email"
            name="memberEmail"
            value={memberData.memberEmail || ""}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">Phone</label>
          <input
            type="tel"
            name="memberPhoneNum"
            value={memberData.memberPhoneNum || ""}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
          {memberData.memberID ? "Update Member" : "Create Member"}
        </button>
      </form>
    </div>
  );
};

export default MemberForm;