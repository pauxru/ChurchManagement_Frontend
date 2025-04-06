"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useToken } from "../../contexts/TokenContext";
import { useEffect, useRef, useState } from "react";
import styles from "./NavBar.module.css";

export default function NavBar() {
  const router = useRouter();
  const { user } = useUser();
  const { fetchToken, token } = useToken();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleProfileClick = () => {
    router.push("/profile/editProfile");
    setDropdownOpen(false);
  };

  const handleLogout = () => {
    router.push("/api/auth/logout");
    setDropdownOpen(false);
  };

  const handleLogin = () => router.push("/api/auth/login");

  const isProfileIncomplete = !user?.email_verified;
  if (user && !token) {
    fetchToken();
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <nav className={styles.navbar}>
        <div className={styles.container}>
          <h1 className={styles.title}>A.I.P.C.A Church Management</h1>
          <ul className={styles.navList}>
            <li><a href="#about" className={styles.navItem}>About</a></li>
            <li><a href="#features" className={styles.navItem}>Features</a></li>
            <li><span onClick={() => router.push("/transfers")} className={styles.navItem}>Transfers</span></li>
            <li><span onClick={() => router.push("/localChurches/searchLocalChurch")} className={styles.navItem}>Churches</span></li>
            <li><span onClick={() => router.push("/members/searchMembers")} className={styles.navItem}>Members</span></li>

            {user ? (
              <div className="relative" ref={dropdownRef}>
                <div
                  className={styles.userWrapper}
                  onClick={() => setDropdownOpen((prev) => !prev)}
                >
                  <Image
                    src={"/images/members.svg"}
                    alt={user.name || "User"}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                  <span>{user.name}</span>
                </div>

                {dropdownOpen && (
                  <div className={styles.dropdown}>
                    <button onClick={handleProfileClick} className={styles.dropdownItem}>
                      Edit Profile
                    </button>
                    <button onClick={() => router.push("/settings")} className={styles.dropdownItem}>
                      Settings
                    </button>
                    <button onClick={handleLogout} className={`${styles.dropdownItem} ${styles.logout}`}>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <li>
                <span onClick={handleLogin} className={styles.navItem}>Login</span>
              </li>
            )}
          </ul>
        </div>
      </nav>

      {isProfileIncomplete && (
        <div className={styles.profileWarning}>
          <p className="font-semibold">Your profile is incomplete. Please complete your details.</p>
          <button onClick={handleProfileClick} className={styles.profileButton}>
            Complete Profile
          </button>
        </div>
      )}
    </>
  );
}
